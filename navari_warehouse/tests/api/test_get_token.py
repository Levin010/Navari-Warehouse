import os
import frappe
from frappe.tests.utils import FrappeTestCase
from frappe import whitelist


class TestGetApiToken(FrappeTestCase):
    def test_returns_token_from_env(self):
        os.environ["FRAPPE_API_TOKEN"] = "test-env-token"
        from navari_warehouse.www.api.get_token import get_api_token

        token = get_api_token()
        self.assertEqual(token, "test-env-token")
        del os.environ["FRAPPE_API_TOKEN"]

    def test_returns_token_from_site_config(self):
        frappe.conf.api_token = "test-config-token"
        from navari_warehouse.www.api.get_token import get_api_token

        token = get_api_token()
        self.assertEqual(token, "test-config-token")
        del frappe.conf.api_token

    def test_throws_error_if_token_missing(self):
        if "FRAPPE_API_TOKEN" in os.environ:
            del os.environ["FRAPPE_API_TOKEN"]
        if hasattr(frappe.conf, "api_token"):
            del frappe.conf.api_token

        from navari_warehouse.www.api.get_token import get_api_token

        with self.assertRaises(frappe.ValidationError):
            get_api_token()
