import frappe
from frappe import _
from datetime import datetime


@frappe.whitelist()
def get_product_balance_at_time(product, transaction_date, creation_time):
    """
    Get the total balance quantity of a product across all warehouse sections
    at a specific point in time (after a specific transaction)
    """
    try:
        # Get all stock ledger entries for this product up to the specified time
        # Note: quantity_in can be negative when stock is consumed
        ledger_entries = frappe.db.sql(
            """
            SELECT 
                SLE.quantity_in,
                SLE.date
            FROM `tabStock Ledger Entry` SLE
            WHERE SLE.product = %(product)s
            AND SLE.date <= %(transaction_datetime)s
            ORDER BY SLE.date ASC
        """,
            {
                "product": product,
                "transaction_datetime": (
                    f"{transaction_date} {creation_time}"
                    if " " not in str(transaction_date)
                    else transaction_date
                ),
            },
            as_dict=True,
        )

        # Calculate running balance from all transactions up to this point
        # Simply sum all quantity_in values (positive for stock in, negative for consumption)
        balance_quantity = 0
        for entry in ledger_entries:
            quantity_in = float(entry.get("quantity_in") or 0)
            balance_quantity += quantity_in

        return {
            "balance_quantity": balance_quantity,
            "product": product,
            "as_of_datetime": transaction_date,
        }

    except Exception as e:
        frappe.log_error(f"Error calculating balance quantity: {str(e)}")
        return {"balance_quantity": 0, "error": str(e)}


@frappe.whitelist()
def get_current_product_balance(product):
    """
    Get the current total balance quantity of a product across all warehouse sections
    """
    try:
        # Sum all quantities from Warehouse Product Stock doctype
        total_quantity = frappe.db.sql(
            """
            SELECT COALESCE(SUM(quantity), 0) as total_quantity
            FROM `tabWarehouse Product Stock`
            WHERE product = %(product)s
        """,
            {"product": product},
            as_dict=True,
        )

        balance_quantity = (
            total_quantity[0].get("total_quantity", 0) if total_quantity else 0
        )

        return {"balance_quantity": float(balance_quantity), "product": product}

    except Exception as e:
        frappe.log_error(f"Error getting current product balance: {str(e)}")
        return {"balance_quantity": 0, "error": str(e)}


@frappe.whitelist()
def get_consolidated_stock_balance(balance_date):
    """
    Get consolidated stock balance for all products as of a specific date
    """
    try:
        # Get all unique products that have stock movements up to the balance date
        products_with_movements = frappe.db.sql(
            """
            SELECT DISTINCT product
            FROM `tabStock Ledger Entry`
            WHERE date <= %(balance_date)s
        """,
            {"balance_date": f"{balance_date} 23:59:59"},
            as_dict=True,
        )

        consolidated_data = []

        for product_row in products_with_movements:
            product = product_row.get("product")

            # Calculate balance quantity from Stock Ledger Entry up to the balance date
            balance_quantity = calculate_product_balance_as_of_date(
                product, balance_date
            )

            # Only include products with non-zero balance
            if balance_quantity != 0:
                # Get current rate from Product doctype
                product_rate = frappe.db.get_value("Product", product, "rate") or 0

                # Get warehouse sections where this product currently has stock
                warehouse_sections = get_product_warehouse_sections(
                    product, balance_date
                )

                consolidated_data.append(
                    {
                        "product": product,
                        "total_quantity": balance_quantity,
                        "warehouse_sections": (
                            ", ".join(warehouse_sections) if warehouse_sections else "-"
                        ),
                        "current_rate": float(product_rate),
                        "total_value": balance_quantity * float(product_rate),
                    }
                )

        # Sort by product name
        consolidated_data.sort(key=lambda x: x["product"])

        return consolidated_data

    except Exception as e:
        frappe.log_error(f"Error getting consolidated stock balance: {str(e)}")
        return []


def calculate_product_balance_as_of_date(product, balance_date):
    """
    Calculate product balance as of a specific date using Stock Ledger Entry
    """
    try:
        ledger_entries = frappe.db.sql(
            """
            SELECT SUM(quantity_in) as total_quantity
            FROM `tabStock Ledger Entry`
            WHERE product = %(product)s
            AND date <= %(balance_date)s
        """,
            {"product": product, "balance_date": f"{balance_date} 23:59:59"},
            as_dict=True,
        )

        return (
            float(ledger_entries[0].get("total_quantity") or 0) if ledger_entries else 0
        )

    except Exception as e:
        frappe.log_error(f"Error calculating product balance as of date: {str(e)}")
        return 0


def get_product_warehouse_sections(product, balance_date):
    """
    Get warehouse sections where a product has stock based on current Warehouse Product Stock
    This is a simplified approach - in reality, you might need to reconstruct
    warehouse section balances from Stock Ledger Entry if sections are tracked there
    """
    try:
        # Get current warehouse sections with stock for this product
        # Note: This gives current sections, not historical sections as of the balance date
        sections = frappe.db.sql(
            """
            SELECT warehouse_section
            FROM `tabWarehouse Product Stock`
            WHERE product = %(product)s
            AND quantity > 0
        """,
            {"product": product},
            as_dict=True,
        )

        return [
            section.get("warehouse_section")
            for section in sections
            if section.get("warehouse_section")
        ]

    except Exception as e:
        frappe.log_error(f"Error getting product warehouse sections: {str(e)}")
        return []
