import frappe


@frappe.whitelist(allow_guest=True)
def get_api_token():
    import os

    token = os.environ.get("FRAPPE_API_TOKEN") or frappe.conf.get("api_token")

    if not token:
        frappe.throw("API token not configured")

    return token
