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
