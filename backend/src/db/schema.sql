-- ElectraKart Relational Schema (PostgreSQL 16+)
-- Derived from docs/database_design.md

-- ============================================================================
-- 1. IDENTITY, ADDRESSES & PARTNER ORGANIZATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('CUSTOMER', 'RETAILER', 'DISTRIBUTOR', 'ADMIN', 'ELECTRICIAN')),
    city VARCHAR(100) DEFAULT 'Vijayawada',
    pincode VARCHAR(10) DEFAULT '520002',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);

CREATE TABLE IF NOT EXISTS addresses (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    recipient_name VARCHAR(150) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    landmark VARCHAR(150),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    country VARCHAR(50) DEFAULT 'India',
    address_type VARCHAR(20) DEFAULT 'HOME' CHECK (address_type IN ('HOME', 'OFFICE', 'OTHER')),
    is_default BOOLEAN DEFAULT FALSE,
    source VARCHAR(30) DEFAULT 'MANUAL' CHECK (source IN ('GPS', 'MANUAL', 'SAVED_ADDRESS', 'CHECKOUT_ADDRESS')),
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    normalized_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_pincode ON addresses(pincode);
CREATE INDEX IF NOT EXISTS idx_addresses_city ON addresses(city);
CREATE INDEX IF NOT EXISTS idx_addresses_coords ON addresses(latitude, longitude);

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
    bank_account VARCHAR(50) NOT NULL,
    bank_ifsc VARCHAR(11) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'SUSPENDED')),
    commission_rate_percent NUMERIC(5, 2) NOT NULL DEFAULT 5.50,
    delivery_radius_km NUMERIC(5, 2) NOT NULL DEFAULT 10.00,
    service_radius_km NUMERIC(5, 2) NOT NULL DEFAULT 10.00,
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    rating NUMERIC(3, 2) NOT NULL DEFAULT 0.00,
    total_orders_fulfilled INT NOT NULL DEFAULT 0,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    address TEXT NOT NULL,
    store_photo_url TEXT,
    joined_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_partners_status ON partners(status);
CREATE INDEX IF NOT EXISTS idx_partners_type ON partners(type);
CREATE INDEX IF NOT EXISTS idx_partners_city ON partners(city);
CREATE INDEX IF NOT EXISTS idx_partners_coords ON partners(latitude, longitude);

