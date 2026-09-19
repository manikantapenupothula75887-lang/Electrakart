-- ElectraKart Relational Schema (PostgreSQL 16+)
-- Migration 001: Initial Core Schema & Tables

-- ============================================================================
-- 1. IDENTITY, ADDRESSES & PARTNER ORGANIZATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('CUSTOMER', 'RETAILER', 'DISTRIBUTOR', 'ADMIN')),
    city VARCHAR(100) DEFAULT 'Vijayawada',
    pincode VARCHAR(10) DEFAULT '520002',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS addresses (
    id TEXT PRIMARY KEY,
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

CREATE TABLE IF NOT EXISTS customers (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    trade_account_type VARCHAR(50) NOT NULL DEFAULT 'HOMEOWNER' CHECK (trade_account_type IN ('HOMEOWNER', 'ELECTRICIAN', 'CONTRACTOR', 'COMMERCIAL')),
    billing_gstin VARCHAR(15),
    company_name VARCHAR(200),
    credit_limit_inr NUMERIC(12, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS partners (
    id TEXT PRIMARY KEY,
    business_name VARCHAR(200) NOT NULL,
    legal_entity_name VARCHAR(250) NOT NULL,
    owner_name VARCHAR(150) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('RETAILER', 'DISTRIBUTOR')),
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    gstin VARCHAR(15) UNIQUE NOT NULL,
    pan VARCHAR(10) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'SUSPENDED')),
    delivery_radius_km NUMERIC(5, 2) NOT NULL DEFAULT 10.00,
    commission_rate_percent NUMERIC(5, 2) NOT NULL DEFAULT 5.00,
    rating NUMERIC(3, 2) NOT NULL DEFAULT 0.00,
    total_orders_fulfilled INT NOT NULL DEFAULT 0,
    joined_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stores (
    id TEXT PRIMARY KEY,
    partner_id TEXT NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    store_name VARCHAR(200) NOT NULL,
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS warehouses (
    id TEXT PRIMARY KEY,
    partner_id TEXT NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'REGIONAL_DEPOT' CHECK (type IN ('CENTRAL_HUB', 'REGIONAL_DEPOT', 'LOCAL_SATELLITE')),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    capacity_sq_ft INT NOT NULL DEFAULT 10000,
    dock_doors INT NOT NULL DEFAULT 2,
    operating_hours VARCHAR(100) DEFAULT '08:00 - 20:00',
    contact_phone VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. GEOGRAPHIC & SERVICING TOPOLOGY
-- ============================================================================

CREATE TABLE IF NOT EXISTS hubs (
    id TEXT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    state VARCHAR(100) NOT NULL,
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pincode_serviceability (
    id TEXT PRIMARY KEY,
    pincode VARCHAR(10) NOT NULL,
    hub_id TEXT NOT NULL REFERENCES hubs(id) ON DELETE CASCADE,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    is_hyperlocal_available BOOLEAN NOT NULL DEFAULT TRUE,
    is_bulk_delivery_available BOOLEAN NOT NULL DEFAULT TRUE,
    standard_eta_hours INT NOT NULL DEFAULT 24,
    express_eta_minutes INT NOT NULL DEFAULT 45,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_pincode_hub UNIQUE (pincode, hub_id)
);

-- ============================================================================
-- 3. MASTER CATALOG & TAXONOMY
-- ============================================================================

CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(150) UNIQUE NOT NULL,
    hsn_code VARCHAR(10) NOT NULL,
    description TEXT,
    icon_name VARCHAR(100),
    image_url TEXT,
    display_order INT NOT NULL DEFAULT 0,
    parent_category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS brands (
    id TEXT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(150) UNIQUE NOT NULL,
    logo_url TEXT,
    description TEXT,
    is_authorized_dealership BOOLEAN NOT NULL DEFAULT TRUE,
    origin_country VARCHAR(100) DEFAULT 'India',
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS brand_series (
    id TEXT PRIMARY KEY,
    brand_id TEXT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(150) NOT NULL,
    description TEXT,
    category_id TEXT REFERENCES categories(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_brand_series UNIQUE (brand_id, slug)
);

CREATE TABLE IF NOT EXISTS skus (
    id TEXT PRIMARY KEY,
    sku_code VARCHAR(80) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    hsn_code VARCHAR(10) NOT NULL,
    category_id TEXT NOT NULL REFERENCES categories(id),
    brand_id TEXT NOT NULL REFERENCES brands(id),
    series_id TEXT NOT NULL REFERENCES brand_series(id),
    unit_of_measure VARCHAR(30) NOT NULL DEFAULT 'Nos',
    mrp_inr NUMERIC(10, 2) NOT NULL,
    selling_price_inr NUMERIC(10, 2) NOT NULL,
    gst_rate_percent NUMERIC(4, 2) NOT NULL DEFAULT 18.00,
    image_url TEXT,
    is_certified BOOLEAN NOT NULL DEFAULT TRUE,
    certification_number VARCHAR(100),
    rating NUMERIC(3, 2) NOT NULL DEFAULT 4.8,
    review_count INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    description TEXT,
    configuration TEXT,
    specification TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 4. HYPERLOCAL INVENTORY & STOCK BALANCES
-- ============================================================================

CREATE TABLE IF NOT EXISTS partner_inventories (
    id TEXT PRIMARY KEY,
    partner_id TEXT NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    sku_id TEXT NOT NULL REFERENCES skus(id) ON DELETE CASCADE,
    sku_code VARCHAR(80) NOT NULL,
    in_stock_quantity INT NOT NULL DEFAULT 0 CHECK (in_stock_quantity >= 0),
    reserved_quantity INT NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
    available_quantity INT GENERATED ALWAYS AS (GREATEST(0, in_stock_quantity - reserved_quantity)) STORED,
    low_stock_threshold INT NOT NULL DEFAULT 5,
    purchase_cost_inr NUMERIC(10, 2) NOT NULL,
    selling_price_inr NUMERIC(10, 2) NOT NULL,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_partner_sku UNIQUE (partner_id, sku_code)
);

CREATE TABLE IF NOT EXISTS warehouse_inventories (
    id TEXT PRIMARY KEY,
    warehouse_id TEXT NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    sku_id TEXT NOT NULL REFERENCES skus(id) ON DELETE CASCADE,
    sku_code VARCHAR(80) NOT NULL,
    in_stock_quantity INT NOT NULL DEFAULT 0 CHECK (in_stock_quantity >= 0),
    reserved_quantity INT NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
    available_quantity INT GENERATED ALWAYS AS (GREATEST(0, in_stock_quantity - reserved_quantity)) STORED,
    reorder_level INT NOT NULL DEFAULT 20,
    purchase_cost_inr NUMERIC(10, 2) NOT NULL,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_warehouse_sku UNIQUE (warehouse_id, sku_code)
);

-- ============================================================================
-- 5. ESTIMATES, QUOTATIONS & 48-HOUR PRICE LOCKS
-- ============================================================================

CREATE TABLE IF NOT EXISTS estimates (
    id TEXT PRIMARY KEY,
    customer_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    customer_name VARCHAR(150),
    customer_phone VARCHAR(20),
    sample_id VARCHAR(50),
    raw_text TEXT,
    document_url TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'EXTRACTED' CHECK (status IN ('UPLOADED', 'ANALYZING', 'EXTRACTED', 'RESOLVED', 'QUOTED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS estimate_items (
    id TEXT PRIMARY KEY,
    estimate_id TEXT NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
    raw_text TEXT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit VARCHAR(50) NOT NULL DEFAULT 'Nos',
    detected_brand VARCHAR(100),
    detected_series VARCHAR(100),
    detected_config VARCHAR(100),
    detected_spec TEXT,
    confidence VARCHAR(20) NOT NULL DEFAULT 'HIGH' CHECK (confidence IN ('HIGH', 'MEDIUM', 'LOW')),
    matched_sku_id TEXT REFERENCES skus(id) ON DELETE SET NULL,
    matched_sku_code VARCHAR(80),
    resolution_notes TEXT,
    is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quotations (
    id TEXT PRIMARY KEY,
    quotation_number VARCHAR(50) UNIQUE NOT NULL,
    estimate_id TEXT REFERENCES estimates(id) ON DELETE SET NULL,
    customer_id TEXT REFERENCES users(id) ON DELETE SET NULL,
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
    status VARCHAR(50) NOT NULL DEFAULT 'LOCKED' CHECK (status IN ('LOCKED', 'ACCEPTED', 'EXPIRED', 'ORDERED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quotation_items (
    id TEXT PRIMARY KEY,
    quotation_id TEXT NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    sku_id TEXT NOT NULL REFERENCES skus(id),
    sku_code VARCHAR(80) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    brand_name VARCHAR(100) NOT NULL,
    series_name VARCHAR(100) NOT NULL,
    specification_details TEXT,
    quantity INT NOT NULL,
    unit VARCHAR(50) NOT NULL,
    unit_rate_inr NUMERIC(10, 2) NOT NULL,
    gst_rate_percent NUMERIC(4, 2) NOT NULL DEFAULT 18.00,
    gst_amount_inr NUMERIC(10, 2) NOT NULL,
    line_total_inr NUMERIC(12, 2) NOT NULL
);

-- ============================================================================
-- 6. ORDERS, MULTI-STORE SPLIT FULFILLMENTS & TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    customer_name VARCHAR(150) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    delivery_address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    delivery_method VARCHAR(50) NOT NULL CHECK (delivery_method IN ('STANDARD', 'EXPRESS', 'PICKUP')),
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('UPI', 'NET_BANKING', 'TRADE_CREDIT', 'COD')),
    payment_status VARCHAR(50) NOT NULL DEFAULT 'PAID' CHECK (payment_status IN ('PENDING', 'PAID', 'REFUNDED', 'FAILED')),
    overall_status VARCHAR(50) NOT NULL DEFAULT 'CONFIRMED' CHECK (overall_status IN ('PLACED', 'CONFIRMED', 'PREPARING', 'PACKED', 'DISPATCHED', 'DELIVERED', 'CANCELLED')),
    subtotal_inr NUMERIC(12, 2) NOT NULL,
    discount_inr NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    delivery_fee_inr NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    gst_total_inr NUMERIC(12, 2) NOT NULL,
    grand_total_inr NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_fulfillments (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    fulfillment_index INT NOT NULL DEFAULT 1,
    partner_id TEXT NOT NULL REFERENCES partners(id),
    partner_name VARCHAR(200) NOT NULL,
    partner_type VARCHAR(50) NOT NULL,
    partner_address TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'CONFIRMED' CHECK (status IN ('CONFIRMED', 'PREPARING', 'PACKED', 'DISPATCHED', 'DELIVERED', 'CANCELLED')),
    estimated_delivery_time VARCHAR(50) NOT NULL,
    assigned_driver_name VARCHAR(150),
    assigned_driver_phone VARCHAR(20),
    handover_otp VARCHAR(6) NOT NULL,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fulfillment_items (
    id TEXT PRIMARY KEY,
    fulfillment_id TEXT NOT NULL REFERENCES order_fulfillments(id) ON DELETE CASCADE,
    sku_id TEXT NOT NULL REFERENCES skus(id),
    sku_code VARCHAR(80) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    brand VARCHAR(100) NOT NULL,
    series VARCHAR(100) NOT NULL,
    quantity INT NOT NULL,
    unit_price_inr NUMERIC(10, 2) NOT NULL,
    unit VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS fulfillment_tracking_logs (
    id TEXT PRIMARY KEY,
    fulfillment_id TEXT NOT NULL REFERENCES order_fulfillments(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('CUSTOMER', 'RETAILER', 'DISTRIBUTOR', 'ADMIN')),
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    link_action_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS catalog_mapping_queue (
    id TEXT PRIMARY KEY,
    raw_term VARCHAR(255) NOT NULL,
    retailer_name VARCHAR(200) NOT NULL,
    retailer_id TEXT NOT NULL REFERENCES partners(id),
    suggested_sku VARCHAR(80) NOT NULL,
    suggested_name VARCHAR(255) NOT NULL,
    confidence_score NUMERIC(3, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'NEEDS_ADMIN_REVIEW' CHECK (status IN ('MATCHED', 'NEEDS_ADMIN_REVIEW', 'APPROVED', 'REJECTED')),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
