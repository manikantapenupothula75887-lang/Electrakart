import { buildApp } from './app.js';
import { config } from './config/environment.js';
import { db } from './db/connection.js';
import { runMigrations } from './db/migrate.js';
import { seedDatabase } from './db/seed.js';

async function startServer() {
  console.log('[Server] Initializing ElectraKart Backend...');

  try {
    // 1. Ensure migrations and seed are up to date
    await runMigrations();
    await seedDatabase();

    // 2. Build Fastify app
    const app = buildApp();

    // 3. Graceful shutdown hooks
    const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
    for (const signal of signals) {
      process.on(signal, async () => {
        console.log(`\n[Server] Received ${signal}. Closing server gracefully...`);
        try {
          await app.close();
          await db.close();
          console.log('[Server] Closed successfully.');
          process.exit(0);
        } catch (err) {
          console.error('[Server] Error during shutdown:', err);
          process.exit(1);
        }
      });
    }

    // 4. Listen on configured port
    const address = await app.listen({
      port: config.port,
      host: config.host,
    });

    console.log(`\n======================================================`);
    console.log(`  ⚡ ElectraKart Production Backend API`);
    console.log(`  🚀 Server listening at: ${address}`);
    console.log(`  🩺 Health Check: ${address}/api/v1/health`);
    console.log(`  📦 Database Engine: ${db.getEngineType()}`);
    console.log(`======================================================\n`);
  } catch (err) {
    console.error('[Server] Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
