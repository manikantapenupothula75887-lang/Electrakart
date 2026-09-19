import { FastifyInstance } from 'fastify';
import { db } from '../../db/connection.js';

export async function quotationRoutes(fastify: FastifyInstance) {
  // Generate 48-hour locked quotation
  fastify.post('/quotations/generate', async (request, reply) => {
    const {
      customerName = 'Anil Kumar Reddy',
      customerPhone = '+91 98481 99882',
      deliveryAddress = 'Flat 301, Sri Sai Residency, Guru Nanak Colony, Vijayawada',
      city = 'Vijayawada',
      pincode = '520008',
      items = [],
    } = request.body as any;

    const quoId = `quo-${Date.now()}`;
    const quotationNumber = `EK-QUO-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    let subtotal = 0;
    const computedItems: any[] = [];

    for (const it of items) {
      const skuRes = await db.query(
        'SELECT name, brand_id, series_id, selling_price_inr, specification, unit_of_measure FROM skus WHERE sku_code = $1',
        [it.sku]
      );

      const rate = skuRes.rows[0]?.selling_price_inr || it.rate || 500;
      const qty = it.quantity || 1;
      const totalAmount = rate * qty;
      const gstAmount = Math.round(totalAmount * 0.18);

      computedItems.push({
        id: `q-item-${computedItems.length + 1}`,
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
    const gstTotal = Math.round(subtotal * 0.18);
    const deliveryFee = 0;
    const grandTotal = subtotal + gstTotal - discount + deliveryFee;

    const now = new Date();
    const expiry = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    await db.withTransaction(async (tx) => {
      await tx.query(
        `INSERT INTO quotations (id, quotation_number, customer_name, customer_phone, delivery_address, city, pincode, subtotal_inr, discount_inr, delivery_fee_inr, gst_total_inr, grand_total_inr, is_price_locked, locked_until_timestamp, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, TRUE, $13, 'LOCKED', $14)`,
        [
          quoId,
          quotationNumber,
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
          now.toISOString(),
        ]
      );

      for (const item of computedItems) {
        const sRes = await tx.query('SELECT id FROM skus WHERE sku_code = $1 OR id = $1', [item.sku]);
        const skuId = sRes.rows[0]?.id || item.sku;

        await tx.query(
          `INSERT INTO quotation_items (id, quotation_id, sku_id, sku_code, product_name, brand_name, series_name, specification_details, quantity, unit, unit_rate_inr, gst_rate_percent, gst_amount_inr, line_total_inr)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          [
            item.id,
            quoId,
            skuId,
            item.sku,
            item.name,
            item.brand,
            item.series,
            item.specification,
            item.quantity,
            item.unit,
            item.rate,
            item.gstPercent,
            item.gstAmount,
            item.totalAmount,
          ]
        );
      }
    });

    const quotation = {
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

    return reply.status(201).send(quotation);
  });

  // Get all quotations
  fastify.get('/quotations', async (_request, reply) => {
    const res = await db.query('SELECT * FROM quotations ORDER BY created_at DESC');
    return reply.send(res.rows);
  });

  // Get quotation by ID or Number
  fastify.get('/quotations/:id', async (request, reply) => {
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
  fastify.post('/quotations/:id/accept', async (request, reply) => {
    const { id } = request.params as any;

    await db.query(
      "UPDATE quotations SET status = 'ACCEPTED' WHERE id = $1 OR quotation_number = $1",
      [id]
    );

    return reply.send({ status: 'ACCEPTED', quotationId: id });
  });
}
