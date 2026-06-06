# VendorBridge — Data Models

## User
```json
{
  "id": "u1",
  "name": "Arjun Mehta",
  "email": "admin@vendorbridge.com",
  "role": "admin",
  "vendorId": null,
  "createdAt": "2026-01-01T00:00:00Z"
}
```

## Vendor
```json
{
  "id": "v1",
  "name": "TechSolutions Pvt Ltd",
  "contact": "Ravi Kumar",
  "email": "vendor@techsolutions.com",
  "phone": "9876543210",
  "gstin": "27AAPCS1234A1Z5",
  "pan": "AAPCS1234A",
  "category": "IT",
  "status": "Active",
  "rating": 4.2,
  "createdAt": "2026-01-15T00:00:00Z"
}
```

## RFQ (Request for Quotation)
```json
{
  "id": "rfq-2026-0001",
  "title": "Office Laptops Q1",
  "description": "15 units Dell/HP laptops",
  "items": [
    { "id": "i1", "name": "Laptop 15 inch", "qty": 15, "unit": "pcs", "estimatedPrice": 55000 }
  ],
  "vendorIds": ["v1", "v2"],
  "deadline": "2026-02-28",
  "status": "Open",
  "createdBy": "u2",
  "createdAt": "2026-02-01T00:00:00Z"
}
```

## Quotation
```json
{
  "id": "q1",
  "rfqId": "rfq-2026-0001",
  "vendorId": "v1",
  "items": [
    { "itemId": "i1", "unitPrice": 52000, "qty": 15, "gst": 18 }
  ],
  "totalAmount": 614250,
  "deliveryDays": 7,
  "notes": "Includes 1 year warranty",
  "status": "Submitted",
  "submittedAt": "2026-02-10T00:00:00Z"
}
```

## Approval
```json
{
  "id": "apr1",
  "rfqId": "rfq-2026-0001",
  "quotationId": "q1",
  "vendorId": "v1",
  "requestedBy": "u2",
  "managerId": "u4",
  "status": "Pending",
  "remarks": "",
  "createdAt": "2026-02-11T00:00:00Z"
}
```

## Purchase Order
```json
{
  "id": "po-2026-0001",
  "rfqId": "rfq-2026-0001",
  "quotationId": "q1",
  "vendorId": "v1",
  "approvalId": "apr1",
  "items": [
    { "name": "Laptop 15 inch", "qty": 15, "unitPrice": 52000, "gst": 18, "total": 614250 }
  ],
  "subtotal": 520000,
  "taxAmount": 94250,
  "totalAmount": 614250,
  "status": "Pending",
  "createdAt": "2026-02-12T00:00:00Z"
}
```

## Invoice
```json
{
  "id": "inv-2026-0001",
  "poId": "po-2026-0001",
  "vendorId": "v1",
  "invoiceNumber": "INV-TPS-001",
  "amount": 614250,
  "cgst": 47125,
  "sgst": 47125,
  "status": "Unpaid",
  "dueDate": "2026-03-12",
  "issuedAt": "2026-02-20T00:00:00Z"
}
```
