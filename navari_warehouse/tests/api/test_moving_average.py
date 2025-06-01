# navari_warehouse/tests/api/test_get_moving_average.py

import frappe
from frappe.tests.utils import FrappeTestCase
from navari_warehouse.www.api.moving_average import get_moving_average_valuation


class TestGetMovingAverageValuation(FrappeTestCase):
    def setUp(self):
        self.product = frappe.get_doc(
            {
                "doctype": "Product",
                "product_name": "Test Product",
                "product_type": "Item",
                "rate": 100,
            }
        ).insert()

        self.entry_1 = frappe.get_doc(
            {
                "doctype": "Stock Ledger Entry",
                "product": self.product.name,
                "transaction_type": "Receipt",
                "from_section": "",
                "to_section": "Shelf A11",
                "quantity_in": "4",
                "rate": 50,
                "reference_doctype": "Test Entry",
                "reference_name": "ENTRY-1",
            }
        ).insert()

        self.entry_2 = frappe.get_doc(
            {
                "doctype": "Stock Ledger Entry",
                "product": self.product.name,
                "transaction_type": "Receipt",
                "from_section": "",
                "to_section": "Shelf A12",
                "quantity_in": "6",
                "rate": 70,
                "reference_doctype": "Test Entry",
                "reference_name": "ENTRY-2",
            }
        ).insert()

    def test_valid_moving_average(self):
        result = get_moving_average_valuation(
            product=self.product.name, entry_name=self.entry_2.name
        )

        self.assertEqual(result["total_quantity"], 10.0)
        self.assertEqual(result["total_value"], 620.0)
        self.assertAlmostEqual(result["moving_average_rate"], 62.0, places=4)

    def test_entry_not_found(self):
        result = get_moving_average_valuation(
            product=self.product.name, entry_name="nonexistent-entry"
        )

        self.assertEqual(result["moving_average_rate"], 0)
        self.assertEqual(result["error"], "Entry not found")

    def tearDown(self):
        frappe.delete_doc("Product", self.product.name, force=1)
        frappe.delete_doc("Stock Ledger Entry", self.entry_1.name, force=1)
        frappe.delete_doc("Stock Ledger Entry", self.entry_2.name, force=1)
