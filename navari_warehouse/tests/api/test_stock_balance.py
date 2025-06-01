import frappe
import unittest
from navari_warehouse.www.api import stock_balance


class TestStockBalanceAPI(unittest.TestCase):
    def setUp(self):
        self.product = frappe.get_doc(
            {
                "doctype": "Product",
                "product_name": "Test Product",
                "product_type": "Item",
                "rate": 50,
            }
        ).insert()

        self.sle1 = frappe.get_doc(
            {
                "doctype": "Stock Ledger Entry",
                "product": self.product.name,
                "transaction_type": "Receipt",
                "quantity_in": 4,
                "date": "2025-05-31 10:00:00",
                "rate": 50,
            }
        ).insert()

        self.sle2 = frappe.get_doc(
            {
                "doctype": "Stock Ledger Entry",
                "product": self.product.name,
                "transaction_type": "Receipt",
                "quantity_in": 6,
                "date": "2025-06-01 15:00:00",
                "rate": 50,
            }
        ).insert()

        self.wps1 = frappe.get_doc(
            {
                "doctype": "Warehouse Product Stock",
                "warehouse_section": "Main Warehouse",
                "product": self.product.name,
                "quantity": 7,
            }
        ).insert()

    def tearDown(self):
        frappe.delete_doc("Warehouse Product Stock", self.wps1.name)
        frappe.delete_doc("Stock Ledger Entry", self.sle2.name)
        frappe.delete_doc("Stock Ledger Entry", self.sle1.name)
        frappe.delete_doc("Product", self.product.name)

    def test_get_product_balance_at_time(self):
        result = stock_balance.get_product_balance_at_time(
            product=self.product.name,
            transaction_date="2025-05-31",
            creation_time="23:59:59",
        )
        self.assertEqual(result["balance_quantity"], 4)
        self.assertEqual(result["product"], self.product.name)

        result = stock_balance.get_product_balance_at_time(
            product=self.product.name,
            transaction_date="2025-06-01",
            creation_time="23:59:59",
        )
        self.assertEqual(result["balance_quantity"], 10)

    def test_get_current_product_balance(self):
        result = stock_balance.get_current_product_balance(self.product.name)
        self.assertEqual(result["balance_quantity"], 7)
        self.assertEqual(result["product"], self.product.name)

    def test_calculate_product_balance_as_of_date(self):
        balance = stock_balance.calculate_product_balance_as_of_date(
            self.product.name, "2025-06-01"
        )
        self.assertEqual(balance, 10)

        balance = stock_balance.calculate_product_balance_as_of_date(
            self.product.name, "2025-05-31"
        )
        self.assertEqual(balance, 4)

    def test_get_product_warehouse_sections(self):
        sections = stock_balance.get_product_warehouse_sections(
            self.product.name, "2025-06-01"
        )
        self.assertIn("Main Warehouse", sections)

    def test_get_consolidated_stock_balance(self):
        results = stock_balance.get_consolidated_stock_balance("2025-06-01")

        entry = next((e for e in results if e["product"] == self.product.name), None)
        self.assertIsNotNone(entry)
        self.assertEqual(entry["total_quantity"], 10)
        self.assertEqual(entry["current_rate"], 50)
        self.assertEqual(entry["total_value"], 10 * 50)
        self.assertIn("Main Warehouse", entry["warehouse_sections"])
