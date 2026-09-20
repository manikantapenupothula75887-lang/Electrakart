# ElectraKart Production Database Architecture & Schema Specification

**System Version:** 2.0 (Production Blueprint)  
**Target Engine:** PostgreSQL 16+ with TimescaleDB / Declarative Range Partitioning  
**Character Encoding:** `UTF-8` | **Collation:** `en_US.UTF-8` | **Timezone:** `UTC`  
**Security Standard:** Row-Level Security (RLS), Encrypted at Rest (AES-256), Column-Level PII Encryption  

---

## 1. Architectural Philosophy & Design Principles

ElectraKart's data layer is designed around four non-negotiable operational principles:

1. **Strict Entity Separation (Canonical vs Operational):**  
   The **Master Catalog** is a pristine, centralized product master maintained by catalog specialists and brand principals. Retailers and distributors *never* create unmoderated products; they map their stock to standardized SKUs.
2. **Deterministic Split-Fulfillment Topology:**  
   Orders are not single monolithic shipments. An order is a container for one or more `order_fulfillments`, each independently routed to either a hyperlocal retailer (for quick 30–60 min delivery) or a regional distributor warehouse (for bulk items and master coils).
3. **Zero Financial Leakage by Construction:**  
   Wholesale purchase costs, distributor landed rates, retail dealer margins, and platform take-rates are strictly stored in permissioned tables guarded by PostgreSQL Row Level Security (RLS). Customer-facing APIs and queries never join or select financial cost columns.
4. **Append-Only Auditing & Immutable Ledgers:**  
   Inventory balances are guaranteed by transaction logs (`inventory_transactions`). Price quotations (`quotations`) are cryptographically stamped with 48-hour expirations. Financial settlements (`settlements`) and order status changes (`fulfillment_tracking_logs`) are append-only.

---

## 2. Global Custom Types & Enums

```sql
-- Identity & Access
CREATE TYPE user_role AS ENUM ('CUSTOMER', 'RETAILER', 'DISTRIBUTOR', 'ADMIN');
CREATE TYPE partner_type AS ENUM ('RETAILER', 'DISTRIBUTOR');
CREATE TYPE verification_status AS ENUM ('PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'SUSPENDED');
CREATE TYPE trade_account_type AS ENUM ('HOMEOWNER', 'ELECTRICIAN', 'CONTRACTOR', 'COMMERCIAL');

-- Inventory & Logistics
CREATE TYPE inventory_transaction_type AS ENUM (
    'INWARD_FACTORY',
    'RESERVATION_ORDER',
    'RELEASE_CANCELLED',
    'DISPATCH_FULFILLMENT',
    'TRANSFER_INTER_WAREHOUSE',
    'MANUAL_ADJUSTMENT'
);

-- Estimates & AI
CREATE TYPE estimate_status AS ENUM (
    'UPLOADED',
    'ANALYZING',
    'NEEDS_REVIEW',
    'REVIEWED',
    'QUOTED',
    'ARCHIVED'
);
CREATE TYPE confidence_level AS ENUM ('HIGH', 'MEDIUM', 'NEEDS_REVIEW');
CREATE TYPE quotation_status AS ENUM ('DRAFT', 'LOCKED', 'ACCEPTED', 'ORDERED', 'EXPIRED');

-- Orders & Fulfillment
CREATE TYPE order_status AS ENUM (
    'PLACED',
    'CONFIRMED',
    'PARTNER_ACCEPTED',
    'PREPARING',
    'PACKED',
    'DISPATCHED',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'CANCELLED'
);
CREATE TYPE delivery_method AS ENUM ('STANDARD', 'EXPRESS', 'STORE_PICKUP');
CREATE TYPE payment_method AS ENUM ('UPI', 'NET_BANKING', 'TRADE_CREDIT', 'COD');
CREATE TYPE payment_status AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');
CREATE TYPE settlement_status AS ENUM ('PENDING', 'PROCESSING', 'SETTLED', 'FAILED');
CREATE TYPE notification_type AS ENUM ('ORDER_UPDATE', 'PRICE_ALERT', 'KYC_STATUS', 'INVENTORY_LOW', 'SYSTEM');
```

