import frappe
from frappe import _


@frappe.whitelist(allow_guest=True)
def get_products(search=None):
    filters = {}
    if search:
        filters["product_name"] = ["like", f"%{search}%"]

    products = frappe.get_all(
        "Product",
        filters=filters,
        fields=["name", "product_name", "description"],
        order_by="creation desc",
    )
    return products
