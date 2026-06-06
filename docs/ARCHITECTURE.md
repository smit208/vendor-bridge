# VendorBridge — Architecture

## Overview

VendorBridge is built as a single-page React application delivered via one HTML file. All React components, state management, styles and business logic are bundled in `index.html` using Babel standalone — no build step required.

## Why single-file?

For a procurement tool used internally, this approach means:
- Zero deployment complexity — just serve the HTML file
- No backend dependency — state persists in localStorage  
- Works offline once loaded
- Easy to fork, copy and customise

## Component Tree

```
App
├── LoginScreen
│   ├── SignIn form
│   └── SignUp form (vendor self-registration)
└── Layout
    ├── Sidebar (role-based nav)
    ├── Header (notifications, profile)
    └── Page (rendered based on currentPage)
        ├── Dashboard
        ├── VendorManagement
        ├── RFQManagement
        ├── QuotationComparison
        ├── ApprovalsScreen
        ├── PurchaseOrders
        ├── InvoiceManagement
        ├── ActivityLogs
        ├── ReportsAnalytics
        ├── UserManagement
        ├── VendorRFQList       (vendor role)
        ├── MyQuotations        (vendor role)
        ├── VendorPOs           (vendor role)
        └── VendorInvoices      (vendor role)
```

## State Management

Global state lives in `AppProvider` using `useReducer`. The full state tree is saved to `localStorage` on every change via a single `useEffect`.

```
state = {
  users        []     registered accounts
  vendors      []     vendor company records
  rfqs         []     requests for quotation
  quotations   []     submitted vendor quotes
  approvals    []     manager approval requests
  pos          []     purchase orders
  invoices     []     vendor invoices
  logs         []     audit trail events
  notifications []    per-user notification inbox
}
```

## Roles and Access

| Role | Description |
|------|-------------|
| admin | Full system access |
| officer | Creates RFQs, compares quotes, manages POs and invoices |
| manager | Reviews and approves procurement requests |
| vendor | Self-service portal — view RFQs, submit quotes, track orders |

## Procurement Workflow

```
Officer creates RFQ
    → RFQ sent to selected vendors
    → Vendors submit quotations
    → Officer compares quotes side by side
    → Officer selects best quote → sends for manager approval
    → Manager approves → PO auto-generated
    → Vendor delivers → Officer records receipt
    → Invoice raised → Payment tracked
```
