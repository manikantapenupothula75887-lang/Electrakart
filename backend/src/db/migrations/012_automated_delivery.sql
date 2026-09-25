-- ElectraKart Relational Schema (PostgreSQL 16+)
-- Migration 012: Automated Delivery Integration (Rapido & Carrier Abstraction)

-- 1. Delivery Bookings Table
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

-- 2. Delivery Status History Audit Log
CREATE TABLE IF NOT EXISTS delivery_status_history (
    id TEXT PRIMARY KEY,
    delivery_booking_id TEXT NOT NULL REFERENCES delivery_bookings(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    description TEXT,
    raw_payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delivery_history_booking ON delivery_status_history(delivery_booking_id, created_at DESC);