---

## 3. Relational Schema: The 32 Canonical Entities

### Group 1: Identity, Addresses & Partner Organizations

#### 1. `users`
Core identity table authenticated via secure OAuth2 / Argon2id password hashes.
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role user_role NOT NULL DEFAULT 'CUSTOMER',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_phone ON users(phone_number);
```

#### 2. `addresses`
Normalized address storage for customers, stores, and fulfillment dropoffs.
```sql
CREATE TABLE addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_name VARCHAR(150) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    landmark VARCHAR(150),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_addresses_pincode ON addresses(pincode);
CREATE INDEX idx_addresses_city ON addresses(city);
CREATE INDEX idx_addresses_coords ON addresses(latitude, longitude);
```

#### 3. `customers`
Extension table for customer trade accounts and GST enterprise billing.
```sql
CREATE TABLE customers (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    trade_account_type trade_account_type NOT NULL DEFAULT 'HOMEOWNER',
    billing_gstin VARCHAR(15),
    company_name VARCHAR(200),
    credit_limit_inr NUMERIC(12, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### 4. `partners`
Verified B2B entities (Retail stores and Distributor logistics hubs).
```sql
CREATE TABLE partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_name VARCHAR(200) NOT NULL,
    legal_entity_name VARCHAR(250) NOT NULL,
    owner_name VARCHAR(150) NOT NULL,
    type partner_type NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    gstin VARCHAR(15) UNIQUE NOT NULL,
    pan VARCHAR(10) NOT NULL,
    bank_account_enc BYTEA NOT NULL, -- Encrypted at rest with pgcrypto
    bank_ifsc VARCHAR(11) NOT NULL,
    status verification_status NOT NULL DEFAULT 'PENDING',
    commission_rate_percent NUMERIC(5, 2) NOT NULL DEFAULT 5.50, -- Confidential Take-rate
    delivery_radius_km NUMERIC(5, 2) NOT NULL DEFAULT 10.00,
    rating NUMERIC(3, 2) NOT NULL DEFAULT 0.00,
    total_orders_fulfilled INT NOT NULL DEFAULT 0,
    primary_address_id UUID REFERENCES addresses(id),
    store_photo_url TEXT,
    joined_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_partners_status ON partners(status);
CREATE INDEX idx_partners_type ON partners(type);
CREATE INDEX idx_partners_gstin ON partners(gstin);
```

#### 5. `stores`
Physical retail locations operated by partner retailers for hyperlocal delivery.
```sql
CREATE TABLE stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    store_name VARCHAR(200) NOT NULL,
    address_id UUID NOT NULL REFERENCES addresses(id),
    delivery_radius_km NUMERIC(5, 2) NOT NULL DEFAULT 8.00,
    is_accepting_orders BOOLEAN NOT NULL DEFAULT TRUE,
    contact_phone VARCHAR(20) NOT NULL,
    operating_hours VARCHAR(100) DEFAULT '09:00 AM - 09:00 PM',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_stores_partner ON stores(partner_id);
```

#### 6. `warehouses`
Large regional depots operated by distributors for bulk orders and inter-depot transfers.
```sql
CREATE TABLE warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    warehouse_name VARCHAR(200) NOT NULL,
    address_id UUID NOT NULL REFERENCES addresses(id),
    capacity_sq_ft INT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_warehouses_partner ON warehouses(partner_id);
```

---

### Group 2: Product Master & Canonical Catalog Hierarchy

```
[categories]
      │
      ▼
[product_types]
      │
      ▼
   [brands] ──► [brand_series] ──► [models] ──► [variants]
                                                    │
                                                    ▼
                                           [specifications]
                                                    │
                                                    ▼
                                                  [skus]
```

#### 7. `categories`
```sql
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(120) UNIQUE NOT NULL,
    description TEXT,
    icon_name VARCHAR(50) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INT NOT NULL DEFAULT 0
);
```

#### 8. `product_types`
```sql
CREATE TABLE product_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(120) UNIQUE NOT NULL,
    description TEXT
);
CREATE INDEX idx_product_types_cat ON product_types(category_id);
```

#### 9. `brands`
```sql
CREATE TABLE brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    origin_country VARCHAR(80) DEFAULT 'India',
    description TEXT,
    logo_url TEXT,
    is_popular BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX idx_brands_name ON brands(name);
```

#### 10. `brand_series`
```sql
CREATE TABLE brand_series (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    description TEXT,
    UNIQUE (brand_id, name)
);
CREATE INDEX idx_brand_series_brand ON brand_series(brand_id);
```

#### 11. `models`
```sql
CREATE TABLE models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    series_id UUID NOT NULL REFERENCES brand_series(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    base_model_code VARCHAR(100) NOT NULL,
    UNIQUE (series_id, base_model_code)
);
CREATE INDEX idx_models_series ON models(series_id);
```

#### 12. `variants`
```sql
CREATE TABLE variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
    color VARCHAR(50),
    sweep_mm INT,
    finish_type VARCHAR(50)
);
CREATE INDEX idx_variants_model ON variants(model_id);
```

#### 13. `specifications`
Technical parameters, electrical ratings, and official Bureau of Indian Standards (BIS) compliance.
```sql
CREATE TABLE specifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    technical_specs JSONB NOT NULL, -- e.g. {"current": "16A", "voltage": "1100V", "poles": "SP"}
    certification_standard VARCHAR(100) NOT NULL, -- e.g. "IS 694 : 2010"
    warranty_period VARCHAR(50) NOT NULL DEFAULT '1 Year'
);
CREATE INDEX idx_specifications_gin ON specifications USING GIN (technical_specs);
```

#### 14. `skus` (Master SKU Catalog)
Canonical unit of trade. Every retailer inventory entry maps to an approved Master SKU.
```sql
CREATE TABLE skus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku_code VARCHAR(80) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    hsn_code VARCHAR(10) NOT NULL,
    category_id UUID NOT NULL REFERENCES categories(id),
    product_type_id UUID NOT NULL REFERENCES product_types(id),
    brand_id UUID NOT NULL REFERENCES brands(id),
    series_id UUID NOT NULL REFERENCES brand_series(id),
    model_id UUID NOT NULL REFERENCES models(id),
    variant_id UUID REFERENCES variants(id),
    specification_id UUID NOT NULL REFERENCES specifications(id),
    unit_of_measure VARCHAR(50) NOT NULL,
    mrp_inr NUMERIC(10, 2) NOT NULL,
    gst_rate_percent NUMERIC(5, 2) NOT NULL DEFAULT 18.00,
    image_url TEXT NOT NULL,
    is_certified BOOLEAN NOT NULL DEFAULT TRUE,
    certification_number VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Essential Composite Indexes for Catalog Search & Filter
CREATE INDEX idx_skus_brand_series ON skus(brand_id, series_id);
CREATE INDEX idx_skus_cat_prodtype ON skus(category_id, product_type_id);
CREATE INDEX idx_skus_sku_code ON skus(sku_code);
CREATE INDEX idx_skus_search_trgm ON skus USING GIN (name gin_trgm_ops);
```

---

### Group 3: Inventory, Pricing & Transactions

#### 15. `partner_inventories`
Stores per-partner stock levels and retail pricing.
```sql
CREATE TABLE partner_inventories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    sku_id UUID NOT NULL REFERENCES skus(id) ON DELETE RESTRICT,
    in_stock_quantity INT NOT NULL DEFAULT 0 CHECK (in_stock_quantity >= 0),
    reserved_quantity INT NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
    available_quantity INT GENERATED ALWAYS AS (in_stock_quantity - reserved_quantity) STORED,
    low_stock_threshold INT NOT NULL DEFAULT 5,
    
    -- CONFIDENTIAL: Guarded by RLS
    purchase_cost_inr NUMERIC(10, 2), 
    
    selling_price_inr NUMERIC(10, 2) NOT NULL CHECK (selling_price_inr > 0),
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (partner_id, sku_id)
);

-- Composite Index for Fast Hyperlocal Multi-Store Availability Query
CREATE INDEX idx_partner_inv_sku_partner ON partner_inventories(sku_id, partner_id, available_quantity);
CREATE INDEX idx_partner_inv_low_stock ON partner_inventories(partner_id, available_quantity) 
    WHERE available_quantity <= low_stock_threshold;
```

#### 16. `inventory_transactions` (Partitioned by Month)
High-volume audit log for all physical stock inward, reservation, and dispatch events.
```sql
CREATE TABLE inventory_transactions (
    id UUID DEFAULT gen_random_uuid(),
    inventory_id UUID NOT NULL,
    partner_id UUID NOT NULL,
    sku_code VARCHAR(80) NOT NULL,
    transaction_type inventory_transaction_type NOT NULL,
    quantity_change INT NOT NULL,
    previous_quantity INT NOT NULL,
    new_quantity INT NOT NULL,
    reference_id VARCHAR(100), -- Order ID or Inward Delivery Note
    notes TEXT,
    created_by_user_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE INDEX idx_inv_tx_partner_sku ON inventory_transactions(partner_id, sku_code, created_at DESC);
CREATE INDEX idx_inv_tx_ref ON inventory_transactions(reference_id);
```

#### 17. `pricing_rules`
B2B Tier pricing matrix (Contractor, Electrician Pro, Quantity Breaks).
```sql
CREATE TABLE pricing_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku_id UUID REFERENCES skus(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    customer_tier VARCHAR(50) NOT NULL,
    min_quantity INT NOT NULL DEFAULT 1,
    discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    min_platform_margin_percent NUMERIC(5, 2) NOT NULL DEFAULT 3.00, -- Internal floor margin
    effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    effective_to TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX idx_pricing_rules_lookup ON pricing_rules(customer_tier, sku_id, category_id, is_active);
```

---

### Group 4: Estimates & Locked Quotations

#### 18. `estimates`
Raw estimate uploads from contractor handwritten slips, BOQs, or WhatsApp images.
```sql
CREATE TABLE estimates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    document_url TEXT,
    document_type VARCHAR(30) NOT NULL DEFAULT 'IMAGE',
    raw_text_payload TEXT,
    status estimate_status NOT NULL DEFAULT 'UPLOADED',
    city VARCHAR(100) NOT NULL DEFAULT 'Vijayawada',
    pincode VARCHAR(10) NOT NULL DEFAULT '520002',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_estimates_customer ON estimates(customer_id);
CREATE INDEX idx_estimates_status ON estimates(status);
```

#### 19. `estimate_items`
Line items extracted by OCR/Gemini with confidence scores and disambiguation flags.
```sql
CREATE TABLE estimate_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estimate_id UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
    raw_line_text TEXT NOT NULL,
    detected_quantity INT NOT NULL DEFAULT 1,
    detected_unit VARCHAR(50) NOT NULL DEFAULT 'Nos',
    detected_brand VARCHAR(100),
    detected_series VARCHAR(100),
    detected_config VARCHAR(100),
    detected_spec VARCHAR(150),
    confidence confidence_level NOT NULL DEFAULT 'HIGH',
    confidence_score NUMERIC(3, 2) NOT NULL DEFAULT 1.00,
    reason_for_review TEXT,
    matched_sku_id UUID REFERENCES skus(id) ON DELETE SET NULL,
    is_resolved_by_customer BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_estimate_items_est ON estimate_items(estimate_id);
```

#### 20. `quotations`
Official binding price proposals with 48-hour locked pricing guarantee.
```sql
CREATE TABLE quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    customer_name VARCHAR(150) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    delivery_address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    subtotal_inr NUMERIC(12, 2) NOT NULL,
    discount_inr NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    delivery_fee_inr NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    gst_total_inr NUMERIC(12, 2) NOT NULL,
    grand_total_inr NUMERIC(12, 2) NOT NULL,
    is_price_locked BOOLEAN NOT NULL DEFAULT TRUE,
    locked_until_timestamp TIMESTAMPTZ NOT NULL,
    status quotation_status NOT NULL DEFAULT 'LOCKED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_quotations_number ON quotations(quotation_number);
CREATE INDEX idx_quotations_expiry ON quotations(locked_until_timestamp, status);
```

#### 21. `quotation_items`
```sql
CREATE TABLE quotation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    sku_id UUID NOT NULL REFERENCES skus(id),
    sku_code VARCHAR(80) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    brand_name VARCHAR(100) NOT NULL,
    series_name VARCHAR(100) NOT NULL,
    specification_details TEXT,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit VARCHAR(50) NOT NULL,
    unit_rate_inr NUMERIC(10, 2) NOT NULL,
    gst_rate_percent NUMERIC(5, 2) NOT NULL,
    gst_amount_inr NUMERIC(10, 2) NOT NULL,
    line_total_inr NUMERIC(12, 2) NOT NULL
);
CREATE INDEX idx_quotation_items_qid ON quotation_items(quotation_id);
```

---

### Group 5: Orders & Split Multi-Store Fulfillments

#### 22. `orders`
Master order record representing customer commitment and total payment.
```sql
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID REFERENCES users(id) ON DELETE RESTRICT,
    customer_name VARCHAR(150) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    shipping_address_id UUID NOT NULL REFERENCES addresses(id),
    delivery_method delivery_method NOT NULL DEFAULT 'EXPRESS',
    subtotal_inr NUMERIC(12, 2) NOT NULL,
    discount_inr NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    delivery_fee_inr NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    gst_total_inr NUMERIC(12, 2) NOT NULL,
    grand_total_inr NUMERIC(12, 2) NOT NULL,
    payment_method payment_method NOT NULL,
    payment_status payment_status NOT NULL DEFAULT 'PENDING',
    overall_status order_status NOT NULL DEFAULT 'PLACED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(overall_status);
CREATE INDEX idx_orders_number ON orders(order_number);
```

#### 23. `order_fulfillments` (Partitioned by Month)
Sub-orders assigned to individual retail shops or distribution depots.
```sql
CREATE TABLE order_fulfillments (
    id UUID DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    fulfillment_index INT NOT NULL DEFAULT 1,
    partner_id UUID NOT NULL REFERENCES partners(id),
    partner_name VARCHAR(200) NOT NULL,
    partner_type partner_type NOT NULL,
    partner_address TEXT NOT NULL,
    status order_status NOT NULL DEFAULT 'CONFIRMED',
    estimated_delivery_time VARCHAR(50),
    assigned_driver_name VARCHAR(120),
    assigned_driver_phone VARCHAR(20),
    handover_otp VARCHAR(6) NOT NULL, -- 4-digit or 6-digit delivery handshake OTP
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Critical Index for Partner Dashboard & Dispatch App
CREATE INDEX idx_order_ful_partner_status ON order_fulfillments(partner_id, status, created_at DESC);
CREATE INDEX idx_order_ful_order_id ON order_fulfillments(order_id);
```

#### 24. `fulfillment_items`
```sql
CREATE TABLE fulfillment_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fulfillment_id UUID NOT NULL,
    sku_id UUID NOT NULL REFERENCES skus(id),
    sku_code VARCHAR(80) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit VARCHAR(50) NOT NULL,
    unit_price_inr NUMERIC(10, 2) NOT NULL,
    line_total_inr NUMERIC(12, 2) NOT NULL
);
CREATE INDEX idx_ful_items_fid ON fulfillment_items(fulfillment_id);
```

#### 25. `fulfillment_tracking_logs` (Partitioned by Month)
Immutable time-series timeline of every dispatch scan and driver milestone.
```sql
CREATE TABLE fulfillment_tracking_logs (
    id UUID DEFAULT gen_random_uuid(),
    fulfillment_id UUID NOT NULL,
    status order_status NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE INDEX idx_ful_logs_fid ON fulfillment_tracking_logs(fulfillment_id, created_at ASC);
```

---

### Group 6: Payments, Settlements & Escrow

#### 26. `payments`
```sql
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    amount_inr NUMERIC(12, 2) NOT NULL,
    payment_method payment_method NOT NULL,
    status payment_status NOT NULL DEFAULT 'PENDING',
    gateway_transaction_id VARCHAR(100),
    payment_gateway_provider VARCHAR(50) NOT NULL DEFAULT 'RAZORPAY',
    gateway_signature VARCHAR(255),
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_gateway_tx ON payments(gateway_transaction_id);
```

#### 27. `settlements`
Weekly automated payout reconciliation for verified retailers and distributors.
```sql
CREATE TABLE settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    settlement_number VARCHAR(50) UNIQUE NOT NULL,
    partner_id UUID NOT NULL REFERENCES partners(id),
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    gross_sales_inr NUMERIC(12, 2) NOT NULL,
    platform_commission_inr NUMERIC(12, 2) NOT NULL,
    tds_deducted_inr NUMERIC(10, 2) NOT NULL DEFAULT 0.00, -- Configurable TDS deduction (e.g. 1%). Subject to statutory legal/tax verification prior to production launch.
    net_payout_inr NUMERIC(12, 2) NOT NULL,
    status settlement_status NOT NULL DEFAULT 'PENDING',
    bank_utr_number VARCHAR(100),
    disbursement_date TIMESTAMPTZ,
    gst_credit_note_invoice_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_settlements_partner ON settlements(partner_id, status);
```

---

### Group 7: Notifications, AI Chat & Trust

#### 28. `notifications`
```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    type notification_type NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    link_action_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
```

#### 29. `chat_sessions`
```sql
CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_title VARCHAR(150),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### 30. `chat_messages`
```sql
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    sender VARCHAR(20) NOT NULL CHECK (sender IN ('ai', 'user', 'agent')),
    text TEXT NOT NULL,
    suggested_actions JSONB,
    product_payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_chat_msg_session ON chat_messages(session_id, created_at ASC);
```

#### 31. `reviews`
Verified contractor and buyer electrical product ratings.
```sql
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku_id UUID NOT NULL REFERENCES skus(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES users(id),
    customer_name VARCHAR(150) NOT NULL,
    is_verified_contractor BOOLEAN NOT NULL DEFAULT FALSE,
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title VARCHAR(200) NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_reviews_sku ON reviews(sku_id, rating);
```

#### 32. `catalog_mapping_queue`
Retailer raw product submission queue for Admin review and canonical SKU matching.
```sql
CREATE TABLE catalog_mapping_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raw_term VARCHAR(255) NOT NULL,
    retailer_id UUID NOT NULL REFERENCES partners(id),
    suggested_sku_id UUID REFERENCES skus(id),
    suggested_name VARCHAR(255) NOT NULL,
    confidence_score NUMERIC(3, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(30) NOT NULL DEFAULT 'NEEDS_ADMIN_REVIEW',
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);
CREATE INDEX idx_cat_mapping_status ON catalog_mapping_queue(status);
```

---

## 4. Multi-Tenancy & Row-Level Security (RLS) Policy Blueprint

PostgreSQL RLS ensures that neither application bugs nor misconfigured queries can ever leak partner data across tenants or customer boundaries.

```sql
-- Enable RLS on core multi-tenant tables
ALTER TABLE partner_inventories ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_fulfillments ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;

-- 1. Partner Inventory Isolation Policy
CREATE POLICY partner_inventory_isolation ON partner_inventories
    AS PERMISSIVE
    FOR ALL
    TO authenticated_user
    USING (
        -- Admin has full access
        current_setting('request.jwt.claim.role', true) = 'ADMIN'
        -- Partners can only see/edit their own store rows
        OR partner_id = current_setting('request.jwt.claim.partner_id', true)::UUID
        -- Customers can see inventory IF it is active, but NEVER the purchase_cost_inr column (handled via customer_views)
        OR (current_setting('request.jwt.claim.role', true) = 'CUSTOMER' AND available_quantity > 0)
    );

-- 2. Order Fulfillment Partner Boundary
CREATE POLICY partner_fulfillment_isolation ON order_fulfillments
    AS PERMISSIVE
    FOR ALL
    TO authenticated_user
    USING (
        current_setting('request.jwt.claim.role', true) = 'ADMIN'
        OR partner_id = current_setting('request.jwt.claim.partner_id', true)::UUID
        OR order_id IN (
            SELECT id FROM orders WHERE customer_id = current_setting('request.jwt.claim.user_id', true)::UUID
        )
    );
```

---

## 5. High-Volume Partitioning Strategy

Three tables grow at orders-of-magnitude higher velocity than the rest of the database:
1. `inventory_transactions`
2. `order_fulfillments`
3. `fulfillment_tracking_logs`

These tables use **PostgreSQL Declarative Range Partitioning** keyed on monthly `created_at` intervals:

```sql
-- Example Monthly Partitions for Q4 2026
CREATE TABLE inventory_transactions_2026_10 PARTITION OF inventory_transactions
    FOR VALUES FROM ('2026-10-01 00:00:00+00') TO ('2026-11-01 00:00:00+00');

CREATE TABLE inventory_transactions_2026_11 PARTITION OF inventory_transactions
    FOR VALUES FROM ('2026-11-01 00:00:00+00') TO ('2026-12-01 00:00:00+00');

CREATE TABLE inventory_transactions_2026_12 PARTITION OF inventory_transactions
    FOR VALUES FROM ('2026-12-01 00:00:00+00') TO ('2027-01-01 00:00:00+00');
```
*Benefits:* Fast partition dropping for archival after 7-year statutory tax compliance, query pruning, and non-blocking vacuuming.

---

## 6. Zero Financial Leakage Database Projections (Customer Views)

To mathematically ensure that customer-facing microservices cannot inadvertently leak wholesale dealer margins:

```sql
CREATE OR REPLACE VIEW v_customer_product_catalog AS
SELECT 
    s.id,
    s.sku_code,
    s.name,
    s.hsn_code,
    c.name AS category_name,
    b.name AS brand_name,
    bs.name AS series_name,
    s.unit_of_measure,
    s.mrp_inr,
    s.gst_rate_percent,
    s.image_url,
    s.is_certified,
    s.certification_number,
    sp.technical_specs,
    sp.warranty_period
FROM skus s
JOIN categories c ON s.category_id = c.id
JOIN brands b ON s.brand_id = b.id
JOIN brand_series bs ON s.series_id = bs.id
JOIN specifications sp ON s.specification_id = sp.id
WHERE s.is_active = TRUE;
-- NOTICE: purchase_cost_inr, commission_rate_percent, and partner margins are completely excluded.
```

---

## 7. Migration Roadmap: From Demo localStorage to PostgreSQL

| Phase | Milestone | Actions |
|---|---|---|
| **Phase 1 (Current)** | Frontend Service Isolation | Clean domain types, modular service interfaces with memory/storage backends. |
| **Phase 2** | DB Deployment & Prisma/TypeORM | Apply migration scripts in RDS/Supabase; seed Master Catalog (Polycab, Anchor, Havells). |
| **Phase 3** | Backend API Gateway | Replace `DemoService` implementations with HTTP Axios/Fetch calls pointing to `/api/v1/*`. |
| **Phase 4** | Zero-Downtime Data Cutover | Dual-write validation, settlement reconciliation test, production launch. |
