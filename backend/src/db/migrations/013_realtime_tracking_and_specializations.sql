-- ElectraKart Relational Schema (PostgreSQL 16+)
-- Migration 013: Real-Time Tracking, Telemetry Ingestion, Webhook Audit & Specializations

-- 1. Extend order_fulfillments status check constraint to include OUT_FOR_DELIVERY
ALTER TABLE order_fulfillments DROP CONSTRAINT IF EXISTS order_fulfillments_status_check;
ALTER TABLE order_fulfillments ADD CONSTRAINT order_fulfillments_status_check 
CHECK (status IN ('CONFIRMED', 'PREPARING', 'PACKED', 'DISPATCHED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'));

-- 2. Extend orders overall_status check constraint to include OUT_FOR_DELIVERY
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_overall_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_overall_status_check 
CHECK (overall_status IN ('PLACED', 'CONFIRMED', 'PREPARING', 'PACKED', 'DISPATCHED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'));

-- 3. Electrician Location Updates Table (Telemetry History & Privacy Guard)
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

-- 4. Delivery Location Updates Table (Live Vehicle / Driver Telemetry)
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

-- 5. Delivery Webhooks Audit & Replay Protection Table
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
