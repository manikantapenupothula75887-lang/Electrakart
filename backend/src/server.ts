import { buildApp } from './app.js';
import { config } from './config/environment.js';
import { db } from './db/connection.js';
import { runMigrations } from './db/migrate.js';
import { seedDatabase } from './db/seed.js';

async function startServer() {
  console.log('[Server] Initializing ElectraKart Backend API...');
  console.log(`[Server] Environment: ${config.nodeEnv}`);

  try {
    // 1. Validate database connection
    await db.validateConnection();
    console.log(`[Server] Database connection validated (${db.getEngineType()}).`);

    // 2. Run pending migrations
    await runMigrations();

    // 3. Seed data only in development/test environments
    if (!config.isProduction) {
      await seedDatabase();
    }

    // 4. Build Fastify app
    const app = buildApp();

    // 5. Graceful shutdown handler
    let isShuttingDown = false;
    const shutdown = async (signal: string) => {
      if (isShuttingDown) return;
      isShuttingDown = true;

      console.log(`\n[Server] Received ${signal}. Initiating graceful shutdown...`);

      const forceExitTimer = setTimeout(() => {
        console.error('[Server] Graceful shutdown timed out (10s). Forcing termination.');
        process.exit(1);
      }, 10000);
      forceExitTimer.unref();

      try {
        console.log('[Server] Stopping HTTP server and draining active requests...');
        await app.close();
        console.log('[Server] Closing database connection pool...');
        await db.close();
        clearTimeout(forceExitTimer);
        console.log('[Server] Shutdown complete. Clean exit.');
        process.exit(0);
      } catch (err) {
        console.error('[Server] Error during shutdown:', err);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    // 6. Start listening
    const address = await app.listen({
      port: config.port,
      host: config.host,
    });

    console.log(`\n======================================================`);
    console.log(`  ⚡ ElectraKart Production-Hardened Backend API`);
    console.log(`  🚀 Server listening at: ${address}`);
    console.log(`  🩺 Liveness Probe:     ${address}/api/v1/health`);
    console.log(`  🚦 Readiness Probe:    ${address}/api/v1/ready`);
    console.log(`  📦 Database Engine:    ${db.getEngineType()}`);
    console.log(`======================================================\n`);
  } catch (err) {
    console.error('[Server] Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
