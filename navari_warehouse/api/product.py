import frappe
from frappe.utils.file_manager import save_file
from frappe import _


@frappe.whitelist(allow_guest=True)
@frappe.csrf_exempt
def guest_upload_file():
    print("Request method:", frappe.request.method)
    print("Request files:", frappe.request.files)

    if "file" not in frappe.request.files:
        frappe.throw(_("No file uploaded"))

    file = frappe.request.files["file"]
    print("Filename:", file.filename)

    filename = file.filename
    content = file.read()
    saved_file = save_file(filename, content, None, is_private=0)

    print("Saved file URL:", saved_file.file_url)

    return {"file_url": saved_file.file_url}
