import { FastifyInstance } from 'fastify';
import { db } from '../../db/connection.js';
import { getPendingMigrations } from '../../db/migrate.js';

export async function healthRoutes(fastify: FastifyInstance) {
  // Liveness Probe: process is alive
  fastify.get('/health', async (_request, reply) => {
    const dbHealth = await db.healthCheck();
    return reply.status(200).send({
      status: 'ok',
      service: 'electrakart-api',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      database: dbHealth.isHealthy ? 'connected' : 'disconnected',
      environment: process.env.NODE_ENV || 'development',
    });
  });

  // Readiness Probe: process can serve real traffic
  fastify.get('/ready', async (_request, reply) => {
    try {
      const dbHealth = await db.healthCheck();
      if (!dbHealth.isHealthy) {
        return reply.status(503).send({
          status: 'not_ready',
          reason: 'Database disconnected',
          timestamp: new Date().toISOString(),
        });
      }

      const pending = await getPendingMigrations();
      if (pending.length > 0) {
        return reply.status(503).send({
          status: 'not_ready',
          reason: 'Database migrations pending',
          timestamp: new Date().toISOString(),
        });
      }

      return reply.status(200).send({
        status: 'ready',
        service: 'electrakart-api',
        database: {
          connected: true,
          status: 'connected',
          latencyMs: dbHealth.latencyMs,
        },
        migrations: {
          pendingCount: 0,
          status: 'current',
        },
        timestamp: new Date().toISOString(),
      });
    } catch {
      return reply.status(503).send({
        status: 'not_ready',
        reason: 'Service readiness check failed',
        timestamp: new Date().toISOString(),
      });
    }
  });
}
