# ElectraKart RESTful API Contracts & Backend Integration Specification

**API Version:** `v1`  
**Base URL:** `https://api.electrakart.com/api/v1` (Staging: `https://staging-api.electrakart.com/api/v1`)  
**Specification:** OpenAPI 3.1.0 / RFC 7807 (Problem Details for HTTP APIs)  
**Security Scheme:** HTTP Bearer JWT with Role-Based Access Control (RBAC)  
**Standard Headers:**
- `Content-Type: application/json`
- `Authorization: Bearer <JWT_TOKEN>`
- `X-Request-ID: <UUIDv4>`
- `X-Client-City: <city-id>` (e.g. `vijayawada`)
- `X-Client-Pincode: <pincode>` (e.g. `520002`)

---

## 1. Global Architectural & Security Policies

1. **Role-Based Access Control (RBAC):**
   Every endpoint declares the required role: `CUSTOMER`, `RETAILER`, `DISTRIBUTOR`, or `ADMIN`.
2. **Zero Financial Leakage Policy:**
   Customer-facing endpoints (`/catalog/*`, `/search`, `/quotations/*`, `/orders/*`) strictly exclude `purchaseCostINR`, `minPlatformMarginPercent`, `commissionRatePercent`, and internal trade formulas.
3. **Standard RFC 7807 Error Schema:**
   All non-2xx responses conform to RFC 7807 Problem Details:
   ```json
   {
     "type": "https://api.electrakart.com/errors/insufficient-stock",
     "title": "Insufficient Hyperlocal Stock",
     "status": 409,
     "detail": "Requested 5 coils of POL-WX-25-RED-90M; only 3 coils available within 10 km.",
     "instance": "/api/v1/cart/items/POL-WX-25-RED-90M",
     "timestamp": "2026-09-19T14:32:00.120Z",
     "errorCode": "ERR_INSUFFICIENT_STOCK",
     "invalidParams": [
       { "name": "quantity", "reason": "Exceeds available local inventory limit" }
     ]
   }
   ```
4. **Idempotency Standard:**
   State-mutating endpoints (`POST /orders`, `POST /quotations/lock`, `POST /payments/verify`) require an `Idempotency-Key: <UUID>` header to prevent duplicate charges or split-order duplication.

---

## 2. Authentication & Session Services (`/api/v1/auth`)

### 2.1 OTP Request
`POST /api/v1/auth/otp/request`  
*Access:* Public

**Request:**
```json
{
  "phoneNumber": "+919848199882",
  "role": "CUSTOMER"
}
```

**Response (`200 OK`):**
```json
{
  "status": "SUCCESS",
  "message": "6-digit OTP sent via SMS to +91 98481 99882",
  "retryAfterSeconds": 30,
  "requestId": "otp-req-9988"
}
```

### 2.2 OTP Verify & Login
`POST /api/v1/auth/otp/verify`  
*Access:* Public

**Request:**
```json
{
  "phoneNumber": "+919848199882",
  "otp": "4821",
  "requestedRole": "CUSTOMER"
}
```

