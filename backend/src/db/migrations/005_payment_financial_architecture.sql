-- ElectraKart Relational Schema (PostgreSQL 16+)
-- Migration 005: Payments, Invoices, Partner Settlements & Webhook Audit Logs

-- 1. Payments Table
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL DEFAULT 'MOCK',
    provider_order_id VARCHAR(150),
    provider_payment_id VARCHAR(150),
    amount_inr NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    payment_method VARCHAR(50) NOT NULL DEFAULT 'UPI',
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    signature TEXT,
    failure_reason TEXT,
    refund_status VARCHAR(50) NOT NULL DEFAULT 'NONE',
    refund_amount_inr NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    raw_response_payload JSONB,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure all columns exist if table was partially created in earlier schema
ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider VARCHAR(50) NOT NULL DEFAULT 'MOCK';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider_order_id VARCHAR(150);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider_payment_id VARCHAR(150);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS currency VARCHAR(10) NOT NULL DEFAULT 'INR';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS signature TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS failure_reason TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS refund_status VARCHAR(50) NOT NULL DEFAULT 'NONE';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS refund_amount_inr NUMERIC(12, 2) NOT NULL DEFAULT 0.00;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS raw_response_payload JSONB;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider_order_id ON payments(provider_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider_payment_id ON payments(provider_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- 2. Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    customer_id TEXT REFERENCES users(id),
    customer_name VARCHAR(150) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    billing_address TEXT NOT NULL,
    shipping_address TEXT NOT NULL,
    items JSONB NOT NULL,
    subtotal_inr NUMERIC(12, 2) NOT NULL,
    discount_inr NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    delivery_fee_inr NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    gst_total_inr NUMERIC(12, 2) NOT NULL,
    grand_total_inr NUMERIC(12, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    payment_status VARCHAR(50) NOT NULL DEFAULT 'PAID',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);

-- 3. Partner Settlements Table (Financial Ledger - Zero Customer Leakage)
CREATE TABLE IF NOT EXISTS partner_settlements (
    id TEXT PRIMARY KEY,
    settlement_number VARCHAR(50) UNIQUE NOT NULL,
    partner_id TEXT NOT NULL REFERENCES partners(id),
    order_id TEXT NOT NULL REFERENCES orders(id),
    fulfillment_id TEXT NOT NULL REFERENCES order_fulfillments(id),
    gross_amount_inr NUMERIC(12, 2) NOT NULL,
    commission_rate_percent NUMERIC(5, 2) NOT NULL,
    commission_amount_inr NUMERIC(12, 2) NOT NULL,
    net_settlement_inr NUMERIC(12, 2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    settled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_settlements_partner ON partner_settlements(partner_id, status);
CREATE INDEX IF NOT EXISTS idx_partner_settlements_order ON partner_settlements(order_id);

-- 4. Payment Webhook Logs (Duplicate Webhook Protection & Audit)
CREATE TABLE IF NOT EXISTS payment_webhook_logs (
    id TEXT PRIMARY KEY,
    provider VARCHAR(50) NOT NULL,
    event_id VARCHAR(150) UNIQUE,
    event_type VARCHAR(100) NOT NULL,
    order_id TEXT,
    payment_id TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'PROCESSED',
    payload_summary JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_event_id ON payment_webhook_logs(event_id);
