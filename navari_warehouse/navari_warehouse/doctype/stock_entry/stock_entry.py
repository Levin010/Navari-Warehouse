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

    def before_save(self):
        self.validate_products()
        self.calculate_totals()

    def generate_unique_entry_code(self):
        while True:
            hex_code = secrets.token_hex(4).upper()

            if not frappe.db.exists("Stock Entry", {"entry_code": hex_code}):
                return hex_code

    def validate_products(self):

        if not self.product:
            frappe.throw(_("Please add at least one product to the Stock Entry"))

        for product in self.product:
            if not product.product:
                frappe.throw(_("Product is required in row {0}").format(product.idx))
            if flt(product.quantity) <= 0:
                frappe.throw(
                    _("Quantity must be greater than 0 in row {0}").format(product.idx)
                )

    def calculate_totals(self):

        total_quantity = 0
        total_amount = 0

        for product in self.product:

            product_doc = frappe.get_doc("Product", product.product)
            rate = flt(product_doc.rate) if product_doc.rate else 0

            product.amount = flt(product.quantity) * rate

            total_quantity += flt(product.quantity)
            total_amount += flt(product.amount)

        self.total_quantity = total_quantity
        self.total_amount = total_amount
