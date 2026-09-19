import { FastifyInstance } from 'fastify';
import { db } from '../../db/connection.js';
import { config } from '../../config/environment.js';

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/health', async (_request, reply) => {
    const dbHealth = await db.healthCheck();

    const response = {
      status: dbHealth.isHealthy ? 'ok' : 'degraded',
      api: 'running',
      database: dbHealth.isHealthy ? 'connected' : 'disconnected',
      databaseEngine: dbHealth.engine,
      environment: config.nodeEnv,
      serverTime: dbHealth.serverTime,
      version: '1.0.0',
    };

    const statusCode = dbHealth.isHealthy ? 200 : 503;
    return reply.status(statusCode).send(response);
  });
}
