/**
 * ElectraKart Notification Routes
 * Exposes REST endpoints for in-app notifications, unread counts,
 * channel preferences, retry mechanisms, and delivery status webhooks.
 */

import { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware/auth.js';
import { notificationService } from './notification.service.js';
import { NotificationChannel } from './notification.types.js';

export async function notificationRoutes(fastify: FastifyInstance) {
  // 1. Get In-App Notifications (Strictly scoped to user / tenant role)
  fastify.get('/notifications', { preHandler: [authenticate] }, async (request, reply) => {
    const user = request.user as { id: string; role: string };
    const { limit, offset, unreadOnly, role } = request.query as any;

    const notifications = await notificationService.getNotifications(user, {
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
      unreadOnly: unreadOnly === 'true' || unreadOnly === true,
      role,
    });

    const unreadCount = await notificationService.getUnreadCount(user);

    return reply.send({
      unreadCount,
      notifications,
    });
  });

  // 2. Fast Unread Count Endpoint
  fastify.get('/notifications/unread-count', { preHandler: [authenticate] }, async (request, reply) => {
    const user = request.user as { id: string; role: string };
    const unreadCount = await notificationService.getUnreadCount(user);
    return reply.send({ unreadCount });
  });

  // 3. Mark Single Notification as Read (Strict IDOR protection)
  fastify.patch('/notifications/:id/read', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as any;
    const user = request.user as { id: string; role: string };

    try {
      const result = await notificationService.markAsRead(id, user);
      return reply.send(result);
    } catch (err: any) {
      const status = err.statusCode || 500;
      return reply.status(status).send({
        type: 'https://api.electrakart.com/errors/notification-read-failed',
        title: 'Mark Read Failed',
        status,
        detail: err.message,
        instance: request.url,
      });
    }
  });

  // 4. Mark All Notifications as Read (PATCH and POST alias)
  const handleMarkAllRead = async (request: any, reply: any) => {
    const user = request.user as { id: string; role: string };
    await notificationService.markAllAsRead(user);
    return reply.send({ status: 'SUCCESS' });
  };

  fastify.patch('/notifications/read-all', { preHandler: [authenticate] }, handleMarkAllRead);
  fastify.post('/notifications/read-all', { preHandler: [authenticate] }, handleMarkAllRead);

  // 5. Notification Channel Preferences
  fastify.get('/notifications/preferences', { preHandler: [authenticate] }, async (request, reply) => {
    const user = request.user as { id: string; role: string };
    const preferences = await notificationService.getUserPreferences(user.id);
    return reply.send(preferences);
  });

  fastify.put('/notifications/preferences', { preHandler: [authenticate] }, async (request, reply) => {
    const user = request.user as { id: string; role: string };
    const body = (request.body as any) || {};

    const updated = await notificationService.updateUserPreferences(user.id, {
      inApp: body.inApp,
      email: body.email,
      sms: body.sms,
      whatsapp: body.whatsapp,
    });

    return reply.send(updated);
  });

  // 6. Retry Failed Notification Delivery
  fastify.post('/notifications/:id/retry', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as any;
    try {
      const result = await notificationService.retryNotification(id);
      return reply.send(result);
    } catch (err: any) {
      const status = err.statusCode || 500;
      return reply.status(status).send({
        type: 'https://api.electrakart.com/errors/notification-retry-failed',
        title: 'Retry Failed',
        status,
        detail: err.message,
        instance: request.url,
      });
    }
  });

  // 7. Delivery Status Webhooks (Idempotent, Signature Verified)
  fastify.post('/notifications/webhooks/:channel', async (request, reply) => {
    const { channel } = request.params as any;
    const normChannel = (channel || '').toUpperCase() as NotificationChannel;

    if (!['EMAIL', 'SMS', 'WHATSAPP'].includes(normChannel)) {
      return reply.status(400).send({
        type: 'https://api.electrakart.com/errors/invalid-channel',
        title: 'Invalid Webhook Channel',
        status: 400,
        detail: `Unsupported webhook channel: '${channel}'`,
      });
    }

    const signature =
      (request.headers['x-webhook-signature'] as string) ||
      (request.headers['x-hub-signature-256'] as string) ||
      (request.headers['x-twilio-signature'] as string) ||
      (request.headers['x-resend-signature'] as string);

    const rawBody = typeof request.body === 'string' ? request.body : JSON.stringify(request.body || {});

    try {
      const result = await notificationService.handleWebhook(
        normChannel,
        request.body as any,
        rawBody,
        signature
      );
      return reply.status(200).send(result);
    } catch (err: any) {
      const status = err.statusCode || 500;
      return reply.status(status).send({
        type: 'https://api.electrakart.com/errors/webhook-verification-failed',
        title: 'Webhook Processing Error',
        status,
        detail: err.message,
        instance: request.url,
      });
    }
  });
}
