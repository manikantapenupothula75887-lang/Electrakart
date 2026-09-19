-- ElectraKart Relational Schema (PostgreSQL 16+)
-- Migration 002: Composite & Performance Indexes

CREATE INDEX IF NOT EXISTS idx_users_role_active ON users(role, is_active);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);
CREATE INDEX IF NOT EXISTS idx_addresses_pincode ON addresses(pincode);
CREATE INDEX IF NOT EXISTS idx_addresses_city ON addresses(city);

CREATE INDEX IF NOT EXISTS idx_partner_inv_lookup ON partner_inventories(partner_id, sku_code);
CREATE INDEX IF NOT EXISTS idx_partner_inv_avail ON partner_inventories(sku_code, available_quantity);
CREATE INDEX IF NOT EXISTS idx_wh_inv_lookup ON warehouse_inventories(warehouse_id, sku_code);

CREATE INDEX IF NOT EXISTS idx_pincode_serv ON pincode_serviceability(pincode, is_hyperlocal_available);
CREATE INDEX IF NOT EXISTS idx_skus_brand ON skus(brand_id, is_active);
CREATE INDEX IF NOT EXISTS idx_skus_category ON skus(category_id, is_active);
CREATE INDEX IF NOT EXISTS idx_skus_series ON skus(series_id, is_active);

CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(overall_status);
CREATE INDEX IF NOT EXISTS idx_fulfillments_partner_status ON order_fulfillments(partner_id, status);
CREATE INDEX IF NOT EXISTS idx_fulfillments_order ON order_fulfillments(order_id);

CREATE INDEX IF NOT EXISTS idx_quotations_customer ON quotations(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_quotations_expiry ON quotations(locked_until_timestamp);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read, created_at);
CREATE INDEX IF NOT EXISTS idx_cat_mapping_status_time ON catalog_mapping_queue(status, submitted_at);
