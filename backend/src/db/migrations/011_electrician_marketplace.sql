-- ElectraKart Relational Schema (PostgreSQL 16+)
-- Migration 011: Electrician Marketplace Ecosystem

-- 1. Extend users role check constraint to include ELECTRICIAN
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('CUSTOMER', 'RETAILER', 'DISTRIBUTOR', 'ADMIN', 'ELECTRICIAN'));

-- 2. Electrician Profiles Table
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

-- 3. Electrician Specializations Table
CREATE TABLE IF NOT EXISTS electrician_specializations (
    id TEXT PRIMARY KEY,
    electrician_id TEXT NOT NULL REFERENCES electrician_profiles(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_electrician_spec UNIQUE (electrician_id, category)
);

CREATE INDEX IF NOT EXISTS idx_electrician_spec_cat ON electrician_specializations(category);
CREATE INDEX IF NOT EXISTS idx_electrician_spec_elec ON electrician_specializations(electrician_id);

-- 4. Electrician Service Requests Table
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

-- 5. Electrician Ratings & Feedback Table
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
