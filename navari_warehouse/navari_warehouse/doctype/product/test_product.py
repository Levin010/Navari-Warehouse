import frappe
from frappe.tests.utils import FrappeTestCase


class TestProduct(FrappeTestCase):
    def test_product_creation_generates_code(self):
        product = frappe.get_doc(
            {
                "doctype": "Product",
                "product_name": "Test Widget",
                "product_type": "Gadget",
                "rate": 99.99,
                "description": "Test product for unit testing",
            }
        )
        product.insert()

        self.assertIsNotNone(product.product_code)
        self.assertEqual(len(product.product_code), 8)

    def test_generated_product_code_is_unique(self):
        p1 = frappe.get_doc(
            {
                "doctype": "Product",
                "product_name": "Product One",
                "product_type": "Type A",
                "rate": 50.0,
                "description": "First product",
            }
        ).insert()

        p2 = frappe.get_doc(
            {
                "doctype": "Product",
                "product_name": "Product Two",
                "product_type": "Type B",
                "rate": 60.0,
                "description": "Second product",
            }
        ).insert()

        self.assertNotEqual(p1.product_code, p2.product_code)

    def tearDown(self):
        for name in frappe.get_all(
            "Product",
            filters={
                "product_name": ["in", ["Test Widget", "Product One", "Product Two"]]
            },
        ):
            frappe.delete_doc("Product", name.name, force=True)
