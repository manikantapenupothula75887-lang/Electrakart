import { FastifyInstance } from 'fastify';
import { db } from '../../db/connection.js';

export async function pricingRoutes(fastify: FastifyInstance) {
  // Evaluate dynamic pricing for cart items
  fastify.post('/pricing/evaluate-cart', async (request, reply) => {
    const { items = [], customerTier = 'HOMEOWNER' } = request.body as any;

    let subtotalINR = 0;
    const breakdowns: any[] = [];

    for (const item of items) {
      const skuRes = await db.query(
        'SELECT mrp_inr, selling_price_inr, gst_rate_percent FROM skus WHERE sku_code = $1',
        [item.sku]
      );

      const price = skuRes.rows[0]?.selling_price_inr || item.price || 500;
      const mrp = skuRes.rows[0]?.mrp_inr || price * 1.2;
      const qty = item.quantity || 1;
      const lineTotal = price * qty;

      subtotalINR += lineTotal;
      breakdowns.push({
        sku: item.sku,
        unitPrice: price,
        mrp,
        quantity: qty,
        lineTotal,
      });
    }

    // Trade discounts based on tier
    let discountPercent = 0;
    if (customerTier === 'ELECTRICIAN_PRO') discountPercent = 5.0;
    if (customerTier === 'CONTRACTOR_BULK') discountPercent = 8.0;

    const discountINR = Math.round((subtotalINR * discountPercent) / 100);
    const taxableAmount = Math.max(0, subtotalINR - discountINR);
    const gstTotalINR = Math.round(taxableAmount * 0.18);
    const deliveryFeeINR = taxableAmount > 5000 ? 0 : 150;
    const grandTotalINR = taxableAmount + gstTotalINR + deliveryFeeINR;

    return reply.send({
      subtotalINR,
      discountINR,
      discountPercent,
      deliveryFeeINR,
      gstTotalINR,
      grandTotalINR,
      tierApplied: customerTier,
      breakdowns,
    });
  });

  // Get active pricing rules
  fastify.get('/pricing/rules', async (_request, reply) => {
    const res = await db.query('SELECT * FROM pricing_rules WHERE is_active = TRUE');
    return reply.send(res.rows);
  });
}
