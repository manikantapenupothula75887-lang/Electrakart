import { runMigrations } from '../src/db/migrate.js';
import { seedDatabase } from '../src/db/seed.js';
import { runAuthTests } from './auth.test.js';
import { runSecurityLeakageTests } from './security_leakage.test.js';
import { runOrdersInventoryTests } from './orders_inventory.test.js';
import { runProductionReadinessTests } from './production_readiness.test.js';
import { runPaymentsTests } from './payments.test.js';
import { db } from '../src/db/connection.js';

async function run() {
  console.log('====================================================');
  console.log('  ⚡ ElectraKart Automated Backend Test Suite');
  console.log('====================================================');

  try {
    // Reset schema and seed to clean state
    await runMigrations();
    await seedDatabase();

    // Run test suites
    await runAuthTests();
    await runSecurityLeakageTests();
    await runOrdersInventoryTests();
    await runProductionReadinessTests();
    await runPaymentsTests();

    console.log('\n====================================================');
    console.log('  🎉 ALL BACKEND TESTS PASSED (100% SUCCESS)');
    console.log('====================================================\n');
    await db.close();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Test Suite Failed:', err);
    await db.close();
    process.exit(1);
  }
}

run();
