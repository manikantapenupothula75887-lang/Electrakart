-- ElectraKart Relational Schema (PostgreSQL 16+)
-- Migration 007: Estimate & Quotation Compatibility Columns

-- 1. Ensure estimates table has customer metadata
ALTER TABLE estimates
  ADD COLUMN IF NOT EXISTS customer_name VARCHAR(150),
  ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(20),
  ADD COLUMN IF NOT EXISTS sample_id VARCHAR(50),
  ADD COLUMN IF NOT EXISTS raw_text TEXT;

-- 2. Ensure estimate_items table has all matching fields
ALTER TABLE estimate_items
  ADD COLUMN IF NOT EXISTS raw_text TEXT,
  ADD COLUMN IF NOT EXISTS quantity INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT 'Nos',
  ADD COLUMN IF NOT EXISTS matched_sku_code VARCHAR(80),
  ADD COLUMN IF NOT EXISTS resolution_notes TEXT,
  ADD COLUMN IF NOT EXISTS is_resolved BOOLEAN DEFAULT FALSE;

-- 3. Ensure quotations table references estimate_id
ALTER TABLE quotations
  ADD COLUMN IF NOT EXISTS estimate_id TEXT;
