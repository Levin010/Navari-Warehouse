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

        sle = frappe.get_doc(
            {
                "doctype": "Stock Ledger Entry",
                "product": self.product,
                "warehouse_section": self.to_section,
                "quantity": self.quantity,
                "rate": rate,
                "date": now_datetime(),
                "reference_doctype": "Stock Entry",
                "reference_name": self.name,
            }
        )

        sle.insert(ignore_permissions=True)
