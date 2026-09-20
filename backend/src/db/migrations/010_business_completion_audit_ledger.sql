-- ElectraKart Relational Schema (PostgreSQL 16+)
-- Migration 010: Phase 3G Business Completion, Audit Logging & Inventory Ledger

-- 1. Audit Logs Table (General Enterprise Audit Trail)
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

-- 2. Extended Inventory Transactions Ledger
ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS warehouse_id VARCHAR(64);
ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS sku_id VARCHAR(64);
ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS reference_type VARCHAR(50);
ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS before_quantity INT;
ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS after_quantity INT;
ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS quantity INT;
ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Relax / update transaction_type constraint so all standard and legacy types are allowed
ALTER TABLE inventory_transactions DROP CONSTRAINT IF EXISTS inventory_transactions_transaction_type_check;

-- 3. Stock Transfers Table (Distributor Multi-Warehouse Movements)
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

-- 4. Quotation Status Constraint Update
ALTER TABLE quotations DROP CONSTRAINT IF EXISTS quotations_status_check;
ALTER TABLE quotations ADD CONSTRAINT quotations_status_check CHECK (status IN ('DRAFT', 'GENERATED', 'LOCKED', 'ACCEPTED', 'ORDERED', 'EXPIRED', 'CANCELLED'));

-- 5. Partner Settlements Status Constraint Update & Anti-Duplicate Index
ALTER TABLE partner_settlements DROP CONSTRAINT IF EXISTS partner_settlements_status_check;
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_fulfillment_settlement 
ON partner_settlements (fulfillment_id) 
WHERE status NOT IN ('CANCELLED', 'FAILED');
