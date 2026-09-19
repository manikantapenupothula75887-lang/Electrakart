-- ElectraKart Relational Schema (PostgreSQL 16+)
-- Migration 003: Zero-Leakage Customer Projection Views

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
