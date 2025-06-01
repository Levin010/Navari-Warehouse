### X Electronics Warehouse Management

---

## 🛠️ Tech Stack

- **Backend:** Frappe Framework
- **Frontend:** Inline CSS, jQuery
- **Database:** MariaDB

---

## 📸 Screenshots

### Dashboard

![Image](https://github.com/user-attachments/assets/6c0a5ea9-32d9-4219-b351-a726f3cd1353)

### Create Stock Entry

![Image](https://github.com/user-attachments/assets/cef22604-1487-4164-9435-f4f6c0b457c4)

### Stock Ledger Entry

![Image](https://github.com/user-attachments/assets/509180c8-359e-4809-90a7-2ff38d72f0af)

### Product Listing

![Image](https://github.com/user-attachments/assets/be87f395-93e1-47d7-9903-9e98c4901404)

### Create New Product

![Image](https://github.com/user-attachments/assets/758302c6-69a4-46b1-9940-3c32ef100261)

### View Individual Product (Edit + Delete modal windows)

![Image](https://github.com/user-attachments/assets/f6032f67-1f9e-45a8-9ef6-541c2604f815)

### Reports Section

![Image](https://github.com/user-attachments/assets/dabee661-35b8-4646-811f-a5b609d929d1)

### Stock Ledger Report (with moving inventory and moving valuation rate of each product, as well as product and date filters)

![Image](https://github.com/user-attachments/assets/7f8423b8-523c-49e0-836d-8e72c4929e89)

### Stock Balance Report (with current inventory of each product and total value, as well as a date filter)

![Image](https://github.com/user-attachments/assets/c16f773a-0a99-41f3-9360-fd0b88ffcec9)

### Exported PDFs of reports

![Image](https://github.com/user-attachments/assets/77361776-f24b-4312-9352-4d10ea0b1545)

![Image](https://github.com/user-attachments/assets/83692620-e568-405f-bd4f-13d5ebded217)


### Installation

You can install this app using the [bench](https://github.com/frappe/bench) CLI:

```bash
cd $PATH_TO_YOUR_BENCH
bench get-app $URL_OF_THIS_REPO --branch main
bench install-app navari_warehouse
```

### Contributing

This app uses `pre-commit` for code formatting and linting. Please [install pre-commit](https://pre-commit.com/#installation) and enable it for this repository:

```bash
cd apps/navari_warehouse
pre-commit install
```

Pre-commit is configured to use the following tools for checking and formatting your code:

- ruff
- eslint
- prettier
- pyupgrade
### CI

This app can use GitHub Actions for CI. The following workflows are configured:

- CI: Installs this app and runs unit tests on every push to `develop` branch.
- Linters: Runs [Frappe Semgrep Rules](https://github.com/frappe/semgrep-rules) and [pip-audit](https://pypi.org/project/pip-audit/) on every pull request.


### License

mit
