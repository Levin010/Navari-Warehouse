# api/moving_average.py
import frappe
from frappe import _


@frappe.whitelist()
def get_moving_average_valuation(product, entry_name):
    """
    Calculate moving average valuation for a product up to and including a specific entry

    Args:
        product (str): Product name
        entry_name (str): Name of the current Stock Ledger Entry

    Returns:
        dict: Contains moving_average_rate, total_value, total_quantity
    """
    try:
        # Get the current entry's creation timestamp
        current_entry = frappe.db.get_value(
            "Stock Ledger Entry", entry_name, ["creation"], as_dict=True
        )

        if not current_entry:
            return {
                "moving_average_rate": 0,
                "total_value": 0,
                "total_quantity": 0,
                "error": "Entry not found",
            }

        # SQL query to calculate moving average valuation
        # Include all entries up to and including the current entry (by creation time)
        sql_query = """
            SELECT 
                COALESCE(SUM(quantity_in * rate), 0) as total_value,
                COALESCE(SUM(quantity_in), 0) as total_quantity
            FROM `tabStock Ledger Entry`
            WHERE 
                product = %(product)s 
                AND creation <= %(creation)s
                AND quantity_in > 0
                AND rate > 0
            ORDER BY creation ASC
        """

        result = frappe.db.sql(
            sql_query,
            {"product": product, "creation": current_entry.creation},
            as_dict=True,
        )

        if not result or len(result) == 0:
            return {"moving_average_rate": 0, "total_value": 0, "total_quantity": 0}

        data = result[0]
        total_value = float(data.get("total_value", 0))
        total_quantity = float(data.get("total_quantity", 0))

        # Calculate moving average rate
        moving_average_rate = 0
        if total_quantity > 0:
            moving_average_rate = total_value / total_quantity

        return {
            "moving_average_rate": round(moving_average_rate, 4),
            "total_value": round(total_value, 2),
            "total_quantity": round(total_quantity, 2),
        }

    except Exception as e:
        frappe.log_error(f"Error calculating moving average valuation: {str(e)}")
        return {
            "moving_average_rate": 0,
            "total_value": 0,
            "total_quantity": 0,
            "error": str(e),
        }
