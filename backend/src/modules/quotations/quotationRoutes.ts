import { FastifyInstance } from 'fastify';
import { db } from '../../db/connection.js';
import { optionalAuthenticate } from '../../middleware/auth.js';
import { checkIdempotency, recordIdempotency } from '../../middleware/idempotency.js';

export async function quotationRoutes(fastify: FastifyInstance) {
  // Generate 48-hour locked quotation (with idempotency support)
  fastify.post('/quotations/generate', { preHandler: [optionalAuthenticate] }, async (request, reply) => {
    // 1. Check Idempotency Key
    if (await checkIdempotency(request, reply)) {
      return;
    }

    const {
      customerName = 'Anil Kumar Reddy',
      customerPhone = '+91 98481 99882',
      deliveryAddress = 'Flat 301, Sri Sai Residency, Guru Nanak Colony, Vijayawada',
      city = 'Vijayawada',
      pincode = '520008',
      items = [],
    } = (request.body as any) || {};

    if (!Array.isArray(items) || items.length === 0) {
      return reply.status(400).send({
        type: 'https://api.electrakart.com/errors/validation-error',
        title: 'Empty Items',
        status: 400,
        detail: 'Cannot generate quotation with empty items array.',
        instance: request.url,
        requestId: request.id,
      });
    }

    const quoId = `quo-${Date.now()}`;
    const quotationNumber = `EK-QUO-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    let subtotal = 0;
    const computedItems: any[] = [];

    for (const it of items) {
      const skuRes = await db.query(
        'SELECT id, name, brand_id, series_id, selling_price_inr, specification, unit_of_measure FROM skus WHERE sku_code = $1 OR id = $1',
        [it.sku]
      );

      const rate = parseFloat(skuRes.rows[0]?.selling_price_inr || it.rate || 500);
      const qty = it.quantity || 1;
      const totalAmount = rate * qty;
      const gstAmount = Math.round(totalAmount * 0.18);

      computedItems.push({
        id: `${quoId}-item-${computedItems.length + 1}`,
        skuId: skuRes.rows[0]?.id || it.sku,
        sku: it.sku,
        name: skuRes.rows[0]?.name || it.name || it.sku,
        brand: it.brand || 'Polycab',
        series: it.series || 'Standard',
        specification: skuRes.rows[0]?.specification || it.specification || '',
        quantity: qty,
        unit: skuRes.rows[0]?.unit_of_measure || it.unit || 'Nos',
        rate,
        gstPercent: 18,
        gstAmount,
        totalAmount: totalAmount + gstAmount,
      });

      subtotal += totalAmount;
    }

    const discount = subtotal > 20000 ? 1500 : 0;
    const gstTotal = Math.round((subtotal - discount) * 0.18);
    const deliveryFee = 0; // Free for locked quotation
    const grandTotal = subtotal - discount + gstTotal + deliveryFee;

    const now = new Date();
    const expiry = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const customerId = request.user?.id || 'usr-customer-1';

    const quotation = await db.withTransaction(async (tx) => {
      await tx.query(
        `INSERT INTO quotations (
          id, quotation_number, customer_id, customer_name, customer_phone,
          delivery_address, city, pincode, subtotal_inr, discount_inr,
          delivery_fee_inr, gst_total_inr, grand_total_inr, is_price_locked,
          locked_until_timestamp, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, TRUE, $14, 'LOCKED', NOW())`,
        [
          quoId,
          quotationNumber,
          customerId,
          customerName,
          customerPhone,
          deliveryAddress,
          city,
          pincode,
          subtotal,
          discount,
          deliveryFee,
          gstTotal,
          grandTotal,
          expiry.toISOString(),
        ]
      );

      for (const cit of computedItems) {
        await tx.query(
          `INSERT INTO quotation_items (
            id, quotation_id, sku_id, sku_code, product_name,
            brand_name, series_name, specification_details, quantity,
            unit, unit_rate_inr, gst_rate_percent, gst_amount_inr, line_total_inr
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          [
            cit.id,
            quoId,
            cit.skuId,
            cit.sku,
            cit.name,
            cit.brand,
            cit.series,
            cit.specification,
            cit.quantity,
            cit.unit,
            cit.rate,
            cit.gstPercent,
            cit.gstAmount,
            cit.totalAmount,
          ]
        );
      }

      return {
        id: quoId,
        quotationNumber,
        createdAt: now.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
        validUntil: expiry.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
        customerName,
        customerPhone,
        deliveryAddress,
        city,
        pincode,
        items: computedItems,
        subtotal,
        discount,
        deliveryFee,
        gstTotal,
        grandTotal,
        isPriceLocked: true,
        status: 'LOCKED',
      };
    });

    // Record idempotency key if provided
    const idempotencyKey = request.headers['idempotency-key'] as string | undefined;
    if (idempotencyKey) {
      await recordIdempotency(idempotencyKey, request.user?.id, request.url, request.body, 201, quotation);
    }

    return reply.status(201).send(quotation);
  });

  // Get all quotations (scoped to user if customer)
  fastify.get('/quotations', { preHandler: [optionalAuthenticate] }, async (request, reply) => {
    let sql = 'SELECT * FROM quotations ORDER BY created_at DESC';
    const params: any[] = [];

    if (request.user?.role === 'CUSTOMER') {
      sql = 'SELECT * FROM quotations WHERE customer_id = $1 ORDER BY created_at DESC';
      params.push(request.user.id);
    }

    const res = await db.query(sql, params);
    return reply.send(res.rows);
  });

  // Get quotation by ID or Number (with IDOR ownership protection)
  fastify.get('/quotations/:id', { preHandler: [optionalAuthenticate] }, async (request, reply) => {
    const { id } = request.params as any;

    const qRes = await db.query(
      'SELECT * FROM quotations WHERE id = $1 OR quotation_number = $1 LIMIT 1',
      [id]
    );

    if (qRes.rows.length === 0) {
      return reply.status(404).send({
        type: 'https://api.electrakart.com/errors/not-found',
        title: 'Quotation Not Found',
        status: 404,
        detail: `Quotation '${id}' was not found.`,
        instance: request.url,
      });
    }

    const quotation = qRes.rows[0];

    // IDOR check
    if (request.user?.role === 'CUSTOMER' && quotation.customer_id && quotation.customer_id !== request.user.id) {
      return reply.status(403).send({
        type: 'https://api.electrakart.com/errors/forbidden',
        title: 'Forbidden',
        status: 403,
        detail: 'You do not have permission to view another customer’s quotation.',
        instance: request.url,
      });
    }

    const itemsRes = await db.query(
      'SELECT id, sku_code AS "sku", product_name AS "name", brand_name AS "brand", series_name AS "series", specification_details AS "specification", quantity, unit, unit_rate_inr AS "rate", gst_rate_percent AS "gstPercent", gst_amount_inr AS "gstAmount", line_total_inr AS "totalAmount" FROM quotation_items WHERE quotation_id = $1',
      [quotation.id]
    );

    return reply.send({
      id: quotation.id,
      quotationNumber: quotation.quotation_number,
      createdAt: quotation.created_at,
      validUntil: quotation.locked_until_timestamp,
      customerName: quotation.customer_name,
      customerPhone: quotation.customer_phone,
      deliveryAddress: quotation.delivery_address,
      city: quotation.city,
      pincode: quotation.pincode,
      subtotal: parseFloat(quotation.subtotal_inr),
      discount: parseFloat(quotation.discount_inr),
      deliveryFee: parseFloat(quotation.delivery_fee_inr),
      gstTotal: parseFloat(quotation.gst_total_inr),
      grandTotal: parseFloat(quotation.grand_total_inr),
      isPriceLocked: quotation.is_price_locked,
      status: quotation.status,
      items: itemsRes.rows,
    });
  });

  // Accept quotation
  fastify.post('/quotations/:id/accept', { preHandler: [optionalAuthenticate] }, async (request, reply) => {
    const { id } = request.params as any;

    const qRes = await db.query('SELECT customer_id FROM quotations WHERE id = $1 OR quotation_number = $1 LIMIT 1', [id]);
    if (qRes.rows.length === 0) {
      return reply.status(404).send({
        type: 'https://api.electrakart.com/errors/not-found',
        title: 'Quotation Not Found',
        status: 404,
        detail: `Quotation '${id}' was not found.`,
        instance: request.url,
      });
    }

    if (request.user?.role === 'CUSTOMER' && qRes.rows[0].customer_id && qRes.rows[0].customer_id !== request.user.id) {
      return reply.status(403).send({
        type: 'https://api.electrakart.com/errors/forbidden',
        title: 'Forbidden',
        status: 403,
        detail: 'You do not have permission to accept another customer’s quotation.',
        instance: request.url,
      });
    }

    await db.query(
      "UPDATE quotations SET status = 'ACCEPTED' WHERE id = $1 OR quotation_number = $1",
      [id]
    );

    return reply.send({ status: 'ACCEPTED', quotationId: id });
  });
}
