-- ElectraKart Relational Schema (PostgreSQL 16+)
-- Migration 006: Estimate OCR, Intelligent Catalog Matching & Clarification Workflow

-- 1. Extend Estimates Table
ALTER TABLE estimates DROP CONSTRAINT IF EXISTS estimates_status_check;
ALTER TABLE estimates ADD CONSTRAINT estimates_status_check CHECK (
  status IN (
    'UPLOADED',
    'PROCESSING',
    'ANALYZING',
    'EXTRACTED',
    'MATCHING',
    'NEEDS_CLARIFICATION',
    'PARTIALLY_RESOLVED',
    'READY_FOR_QUOTE',
    'RESOLVED',
    'QUOTED',
    'FAILED'
  )
);

ALTER TABLE estimates
  ADD COLUMN IF NOT EXISTS file_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS file_type VARCHAR(32) DEFAULT 'PDF',
  ADD COLUMN IF NOT EXISTS file_size_bytes INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ocr_provider VARCHAR(32) DEFAULT 'MOCK',
  ADD COLUMN IF NOT EXISTS raw_text_payload TEXT,
  ADD COLUMN IF NOT EXISTS city VARCHAR(100) DEFAULT 'Vijayawada',
  ADD COLUMN IF NOT EXISTS pincode VARCHAR(10) DEFAULT '520002';

-- 2. Extend Estimate Items Table
ALTER TABLE estimate_items DROP CONSTRAINT IF EXISTS estimate_items_confidence_check;
ALTER TABLE estimate_items ADD CONSTRAINT estimate_items_confidence_check CHECK (
  confidence IN ('HIGH', 'MEDIUM', 'LOW', 'AMBIGUOUS', 'NEEDS_REVIEW')
);

ALTER TABLE estimate_items
  ADD COLUMN IF NOT EXISTS raw_line_text TEXT,
  ADD COLUMN IF NOT EXISTS normalized_text TEXT,
  ADD COLUMN IF NOT EXISTS detected_quantity INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS detected_unit VARCHAR(50) DEFAULT 'Nos',
  ADD COLUMN IF NOT EXISTS confidence_score NUMERIC(3, 2) DEFAULT 1.00,
  ADD COLUMN IF NOT EXISTS match_status VARCHAR(32) DEFAULT 'EXACT_MATCH',
  ADD COLUMN IF NOT EXISTS candidate_options JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS matching_evidence JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS clarification_prompt TEXT,
  ADD COLUMN IF NOT EXISTS is_resolved_by_customer BOOLEAN DEFAULT FALSE;

-- 3. Composite & Performance Indexes
CREATE INDEX IF NOT EXISTS idx_estimates_customer_created ON estimates(customer_id, created_at);
CREATE INDEX IF NOT EXISTS idx_estimates_status ON estimates(status);
CREATE INDEX IF NOT EXISTS idx_estimate_items_estimate_id ON estimate_items(estimate_id);
CREATE INDEX IF NOT EXISTS idx_estimate_items_match_status ON estimate_items(estimate_id, match_status);
CREATE INDEX IF NOT EXISTS idx_skus_lookup_series ON skus(series_id, brand_id);
CREATE INDEX IF NOT EXISTS idx_skus_code_active ON skus(sku_code, is_active);
