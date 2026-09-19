import { FastifyInstance } from 'fastify';
import { db } from '../../db/connection.js';

export async function estimateRoutes(fastify: FastifyInstance) {
  // Upload estimate document or submit text
  fastify.post('/estimates/upload', async (request, reply) => {
    const { sampleId, rawCustomText, city = 'Vijayawada', pincode = '520002' } = request.body as any;

    const estimateId = `est-${Date.now()}`;
    await db.query(
      `INSERT INTO estimates (id, raw_text_payload, status, city, pincode)
       VALUES ($1, $2, 'NEEDS_REVIEW', $3, $4)`,
      [estimateId, rawCustomText || sampleId || 'Sample Estimate', city, pincode]
    );

    // Pre-populate realistic extracted items based on sample or default residential bill
    const isCommercial = sampleId === 'estimate-sample-2';
    const items = isCommercial
      ? [
          { id: `item-c1`, raw: 'Finolex FRLSH 1.5 sq mm blue wire - 6 Coils', qty: 6, unit: 'Coil (90m)', sku: 'FIN-FRL-15-BLU-90M', conf: 'HIGH' },
          { id: `item-c2`, raw: 'Finolex 4.0 sq mm green earth wire - 2 Coils', qty: 2, unit: 'Coil (90m)', sku: 'FIN-FRL-40-GRN-90M', conf: 'HIGH' },
          { id: `item-c3`, raw: 'Anchor Roma 8 module plate - 8 Nos', qty: 8, unit: 'Nos', sku: 'ANC-ROM-8M-PLT-WHT', conf: 'HIGH' },
          { id: `item-c4`, raw: 'Anchor Roma 6A 1-way modular switch - 40 Nos', qty: 4, unit: 'Pack (10 Nos)', sku: 'ANC-ROM-6A1W-WHT', conf: 'HIGH' },
          { id: `item-c5`, raw: 'Philips 15W round LED panel light - 12 Nos', qty: 12, unit: 'Nos', sku: 'PHI-STL-15W-WW', conf: 'HIGH' },
          { id: `item-c6`, raw: 'Schneider Acti9 16A MCB - 10 Nos', qty: 10, unit: 'Nos', sku: 'SCH-ACT-16A-SP', conf: 'HIGH' },
        ]
      : [
          { id: `item-r1`, raw: 'Polycab 2.5 sq mm red wire - 3 Coils', qty: 3, unit: 'Coil (90m)', sku: 'POL-WX-25-RED-90M', conf: 'HIGH' },
          { id: `item-r2`, raw: 'Polycab 1.5 sq mm yellow wire - 2 Coils', qty: 2, unit: 'Coil (90m)', sku: 'POL-WX-15-YEL-90M', conf: 'HIGH' },
          { id: `item-r3`, raw: 'Anchor 6-9 switch - 20 Nos', qty: 20, unit: 'Nos', sku: null, conf: 'MEDIUM' }, // Ambiguity item
          { id: `item-r4`, raw: 'Anchor Roma 6 module plate with frame - 6 Nos', qty: 6, unit: 'Nos', sku: 'ANC-ROM-6M-PLT-WHT', conf: 'HIGH' },
          { id: `item-r5`, raw: 'Legrand 16A shutter socket - 4 Nos', qty: 4, unit: 'Nos', sku: 'LEG-ART-16AS-MG', conf: 'HIGH' },
          { id: `item-r6`, raw: 'Havells 1200mm ceiling fan - 3 Nos', qty: 3, unit: 'Nos', sku: 'HAV-STL-1200-BLU', conf: 'HIGH' },
          { id: `item-r7`, raw: 'Schneider 16A SP MCB - 6 Nos', qty: 6, unit: 'Nos', sku: 'SCH-ACT-16A-SP', conf: 'HIGH' },
          { id: `item-r8`, raw: 'Polycab 63A 4 pole 30mA RCCB - 1 No', qty: 1, unit: 'Nos', sku: 'POL-RCCB-63A-4P30', conf: 'HIGH' },
        ];

    for (const it of items) {
      await db.query(
        `INSERT INTO estimate_items (id, estimate_id, raw_line_text, detected_quantity, detected_unit, confidence, confidence_score, matched_sku_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [it.id, estimateId, it.raw, it.qty, it.unit, it.conf, it.conf === 'HIGH' ? 0.95 : 0.65, it.sku]
      );
    }

    return reply.status(201).send({
      id: estimateId,
      status: 'NEEDS_REVIEW',
      totalItemsExtracted: items.length,
    });
  });

  // Get estimate details
  fastify.get('/estimates/:id', async (request, reply) => {
    const { id } = request.params as any;

    const estRes = await db.query('SELECT * FROM estimates WHERE id = $1', [id]);
    if (estRes.rows.length === 0) {
      return reply.status(404).send({
        type: 'https://api.electrakart.com/errors/not-found',
        title: 'Estimate Not Found',
        status: 404,
        detail: `Estimate with ID '${id}' not found`,
        instance: request.url,
      });
    }

    const itemsRes = await db.query(
      `SELECT 
        ei.id,
        ei.raw_line_text AS "rawText",
        ei.detected_quantity AS "quantity",
        ei.detected_unit AS "unit",
        ei.confidence,
        ei.is_resolved_by_customer AS "isResolved",
        s.sku_code AS "matchedSku",
        s.name AS "productName",
        s.selling_price_inr AS "price"
       FROM estimate_items ei
       LEFT JOIN skus s ON ei.matched_sku_id = s.sku_code OR ei.matched_sku_id = s.id
       WHERE ei.estimate_id = $1
       ORDER BY ei.id ASC`,
      [id]
    );

    return reply.send({
      ...estRes.rows[0],
      items: itemsRes.rows,
    });
  });

  // Resolve Ambiguity
  fastify.post('/estimates/:id/items/:itemId/resolve', async (request, reply) => {
    const { id, itemId } = request.params as any;
    const { chosenSku, quantity, unit } = request.body as any;

    await db.query(
      `UPDATE estimate_items
       SET matched_sku_id = $1, confidence = 'HIGH', confidence_score = 1.0, is_resolved_by_customer = TRUE,
           detected_quantity = COALESCE($2, detected_quantity), detected_unit = COALESCE($3, detected_unit)
       WHERE id = $4 AND estimate_id = $5`,
      [chosenSku, quantity, unit, itemId, id]
    );

    return reply.send({
      status: 'RESOLVED',
      itemId,
      chosenSku,
    });
  });
}
