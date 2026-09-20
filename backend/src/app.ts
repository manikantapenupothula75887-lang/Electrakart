import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
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
import { paymentRoutes } from './modules/payments/payment.routes.js';
import { customerAddressRoutes } from './modules/location/customerAddressRoutes.js';
import { locationRoutes } from './modules/location/locationRoutes.js';
import { fulfillmentRoutes } from './modules/fulfillment/fulfillmentRoutes.js';

export function buildApp(): FastifyInstance {
  const app = Fastify({
    requestIdHeader: 'x-request-id',
    bodyLimit: config.bodyLimitBytes,
    logger: {
      level: config.logLevel,
      redact: [
        'req.headers.authorization',
        'req.headers.cookie',
        'body.password',
        'body.password_hash',
        'body.token',
        'body.accessToken',
        'body.refreshToken',
        'body.secret',
        'body.otp',
        'body.purchaseCost',
        'body.dealerMargin',
        'body.keySecret',
        'body.webhookSecret',
        'body.apiKey',
        'body.api_key',
        'body.signature',
        'body.bankAccount',
        'body.bank_account',
        'body.accountNumber',
        '*.password',
        '*.secret',
        '*.token',
      ],
    },
  });

  // 1. Security Headers (Helmet)
  app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        connectSrc: ["'self'", ...config.corsOrigins, 'https:', 'http:'],
      },
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    hsts: config.isProduction ? { maxAge: 31536000, includeSubDomains: true } : false,
  });

  // 2. Strict CORS Configuration
  app.register(cors, {
    origin: (origin, cb) => {
      // Allow non-browser agents (curl, server-to-server) where origin header is absent
      if (!origin) return cb(null, true);

      if (config.isProduction) {
        if (config.corsOrigins.includes(origin)) {
          return cb(null, true);
        }
        return cb(new Error('Not allowed by CORS'), false);
      }

      // Development / Test
      if (
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:') ||
        config.corsOrigins.includes(origin)
      ) {
        return cb(null, true);
      }

      return cb(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Request-ID',
      'Idempotency-Key',
      'X-Client-City',
      'X-Client-Pincode',
    ],
    exposedHeaders: ['X-Request-ID', 'X-Cache-Lookup'],
  });

  // 3. API Rate Limiting
  app.register(rateLimit, {
    max: config.rateLimitMax,
    timeWindow: config.rateLimitWindowMs,
    allowList: (req) => req.url.startsWith('/api/v1/health') || req.url.startsWith('/api/v1/ready'),
    errorResponseBuilder: (_req, context) => ({
      type: 'https://api.electrakart.com/errors/too-many-requests',
      title: 'Too Many Requests',
      status: 429,
      detail: `Rate limit exceeded. Try again in ${Math.round(context.ttl / 1000)} seconds.`,
      instance: _req.url,
      timestamp: new Date().toISOString(),
      requestId: _req.id,
      errorCode: 'ERR_RATE_LIMIT_EXCEEDED',
    }),
  });

  // 4. Return correlation Request ID on every response
  app.addHook('onSend', async (request, reply) => {
    reply.header('X-Request-ID', request.id);
  });

  // 5. JWT Authentication plugin
  app.register(jwt, {
    secret: config.jwtSecret,
  });

  // 6. Custom RFC 7807 Error Handler
  app.setErrorHandler(errorHandler);

  // 7. Register API Routes under /api/v1
  app.register(
    async (v1) => {
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
      v1.register(paymentRoutes);
      v1.register(customerAddressRoutes);
      v1.register(locationRoutes);
      v1.register(fulfillmentRoutes);
    },
    { prefix: '/api/v1' }
  );

  return app;
}
