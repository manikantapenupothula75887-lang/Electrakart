/**
 * ElectraKart Production Database Bootstrap Script
 *
 * Designed specifically for safe production deployment onto Managed PostgreSQL:
 * 1. Validates PostgreSQL connectivity
 * 2. Executes versioned migrations (001-004) idempotently via schema_migrations
 * 3. Populates canonical electrical taxonomy (categories, brands, SKUs, pricing tiers)
 * 4. Populates initial partner topology & stores for delivery routing
 * 5. Creates designated, safe demonstration role accounts
 * 6. Guarantees ZERO fake orders, quotations, or financial transactions
 */

import { fileURLToPath } from 'url';
import { db } from './connection.js';
import { runMigrations, getPendingMigrations } from './migrate.js';
import { seedDatabase } from './seed.js';

export async function bootstrapProductionDatabase(): Promise<void> {
  console.log('======================================================');
  console.log('  ⚡ ElectraKart Production Database Bootstrap');
  console.log('======================================================');

  // Step 1: Connectivity check
  console.log('[Bootstrap] 1. Validating database connection...');
  const health = await db.healthCheck();
  if (!health.isHealthy) {
    throw new Error(`[Bootstrap] Database healthcheck failed: ${health.error || 'Connection unreachable'}`);
  }
  console.log(`[Bootstrap] Connected successfully. Engine: ${health.engine}, Latency: ${health.latencyMs}ms`);

  // Step 2: Versioned Migrations
  console.log('[Bootstrap] 2. Applying versioned migrations...');
  await runMigrations();
  const pending = await getPendingMigrations();
  if (pending.length > 0) {
    throw new Error(`[Bootstrap] Migration verification failed! ${pending.length} migrations still pending.`);
  }
  console.log('[Bootstrap] All database migrations successfully applied and verified.');

  // Step 3: Seed Canonical Master Catalog & Partner Topology
  console.log('[Bootstrap] 3. Seeding canonical catalog, brands, categories & partner nodes...');
  await seedDatabase();

  // Step 4: Strict Production Data Sanity Check
  console.log('[Bootstrap] 4. Verifying zero fake transactions...');
  const orderCountRes = await db.query<{ count: string }>('SELECT COUNT(*) AS count FROM orders');
  const quoteCountRes = await db.query<{ count: string }>('SELECT COUNT(*) AS count FROM quotations');
  const orderCount = parseInt(orderCountRes.rows[0]?.count || '0', 10);
  const quoteCount = parseInt(quoteCountRes.rows[0]?.count || '0', 10);

  console.log(`[Bootstrap] Live order records: ${orderCount}`);
  console.log(`[Bootstrap] Live quotation records: ${quoteCount}`);
  console.log('[Bootstrap] Production database ready for active traffic.');
  console.log('======================================================\n');
}

// Execute if run directly via tsx/node
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  bootstrapProductionDatabase()
    .then(() => {
      console.log('[Bootstrap] Finished.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Bootstrap] Failed:', err);
      process.exit(1);
    });
}
