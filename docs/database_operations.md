# ElectraKart — Database Operations Guide

This document details the PostgreSQL database lifecycle management, versioned migration framework, connection pooling parameters, automated backup procedures, and disaster recovery runbooks for ElectraKart.

---

## 1. Schema Architecture & Structure

The ElectraKart relational model is organized into 32 normalized tables across core business domains:

- **Identity & Access**: `users`, `partners`, `partner_serviceable_pincodes`, `kyc_documents`, `audit_logs`
- **Product Catalog**: `product_categories`, `brands`, `products`, `product_attributes`, `product_pricing_tiers`, `raw_catalog_mappings`
- **Inventory & Warehouses**: `warehouses`, `partner_inventory`, `inventory_transactions`, `warehouse_stock_transfers`
- **Estimates & AI Disambiguation**: `estimates`, `estimate_items`, `ocr_extraction_runs`, `disambiguation_logs`
- **Quotations**: `quotations`, `quotation_items`, `price_lock_tokens`
- **Orders & Fulfillment**: `orders`, `order_items`, `order_status_history`, `payments`, `deliveries`, `proof_of_deliveries`
- **Infrastructure & Reliability**: `schema_migrations`, `idempotency_keys`

### Customer Isolation Security Views
To eliminate wholesale pricing and supplier cost leaks to end customers, the schema features row-and-column-isolated views:
- `v_customer_products`: Exposes only active, customer-visible catalog items with MRP and retail selling prices. Excludes supplier IDs, cost rates, and wholesale trade margins.

---

## 2. Versioned Migration Framework

ElectraKart utilizes an explicit, idempotent, forward-migrating SQL file system located in:
`backend/src/db/migrations/`

### Migration Numbering Convention
Migrations follow strict sequential semantic prefixes:
```
backend/src/db/migrations/
├── 001_initial_schema.sql
├── 002_composite_indexes.sql
├── 003_customer_views.sql
└── 004_idempotency_keys.sql
```

### Tracking Mechanism
Applied migrations are recorded in the `schema_migrations` table:
```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Executing Migrations
```bash
# In backend directory:
npm run migrate
```
The migration runner checks `schema_migrations`. Already executed scripts are safely skipped. Unapplied scripts are executed in alphanumeric sequence within isolated transactions.

---

## 3. Connection Pooling Configuration

ElectraKart utilizes the standard `pg` connection pool with production safeguards:

```typescript
const pool = new Pool({
  connectionString: config.databaseUrl,
  max: config.dbPoolMax,                     // Default: 20 connections
  idleTimeoutMillis: config.dbIdleTimeoutMs, // Default: 30,000 ms (30s)
  connectionTimeoutMillis: config.dbConnectionTimeoutMs, // Default: 5,000 ms (5s)
  ssl: config.isProduction ? { rejectUnauthorized: true } : false
});
```

### Tuning Recommendations
- **Single API Instance (2 vCPU)**: `DB_POOL_MAX=20`
- **Multi-Instance Container Cluster (4 instances)**: `DB_POOL_MAX=15` per instance (Total 60 connections against a 100-connection PostgreSQL tier).
- **Idle Timeout**: Retain at 30s to allow idle connections to terminate during traffic lulls without incurring reconnection overhead during peak shopping hours.

---

## 4. Automated Backup & Recovery Procedures

### 4.1 Daily Full Physical / Logical Backup
Run logical dumps nightly via cron or AWS RDS automated snapshots:
```bash
# Logical backup command
pg_dump \
  --format=custom \
  --compress=9 \
  --file="electrakart_backup_$(date +%Y%m%d_%H%M%S).dump" \
  --dbname="$DATABASE_URL"
```

### 4.2 Point-In-Time Recovery (PITR)
- **WAL Archiving**: Enable `wal_level = replica` and archive WAL segments to Amazon S3 or Google Cloud Storage every 5 minutes.
- **RPO (Recovery Point Objective)**: Under 5 minutes of transaction data.
- **RTO (Recovery Time Objective)**: Under 30 minutes to restore a warm standby database.

### 4.3 Database Restore Runbook
```bash
# 1. Stop backend services to avoid concurrent writes
docker compose -f docker-compose.prod.yml stop backend

# 2. Recreate target database
dropdb -h $DB_HOST -U $DB_USER electrakart_db
createdb -h $DB_HOST -U $DB_USER electrakart_db

# 3. Restore from custom dump
pg_restore \
  -h $DB_HOST \
  -U $DB_USER \
  -d electrakart_db \
  --clean \
  --if-exists \
  --no-owner \
  "electrakart_backup_20260919.dump"

# 4. Run schema migration check
npm run migrate

# 5. Restart backend services
docker compose -f docker-compose.prod.yml start backend
```

---

## 5. Maintenance & Housekeeping Runbook

### 5.1 Idempotency Key Cleanup
Idempotency keys are valid for 24 hours. A scheduled cron job should clean expired keys daily:
```sql
DELETE FROM idempotency_keys WHERE expires_at < NOW();
```

### 5.2 Vacuum & Analyze
PostgreSQL autovacuum handles standard row maintenance. For high-volume quotation and inventory tables, execute weekly maintenance during off-peak windows (03:00 AM IST):
```sql
VACUUM ANALYZE partner_inventory;
VACUUM ANALYZE quotations;
VACUUM ANALYZE orders;
```