**Response (`200 OK`):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "d7b92019...",
  "tokenType": "Bearer",
  "expiresIn": 86400,
  "user": {
    "id": "usr-cust-001",
    "phoneNumber": "+919848199882",
    "fullName": "Anil Kumar Reddy",
    "role": "CUSTOMER",
    "city": "Vijayawada",
    "pincode": "520002",
    "tradeAccountType": "HOMEOWNER"
  }
}
```

---

## 3. Master Catalog & Hyperlocal Search (`/api/v1/catalog`, `/api/v1/search`)

### 3.1 Search Products with Nearby Availability
`GET /api/v1/search?query=polycab+2.5&city=vijayawada&pincode=520002&limit=20`  
*Access:* Public  
*Cache-Control:* `public, max-age=60, s-maxage=300`

**Response (`200 OK`):**
```json
{
  "total": 1,
  "page": 1,
  "limit": 20,
  "items": [
    {
      "id": "prod-pol-25-red",
      "sku": "POL-WX-25-RED-90M",
      "name": "Polycab FlameX FR 2.5 sq.mm Red (90m Coil)",
      "category": "Wires & Cables",
      "brand": "Polycab",
      "series": "FlameX FR",
      "unit": "Coil (90m)",
      "mrp": 3650,
      "sellingPrice": 3100,
      "gstPercent": 18,
      "isCertified": true,
      "certificationNumber": "IS 694 : 2010",
      "imageUrl": "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600",
      "rating": 4.9,
      "reviewCount": 128,
      "nearbyStoreCount": 2,
      "nearestStore": {
        "partnerId": "partner-vja-elec-1",
        "storeName": "Vijayawada Electricals & Hardware",
        "distanceKm": 2.5,
        "deliveryEtaMin": 45,
        "stockCount": 14,
        "price": 3100
      }
    }
  ]
}
```

### 3.2 Get Product By SKU with Store-by-Store Stock
`GET /api/v1/catalog/products/{sku}?city=vijayawada`  
*Access:* Public

**Response (`200 OK`):**
```json
{
  "id": "prod-pol-25-red",
  "sku": "POL-WX-25-RED-90M",
  "name": "Polycab FlameX FR 2.5 sq.mm Red (90m Coil)",
  "category": "Wires & Cables",
  "brand": "Polycab",
  "series": "FlameX FR",
  "configuration": "Single Core, Class 5 Flexible Bare Electrolytic Copper",
  "specification": "2.5 sq.mm, 1100V Grade Flame Retardant",
  "mrp": 3650,
  "sellingPrice": 3100,
  "gstPercent": 18,
  "hsnCode": "8544",
  "isCertified": true,
  "certificationNumber": "IS 694 : 2010",
  "warranty": "100% Genuine ISI Marked Manufacturer Guarantee",
  "specs": {
    "Conductor Material": "Electrolytic Grade Bare Copper",
    "Current Rating": "24 Amps (Conduit Installation)",
    "Voltage Rating": "1100 Volts AC",
    "Coil Length": "90 Metres with Anti-Theft Metre Marking",
    "Insulation": "Flame Retardant (FR) High Oxygen Index PVC",
    "Operating Temp": "-15°C to +70°C"
  },
  "nearbyStores": [
    {
      "partnerId": "partner-vja-elec-1",
      "storeName": "Vijayawada Electricals & Hardware",
      "partnerType": "RETAILER",
      "distanceKm": 2.5,
      "deliveryEtaMin": 45,
      "stockCount": 14,
      "price": 3100,
      "rating": 4.9,
      "address": "Shop 14, Besant Road, Governorpet, Vijayawada"
    },
    {
      "partnerId": "dist-abc-vja-hub",
      "storeName": "ABC Electrical Distributors Central Hub",
      "partnerType": "DISTRIBUTOR",
      "distanceKm": 8.2,
      "deliveryEtaMin": 90,
      "stockCount": 85,
      "price": 3050,
      "rating": 5.0,
      "address": "Plot 48, Auto Nagar Phase 2, Vijayawada"
    }
  ]
}
```

---

## 4. Hyperlocal Inventory & Allocation (`/api/v1/inventory`)

### 4.1 Retailer Inventory Listing
`GET /api/v1/inventory/partner-stock`  
*Access:* `RETAILER`, `DISTRIBUTOR`, `ADMIN`  
*Identity:* Inferred from `Bearer` JWT Claim `partner_id`

**Response (`200 OK`):**
```json
{
  "partnerId": "partner-vja-elec-1",
  "totalSkus": 142,
  "lowStockAlertCount": 3,
  "items": [
    {
      "id": "inv-1",
      "sku": "POL-WX-25-RED-90M",
      "productName": "Polycab FlameX FR 2.5 sq.mm Red (90m)",
      "brand": "Polycab",
      "inStock": 14,
      "reserved": 3,
      "available": 11,
      "lowStockThreshold": 5,
      "purchaseCostINR": 2720.00,
      "sellingPrice": 3100.00,
      "lastUpdated": "2026-09-19T14:15:00Z"
    }
  ]
}
```

### 4.2 Adjust Retailer Stock (Manual Cycle Count)
`PATCH /api/v1/inventory/partner-stock/{sku}`  
*Access:* `RETAILER`, `ADMIN`

**Request:**
```json
{
  "deltaQuantity": 5,
  "reason": "PHYSICAL_COUNT_ADJUSTMENT",
  "notes": "Verified new carton received from factory"
}
```

**Response (`200 OK`):**
```json
{
  "sku": "POL-WX-25-RED-90M",
  "previousQuantity": 14,
  "newQuantity": 19,
  "availableQuantity": 16,
  "updatedAt": "2026-09-19T15:45:00Z"
}
```

### 4.3 Bulk Inventory Inward (Tally / Excel CSV)
`POST /api/v1/inventory/bulk-inward`  
*Access:* `RETAILER`, `DISTRIBUTOR`

**Request:**
```json
{
  "items": [
    { "sku": "POL-WX-25-RED-90M", "inwardQuantity": 20, "purchasePrice": 2720, "sellingPrice": 3100 },
    { "sku": "ANC-ROM-6A1W-WHT", "inwardQuantity": 50, "purchasePrice": 380, "sellingPrice": 460 }
  ],
  "invoiceNumber": "INV-POL-98421",
  "invoiceDate": "2026-09-19"
}
```

**Response (`202 Accepted`):**
```json
{
  "batchId": "inw-batch-2026-09-001",
  "status": "PROCESSED",
  "processedItemsCount": 2,
  "unmatchedItemsCount": 0
}
```

---

## 5. Pricing & Trade Tier Engine (`/api/v1/pricing`)

### 5.1 Evaluate Dynamic Tiered Cart Pricing
`POST /api/v1/pricing/evaluate-cart`  
*Access:* Authenticated / Public (falls back to Retail tier)

**Request:**
```json
{
  "customerTier": "ELECTRICIAN_PRO",
  "city": "Vijayawada",
  "items": [
    { "sku": "POL-WX-25-RED-90M", "quantity": 3, "partnerId": "partner-vja-elec-1" },
    { "sku": "ANC-ROM-6A1W-WHT", "quantity": 2, "partnerId": "partner-vja-elec-1" }
  ]
}
```

**Response (`200 OK`):**
```json
{
  "subtotalINR": 10220.00,
  "tradeDiscountINR": 511.00,
  "discountPercent": 5.0,
  "deliveryFeeINR": 0.00,
  "gstTotalINR": 1747.62,
  "grandTotalINR": 11456.62,
  "tierApplied": "ELECTRICIAN_PRO",
  "breakdowns": [
    {
      "sku": "POL-WX-25-RED-90M",
      "mrp": 3650,
      "appliedRate": 3100,
      "quantity": 3,
      "lineTotal": 9300
    }
  ]
}
```

---

## 6. AI Estimates & Extraction Workflow (`/api/v1/estimates`)

### 6.1 Upload Estimate Document (Image / PDF / OCR)
`POST /api/v1/estimates/upload`  
*Access:* `CUSTOMER`, `ADMIN`  
*Header:* `Content-Type: multipart/form-data`

**Form Data:**
- `file`: (binary bill.jpg or boq.pdf)
- `city`: `Vijayawada`
- `pincode`: `520002`

**Response (`202 Accepted`):**
```json
{
  "estimateId": "est-88410",
  "status": "ANALYZING",
  "websocketSubscriptionChannel": "/ws/estimates/est-88410",
  "estimatedProcessingSeconds": 3
}
```

### 6.2 Get Analyzed Estimate Results & Disambiguation Items
`GET /api/v1/estimates/{estimateId}`  
*Access:* `CUSTOMER`, `ADMIN`

**Response (`200 OK`):**
```json
{
  "id": "est-88410",
  "status": "NEEDS_REVIEW",
  "totalItemsExtracted": 8,
  "items": [
    {
      "id": "ext-1",
      "rawLineText": "Polycab 2.5 sq mm red wire - 3 Coils",
      "quantity": 3,
      "unit": "Coil (90m)",
      "confidence": "HIGH",
      "matchedProduct": {
        "sku": "POL-WX-25-RED-90M",
        "name": "Polycab FlameX FR 2.5 sq.mm Red (90m Coil)",
        "sellingPrice": 3100
      }
    },
    {
      "id": "ext-3",
      "rawLineText": "Anchor 6-9 switch - 20 Nos",
      "quantity": 20,
      "unit": "Nos",
      "confidence": "NEEDS_REVIEW",
      "reason": "Series ambiguous: Contractor specified Anchor 6A switch, but did not specify modular Roma vs traditional Penta.",
      "possibleOptions": [
        {
          "brand": "Anchor",
          "series": "Roma Classic (Modular)",
          "matchedSku": "ANC-ROM-6A1W-WHT",
          "productName": "Anchor Roma Classic 6A 1-Way Modular Switch (Pack of 10)",
          "price": 460
        },
        {
          "brand": "Anchor",
          "series": "Penta (Traditional Piano)",
          "matchedSku": "ANC-PEN-6A1W-WHT",
          "productName": "Anchor Penta 6A 1-Way Piano Switch White (Box of 20)",
          "price": 420
        }
      ]
    }
  ]
}
```

### 6.3 Resolve Disambiguation Item
`POST /api/v1/estimates/{estimateId}/items/{itemId}/resolve`  
*Access:* `CUSTOMER`

**Request:**
```json
{
  "chosenSku": "ANC-ROM-6A1W-WHT",
  "quantity": 2,
  "unit": "Pack (10 Nos)"
}
```

**Response (`200 OK`):**
```json
{
  "itemId": "ext-3",
  "status": "RESOLVED",
  "matchedSku": "ANC-ROM-6A1W-WHT",
  "confidence": "HIGH"
}
```

---

## 7. Quotations & 48-Hour Price Lock (`/api/v1/quotations`)

### 7.1 Generate Official 48-Hour Locked Quotation
`POST /api/v1/quotations/generate`  
*Access:* `CUSTOMER`, `ADMIN`  
*Header:* `Idempotency-Key: <UUID>`

**Request:**
```json
{
  "estimateId": "est-88410",
  "customerName": "Anil Kumar Reddy",
  "customerPhone": "+91 98481 99882",
  "deliveryAddress": "Flat 301, Sri Sai Residency, Guru Nanak Colony, Vijayawada",
  "city": "Vijayawada",
  "pincode": "520008"
}
```

**Response (`201 Created`):**
```json
{
  "id": "quo-2026-8841",
  "quotationNumber": "EK-QUO-2026-8841",
  "createdAt": "2026-09-19T14:30:00Z",
  "validUntil": "2026-09-21T14:30:00Z",
  "isPriceLocked": true,
  "status": "LOCKED",
  "subtotal": 39550.00,
  "discount": 1500.00,
  "deliveryFee": 0.00,
  "gstTotal": 7119.00,
  "grandTotal": 45169.00,
  "downloadPdfUrl": "https://api.electrakart.com/api/v1/quotations/quo-2026-8841/download-pdf",
  "items": [
    {
      "sku": "POL-WX-25-RED-90M",
      "name": "Polycab FlameX FR 2.5 sq.mm Red (90m Coil)",
      "quantity": 3,
      "rate": 3100.00,
      "gstPercent": 18,
      "lineTotal": 9300.00
    }
  ]
}
```

### 7.2 Accept Quotation & Transfer to Cart
`POST /api/v1/quotations/{quotationNumber}/accept`  
*Access:* `CUSTOMER`

**Response (`200 OK`):**
```json
{
  "quotationNumber": "EK-QUO-2026-8841",
  "status": "ACCEPTED",
  "cartUpdated": true,
  "itemsLoadedCount": 8
}
```

---

## 8. Orders & Multi-Store Split Routing (`/api/v1/orders`)

### 8.1 Create Order & Execute Split Fulfillment
`POST /api/v1/orders`  
*Access:* `CUSTOMER`  
*Header:* `Idempotency-Key: <UUID>`

**Request:**
```json
{
  "customerName": "Anil Kumar Reddy",
  "customerPhone": "+91 98481 99882",
  "deliveryAddress": "Flat 301, Sri Sai Residency, Guru Nanak Colony, Vijayawada",
  "city": "Vijayawada",
  "pincode": "520008",
  "deliveryMethod": "EXPRESS",
  "paymentMethod": "UPI",
  "cart": [
    { "sku": "POL-WX-25-RED-90M", "quantity": 3, "partnerId": "partner-vja-elec-1" },
    { "sku": "ANC-ROM-6M-PLT-WHT", "quantity": 6, "partnerId": "partner-anchor-exclusive" },
    { "sku": "HAV-STL-1200-BLU", "quantity": 3, "partnerId": "dist-abc-vja-hub" }
  ]
}
```

**Response (`201 Created`):**
```json
{
  "id": "ord-10025",
  "orderNumber": "EK-10025",
  "createdAt": "2026-09-19 14:30",
  "customerName": "Anil Kumar Reddy",
  "customerPhone": "+91 98481 99882",
  "grandTotal": 45169.00,
  "paymentStatus": "PAID",
  "overallStatus": "PREPARING",
  "fulfillmentsCount": 3,
  "fulfillments": [
    {
      "id": "ful-10025-1",
      "fulfillmentIndex": 1,
      "partnerName": "Vijayawada Electricals & Hardware",
      "partnerType": "RETAILER",
      "status": "PACKED",
      "eta": "30–45 mins",
      "driverName": "K. Somesh (Dunzo/ElectraKart Express)",
      "driverPhone": "+91 99482 10928",
      "handoverOtp": "4821",
      "items": [
        { "sku": "POL-WX-25-RED-90M", "name": "Polycab FlameX FR 2.5 sq.mm Red (90m Coil)", "quantity": 3, "unitPrice": 3100 }
      ]
    },
    {
      "id": "ful-10025-2",
      "fulfillmentIndex": 2,
      "partnerName": "Sri Balaji Anchor World",
      "partnerType": "RETAILER",
      "status": "PREPARING",
      "eta": "45–60 mins",
      "driverName": "Awaiting Driver Allocation",
      "handoverOtp": "8914",
      "items": [
        { "sku": "ANC-ROM-6M-PLT-WHT", "name": "Anchor Roma Classic 6-Module Plate with Grid White", "quantity": 6, "unitPrice": 185 }
      ]
    },
    {
      "id": "ful-10025-3",
      "fulfillmentIndex": 3,
      "partnerName": "ABC Electrical Distributors Central Hub",
      "partnerType": "DISTRIBUTOR",
      "status": "PARTNER_ACCEPTED",
      "eta": "Same Day Evening (6:00 PM)",
      "driverName": "Regional Logistics Van (AP16-TE-8102)",
      "handoverOtp": "2230",
      "items": [
        { "sku": "HAV-STL-1200-BLU", "name": "Havells Stealth Air 1200mm Ceiling Fan Indigo Blue", "quantity": 3, "unitPrice": 7350 }
      ]
    }
  ]
}
```

### 8.2 Update Partner Fulfillment Status (Partner / Driver App)
`POST /api/v1/orders/{orderId}/fulfillments/{fulfillmentId}/status`  
*Access:* `RETAILER`, `DISTRIBUTOR`, `ADMIN`  
*Linear State Lifecycle:* `CONFIRMED` $\to$ `PREPARING` $\to$ `PACKED` $\to$ `DISPATCHED` $\to$ `DELIVERED`. Backward or illegal transitions return `400 Bad Request`. Handover at `DELIVERED` requires customer delivery OTP.

**Request:**
```json
{
  "status": "DISPATCHED",
  "driverName": "K. Somesh",
  "driverPhone": "+91 99482 10928",
  "note": "Package picked up and en route to Benz Circle customer address"
}
```

**Response (`200 OK`):**
```json
{
  "fulfillmentId": "ful-10025-1",
  "previousStatus": "PACKED",
  "currentStatus": "DISPATCHED",
  "lastUpdated": "2026-09-19T14:55:00Z"
}
```

---

## 9. Partner Network & Governance (`/api/v1/partners`)

### 9.1 Register New Partner (KYC Onboarding)
`POST /api/v1/partners/register`  
*Access:* Public / Retailer Onboarding

**Request:**
```json
{
  "businessName": "Krishna Power & Cables Mart",
  "ownerName": "Suresh Varma",
  "type": "RETAILER",
  "city": "Vijayawada",
  "state": "Andhra Pradesh",
  "pincode": "520010",
  "address": "Patamata Main Road, Vijayawada",
  "phone": "+91 97000 44321",
  "email": "krishnapower.vja@outlook.com",
  "gstin": "37EEEEE7890E1Z4",
  "pan": "EEEEE7890E",
  "bankAccount": "38192019283",
  "bankIfsc": "SBIN0004128",
  "brandsSold": ["Polycab", "RR Kabel", "KEI"]
}
```

**Response (`201 Created`):**
```json
{
  "partnerId": "partner-pending-1",
  "status": "PENDING",
  "message": "Partner onboarding submitted. Documents routed to ElectraKart compliance admin."
}
```

### 9.2 Update Partner Status & Take-Rate (Admin Only)
`PATCH /api/v1/partners/{partnerId}/governance`  
*Access:* `ADMIN`

**Request:**
```json
{
  "status": "VERIFIED",
  "commissionRatePercent": 5.5,
  "deliveryRadiusKm": 10.0
}
```

**Response (`200 OK`):**
```json
{
  "partnerId": "partner-pending-1",
  "status": "VERIFIED",
  "commissionRatePercent": 5.5,
  "deliveryRadiusKm": 10.0,
  "updatedAt": "2026-09-19T16:00:00Z"
}
```

---

## 10. Warehouses & Inter-Depot Logistics (`/api/v1/warehouses`)

### 10.1 Transfer Stock Between Distribution Hubs
`POST /api/v1/warehouses/transfer`  
*Access:* `DISTRIBUTOR`, `ADMIN`

**Request:**
```json
{
  "sourceWarehouseId": "wh-hyd-sanathnagar",
  "destinationWarehouseId": "wh-vja-autonagar",
  "sku": "HAV-STL-1200-BLU",
  "quantity": 50,
  "reason": "Replenish regional festival surge demand"
}
```

**Response (`200 OK`):**
```json
{
  "transferId": "trf-2026-9912",
  "sourceWarehouseId": "wh-hyd-sanathnagar",
  "destinationWarehouseId": "wh-vja-autonagar",
  "sku": "HAV-STL-1200-BLU",
  "quantity": 50,
  "status": "IN_TRANSIT",
  "estimatedArrival": "2026-09-20T08:00:00Z"
}
```

---

## 11. Settlements & Payouts (`/api/v1/settlements`)

### 11.1 Get Weekly Partner Settlement Statement
`GET /api/v1/settlements/partner/{partnerId}`  
*Access:* `RETAILER`, `DISTRIBUTOR`, `ADMIN`

**Response (`200 OK`):**
```json
{
  "settlementNumber": "SET-2026-W38",
  "partnerId": "partner-vja-elec-1",
  "billingPeriod": "2026-09-12 to 2026-09-18",
  "grossSalesINR": 348200.00,
  "platformCommissionPercent": 5.5,
  "platformCommissionINR": 19151.00,
  "tdsDeductedINR": 3482.00,
  "netPayoutINR": 325567.00,
  "status": "SETTLED",
  "bankUtrNumber": "SBIN26262849182",
  "disbursementDate": "2026-09-19T10:00:00Z",
  "gstInvoiceUrl": "https://api.electrakart.com/invoices/gst-credit-note-set-38.pdf"
}
```

---

## 12. Real-Time Notifications (`/api/v1/notifications`)

### 12.1 List User Notifications
`GET /api/v1/notifications?unreadOnly=false`  
*Access:* Authenticated (`CUSTOMER`, `RETAILER`, `DISTRIBUTOR`, `ADMIN`)

**Response (`200 OK`):**
```json
{
  "unreadCount": 1,
  "notifications": [
    {
      "id": "notif-1",
      "type": "ORDER_UPDATE",
      "title": "Order EK-10025 Dispatched",
      "message": "Part 1 of your order has been dispatched from Vijayawada Electricals with OTP 4821.",
      "isRead": false,
      "linkActionUrl": "/orders/ord-10025",
      "createdAt": "2026-09-19T14:45:00Z"
    }
  ]
}
```

### 12.2 Mark Notification as Read
`PATCH /api/v1/notifications/{id}/read`  
*Access:* Authenticated

**Response (`204 No Content`)**

---

## 13. Customer Address Management (`/api/v1/customers/me/addresses`)

### 13.1 List Customer Addresses
`GET /api/v1/customers/me/addresses`  
*Access:* `CUSTOMER` (Strict horizontal tenancy isolation by authenticated user ID)

**Response (`200 OK`):**
```json
{
  "addresses": [
    {
      "id": "addr-101",
      "userId": "usr-cust-001",
      "recipientName": "Anil Kumar Reddy",
      "phone": "+919848199882",
      "addressLine1": "Flat 402, Sri Sai Nilayam, Benz Circle",
      "landmark": "Near Sweet Magic",
      "city": "Vijayawada",
      "state": "Andhra Pradesh",
      "pincode": "520002",
      "isDefault": true,
      "createdAt": "2026-09-19T10:00:00Z"
    }
  ]
}
```

### 13.2 Create Customer Address
`POST /api/v1/customers/me/addresses`  
*Access:* `CUSTOMER`

**Request:**
```json
{
  "recipientName": "Anil Kumar Reddy",
  "phone": "+919848199882",
  "addressLine1": "Plot 14, Auto Nagar Main Road",
  "city": "Vijayawada",
  "state": "Andhra Pradesh",
  "pincode": "520007",
  "isDefault": false
}
```

**Response (`201 Created`):**
```json
{
  "address": {
    "id": "addr-102",
    "userId": "usr-cust-001",
    "recipientName": "Anil Kumar Reddy",
    "phone": "+919848199882",
    "addressLine1": "Plot 14, Auto Nagar Main Road",
    "city": "Vijayawada",
    "state": "Andhra Pradesh",
    "pincode": "520007",
    "isDefault": false,
    "createdAt": "2026-09-20T10:00:00Z"
  }
}
```

### 13.3 Update Customer Address
`PATCH /api/v1/customers/me/addresses/{id}`  
*Access:* `CUSTOMER` (IDOR Protected: 404/403 if address belongs to another customer)

**Request:**
```json
{
  "isDefault": true
}
```

**Response (`200 OK`):**
```json
{
  "address": {
    "id": "addr-102",
    "isDefault": true,
    "updatedAt": "2026-09-20T10:05:00Z"
  }
}
```

### 13.4 Delete Customer Address
`DELETE /api/v1/customers/me/addresses/{id}`  
*Access:* `CUSTOMER` (IDOR Protected)

**Response (`200 OK`):**
```json
{
  "success": true
}
```

---

## 14. Order Lifecycle & Post-Placement (`/api/v1/orders`, `/api/v1/invoices`)

### 14.1 Cancel Order
`POST /api/v1/orders/{id}/cancel`  
*Access:* `CUSTOMER` (Owner), `ADMIN`  
*Business Rules:*
- Orders in `CONFIRMED` or `PREPARING` status are cancellable.
- Orders already `DISPATCHED`, `OUT_FOR_DELIVERY`, or `DELIVERED` reject cancellation with `409 Conflict`.
- Cancelling an order automatically releases reserved inventory back to available stock.
- Idempotent: Repeat cancellation of an already cancelled order returns `200 OK` with existing status.

**Request:**
```json
{
  "reason": "Ordered wrong gauge wire by mistake"
}
```

**Response (`200 OK`):**
```json
{
  "orderId": "ord-10025",
  "status": "CANCELLED",
  "cancelledAt": "2026-09-20T11:00:00Z",
  "reason": "Ordered wrong gauge wire by mistake"
}
```

### 14.2 Get Customer Tax Invoice
`GET /api/v1/invoices/{orderId}`  
*Access:* `CUSTOMER` (Order Owner), `ADMIN` (Tenant Isolated)  
*Zero Financial Leakage Policy:* Tax invoice returns client pricing, GST line items, and invoice number. Strict exclusion of partner purchase costs or platform commission rates.

**Response (`200 OK`):**
```json
{
  "invoice": {
    "invoiceNumber": "INV-2026-0010025",
    "orderId": "ord-10025",
    "orderNumber": "EK-10025",
    "customer": {
      "name": "Anil Kumar Reddy",
      "phone": "+919848199882",
      "billingAddress": "Flat 402, Benz Circle, Vijayawada - 520002"
    },
    "seller": {
      "businessName": "Vijayawada Electricals",
      "gstin": "37AAAAA1234A1Z5",
      "address": "Governorpet, Vijayawada"
    },
    "items": [
      {
        "sku": "POL-WX-25-RED-90M",
        "description": "Polycab 2.5 sq mm Single Core FR PVC Copper Wire 90m",
        "hsnCode": "8544",
        "quantity": 2,
        "unitPriceINR": 2450.00,
        "taxableAmountINR": 4152.54,
        "gstRate": 18,
        "cgstINR": 373.73,
        "sgstINR": 373.73,
        "totalINR": 4900.00
      }
    ],
    "subtotalINR": 4152.54,
    "cgstINR": 373.73,
    "sgstINR": 373.73,
    "grandTotalINR": 4900.00,
    "createdAt": "2026-09-20T09:30:00Z"
  }
}
```

---

## 15. Inventory Ledger & Double-Entry Auditing (`/api/v1/inventory`)

### 15.1 Query Inventory Transaction Ledger
`GET /api/v1/inventory/transactions?sku=POL-WX-25-RED-90M&partnerId=partner-1&limit=50`  
*Access:* `RETAILER` (Own partner records only), `DISTRIBUTOR`, `ADMIN`  
*Invariants Enforced:*
- `reserved <= in_stock`
- `available = in_stock - reserved`
- Every stock movement (allocation, dispatch, transfer, cancellation release) creates an immutable transaction row.

**Response (`200 OK`):**
```json
{
  "transactions": [
    {
      "id": "inv-tx-1001",
      "sku": "POL-WX-25-RED-90M",
      "partnerId": "partner-1",
      "warehouseId": null,
      "transactionType": "STOCK_RESERVATION",
      "quantityDelta": -2,
      "stockBefore": 50,
      "stockAfter": 48,
      "referenceType": "ORDER",
      "referenceId": "ord-10025",
      "createdAt": "2026-09-20T09:25:00Z"
    },
    {
      "id": "inv-tx-1002",
      "sku": "POL-WX-25-RED-90M",
      "partnerId": "partner-1",
      "warehouseId": null,
      "transactionType": "ORDER_DISPATCHED",
      "quantityDelta": -2,
      "stockBefore": 48,
      "stockAfter": 48,
      "referenceType": "ORDER",
      "referenceId": "ord-10025",
      "createdAt": "2026-09-20T09:45:00Z"
    }
  ]
}
```

---

## 16. Multi-Warehouse Inter-Depot Transfers (`/api/v1/warehouses/transfers`)

### 16.1 Create Transfer Request
`POST /api/v1/warehouses/transfers`  
*Access:* `DISTRIBUTOR`, `ADMIN`

**Request:**
```json
{
  "sourceWarehouseId": "wh-hyd-sanathnagar",
  "destinationWarehouseId": "wh-vja-autonagar",
  "sku": "POL-WX-25-RED-90M",
  "quantity": 100,
  "reason": "Replenish regional project demands"
}
```

**Response (`201 Created`):**
```json
{
  "transfer": {
    "id": "trf-1001",
    "transferNumber": "TRF-2026-0001",
    "sourceWarehouseId": "wh-hyd-sanathnagar",
    "destinationWarehouseId": "wh-vja-autonagar",
    "sku": "POL-WX-25-RED-90M",
    "quantity": 100,
    "status": "CREATED",
    "createdAt": "2026-09-20T08:00:00Z"
  }
}
```

### 16.2 Approve Transfer Request
`POST /api/v1/warehouses/transfers/{id}/approve`  
*Access:* `DISTRIBUTOR`, `ADMIN`

**Response (`200 OK`):**
```json
{
  "transfer": {
    "id": "trf-1001",
    "status": "APPROVED",
    "approvedAt": "2026-09-20T08:15:00Z"
  }
}
```

### 16.3 Dispatch Transfer Request
`POST /api/v1/warehouses/transfers/{id}/dispatch`  
*Access:* `DISTRIBUTOR`, `ADMIN`  
*Invariant:* Source warehouse available stock is atomically decremented and transfer moves to `IN_TRANSIT`.

**Response (`200 OK`):**
```json
{
  "transfer": {
    "id": "trf-1001",
    "status": "IN_TRANSIT",
    "dispatchedAt": "2026-09-20T08:45:00Z"
  }
}
```

### 16.4 Receive Transfer Request
`POST /api/v1/warehouses/transfers/{id}/receive`  
*Access:* `DISTRIBUTOR`, `ADMIN`  
*Invariant:* Destination warehouse stock is atomically incremented, and status transitions to `RECEIVED`. Idempotent: Repeat receive requests return `200 OK`.

**Response (`200 OK`):**
```json
{
  "transfer": {
    "id": "trf-1001",
    "status": "RECEIVED",
    "receivedAt": "2026-09-20T12:00:00Z"
  }
}
```

### 16.5 Cancel Transfer Request
`POST /api/v1/warehouses/transfers/{id}/cancel`  
*Access:* `DISTRIBUTOR`, `ADMIN`  
*Invariant:* Cancelling before dispatch releases any warehouse lock. Cancelling after dispatch is rejected with `409 Conflict`.

**Response (`200 OK`):**
```json
{
  "transfer": {
    "id": "trf-1001",
    "status": "CANCELLED",
    "cancelledAt": "2026-09-20T08:10:00Z"
  }
}
```

---

## 17. Quotation Lifecycle & Price Lock Protection (`/api/v1/quotations`)

### 17.1 Generate Quotation with 48-Hour Price Lock
`POST /api/v1/quotations/generate`  
*Access:* `CUSTOMER`, `RETAILER`  
*Behavior:* Locks prices and inventory allocation for exactly 48 hours. Returns `validUntil` and `isPriceLocked: true`.

**Request:**
```json
{
  "items": [
    { "sku": "POL-WX-25-RED-90M", "quantity": 10 }
  ],
  "pincode": "520002"
}
```

**Response (`201 Created`):**
```json
{
  "quotationId": "quot-10042",
  "quoteNumber": "QT-2026-0042",
  "totalAmount": 24500.00,
  "validUntil": "2026-09-22T09:00:00Z",
  "isPriceLocked": true,
  "status": "GENERATED"
}
```

### 17.2 Cancel Quotation
`POST /api/v1/quotations/{id}/cancel`  
*Access:* `CUSTOMER` (Owner), `ADMIN` (IDOR Protected: 403/404 if accessed by unauthorized customer)

**Response (`200 OK`):**
```json
{
  "quotationId": "quot-10042",
  "status": "CANCELLED",
  "cancelledAt": "2026-09-20T10:30:00Z"
}
```

---

## 18. Admin Auditing, User Governance, and Settlements (`/api/v1/admin`)

### 18.1 Query Audit Logs
`GET /api/v1/admin/audit-logs?entityType=ORDER&limit=50`  
*Access:* `ADMIN` (Vertical RBAC: 403 Forbidden for `CUSTOMER`, `RETAILER`, `DISTRIBUTOR`)

**Response (`200 OK`):**
```json
{
  "logs": [
    {
      "id": "aud-1001",
      "userId": "usr-admin-01",
      "action": "ORDER_STATUS_OVERRIDE",
      "entityType": "ORDER",
      "entityId": "ord-10025",
      "details": { "previousStatus": "CONFIRMED", "newStatus": "PREPARING" },
      "ipAddress": "127.0.0.1",
      "createdAt": "2026-09-20T09:20:00Z"
    }
  ]
}
```

### 18.2 List & Manage Platform Users
`GET /api/v1/admin/users?role=RETAILER`  
*Access:* `ADMIN`

**Response (`200 OK`):**
```json
{
  "users": [
    {
      "id": "usr-ret-001",
      "phoneNumber": "+919848123456",
      "fullName": "Suresh Varma",
      "role": "RETAILER",
      "partnerId": "partner-1",
      "isActive": true,
      "createdAt": "2026-09-18T10:00:00Z"
    }
  ]
}
```

### 18.3 Admin Partner Settlements Overview & Manual Disbursement
`GET /api/v1/admin/settlements`  
*Access:* `ADMIN`

**Response (`200 OK`):**
```json
{
  "settlements": [
    {
      "id": "set-1001",
      "partnerId": "partner-1",
      "partnerName": "Vijayawada Electricals",
      "orderId": "ord-10025",
      "grossSalesINR": 4900.00,
      "platformCommissionINR": 269.50,
      "tdsDeductedINR": 49.00,
      "netPayoutINR": 4581.50,
      "status": "PENDING",
      "createdAt": "2026-09-20T09:45:00Z"
    }
  ]
}
```

`POST /api/v1/admin/settlements/{id}/disburse`  
*Access:* `ADMIN`

**Request:**
```json
{
  "bankUtrNumber": "SBIN20260920001",
  "disbursementNotes": "Weekly batch settlement cleared via NEFT"
}
```

**Response (`200 OK`):**
```json
{
  "settlement": {
    "id": "set-1001",
    "status": "SETTLED",
    "bankUtrNumber": "SBIN20260920001",
    "disbursedAt": "2026-09-20T12:00:00Z"
  }
}
```
