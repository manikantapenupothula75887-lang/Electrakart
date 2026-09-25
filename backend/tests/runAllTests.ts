import { runMigrations } from '../src/db/migrate.js';
import { seedDatabase } from '../src/db/seed.js';
import { runAuthTests } from './auth.test.js';
import { runSecurityLeakageTests } from './security_leakage.test.js';
import { runOrdersInventoryTests } from './orders_inventory.test.js';
import { runProductionReadinessTests } from './production_readiness.test.js';
import { runPaymentsTests } from './payments.test.js';
import { runEstimateOcrTests } from './estimate_ocr.test.js';
import { runLocationFulfillmentTests } from './location_fulfillment.test.js';
import { runNotificationCommunicationTests } from './notification_communication.test.js';
import { runBusinessCompletionTests } from './business_completion.test.js';
import { runFinalAcceptanceAuditTests } from './final_acceptance_audit.test.js';
import { runElectricianMarketplaceTests } from './electrician_marketplace.test.js';
import { runAutomatedDeliveryTests } from './automated_delivery.test.js';
import { runRealtimeTrackingTests } from './realtime_tracking.test.js';
import { runE2EBusinessFlowTests } from './e2e_business_flow.test.js';
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
    await runEstimateOcrTests();
    await runLocationFulfillmentTests();
    await runNotificationCommunicationTests();
    await runBusinessCompletionTests();
    await runFinalAcceptanceAuditTests();
    await runElectricianMarketplaceTests();
    await runAutomatedDeliveryTests();
    await runRealtimeTrackingTests();
    await runE2EBusinessFlowTests();

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
