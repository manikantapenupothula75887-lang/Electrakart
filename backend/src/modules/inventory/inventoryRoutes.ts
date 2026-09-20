import { FastifyInstance } from 'fastify';
import { db } from '../../db/connection.js';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { inventoryLedgerService } from './inventory.ledger.service.js';
import { auditService } from '../audit/audit.service.js';

export async function inventoryRoutes(fastify: FastifyInstance) {
  // Get stock for authenticated partner (Retailer or Distributor) with IDOR protection
  fastify.get(
    '/inventory/partner-stock',
    { preHandler: [authenticate, requireRole('RETAILER', 'DISTRIBUTOR', 'ADMIN')] },
    async (request, reply) => {
      const user = request.user!;
      let partnerId = user.partnerId || 'partner-vja-elec-1';
      const queryPartnerId = (request.query as any)?.partnerId;

      if (user.role !== 'ADMIN') {
        if (queryPartnerId && queryPartnerId !== user.partnerId) {
          return reply.status(403).send({
            type: 'https://api.electrakart.com/errors/forbidden',
            title: 'Forbidden',
            status: 403,
            detail: 'You are not authorized to view another partner’s private inventory.',
            instance: request.url,
          });
        }
      } else if (queryPartnerId) {
        partnerId = queryPartnerId;
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

  // Adjust Partner Stock (Cycle Count / Manual) with IDOR protection
  fastify.patch(
    '/inventory/partner-stock/:sku',
    { preHandler: [authenticate, requireRole('RETAILER', 'DISTRIBUTOR', 'ADMIN')] },
    async (request, reply) => {
      const { sku } = request.params as any;
      const { deltaQuantity, reason = 'MANUAL_ADJUSTMENT', notes } = (request.body as any) || {};

      if (typeof deltaQuantity !== 'number' || isNaN(deltaQuantity)) {
        return reply.status(400).send({
          type: 'https://api.electrakart.com/errors/validation-error',
          title: 'Invalid Request',
          status: 400,
          detail: 'deltaQuantity must be a valid number.',
          instance: request.url,
          invalidParams: [{ name: 'deltaQuantity', reason: 'Must be a numeric value' }],
        });
      }

      const user = request.user!;
      let partnerId = user.partnerId || 'partner-vja-elec-1';
      const bodyPartnerId = (request.body as any)?.partnerId;

      if (user.role !== 'ADMIN') {
        if (bodyPartnerId && bodyPartnerId !== user.partnerId) {
          return reply.status(403).send({
            type: 'https://api.electrakart.com/errors/forbidden',
            title: 'Forbidden',
            status: 403,
            detail: 'You are not authorized to adjust inventory belonging to another partner.',
            instance: request.url,
          });
        }
      } else if (bodyPartnerId) {
        partnerId = bodyPartnerId;
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

        await inventoryLedgerService.recordEntry(
          {
            inventoryId: inv.id,
            partnerId,
            skuCode: sku,
            transactionType: 'ADJUSTMENT',
            quantityChange: deltaQuantity,
            previousQuantity: previousQty,
            newQuantity: newInStock,
            referenceType: 'MANUAL_ADJUSTMENT',
            referenceId: `adj-${Date.now()}`,
            notes: notes || 'Cycle count adjustment',
            createdByUserId: request.user!.id,
            metadata: { reason, deltaQuantity, previousQty, newInStock },
          },
          tx
        );
      });

      // Audit log sensitive inventory change
      await auditService.recordLog({
        actorUserId: request.user!.id,
        action: 'INVENTORY_ADJUSTMENT',
        entityType: 'INVENTORY',
        entityId: inv.id,
        oldValue: { inStock: previousQty, available: inv.available_quantity, sku },
        newValue: { inStock: newInStock, available: newAvailable, sku, deltaQuantity },
        ipAddress: request.ip,
        requestId: request.id,
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

  // Bulk Inward (Excel / Tally import) with IDOR protection
  fastify.post(
    '/inventory/bulk-inward',
    { preHandler: [authenticate, requireRole('RETAILER', 'DISTRIBUTOR', 'ADMIN')] },
    async (request, reply) => {
      const { items, invoiceNumber, invoiceDate } = (request.body as any) || {};

      if (!Array.isArray(items) || items.length === 0) {
        return reply.status(400).send({
          type: 'https://api.electrakart.com/errors/bad-request',
          title: 'Invalid Payload',
          status: 400,
          detail: 'items must be a non-empty array',
          instance: request.url,
        });
      }

      const user = request.user!;
      let partnerId = user.partnerId || 'partner-vja-elec-1';
      const bodyPartnerId = (request.body as any)?.partnerId;

      if (user.role !== 'ADMIN') {
        if (bodyPartnerId && bodyPartnerId !== user.partnerId) {
          return reply.status(403).send({
            type: 'https://api.electrakart.com/errors/forbidden',
            title: 'Forbidden',
            status: 403,
            detail: 'You are not authorized to inward stock into another partner’s inventory.',
            instance: request.url,
          });
        }
      } else if (bodyPartnerId) {
        partnerId = bodyPartnerId;
      }

      let processedCount = 0;

      await db.withTransaction(async (tx) => {
        for (const item of items) {
          const skuCode = item.sku;
          const qty = item.stock || item.quantity || 0;
          const price = item.price || item.sellingPrice || 100;
          const cost = item.purchaseCost || price * 0.85;

          const invRes = await tx.query(
            'SELECT id, in_stock_quantity, reserved_quantity FROM partner_inventories WHERE partner_id = $1 AND sku_code = $2',
            [partnerId, skuCode]
          );

          if (invRes.rows.length > 0) {
            const inv = invRes.rows[0];
            const newStock = inv.in_stock_quantity + qty;
            const newAvailable = Math.max(0, newStock - inv.reserved_quantity);

            await tx.query(
              'UPDATE partner_inventories SET in_stock_quantity = $1, available_quantity = $2, selling_price_inr = $3, last_updated = NOW() WHERE id = $4',
              [newStock, newAvailable, price, inv.id]
            );
          } else {
            const skuLookup = await tx.query('SELECT id FROM skus WHERE sku_code = $1', [skuCode]);
            if (skuLookup.rows.length > 0) {
              const skuId = skuLookup.rows[0].id;
              await tx.query(
                `INSERT INTO partner_inventories (id, partner_id, sku_id, sku_code, in_stock_quantity, reserved_quantity, available_quantity, purchase_cost_inr, selling_price_inr, last_updated)
                 VALUES ($1, $2, $3, $4, $5, 0, $5, $6, $7, NOW())`,
                [`inv-${Date.now()}-${processedCount}`, partnerId, skuId, skuCode, qty, cost, price]
              );
            }
          }
          processedCount++;
        }
      });

      return reply.send({
        success: true,
        itemsProcessed: processedCount,
        invoiceNumber: invoiceNumber || `INV-${Date.now()}`,
        invoiceDate: invoiceDate || new Date().toISOString().split('T')[0],
        message: `Successfully inwarded ${processedCount} inventory lines.`,
      });
    }
  );

  // Hyperlocal Store Stock Availability (Public endpoint with zero financial leakage)
  fastify.get('/inventory/nearby', async (request, reply) => {
    const { sku, city = 'Vijayawada' } = request.query as any;

    if (!sku) {
      return reply.status(400).send({
        type: 'https://api.electrakart.com/errors/missing-parameter',
        title: 'Missing SKU',
        status: 400,
        detail: 'Query parameter "sku" is required.',
        instance: request.url,
      });
    }

    const res = await db.query(
      `
      SELECT 
        p.id AS "partnerId",
        p.business_name AS "storeName",
        p.type AS "partnerType",
        s.city AS "city",
        s.address_line1 AS "address",
        p.rating AS "rating",
        inv.available_quantity AS "stockCount",
        inv.selling_price_inr AS "price",
        CASE 
          WHEN p.type = 'RETAILER' THEN 35
          ELSE 90
        END AS "deliveryEtaMin",
        CASE 
          WHEN p.id = 'partner-vja-elec-1' THEN 2.5
          WHEN p.id = 'partner-vja-elec-2' THEN 4.8
          ELSE 8.2
        END AS "distanceKm"
      FROM partner_inventories inv
      JOIN partners p ON inv.partner_id = p.id
      JOIN stores s ON s.partner_id = p.id
      WHERE inv.sku_code = $1 
        AND p.status = 'VERIFIED'
        AND s.is_active = TRUE
        AND inv.available_quantity > 0
      ORDER BY "distanceKm" ASC
    `,
      [sku]
    );

    return reply.send(res.rows);
  });

  // Get Inventory Ledger Transactions (RBAC: RETAILER, DISTRIBUTOR, ADMIN only. CUSTOMER forbidden)
  fastify.get(
    '/inventory/transactions',
    { preHandler: [authenticate, requireRole('RETAILER', 'DISTRIBUTOR', 'ADMIN')] },
    async (request, reply) => {
      const user = request.user!;
      const query = request.query as any;
      let partnerId = user.partnerId;

      if (user.role === 'ADMIN') {
        partnerId = query.partnerId || undefined;
      } else if (query.partnerId && query.partnerId !== user.partnerId) {
        return reply.status(403).send({
          type: 'https://api.electrakart.com/errors/forbidden',
          title: 'Forbidden',
          status: 403,
          detail: 'You are not authorized to view another partner’s inventory ledger transactions.',
          instance: request.url,
        });
      }

      const transactions = await inventoryLedgerService.getTransactions({
        partnerId,
        warehouseId: query.warehouseId,
        skuCode: query.sku,
        referenceId: query.referenceId,
        transactionType: query.type,
        limit: query.limit ? parseInt(query.limit, 10) : 50,
        offset: query.offset ? parseInt(query.offset, 10) : 0,
      });

      return reply.send(transactions);
    }
  );
}

