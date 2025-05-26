# Copyright (c) 2025, Levin Oyugi and contributors
# For license information, please see license.txt

import frappe
import secrets
from frappe.website.website_generator import WebsiteGenerator


class Product(WebsiteGenerator):
    def before_insert(self):
        if not self.product_code:
            self.product_code = self.generate_unique_product_code()

    def generate_unique_product_code(self):
        while True:
            hex_code = secrets.token_hex(4).upper()

            if not frappe.db.exists("Product", {"product_code": hex_code}):
                return hex_code
