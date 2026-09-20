/**
 * ElectraKart Fastify Payment & Financial Routes
 */

import { FastifyInstance } from 'fastify';
import { paymentService } from './payment.service.js';
import { optionalAuthenticate, authenticate } from '../../middleware/auth.js';
import { checkIdempotency, recordIdempotency } from '../../middleware/idempotency.js';

export async function paymentRoutes(fastify: FastifyInstance) {
  // 1. Create Payment Order (Server-Authoritative Calculation)
  fastify.post('/payments/create', { preHandler: [optionalAuthenticate] }, async (request, reply) => {
    // Check Idempotency Key
    if (await checkIdempotency(request, reply)) {
      return;
    }

    const {
      cart,
      orderId,
      customerName = 'Anil Kumar Reddy',
      customerPhone = '+91 98481 99882',
      deliveryAddress = 'Flat 301, Sri Sai Residency, Guru Nanak Colony, Vijayawada',
      city = 'Vijayawada',
      pincode = '520008',
      deliveryMethod = 'EXPRESS',
      paymentMethod = 'UPI',
      simulatedOutcome,
    } = (request.body as any) || {};

    if (!orderId && (!Array.isArray(cart) || cart.length === 0)) {
      return reply.status(400).send({
        type: 'https://api.electrakart.com/errors/invalid-request',
        title: 'Invalid Request',
        status: 400,
        detail: 'Either orderId or a non-empty cart array is required.',
        instance: request.url,
      });
    }

    if (!customerPhone || customerPhone.replace(/\D/g, '').length < 10) {
      return reply.status(400).send({
        type: 'https://api.electrakart.com/errors/invalid-phone',
        title: 'Invalid Phone Number',
        status: 400,
        detail: 'A valid 10-digit mobile number is required for OTP and order dispatch.',
        instance: request.url,
      });
    }

    try {
      const result = await paymentService.createPaymentOrder(
        {
          orderId,
          cart,
          customerName,
          customerPhone,
          deliveryAddress,
          city,
          pincode,
          deliveryMethod,
          paymentMethod,
          simulatedOutcome,
        },
        request.user
      );

      // Record Idempotency Key if header present
      const idempotencyKey = request.headers['idempotency-key'] as string | undefined;
      if (idempotencyKey) {
        await recordIdempotency(idempotencyKey, request.user?.id, request.url, request.body, 201, result);
      }

      return reply.status(201).send(result);
    } catch (err: any) {
      return reply.status(409).send({
        type: 'https://api.electrakart.com/errors/payment-creation-failed',
        title: 'Payment Order Creation Failed',
        status: 409,
        detail: err.message,
        instance: request.url,
      });
    }
  });

  // 2. Verify Payment (Cryptographic validation + Atomic Order Confirmation)
  fastify.post('/payments/verify', { preHandler: [optionalAuthenticate] }, async (request, reply) => {
    const {
      paymentId,
      orderId,
      providerPaymentId,
      providerOrderId,
      signature,
      simulatedOutcome,
    } = (request.body as any) || {};

    if (!paymentId && !providerOrderId) {
      return reply.status(400).send({
        type: 'https://api.electrakart.com/errors/validation-error',
        title: 'Validation Error',
        status: 400,
        detail: 'paymentId or providerOrderId is required.',
        instance: request.url,
      });
    }

    try {
      const result = await paymentService.verifyPayment(
        {
          paymentId,
          orderId,
          providerPaymentId,
          providerOrderId,
          signature,
          simulatedOutcome,
        },
        request.user
      );

      if (!result.isVerified || result.paymentStatus === 'FAILED' || result.paymentStatus === 'CANCELLED') {
        return reply.status(402).send({
          type: 'https://api.electrakart.com/errors/payment-failed',
          title: 'Payment Authorization Failed',
          status: 402,
          detail: result.failureReason || 'Payment authorization was declined or cancelled.',
          data: result,
          instance: request.url,
        });
      }

      return reply.status(200).send(result);
    } catch (err: any) {
      const status = err.message.includes('Forbidden') ? 403 : 409;
      return reply.status(status).send({
        type: 'https://api.electrakart.com/errors/payment-verification-failed',
        title: 'Payment Verification Error',
        status,
        detail: err.message,
        instance: request.url,
      });
    }
  });

  // 3. Retry Payment for existing unpaid/failed order
  fastify.post('/payments/retry', { preHandler: [optionalAuthenticate] }, async (request, reply) => {
    const { orderId, paymentMethod, simulatedOutcome } = (request.body as any) || {};

    if (!orderId) {
      return reply.status(400).send({
        type: 'https://api.electrakart.com/errors/validation-error',
        title: 'Validation Error',
        status: 400,
        detail: 'orderId is required to retry payment.',
        instance: request.url,
      });
    }

    try {
      const result = await paymentService.createPaymentOrder(
        {
          orderId,
          customerName: '',
          customerPhone: '',
          deliveryAddress: '',
          city: '',
          pincode: '',
          paymentMethod: paymentMethod || 'UPI',
          simulatedOutcome,
        },
        request.user
      );

      return reply.status(201).send(result);
    } catch (err: any) {
      const status = err.message.includes('Forbidden') ? 403 : 409;
      return reply.status(status).send({
        type: 'https://api.electrakart.com/errors/payment-retry-failed',
        title: 'Payment Retry Failed',
        status,
        detail: err.message,
        instance: request.url,
      });
    }
  });

  // 4. Inbound Webhook Endpoint
  fastify.post('/payments/webhook', async (request, reply) => {
    const signature =
      (request.headers['x-razorpay-signature'] as string) ||
      (request.headers['x-webhook-signature'] as string) ||
      (request.headers['x-signature'] as string) ||
      '';

    const rawBody = typeof request.body === 'string' ? request.body : JSON.stringify(request.body || {});

    try {
      const result = await paymentService.handleWebhook(rawBody, signature, request.headers);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({
        type: 'https://api.electrakart.com/errors/webhook-error',
        title: 'Webhook Verification Failed',
        status: 400,
        detail: err.message,
        instance: request.url,
      });
    }
  });

  // 5. Refund Endpoint (Admin Role Enforced)
  fastify.post('/payments/refund', { preHandler: [authenticate] }, async (request, reply) => {
    if (request.user?.role !== 'ADMIN') {
      return reply.status(403).send({
        type: 'https://api.electrakart.com/errors/forbidden',
        title: 'Forbidden',
        status: 403,
        detail: 'Only administrators can initiate refunds.',
        instance: request.url,
      });
    }

    const { paymentId, amountInr, reason } = (request.body as any) || {};

    if (!paymentId) {
      return reply.status(400).send({
        type: 'https://api.electrakart.com/errors/validation-error',
        title: 'Validation Error',
        status: 400,
        detail: 'paymentId is required.',
        instance: request.url,
      });
    }

    try {
      const result = await paymentService.processRefund(
        { paymentId, amountInr, reason: reason || 'Admin initiated refund' },
        request.user
      );
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(409).send({
        type: 'https://api.electrakart.com/errors/refund-failed',
        title: 'Refund Failed',
        status: 409,
        detail: err.message,
        instance: request.url,
      });
    }
  });

  // 6. Get Payment Status by ID
  fastify.get('/payments/:id', { preHandler: [optionalAuthenticate] }, async (request, reply) => {
    const { id } = request.params as any;

    try {
      const payment = await paymentService.getPaymentById(id, request.user);
      return reply.send(payment);
    } catch (err: any) {
      const status = err.message.includes('Forbidden') ? 403 : 404;
      return reply.status(status).send({
        type: 'https://api.electrakart.com/errors/not-found',
        title: 'Payment Not Found',
        status,
        detail: err.message,
        instance: request.url,
      });
    }
  });

  // 7. Get Customer Invoice
  fastify.get('/invoices/:orderId', { preHandler: [optionalAuthenticate] }, async (request, reply) => {
    const { orderId } = request.params as any;

    try {
      const invoice = await paymentService.getInvoiceByOrderId(orderId, request.user);
      return reply.send(invoice);
    } catch (err: any) {
      const status = err.message.includes('Forbidden') ? 403 : 404;
      return reply.status(status).send({
        type: 'https://api.electrakart.com/errors/not-found',
        title: 'Invoice Not Found',
        status,
        detail: err.message,
        instance: request.url,
      });
    }
  });

  // 8. Partner Settlements (Zero Customer Leakage Enforced)
  fastify.get('/settlements', { preHandler: [authenticate] }, async (request, reply) => {
    if (request.user?.role === 'CUSTOMER') {
      return reply.status(403).send({
        type: 'https://api.electrakart.com/errors/forbidden',
        title: 'Forbidden',
        status: 403,
        detail: 'Customers are not permitted to view partner financial settlements.',
        instance: request.url,
      });
    }

    try {
      const settlements = await paymentService.getSettlements(request.user);
      return reply.send(settlements);
    } catch (err: any) {
      return reply.status(403).send({
        type: 'https://api.electrakart.com/errors/forbidden',
        title: 'Forbidden',
        status: 403,
        detail: err.message,
        instance: request.url,
      });
    }
  });
}
