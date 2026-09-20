import { FastifyInstance } from 'fastify';
import { optionalAuthenticate } from '../../middleware/auth.js';
import { fulfillmentSelectionService } from './fulfillment-selection.service.js';
import { FulfillmentCartItem } from './fulfillment.types.js';

export async function fulfillmentRoutes(fastify: FastifyInstance) {
  // 1. POST /fulfillment/plan - Authoritative fulfillment calculation
  fastify.post('/fulfillment/plan', { preHandler: [optionalAuthenticate] }, async (request, reply) => {
    const body = (request.body as any) || {};
    const { items = [], location, clientPartnerHint } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return reply.status(400).send({
        type: 'https://api.electrakart.com/errors/validation',
        title: 'Validation Error',
        status: 400,
        detail: 'Fulfillment calculation requires at least one cart item.',
        instance: request.url,
      });
    }

    try {
      const plan = await fulfillmentSelectionService.computeFulfillmentPlan({
        items: items as FulfillmentCartItem[],
        location,
        userId: request.user?.id,
        clientPartnerHint,
      });

      return reply.send({ plan });
    } catch (err: any) {
      const statusCode = err.statusCode || 500;
      return reply.status(statusCode).send({
        type: 'https://api.electrakart.com/errors/fulfillment-failed',
        title: 'Fulfillment Planning Failed',
        status: statusCode,
        detail: err.message || 'Could not compute fulfillment plan.',
        instance: request.url,
      });
    }
  });

  // 2. GET /fulfillment/nearby - Check nearby availability without exposing internal warehouse IDs
  fastify.get('/fulfillment/nearby', { preHandler: [optionalAuthenticate] }, async (request, reply) => {
    const query = (request.query as any) || {};
    const { sku_code, latitude, longitude, pincode, city } = query;

    if (!sku_code) {
      return reply.status(400).send({
        type: 'https://api.electrakart.com/errors/validation',
        title: 'Validation Error',
        status: 400,
        detail: 'sku_code is required.',
        instance: request.url,
      });
    }

    try {
      const plan = await fulfillmentSelectionService.computeFulfillmentPlan({
        items: [{ sku_code, quantity: 1 }],
        location: {
          latitude: latitude ? parseFloat(latitude) : undefined,
          longitude: longitude ? parseFloat(longitude) : undefined,
          pincode,
          city,
        },
        userId: request.user?.id,
      });

      const isNearby = plan.is_fulfillable && plan.groups.length > 0;
      const minDistance = isNearby ? Math.min(...plan.groups.map((g) => g.distance_km)) : null;
      const earliestEta = isNearby ? Math.min(...plan.groups.map((g) => g.estimated_delivery_hours)) : null;

      return reply.send({
        sku_code,
        is_available_nearby: isNearby,
        min_distance_km: minDistance,
        earliest_eta_hours: earliestEta,
        delivery_location: plan.delivery_location,
      });
    } catch (err: any) {
      const statusCode = err.statusCode || 500;
      return reply.status(statusCode).send({
        type: 'https://api.electrakart.com/errors/fulfillment-nearby-failed',
        title: 'Nearby Availability Check Failed',
        status: statusCode,
        detail: err.message || 'Could not check nearby availability.',
        instance: request.url,
      });
    }
  });
}
