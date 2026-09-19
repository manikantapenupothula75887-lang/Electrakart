import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { config } from './config/environment.js';
import { errorHandler } from './middleware/errorHandler.js';

// Route modules
import { healthRoutes } from './modules/health/healthRoutes.js';
import { authRoutes } from './modules/auth/authRoutes.js';
import { catalogRoutes } from './modules/catalog/catalogRoutes.js';
import { inventoryRoutes } from './modules/inventory/inventoryRoutes.js';
import { pricingRoutes } from './modules/pricing/pricingRoutes.js';
import { estimateRoutes } from './modules/estimates/estimateRoutes.js';
import { quotationRoutes } from './modules/quotations/quotationRoutes.js';
import { orderRoutes } from './modules/orders/orderRoutes.js';
import { partnerRoutes } from './modules/partners/partnerRoutes.js';
import { warehouseRoutes } from './modules/warehouses/warehouseRoutes.js';
import { notificationRoutes } from './modules/notifications/notificationRoutes.js';
import { adminRoutes } from './modules/admin/adminRoutes.js';

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: config.nodeEnv === 'development' ? { level: 'info' } : false,
  });

  // CORS
  app.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'Idempotency-Key'],
  });

  // JWT
  app.register(jwt, {
    secret: config.jwtSecret,
  });

  // Custom Error Handler (RFC 7807 Problem Details)
  app.setErrorHandler(errorHandler);

  // Register API Routes under /api/v1
  app.register(async (v1) => {
    v1.register(healthRoutes);
    v1.register(authRoutes);
    v1.register(catalogRoutes);
    v1.register(inventoryRoutes);
    v1.register(pricingRoutes);
    v1.register(estimateRoutes);
    v1.register(quotationRoutes);
    v1.register(orderRoutes);
    v1.register(partnerRoutes);
    v1.register(warehouseRoutes);
    v1.register(notificationRoutes);
    v1.register(adminRoutes);
  }, { prefix: '/api/v1' });

  return app;
}
