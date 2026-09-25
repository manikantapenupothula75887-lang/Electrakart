/**
 * ElectraKart Automated Delivery Fastify Routes
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { DeliveryService } from './delivery.service.js';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { DeliveryStatus } from './delivery.types.js';

const deliveryService = new DeliveryService();

export async function deliveryRoutes(app: FastifyInstance): Promise<void> {
  // 1. Get Provider Status (Check Rapido configuration)
  app.get(
    '/deliveries/provider-status',
    { preHandler: [authenticate, requireRole('ADMIN', 'RETAILER', 'DISTRIBUTOR')] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const status = deliveryService.getProviderStatus();
      return reply.send(status);
    }
  );

  // 2. List Delivery Bookings
  app.get(
    '/deliveries/bookings',
    { preHandler: [authenticate, requireRole('ADMIN', 'RETAILER', 'DISTRIBUTOR')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = (request.query as { status?: DeliveryStatus }) || {};
      const list = await deliveryService.listBookings(query.status);
      return reply.send(list);
    }
  );

  // 3. Get Single Booking
  app.get(
    '/deliveries/bookings/:id',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = (request.params as { id: string }) || {};
      const booking = await deliveryService.getBookingById(id);
      if (!booking) {
        return reply.status(404).send({
          type: 'https://api.electrakart.com/errors/not-found',
          title: 'Booking Not Found',
          status: 404,
          detail: 'Delivery booking not found.',
        });
      }
      return reply.send(booking);
    }
  );

  // 4. Retry Failed Booking (Admin only)
  app.post(
    '/deliveries/bookings/:id/retry',
    { preHandler: [authenticate, requireRole('ADMIN')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = (request.params as { id: string }) || {};
        const retried = await deliveryService.retryFailedBooking(id);
        return reply.send(retried);
      } catch (err: any) {
        return reply.status(400).send({
          type: 'https://api.electrakart.com/errors/bad-request',
          title: 'Retry Failed',
          status: 400,
          detail: err.message,
        });
      }
    }
  );

  // 5. Manual Delivery Booking Trigger
  app.post(
    '/deliveries/bookings/manual',
    { preHandler: [authenticate, requireRole('ADMIN', 'RETAILER', 'DISTRIBUTOR')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = (request.body as { orderId: string; fulfillmentId: string }) || {};
        const { orderId, fulfillmentId } = body;
        if (!orderId || !fulfillmentId) {
          return reply.status(400).send({
            type: 'https://api.electrakart.com/errors/validation',
            title: 'Validation Failed',
            status: 400,
            detail: 'orderId and fulfillmentId are required.',
          });
        }
        const booking = await deliveryService.bookDeliveryForFulfillment(orderId, fulfillmentId);
        return reply.status(201).send(booking);
      } catch (err: any) {
        return reply.status(400).send({
          type: 'https://api.electrakart.com/errors/bad-request',
          title: 'Delivery Booking Failed',
          status: 400,
          detail: err.message,
        });
      }
    }
  );

  // 6. Live Delivery Tracking (Zomato/Swiggy-style telemetry payload)
  app.get('/deliveries/bookings/:id/tracking', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = (request.params as { id: string }) || {};
    const tracking = await deliveryService.getLiveTracking(id);
    if (!tracking) {
      return reply.status(404).send({
        type: 'https://api.electrakart.com/errors/not-found',
        title: 'Tracking Info Not Found',
        status: 404,
        detail: 'No active delivery or tracking data found for the given reference.',
      });
    }
    return reply.send(tracking);
  });

  // 7. Driver GPS Telemetry Ingestion (Driver App / Partner Portal)
  app.post('/deliveries/driver/location', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = (request.body as any) || {};
    const { deliveryBookingId, latitude, longitude } = body;

    if (!deliveryBookingId || latitude === undefined || longitude === undefined) {
      return reply.status(400).send({
        type: 'https://api.electrakart.com/errors/validation',
        title: 'Validation Failed',
        status: 400,
        detail: 'deliveryBookingId, latitude, and longitude are required.',
      });
    }

    try {
      const locationUpdate = await deliveryService.recordDriverLocation({
        deliveryBookingId,
        driverName: body.driverName,
        latitude: Number(latitude),
        longitude: Number(longitude),
        accuracy: body.accuracy ? Number(body.accuracy) : undefined,
        heading: body.heading ? Number(body.heading) : undefined,
        speed: body.speed ? Number(body.speed) : undefined,
        distanceRemainingKm: body.distanceRemainingKm ? Number(body.distanceRemainingKm) : undefined,
        etaMinutes: body.etaMinutes ? Number(body.etaMinutes) : undefined,
      });

      return reply.status(201).send(locationUpdate);
    } catch (err: any) {
      return reply.status(400).send({
        type: 'https://api.electrakart.com/errors/bad-request',
        title: 'Driver Location Ingestion Failed',
        status: 400,
        detail: err.message,
      });
    }
  });

  // 8. Delivery Carrier Webhooks (HMAC Verified & Idempotent)
  app.post('/deliveries/webhooks/:provider', async (request: FastifyRequest, reply: FastifyReply) => {
    const { provider } = (request.params as { provider: string }) || {};
    const signature =
      (request.headers['x-webhook-signature'] as string) ||
      (request.headers['x-rapido-signature'] as string) ||
      (request.headers['x-signature-sha256'] as string);

    try {
      const result = await deliveryService.handleDeliveryWebhook(provider, request.body, signature);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({
        type: 'https://api.electrakart.com/errors/webhook-error',
        title: 'Webhook Processing Error',
        status: 400,
        detail: err.message,
      });
    }
  });
}

