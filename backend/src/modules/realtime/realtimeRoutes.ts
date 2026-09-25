/**
 * ElectraKart Real-Time Streaming Routes (Server-Sent Events)
 * Exposes persistent streaming connections for order tracking, live vehicle telemetry,
 * and service job progression.
 */

import { FastifyInstance } from 'fastify';
import { eventHub } from './eventHub.js';
import { db } from '../../db/connection.js';

export async function realtimeRoutes(fastify: FastifyInstance) {
  fastify.get('/realtime/stream', async (request, reply) => {
    const query = request.query as any;
    const channel = query.channel as string;
    const token = query.token || (request.headers.authorization ? request.headers.authorization.replace('Bearer ', '') : undefined);

    if (!channel) {
      return reply.status(400).send({
        type: 'https://api.electrakart.com/errors/missing-channel',
        title: 'Missing Channel Parameter',
        status: 400,
        detail: 'The query parameter "channel" is required (e.g. order:<orderId>, delivery:<bookingId>, electrician:<jobId>).',
      });
    }

    // Optional authorization resolution
    let authenticatedUser: { id: string; role: string } | null = null;
    if (token) {
      try {
        authenticatedUser = fastify.jwt.verify(token) as any;
      } catch {
        // Token invalid - allow public reading if not admin channel, or reject if sensitive
      }
    }

    // Admin channel requires admin role
    if (channel.startsWith('admin:') && (!authenticatedUser || authenticatedUser.role !== 'ADMIN')) {
      return reply.status(403).send({
        type: 'https://api.electrakart.com/errors/forbidden',
        title: 'Forbidden',
        status: 403,
        detail: 'Admin channels require authenticated ADMIN credentials.',
      });
    }

    // Configure raw HTTP response for Server-Sent Events (SSE)
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache, no-transform');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('X-Accel-Buffering', 'no');
    reply.raw.flushHeaders?.();

    // Send initial handshake
    reply.raw.write(`event: connected\ndata: ${JSON.stringify({ status: 'CONNECTED', channel, timestamp: new Date().toISOString() })}\n\n`);

    // Subscribe to EventHub
    const unsubscribe = eventHub.subscribe(channel, (event) => {
      try {
        reply.raw.write(`event: ${event.eventType}\ndata: ${JSON.stringify(event)}\n\n`);
      } catch (err) {
        console.error('[RealtimeRoutes] Error writing event to stream:', err);
      }
    });

    // 20-second heartbeat to prevent proxy timeout
    const heartbeatTimer = setInterval(() => {
      try {
        reply.raw.write(`: keep-alive ${Date.now()}\n\n`);
      } catch {
        clearInterval(heartbeatTimer);
      }
    }, 20000);

    // Clean up on disconnect
    request.raw.on('close', () => {
      clearInterval(heartbeatTimer);
      unsubscribe();
    });

    // Return unresolved promise so Fastify keeps the connection open
    return new Promise(() => {});
  });
}
