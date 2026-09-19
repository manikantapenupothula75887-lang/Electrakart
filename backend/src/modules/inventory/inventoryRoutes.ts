import { FastifyInstance } from 'fastify';
import { db } from '../../db/connection.js';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';

export async function inventoryRoutes(fastify: FastifyInstance) {
  // Get stock for authenticated partner (Retailer or Distributor)
  fastify.get(
    '/inventory/partner-stock',
    { preHandler: [authenticate, requireRole('RETAILER', 'DISTRIBUTOR', 'ADMIN')] },
    async (request, reply) => {
      let partnerId = request.user!.partnerId;
      const queryPartnerId = (request.query as any)?.partnerId;
      if (request.user!.role === 'ADMIN' && queryPartnerId) {
        partnerId = queryPartnerId;
      }

      if (!partnerId) {
        partnerId = 'partner-vja-elec-1';
      }

      const res = await db.query(
        `
        SELECT 
          inv.id,
          inv.sku_code AS "sku",
          s.name AS "productName",
          b.name AS "brand",
          bs.name AS "series",
          c.name AS "category",
          inv.in_stock_quantity AS "inStock",
          inv.reserved_quantity AS "reserved",
          inv.available_quantity AS "available",
          inv.low_stock_threshold AS "lowStockThreshold",
          inv.purchase_cost_inr AS "purchaseCostINR",
          inv.selling_price_inr AS "priceReference",
          TO_CHAR(inv.last_updated, 'YYYY-MM-DD HH24:MI') AS "lastUpdated",
          inv.partner_id AS "partnerId"
        FROM partner_inventories inv
        JOIN skus s ON inv.sku_code = s.sku_code
        JOIN brands b ON s.brand_id = b.id
        JOIN brand_series bs ON s.series_id = bs.id
        JOIN categories c ON s.category_id = c.id
        WHERE inv.partner_id = $1
        ORDER BY s.name ASC
      `,
        [partnerId]
      );

      return reply.send(res.rows);
    }
  );

  // Adjust Partner Stock (Cycle Count / Manual)
  fastify.patch(
    '/inventory/partner-stock/:sku',
    { preHandler: [authenticate, requireRole('RETAILER', 'DISTRIBUTOR', 'ADMIN')] },
    async (request, reply) => {
      const { sku } = request.params as any;
      const { deltaQuantity, reason = 'MANUAL_ADJUSTMENT', notes } = request.body as any;

      let partnerId = request.user!.partnerId || 'partner-vja-elec-1';
      if (request.user!.role === 'ADMIN' && (request.body as any)?.partnerId) {
        partnerId = (request.body as any).partnerId;
      }

      const invRes = await db.query(
        'SELECT id, in_stock_quantity, reserved_quantity FROM partner_inventories WHERE partner_id = $1 AND sku_code = $2',
        [partnerId, sku]
      );

      if (invRes.rows.length === 0) {
        return reply.status(404).send({
          type: 'https://api.electrakart.com/errors/not-found',
          title: 'Stock Record Not Found',
          status: 404,
          detail: `No inventory record found for partner '${partnerId}' and SKU '${sku}'`,
          instance: request.url,
        });
      }

      const inv = invRes.rows[0];
      const previousQty = inv.in_stock_quantity;
      const newInStock = Math.max(0, previousQty + deltaQuantity);
      const newAvailable = Math.max(0, newInStock - inv.reserved_quantity);

      await db.withTransaction(async (tx) => {
        await tx.query(
          `UPDATE partner_inventories 
           SET in_stock_quantity = $1, available_quantity = $2, last_updated = NOW()
           WHERE id = $3`,
          [newInStock, newAvailable, inv.id]
        );

        await tx.query(
          `INSERT INTO inventory_transactions (id, inventory_id, partner_id, sku_code, transaction_type, quantity_change, previous_quantity, new_quantity, notes, created_by_user_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            `tx-${Date.now()}`,
            inv.id,
            partnerId,
            sku,
            reason,
            deltaQuantity,
            previousQty,
            newInStock,
            notes || 'Cycle count adjustment',
            request.user!.id,
          ]
        );
      });

      return reply.send({
        sku,
        previousQuantity: previousQty,
        newQuantity: newInStock,
        availableQuantity: newAvailable,
        updatedAt: new Date().toISOString(),
      });
    }
  );

  // Bulk Inward (Excel / Tally import)
  fastify.post(
    '/inventory/bulk-inward',
    { preHandler: [authenticate, requireRole('RETAILER', 'DISTRIBUTOR', 'ADMIN')] },
    async (request, reply) => {
      const { items, invoiceNumber, invoiceDate } = request.body as any;
      const partnerId = request.user!.partnerId || 'partner-vja-elec-1';

      if (!Array.isArray(items) || items.length === 0) {
        return reply.status(400).send({
          type: 'https://api.electrakart.com/errors/bad-request',
          title: 'Invalid Payload',
          status: 400,
          detail: 'items must be a non-empty array',
          instance: request.url,
        });
      }

      let processedCount = 0;

      await db.withTransaction(async (tx) => {
        for (const item of items) {
          const invRes = await tx.query(
            'SELECT id, in_stock_quantity, reserved_quantity FROM partner_inventories WHERE partner_id = $1 AND sku_code = $2',
            [partnerId, item.sku]
          );

          if (invRes.rows.length > 0) {
            const current = invRes.rows[0];
            const newStock = current.in_stock_quantity + (item.inwardQuantity || item.stock || 0);
            const newAvailable = Math.max(0, newStock - current.reserved_quantity);

            await tx.query(
              `UPDATE partner_inventories 
               SET in_stock_quantity = $1, available_quantity = $2, last_updated = NOW()
               WHERE id = $3`,
              [newStock, newAvailable, current.id]
            );

            await tx.query(
              `INSERT INTO inventory_transactions (id, inventory_id, partner_id, sku_code, transaction_type, quantity_change, previous_quantity, new_quantity, reference_id, created_by_user_id)
               VALUES ($1, $2, $3, $4, 'INWARD_FACTORY', $5, $6, $7, $8, $9)`,
              [
                `tx-${Date.now()}-${processedCount}`,
                current.id,
                partnerId,
                item.sku,
                item.inwardQuantity || item.stock,
                current.in_stock_quantity,
                newStock,
                invoiceNumber || 'EXCEL_IMPORT',
                request.user!.id,
              ]
            );
            processedCount++;
          } else {
            // New partner inventory row
            const newInvId = `inv-${Date.now()}-${processedCount}`;
            const qty = item.inwardQuantity || item.stock || 0;
            const price = item.sellingPrice || item.price || 500;
            const cost = item.purchasePrice || price * 0.85;

            // Get sku_id
            const sRes = await tx.query('SELECT id FROM skus WHERE sku_code = $1', [item.sku]);
            const skuId = sRes.rows[0]?.id || `prod-${item.sku}`;

            await tx.query(
              `INSERT INTO partner_inventories (id, partner_id, sku_id, sku_code, in_stock_quantity, reserved_quantity, available_quantity, low_stock_threshold, purchase_cost_inr, selling_price_inr)
               VALUES ($1, $2, $3, $4, $5, 0, $5, 5, $6, $7)
               ON CONFLICT (partner_id, sku_code) DO UPDATE SET
                 in_stock_quantity = partner_inventories.in_stock_quantity + EXCLUDED.in_stock_quantity,
                 available_quantity = partner_inventories.available_quantity + EXCLUDED.available_quantity`,
              [newInvId, partnerId, skuId, item.sku, qty, cost, price]
            );
            processedCount++;
          }
        }
      });

      return reply.status(202).send({
        batchId: `batch-${Date.now()}`,
        status: 'PROCESSED',
        processedItemsCount: processedCount,
        invoiceNumber,
      });
    }
  );

  // Hyperlocal Stock by SKU and City (Customer Safe)
  fastify.get('/inventory/nearby', async (request, reply) => {
    const { sku, city = 'Vijayawada' } = request.query as any;

    if (!sku) {
      return reply.status(400).send({
        type: 'https://api.electrakart.com/errors/bad-request',
        title: 'Missing SKU',
        status: 400,
        detail: 'sku parameter is required',
        instance: request.url,
      });
    }

    const res = await db.query(
      `
      SELECT 
        p.id AS "partnerId",
        p.business_name AS "storeName",
        p.type AS "partnerType",
        p.city,
        p.address,
        p.rating,
        inv.available_quantity AS "stockCount",
        inv.selling_price_inr AS "price"
      FROM partner_inventories inv
      JOIN partners p ON inv.partner_id = p.id
      WHERE inv.sku_code = $1 AND p.city = $2 AND inv.available_quantity > 0 AND p.status = 'VERIFIED'
    `,
      [sku, city]
    );

    const stores = res.rows.map((st, idx) => ({
      ...st,
      distanceKm: idx === 0 ? 2.5 : 8.2,
      deliveryEtaMin: idx === 0 ? 45 : 90,
    }));

    return reply.send(stores);
  });
}
