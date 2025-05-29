# Copyright (c) 2025, Levin Oyugi and contributors
# For license information, please see license.txt

import frappe
import secrets
from frappe import _
from frappe.website.website_generator import WebsiteGenerator
from frappe.utils import now_datetime, flt


class StockEntry(WebsiteGenerator):
    def before_insert(self):
        if not self.entry_code:
            self.entry_code = self.generate_unique_entry_code()
        if not self.entry_date:
            self.entry_date = now_datetime()
        self.set_total_amount()

    def before_save(self):
        self.set_total_amount()
        if self.is_new():
            self.create_stock_ledger_entry()
        self.update_warehouse_product_stock()

    def generate_unique_entry_code(self):
        while True:
            hex_code = secrets.token_hex(4).upper()
            if not frappe.db.exists("Stock Entry", {"entry_code": hex_code}):
                return hex_code

    def set_total_amount(self):
        if self.product and self.quantity:
            rate = frappe.db.get_value("Product", self.product, "rate") or 0
            self.total_amount = flt(rate) * flt(self.quantity)
        else:
            self.total_amount = 0

    def create_stock_ledger_entry(self):

        rate = frappe.db.get_value("Product", self.product, "rate") or 0

        if self.stock_entry_type == "Receipt":
            quantity = f"+{self.quantity}"
        elif self.stock_entry_type == "Consume":
            quantity = f"-{self.quantity}"
        elif self.stock_entry_type == "Transfer":
            quantity = "0"
        else:
            quantity = str(self.quantity)

        sle = frappe.get_doc(
            {
                "doctype": "Stock Ledger Entry",
                "product": self.product,
                "transaction_type": self.stock_entry_type,
                "from_section": self.from_section,
                "to_section": self.to_section,
                "quantity_in": quantity,
                "rate": rate,
                "date": now_datetime(),
                "reference_doctype": "Stock Entry",
                "reference_name": self.name,
            }
        )

        sle.insert(ignore_permissions=True)

    def update_warehouse_product_stock(self):

        qty = flt(self.quantity)

        if self.stock_entry_type in ["Consume", "Transfer"]:
            if self.from_section:
                stock = frappe.get_value(
                    "Warehouse Product Stock",
                    {"warehouse_section": self.from_section, "product": self.product},
                    ["name", "quantity"],
                    as_dict=True,
                )
                if not stock:
                    frappe.throw(
                        _("Product not available in the selected From Section")
                    )

                if qty > flt(stock.quantity):
                    frappe.throw(
                        _(
                            "Not enough stock in '{0}' for product '{1}'. Available: {2}, Requested: {3}"
                        ).format(self.from_section, self.product, stock.quantity, qty)
                    )

                doc = frappe.get_doc("Warehouse Product Stock", stock.name)
                doc.quantity = flt(stock.quantity) - qty
                doc.save(ignore_permissions=True)

        if self.stock_entry_type in ["Receipt", "Transfer"]:
            if self.to_section:
                stock = frappe.get_value(
                    "Warehouse Product Stock",
                    {"warehouse_section": self.to_section, "product": self.product},
                    ["name", "quantity"],
                    as_dict=True,
                )
                if stock:
                    doc = frappe.get_doc("Warehouse Product Stock", stock.name)
                    doc.quantity += qty
                    doc.save(ignore_permissions=True)
                else:
                    frappe.get_doc(
                        {
                            "doctype": "Warehouse Product Stock",
                            "warehouse_section": self.to_section,
                            "product": self.product,
                            "quantity": qty,
                        }
                    ).insert(ignore_permissions=True)
