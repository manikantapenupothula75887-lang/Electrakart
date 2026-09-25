import { FastifyInstance } from 'fastify';
import { optionalAuthenticate } from '../../middleware/auth.js';
import { estimateService } from './estimate.service.js';

export async function estimateRoutes(fastify: FastifyInstance) {
  // 1. Upload estimate document or submit text
  fastify.post('/estimates/upload', { preHandler: [optionalAuthenticate] }, async (request, reply) => {
    const body = (request.body as any) || {};
    const {
      filename,
      mimeType,
      fileBase64,
      sampleId,
      rawCustomText,
      city = 'Vijayawada',
      pincode = '520002',
      customerName = request.user?.fullName || body.customerName || 'Anil Kumar Reddy',
      customerPhone = body.customerPhone || '+91 98481 99882',
    } = body;

    let fileBuffer: Buffer | undefined;
    if (fileBase64) {
      fileBuffer = Buffer.from(fileBase64, 'base64');
    }

    const customerId = request.user?.id || 'usr-customer-1';

    try {
      const result = await estimateService.uploadAndProcessEstimate({
        customerId,
        customerName,
        customerPhone,
        city,
        pincode,
        fileBuffer,
        filename,
        mimeType,
        sampleId,
        rawCustomText,
      });

      return reply.status(201).send({
        id: result.estimateId,
        estimateId: result.estimateId,
        status: result.status,
        ocrProvider: result.ocrProvider,
        totalItemsExtracted: result.totalItemsExtracted,
        unresolvedCount: result.unresolvedCount,
        items: result.items,
        city: result.city,
        pincode: result.pincode,
      });
    } catch (err: any) {
      const status = err.statusCode || 500;
      return reply.status(status).send({
        type: err.type || 'https://api.electrakart.com/errors/estimate-processing-failed',
        title: err.title || 'Estimate Processing Failed',
        status,
        detail: err.message,
        instance: request.url,
      });
    }
  });

  // 2. Get estimate details with IDOR protection
  fastify.get('/estimates/:id', { preHandler: [optionalAuthenticate] }, async (request, reply) => {
    const { id } = request.params as any;

    try {
      const estimate = await estimateService.getEstimateById(id, request.user);
      return reply.send(estimate);
    } catch (err: any) {
      const status = err.statusCode || 500;
      return reply.status(status).send({
        type: 'https://api.electrakart.com/errors/estimate-not-found',
        title: 'Estimate Lookup Failed',
        status,
        detail: err.message,
        instance: request.url,
      });
    }
  });

  // 3. Customer Clarification for Ambiguous / Missing Spec Line Items
  fastify.post('/estimates/:id/items/:itemId/clarify', { preHandler: [optionalAuthenticate] }, async (request, reply) => {
    const { id, itemId } = request.params as any;
    const { chosenSku, quantity } = (request.body as any) || {};

    if (!chosenSku) {
      return reply.status(400).send({
        type: 'https://api.electrakart.com/errors/validation-error',
        title: 'Missing Required Field',
        status: 400,
        detail: 'A valid chosenSku must be provided to clarify line item.',
      });
    }

    try {
      const result = await estimateService.clarifyItem(id, itemId, chosenSku, quantity, request.user);
      return reply.send(result);
    } catch (err: any) {
      const status = err.statusCode || 500;
      return reply.status(status).send({
        type: 'https://api.electrakart.com/errors/clarification-failed',
        title: 'Item Clarification Failed',
        status,
        detail: err.message,
        instance: request.url,
      });
    }
  });

  // Legacy alias support: /estimates/:id/items/:itemId/resolve
  fastify.post('/estimates/:id/items/:itemId/resolve', { preHandler: [optionalAuthenticate] }, async (request, reply) => {
    const { id, itemId } = request.params as any;
    const { chosenSku, quantity } = (request.body as any) || {};
    try {
      const result = await estimateService.clarifyItem(id, itemId, chosenSku, quantity, request.user);
      return reply.send(result);
    } catch (err: any) {
      const status = err.statusCode || 500;
      return reply.status(status).send({
        type: 'https://api.electrakart.com/errors/resolution-failed',
        title: 'Item Resolution Failed',
        status,
        detail: err.message,
      });
    }
  });

  // 4. Generate 48-Hour Locked Quotation from Fully Resolved Estimate
  fastify.post('/estimates/:id/quote', { preHandler: [optionalAuthenticate] }, async (request, reply) => {
    const { id } = request.params as any;
    const customerDetails = (request.body as any) || {};

    try {
      const quotation = await estimateService.generateQuotationFromEstimate(id, customerDetails, request.user);
      return reply.status(201).send(quotation);
    } catch (err: any) {
      const status = err.statusCode || 500;
      return reply.status(status).send({
        type: 'https://api.electrakart.com/errors/quotation-generation-failed',
        title: 'Quotation Generation Failed',
        status,
        detail: err.message,
        instance: request.url,
      });
    }
  });
}
