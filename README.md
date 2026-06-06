# VendorBridge

A procurement and vendor management platform built for small-to-mid-sized businesses that need structure in their purchasing workflows without the overhead of a full enterprise ERP.

## What it does

VendorBridge handles the complete procurement cycle from start to finish:

- **Vendor management** — onboard vendors, track their GST/PAN details, ratings, and contact info
- **RFQ creation** — raise requests for quotations and send them to selected vendors
- **Quotation comparison** — view all vendor quotes side by side and pick the best one
- **Approval workflow** — selected quotations go to a manager for approval before any PO is raised
- **Purchase orders** — auto-generated once approval is granted, with full GST breakdown
- **Invoicing** — generate and track invoices against delivered POs
- **Vendor portal** — vendors get their own login to view RFQs, submit quotes, and track their orders
- **Reports** — spending trends, vendor performance, RFQ analytics with live charts

## Roles

| Role | Access |
|------|--------|
| Admin | Full access to everything |
| Procurement Officer | Creates RFQs, compares quotes, generates invoices |
| Manager | Reviews and approves procurement requests |
| Vendor | Views their own RFQs, submits quotations, tracks orders |

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@vendorbridge.com | admin123 |
| Officer | officer@vendorbridge.com | officer123 |
| Vendor | vendor@vendorbridge.com | vendor123 |
| Manager | manager@vendorbridge.com | manager123 |

## Tech Stack

Built as a single-page application using React 18 (via Babel CDN) with no backend. All data lives in localStorage so nothing is lost on refresh.

- React 18 with hooks
- Chart.js for analytics
- Pure CSS with CSS variables
- Vercel for hosting

## Live Demo

[vendorbridge-ten.vercel.app](https://vendorbridge-ten.vercel.app)

## Running locally

Just open `index.html` in a browser, or serve it with any static file server:

```
npx serve .
```
