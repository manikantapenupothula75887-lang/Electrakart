-- ElectraKart Relational Schema (PostgreSQL 16+)
-- Migration 008: Customer Addresses, Maps Coordinates & Hyperlocal Fulfillment Topology

-- ============================================================================
-- 1. EXTEND ADDRESSES TABLE FOR MULTI-ADDRESS & LOCATION PROVENANCE
-- ============================================================================

ALTER TABLE addresses ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS address_type VARCHAR(20) DEFAULT 'HOME' CHECK (address_type IN ('HOME', 'OFFICE', 'OTHER'));
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE;
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS source VARCHAR(30) DEFAULT 'MANUAL' CHECK (source IN ('GPS', 'MANUAL', 'SAVED_ADDRESS', 'CHECKOUT_ADDRESS'));
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS country VARCHAR(50) DEFAULT 'India';
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7);
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7);
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS normalized_address TEXT;
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_pincode ON addresses(pincode);
CREATE INDEX IF NOT EXISTS idx_addresses_coords ON addresses(latitude, longitude);

-- ============================================================================
-- 2. EXTEND PARTNERS TABLE WITH COORDINATES & SERVICE RADIUS
-- ============================================================================

ALTER TABLE partners ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7);
ALTER TABLE partners ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7);
ALTER TABLE partners ADD COLUMN IF NOT EXISTS service_radius_km NUMERIC(5, 2) DEFAULT 10.00;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Sync existing partners delivery_radius_km to service_radius_km if set
UPDATE partners SET service_radius_km = delivery_radius_km WHERE delivery_radius_km IS NOT NULL AND (service_radius_km IS NULL OR service_radius_km = 10.00);

-- ============================================================================
-- 3. EXTEND STORES TABLE WITH COORDINATES & SERVICE RADIUS
-- ============================================================================

ALTER TABLE stores ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7);
ALTER TABLE stores ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7);
ALTER TABLE stores ADD COLUMN IF NOT EXISTS service_radius_km NUMERIC(5, 2) DEFAULT 8.00;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- ============================================================================
-- 4. EXTEND WAREHOUSES TABLE WITH COORDINATES, PINCODE & SERVICE RADIUS
-- ============================================================================

ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7);
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7);
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS pincode VARCHAR(10);
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS service_radius_km NUMERIC(5, 2) DEFAULT 50.00;

CREATE INDEX IF NOT EXISTS idx_partners_coords ON partners(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_stores_coords ON stores(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_warehouses_coords ON warehouses(latitude, longitude);
