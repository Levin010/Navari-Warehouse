import frappe
from frappe.tests.utils import FrappeTestCase


class TestStockEntry(FrappeTestCase):
    def setUp(self):
        self.product = frappe.get_doc(
            {
                "doctype": "Product",
                "product_name": "Test Widget",
                "product_type": "Gadget",
                "rate": 100.0,
                "description": "Test product",
            }
        ).insert()

        self.from_section = "Section A"
        self.to_section = "Section B"

        frappe.get_doc(
            {
                "doctype": "Warehouse Product Stock",
                "warehouse_section": self.from_section,
                "product": self.product.name,
                "quantity": 50,
            }
        ).insert()

    def test_stock_entry_receipt_creates_ledger_and_stock(self):
        doc = frappe.get_doc(
            {
                "doctype": "Stock Entry",
                "stock_entry_type": "Receipt",
                "product": self.product.name,
                "quantity": 10,
                "to_section": self.to_section,
            }
        ).insert()

        self.assertIsNotNone(doc.entry_code)
        self.assertGreater(doc.total_amount, 0)

        sle = frappe.get_all("Stock Ledger Entry", filters={"reference_name": doc.name})
        self.assertTrue(sle)

        updated_stock = frappe.get_value(
            "Warehouse Product Stock",
            {"warehouse_section": self.to_section, "product": self.product.name},
            "quantity",
        )
        self.assertEqual(float(updated_stock), 10)

    def test_stock_entry_consume_reduces_from_section_stock(self):
        doc = frappe.get_doc(
            {
                "doctype": "Stock Entry",
                "stock_entry_type": "Consume",
                "product": self.product.name,
                "quantity": 20,
                "from_section": self.from_section,
            }
        ).insert()

        remaining = frappe.get_value(
            "Warehouse Product Stock",
            {"warehouse_section": self.from_section, "product": self.product.name},
            "quantity",
        )
        self.assertEqual(float(remaining), 30)

    def test_consume_more_than_available_throws_error(self):
        with self.assertRaises(frappe.ValidationError):
            frappe.get_doc(
                {
                    "doctype": "Stock Entry",
                    "stock_entry_type": "Consume",
                    "product": self.product.name,
                    "quantity": 1000,
                    "from_section": self.from_section,
                }
            ).insert()

    def tearDown(self):
        for dt in [
            "Stock Ledger Entry",
            "Stock Entry",
            "Warehouse Product Stock",
            "Product",
        ]:
            docs = frappe.get_all(
                dt,
                filters=(
                    {"product": self.product.name}
                    if "product" in frappe.get_meta(dt).fields_map
                    else {}
                ),
            )
            for d in docs:
                frappe.delete_doc(dt, d.name, force=True)