CREATE TABLE IF NOT EXISTS stores (
    id TEXT PRIMARY KEY,
    partner_id TEXT NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    store_name VARCHAR(200) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    delivery_radius_km NUMERIC(5, 2) NOT NULL DEFAULT 8.00,
    service_radius_km NUMERIC(5, 2) NOT NULL DEFAULT 8.00,
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    is_accepting_orders BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    contact_phone VARCHAR(20) NOT NULL,
    operating_hours VARCHAR(100) DEFAULT '09:00 AM - 09:00 PM',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_stores_partner ON stores(partner_id);
CREATE INDEX IF NOT EXISTS idx_stores_coords ON stores(latitude, longitude);

CREATE TABLE IF NOT EXISTS warehouses (
    id TEXT PRIMARY KEY,
    partner_id TEXT NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    warehouse_name VARCHAR(200) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pincode VARCHAR(10),
    address TEXT NOT NULL,
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    capacity_sq_ft INT NOT NULL DEFAULT 25000,
    total_skus INT NOT NULL DEFAULT 0,
    total_inventory_units INT NOT NULL DEFAULT 0,
    low_stock_count INT NOT NULL DEFAULT 0,
    out_of_stock_count INT NOT NULL DEFAULT 0,
    reserved_stock_units INT NOT NULL DEFAULT 0,
    incoming_stock_units INT NOT NULL DEFAULT 0,
    service_radius_km NUMERIC(5, 2) NOT NULL DEFAULT 50.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_warehouses_partner ON warehouses(partner_id);
CREATE INDEX IF NOT EXISTS idx_warehouses_coords ON warehouses(latitude, longitude);

-- ============================================================================
-- 2. PRODUCT MASTER & CANONICAL CATALOG HIERARCHY
-- ============================================================================

CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(120) UNIQUE NOT NULL,
    description TEXT,
    icon_name VARCHAR(50) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS product_types (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(120) UNIQUE NOT NULL,
    description TEXT
);
CREATE INDEX IF NOT EXISTS idx_product_types_cat ON product_types(category_id);

CREATE TABLE IF NOT EXISTS brands (
    id TEXT PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    origin_country VARCHAR(80) DEFAULT 'India',
    description TEXT,
    logo_url TEXT,
    is_popular BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_brands_name ON brands(name);

CREATE TABLE IF NOT EXISTS brand_series (
    id TEXT PRIMARY KEY,
    brand_id TEXT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    description TEXT,
    UNIQUE (brand_id, name)
);
CREATE INDEX IF NOT EXISTS idx_brand_series_brand ON brand_series(brand_id);

CREATE TABLE IF NOT EXISTS models (
    id TEXT PRIMARY KEY,
    series_id TEXT NOT NULL REFERENCES brand_series(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    base_model_code VARCHAR(100) NOT NULL,
    UNIQUE (series_id, base_model_code)
);
CREATE INDEX IF NOT EXISTS idx_models_series ON models(series_id);

CREATE TABLE IF NOT EXISTS variants (
    id TEXT PRIMARY KEY,
    model_id TEXT NOT NULL REFERENCES models(id) ON DELETE CASCADE,
    color VARCHAR(50),
    sweep_mm INT,
    finish_type VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS specifications (
    id TEXT PRIMARY KEY,
    technical_specs JSONB NOT NULL,
    certification_standard VARCHAR(100) NOT NULL,
    warranty_period VARCHAR(50) NOT NULL DEFAULT '1 Year'
);

CREATE TABLE IF NOT EXISTS skus (
    id TEXT PRIMARY KEY,
    sku_code VARCHAR(80) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    hsn_code VARCHAR(10) NOT NULL,
    category_id TEXT NOT NULL REFERENCES categories(id),
    product_type_id TEXT REFERENCES product_types(id),
    brand_id TEXT NOT NULL REFERENCES brands(id),
    series_id TEXT NOT NULL REFERENCES brand_series(id),
    model_id TEXT REFERENCES models(id),
    variant_id TEXT REFERENCES variants(id),
    specification_id TEXT REFERENCES specifications(id),
    unit_of_measure VARCHAR(50) NOT NULL,
    mrp_inr NUMERIC(10, 2) NOT NULL,
    selling_price_inr NUMERIC(10, 2) NOT NULL,
    gst_rate_percent NUMERIC(5, 2) NOT NULL DEFAULT 18.00,
    image_url TEXT NOT NULL,
    is_certified BOOLEAN NOT NULL DEFAULT TRUE,
    certification_number VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    rating NUMERIC(3, 2) NOT NULL DEFAULT 4.8,
    review_count INT NOT NULL DEFAULT 0,
    description TEXT,
    configuration TEXT,
    specification TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_skus_brand_series ON skus(brand_id, series_id);
CREATE INDEX IF NOT EXISTS idx_skus_cat_prodtype ON skus(category_id, product_type_id);
CREATE INDEX IF NOT EXISTS idx_skus_sku_code ON skus(sku_code);

-- ============================================================================
-- 3. INVENTORY & PRICING
-- ============================================================================

CREATE TABLE IF NOT EXISTS partner_inventories (
    id TEXT PRIMARY KEY,
    partner_id TEXT NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    sku_id TEXT NOT NULL REFERENCES skus(id) ON DELETE RESTRICT,
    sku_code VARCHAR(80) NOT NULL,
    in_stock_quantity INT NOT NULL DEFAULT 0 CHECK (in_stock_quantity >= 0),
    reserved_quantity INT NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
    available_quantity INT NOT NULL DEFAULT 0,
    low_stock_threshold INT NOT NULL DEFAULT 5,
    purchase_cost_inr NUMERIC(10, 2), -- Internal confidential
    selling_price_inr NUMERIC(10, 2) NOT NULL CHECK (selling_price_inr > 0),
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (partner_id, sku_code)
);
CREATE INDEX IF NOT EXISTS idx_partner_inv_sku ON partner_inventories(sku_code, partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_inv_partner ON partner_inventories(partner_id);

CREATE TABLE IF NOT EXISTS inventory_transactions (
    id TEXT PRIMARY KEY,
    inventory_id TEXT NOT NULL,
    partner_id TEXT NOT NULL,
    sku_code VARCHAR(80) NOT NULL,
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('INWARD_FACTORY', 'RESERVATION_ORDER', 'RELEASE_CANCELLED', 'DISPATCH_FULFILLMENT', 'TRANSFER_INTER_WAREHOUSE', 'MANUAL_ADJUSTMENT')),
    quantity_change INT NOT NULL,
    previous_quantity INT NOT NULL,
    new_quantity INT NOT NULL,
    reference_id VARCHAR(100),
    notes TEXT,
    created_by_user_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_inv_tx_partner_sku ON inventory_transactions(partner_id, sku_code);

CREATE TABLE IF NOT EXISTS pricing_rules (
    id TEXT PRIMARY KEY,
    sku_id TEXT REFERENCES skus(id) ON DELETE CASCADE,
    category_id TEXT REFERENCES categories(id) ON DELETE CASCADE,
    customer_tier VARCHAR(50) NOT NULL,
    min_quantity INT NOT NULL DEFAULT 1,
    discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    min_platform_margin_percent NUMERIC(5, 2) NOT NULL DEFAULT 3.00,
    effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    effective_to TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- ============================================================================
-- 4. ESTIMATES & QUOTATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS estimates (
    id TEXT PRIMARY KEY,
    customer_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    document_url TEXT,
    document_type VARCHAR(30) NOT NULL DEFAULT 'IMAGE',
    raw_text_payload TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'UPLOADED' CHECK (status IN ('UPLOADED', 'ANALYZING', 'NEEDS_REVIEW', 'REVIEWED', 'QUOTED', 'ARCHIVED')),
    city VARCHAR(100) NOT NULL DEFAULT 'Vijayawada',
    pincode VARCHAR(10) NOT NULL DEFAULT '520002',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS estimate_items (
    id TEXT PRIMARY KEY,
    estimate_id TEXT NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
    raw_line_text TEXT NOT NULL,
    detected_quantity INT NOT NULL DEFAULT 1,
    detected_unit VARCHAR(50) NOT NULL DEFAULT 'Nos',
    detected_brand VARCHAR(100),
    detected_series VARCHAR(100),
    detected_config VARCHAR(100),
    detected_spec VARCHAR(150),
    confidence VARCHAR(30) NOT NULL DEFAULT 'HIGH' CHECK (confidence IN ('HIGH', 'MEDIUM', 'NEEDS_REVIEW')),
    confidence_score NUMERIC(3, 2) NOT NULL DEFAULT 1.00,
    reason_for_review TEXT,
    matched_sku_id TEXT REFERENCES skus(id) ON DELETE SET NULL,
    is_resolved_by_customer BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quotations (
    id TEXT PRIMARY KEY,
    quotation_number VARCHAR(50) UNIQUE NOT NULL,
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
    status VARCHAR(50) NOT NULL DEFAULT 'LOCKED' CHECK (status IN ('DRAFT', 'LOCKED', 'ACCEPTED', 'ORDERED', 'EXPIRED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_quotations_number ON quotations(quotation_number);

CREATE TABLE IF NOT EXISTS quotation_items (
    id TEXT PRIMARY KEY,
    quotation_id TEXT NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    sku_id TEXT NOT NULL REFERENCES skus(id),
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

-- ============================================================================
-- 5. ORDERS & SPLIT FULFILLMENT
-- ============================================================================

CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id TEXT REFERENCES users(id) ON DELETE RESTRICT,
    customer_name VARCHAR(150) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    delivery_address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    delivery_method VARCHAR(50) NOT NULL DEFAULT 'EXPRESS',
    subtotal_inr NUMERIC(12, 2) NOT NULL,
    discount_inr NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    delivery_fee_inr NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    gst_total_inr NUMERIC(12, 2) NOT NULL,
    grand_total_inr NUMERIC(12, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    payment_status VARCHAR(50) NOT NULL DEFAULT 'PAID',
    overall_status VARCHAR(50) NOT NULL DEFAULT 'PLACED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(overall_status);
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);

CREATE TABLE IF NOT EXISTS order_fulfillments (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    fulfillment_index INT NOT NULL DEFAULT 1,
    partner_id TEXT NOT NULL REFERENCES partners(id),
    partner_name VARCHAR(200) NOT NULL,
    partner_type VARCHAR(50) NOT NULL,
    partner_address TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'CONFIRMED',
    estimated_delivery_time VARCHAR(50),
    assigned_driver_name VARCHAR(120),
    assigned_driver_phone VARCHAR(20),
    handover_otp VARCHAR(6) NOT NULL,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_order_ful_partner ON order_fulfillments(partner_id, status);
CREATE INDEX IF NOT EXISTS idx_order_ful_order ON order_fulfillments(order_id);

CREATE TABLE IF NOT EXISTS fulfillment_items (
    id TEXT PRIMARY KEY,
    fulfillment_id TEXT NOT NULL REFERENCES order_fulfillments(id) ON DELETE CASCADE,
    sku_id TEXT NOT NULL REFERENCES skus(id),
    sku_code VARCHAR(80) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    brand VARCHAR(100),
    series VARCHAR(100),
    quantity INT NOT NULL CHECK (quantity > 0),
    unit VARCHAR(50) NOT NULL,
    unit_price_inr NUMERIC(10, 2) NOT NULL,
    line_total_inr NUMERIC(12, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS fulfillment_tracking_logs (
    id TEXT PRIMARY KEY,
    fulfillment_id TEXT NOT NULL REFERENCES order_fulfillments(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ful_logs_fid ON fulfillment_tracking_logs(fulfillment_id);

-- ============================================================================
-- 6. PAYMENTS, SETTLEMENTS, NOTIFICATIONS & REVIEWS
-- ============================================================================

CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    amount_inr NUMERIC(12, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    gateway_transaction_id VARCHAR(100),
    payment_gateway_provider VARCHAR(50) NOT NULL DEFAULT 'RAZORPAY',
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS settlements (
    id TEXT PRIMARY KEY,
    settlement_number VARCHAR(50) UNIQUE NOT NULL,
    partner_id TEXT NOT NULL REFERENCES partners(id),
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    gross_sales_inr NUMERIC(12, 2) NOT NULL,
    platform_commission_inr NUMERIC(12, 2) NOT NULL,
    tds_deducted_inr NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    net_payout_inr NUMERIC(12, 2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    bank_utr_number VARCHAR(100),
    disbursement_date TIMESTAMPTZ,
    gst_credit_note_invoice_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_settlements_partner ON settlements(partner_id, status);

CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    link_action_url TEXT,
    entity_type VARCHAR(50),
    entity_id TEXT,
    read_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_entity ON notifications(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS notification_logs (
    id TEXT PRIMARY KEY,
    notification_id TEXT REFERENCES notifications(id) ON DELETE SET NULL,
    channel VARCHAR(32) NOT NULL CHECK (channel IN ('IN_APP', 'EMAIL', 'SMS', 'WHATSAPP')),
    provider VARCHAR(50) NOT NULL,
    provider_message_id VARCHAR(255),
    recipient TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'READ')),
    attempt_count INT NOT NULL DEFAULT 1,
    last_error TEXT,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status, created_at);
CREATE INDEX IF NOT EXISTS idx_notification_logs_notif_channel ON notification_logs(notification_id, channel);
CREATE INDEX IF NOT EXISTS idx_notification_logs_provider_msg ON notification_logs(provider, provider_message_id);

CREATE TABLE IF NOT EXISTS notification_preferences (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel VARCHAR(32) NOT NULL CHECK (channel IN ('IN_APP', 'EMAIL', 'SMS', 'WHATSAPP')),
    event_category VARCHAR(50) NOT NULL DEFAULT 'ALL',
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, channel, event_category)
);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON notification_preferences(user_id);

CREATE TABLE IF NOT EXISTS chat_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    session_title VARCHAR(150),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    sender VARCHAR(20) NOT NULL CHECK (sender IN ('ai', 'user', 'agent')),
    text TEXT NOT NULL,
    suggested_actions JSONB,
    product_payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    sku_id TEXT NOT NULL REFERENCES skus(id) ON DELETE CASCADE,
    customer_id TEXT NOT NULL REFERENCES users(id),
    customer_name VARCHAR(150) NOT NULL,
    is_verified_contractor BOOLEAN NOT NULL DEFAULT FALSE,
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title VARCHAR(200) NOT NULL,
    comment TEXT NOT NULL,
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
CREATE INDEX IF NOT EXISTS idx_cat_mapping_status ON catalog_mapping_queue(status);

-- ============================================================================
-- 7. ZERO-LEAKAGE CUSTOMER VIEW
-- ============================================================================
CREATE OR REPLACE VIEW v_customer_products AS
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
    s.selling_price_inr,
    s.gst_rate_percent,
    s.image_url,
    s.is_certified,
    s.certification_number,
    s.rating,
    s.review_count,
    s.description,
    s.configuration,
    s.specification
FROM skus s
JOIN categories c ON s.category_id = c.id
JOIN brands b ON s.brand_id = b.id
JOIN brand_series bs ON s.series_id = bs.id
WHERE s.is_active = TRUE;

-- ============================================================================
-- 8. PHASE 3G: AUDIT LOGS & STOCK TRANSFERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    actor_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(64) NOT NULL,
    old_value JSONB,
    new_value JSONB,
    ip_address VARCHAR(50),
    request_id VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action, created_at DESC);

CREATE TABLE IF NOT EXISTS stock_transfers (
    id VARCHAR(64) PRIMARY KEY,
    transfer_number VARCHAR(50) UNIQUE NOT NULL,
    partner_id VARCHAR(64) NOT NULL REFERENCES partners(id) ON DELETE RESTRICT,
    source_warehouse_id VARCHAR(64) NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    destination_warehouse_id VARCHAR(64) NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    sku_id VARCHAR(64) REFERENCES skus(id),
    sku_code VARCHAR(80) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    status VARCHAR(50) NOT NULL DEFAULT 'TRANSFER_CREATED' CHECK (status IN ('TRANSFER_CREATED', 'TRANSFER_APPROVED', 'TRANSFER_IN_TRANSIT', 'TRANSFER_RECEIVED', 'TRANSFER_CANCELLED')),
    reason TEXT,
    created_by_user_id VARCHAR(64) REFERENCES users(id),
    approved_by_user_id VARCHAR(64) REFERENCES users(id),
    dispatched_at TIMESTAMPTZ,
    received_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_partner ON stock_transfers(partner_id, status);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_src ON stock_transfers(source_warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_dst ON stock_transfers(destination_warehouse_id);

-- ============================================================================
-- 9. ELECTRICIAN MARKETPLACE ECOSYSTEM
-- ============================================================================
CREATE TABLE IF NOT EXISTS electrician_profiles (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(150),
    experience_years INT NOT NULL DEFAULT 0,
    service_radius_km NUMERIC(5, 2) NOT NULL DEFAULT 10.00,
    city VARCHAR(100) NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    address TEXT NOT NULL,
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    id_proof_url TEXT,
    license_url TEXT,
    profile_photo_url TEXT,
    inspection_fee_inr NUMERIC(10, 2) NOT NULL DEFAULT 199.00,
    verification_status VARCHAR(50) NOT NULL DEFAULT 'PENDING_VERIFICATION' CHECK (verification_status IN ('PENDING_VERIFICATION', 'APPROVED', 'REJECTED', 'SUSPENDED')),
    rejection_reason TEXT,
    is_online BOOLEAN NOT NULL DEFAULT FALSE,
    is_busy BOOLEAN NOT NULL DEFAULT FALSE,
    rating_avg NUMERIC(3, 2) NOT NULL DEFAULT 0.00,
    rating_count INT NOT NULL DEFAULT 0,
    completed_jobs_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_electrician_profiles_status_online ON electrician_profiles(verification_status, is_online);
CREATE INDEX IF NOT EXISTS idx_electrician_profiles_coords ON electrician_profiles(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_electrician_profiles_user ON electrician_profiles(user_id);

CREATE TABLE IF NOT EXISTS electrician_specializations (
    id TEXT PRIMARY KEY,
    electrician_id TEXT NOT NULL REFERENCES electrician_profiles(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_electrician_spec UNIQUE (electrician_id, category)
);

CREATE INDEX IF NOT EXISTS idx_electrician_spec_cat ON electrician_specializations(category);
CREATE INDEX IF NOT EXISTS idx_electrician_spec_elec ON electrician_specializations(electrician_id);

CREATE TABLE IF NOT EXISTS electrician_service_requests (
    id TEXT PRIMARY KEY,
    request_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    customer_name VARCHAR(150) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    preferred_time VARCHAR(50) NOT NULL DEFAULT 'IMMEDIATE',
    status VARCHAR(50) NOT NULL DEFAULT 'REQUESTED' CHECK (status IN ('REQUESTED', 'ACCEPTED', 'ON_THE_WAY', 'ARRIVED', 'WORK_STARTED', 'COMPLETED', 'CANCELLED', 'EXPIRED', 'REJECTED')),
    assigned_electrician_id TEXT REFERENCES electrician_profiles(id) ON DELETE SET NULL,
    inspection_fee_inr NUMERIC(10, 2) NOT NULL DEFAULT 199.00,
    total_charges_inr NUMERIC(10, 2),
    cancellation_reason TEXT,
    cancelled_by VARCHAR(50),
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    customer_notified_at TIMESTAMPTZ,
    arrived_at TIMESTAMPTZ,
    work_started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_elec_req_status ON electrician_service_requests(status);
CREATE INDEX IF NOT EXISTS idx_elec_req_assigned ON electrician_service_requests(assigned_electrician_id);
CREATE INDEX IF NOT EXISTS idx_elec_req_customer ON electrician_service_requests(customer_id);

CREATE TABLE IF NOT EXISTS electrician_ratings (
    id TEXT PRIMARY KEY,
    service_request_id TEXT NOT NULL UNIQUE REFERENCES electrician_service_requests(id) ON DELETE CASCADE,
    customer_id TEXT NOT NULL REFERENCES users(id),
    electrician_id TEXT NOT NULL REFERENCES electrician_profiles(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_elec_ratings_elec ON electrician_ratings(electrician_id);

-- ============================================================================
-- 10. AUTOMATED DELIVERY INTEGRATION (RAPIDO & CARRIER ABSTRACTION)
-- ============================================================================
CREATE TABLE IF NOT EXISTS delivery_bookings (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    fulfillment_id TEXT NOT NULL REFERENCES order_fulfillments(id) ON DELETE CASCADE,
    idempotency_key VARCHAR(120) UNIQUE NOT NULL,
    provider VARCHAR(50) NOT NULL DEFAULT 'rapido',
    provider_booking_id VARCHAR(100),
    tracking_url TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'BOOKING_REQUESTED', 'BOOKED', 'PICKUP_ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED', 'FAILED')),
    pickup_name VARCHAR(150) NOT NULL,
    pickup_phone VARCHAR(20) NOT NULL,
    pickup_address TEXT NOT NULL,
    pickup_city VARCHAR(100) NOT NULL,
    pickup_pincode VARCHAR(10) NOT NULL,
    pickup_latitude NUMERIC(10, 7) NOT NULL,
    pickup_longitude NUMERIC(10, 7) NOT NULL,
    drop_name VARCHAR(150) NOT NULL,
    drop_phone VARCHAR(20) NOT NULL,
    drop_address TEXT NOT NULL,
    drop_city VARCHAR(100) NOT NULL,
    drop_pincode VARCHAR(10) NOT NULL,
    drop_latitude NUMERIC(10, 7) NOT NULL,
    drop_longitude NUMERIC(10, 7) NOT NULL,
    distance_km NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    rider_name VARCHAR(150),
    rider_phone VARCHAR(20),
    rider_vehicle_number VARCHAR(50),
    estimated_delivery_time TIMESTAMPTZ,
    delivery_fee_inr NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    retry_count INT NOT NULL DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delivery_bookings_order ON delivery_bookings(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_bookings_ful ON delivery_bookings(fulfillment_id);
CREATE INDEX IF NOT EXISTS idx_delivery_bookings_status ON delivery_bookings(status);
CREATE INDEX IF NOT EXISTS idx_delivery_bookings_provider ON delivery_bookings(provider, provider_booking_id);

CREATE TABLE IF NOT EXISTS delivery_status_history (
    id TEXT PRIMARY KEY,
    delivery_booking_id TEXT NOT NULL REFERENCES delivery_bookings(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    description TEXT,
    raw_payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delivery_history_booking ON delivery_status_history(delivery_booking_id, created_at DESC);

-- ============================================================================
-- 11. REAL-TIME TRACKING, TELEMETRY INGESTION & DELIVERY WEBHOOKS
-- ============================================================================

CREATE TABLE IF NOT EXISTS electrician_location_updates (
    id TEXT PRIMARY KEY,
    electrician_id TEXT NOT NULL REFERENCES electrician_profiles(id) ON DELETE CASCADE,
    job_id TEXT REFERENCES electrician_service_requests(id) ON DELETE CASCADE,
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    accuracy NUMERIC(6, 2),
    heading NUMERIC(5, 2),
    speed NUMERIC(5, 2),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_elec_loc_elec_time ON electrician_location_updates(electrician_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_elec_loc_job_time ON electrician_location_updates(job_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS delivery_location_updates (
    id TEXT PRIMARY KEY,
    delivery_booking_id TEXT NOT NULL REFERENCES delivery_bookings(id) ON DELETE CASCADE,
    driver_name VARCHAR(150),
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    accuracy NUMERIC(6, 2),
    heading NUMERIC(5, 2),
    speed NUMERIC(5, 2),
    distance_remaining_km NUMERIC(6, 2),
    eta_minutes INT,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deliv_loc_booking_time ON delivery_location_updates(delivery_booking_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS delivery_webhooks (
    id TEXT PRIMARY KEY,
    provider VARCHAR(50) NOT NULL,
    provider_event_id VARCHAR(120) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload_hash VARCHAR(64) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(50) NOT NULL DEFAULT 'PROCESSED',
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_delivery_webhooks_provider_event UNIQUE (provider, provider_event_id)
);

CREATE INDEX IF NOT EXISTS idx_deliv_webhooks_event ON delivery_webhooks(provider, provider_event_id);
