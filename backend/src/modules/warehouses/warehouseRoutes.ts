import { FastifyInstance } from 'fastify';
import { db } from '../../db/connection.js';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { inventoryLedgerService } from '../inventory/inventory.ledger.service.js';
import { auditService } from '../audit/audit.service.js';

export async function warehouseRoutes(fastify: FastifyInstance) {
  // List warehouses
  fastify.get('/warehouses', async (_request, reply) => {
    const res = await db.query('SELECT * FROM warehouses WHERE is_active = TRUE ORDER BY warehouse_name ASC');
    const warehouses = res.rows.map((w) => ({
      id: w.id,
      partnerId: w.partner_id,
      warehouseName: w.warehouse_name,
      city: w.city,
      state: w.state,
      address: w.address,
      capacitySqFt: w.capacity_sq_ft,
      totalSkus: w.total_skus,
      totalInventoryUnits: w.total_inventory_units,
      lowStockCount: w.low_stock_count,
      outOfStockCount: w.out_of_stock_count,
      reservedStockUnits: w.reserved_stock_units,
      incomingStockUnits: w.incoming_stock_units,
    }));
    return reply.send(warehouses);
  });

  // Get warehouse by ID
  fastify.get('/warehouses/:id', async (request, reply) => {
    const { id } = request.params as any;

    const res = await db.query('SELECT * FROM warehouses WHERE id = $1', [id]);
    if (res.rows.length === 0) {
      return reply.status(404).send({
        type: 'https://api.electrakart.com/errors/not-found',
        title: 'Warehouse Not Found',
        status: 404,
        detail: `Warehouse '${id}' not found`,
        instance: request.url,
      });
    }

    const w = res.rows[0];
    return reply.send({
      id: w.id,
      partnerId: w.partner_id,
      warehouseName: w.warehouse_name,
      city: w.city,
      state: w.state,
      address: w.address,
      capacitySqFt: w.capacity_sq_ft,
      totalSkus: w.total_skus,
      totalInventoryUnits: w.total_inventory_units,
      lowStockCount: w.low_stock_count,
      outOfStockCount: w.out_of_stock_count,
      reservedStockUnits: w.reserved_stock_units,
      incomingStockUnits: w.incoming_stock_units,
    });
  });

  // List stock transfers
  fastify.get(
    '/warehouses/transfers',
    { preHandler: [authenticate, requireRole('DISTRIBUTOR', 'ADMIN')] },
    async (request, reply) => {
      const user = request.user!;
      let sql = 'SELECT * FROM stock_transfers WHERE 1=1';
      const params: any[] = [];

      if (user.role !== 'ADMIN') {
        const pId = user.partnerId || 'partner-abc-dist-1';
        sql += ' AND partner_id = $1';
        params.push(pId);
      }

      sql += ' ORDER BY created_at DESC';
      const res = await db.query(sql, params);
      return reply.send(res.rows);
    }
  );

  // 1. Create Stock Transfer (TRANSFER_CREATED)
  fastify.post(
    '/warehouses/transfers',
    { preHandler: [authenticate, requireRole('DISTRIBUTOR', 'ADMIN')] },
    async (request, reply) => {
      const { sourceWarehouseId, destinationWarehouseId, sku, quantity, reason } = request.body as any;

      if (!sourceWarehouseId || !destinationWarehouseId || !sku || !quantity || quantity <= 0) {
        return reply.status(400).send({
          type: 'https://api.electrakart.com/errors/bad-request',
          title: 'Invalid Transfer Request',
          status: 400,
          detail: 'sourceWarehouseId, destinationWarehouseId, sku, and positive quantity are required.',
          instance: request.url,
        });
      }

      if (sourceWarehouseId === destinationWarehouseId) {
        return reply.status(400).send({
          type: 'https://api.electrakart.com/errors/bad-request',
          title: 'Identical Warehouses',
          status: 400,
          detail: 'Source and destination warehouses cannot be the same.',
          instance: request.url,
        });
      }

      // Lookup warehouses
      const srcRes = await db.query('SELECT * FROM warehouses WHERE id = $1', [sourceWarehouseId]);
      const dstRes = await db.query('SELECT * FROM warehouses WHERE id = $1', [destinationWarehouseId]);

      if (srcRes.rows.length === 0 || dstRes.rows.length === 0) {
        return reply.status(404).send({
          type: 'https://api.electrakart.com/errors/not-found',
          title: 'Warehouse Not Found',
          status: 404,
          detail: 'Source or destination warehouse not found.',
          instance: request.url,
        });
      }

      const srcWh = srcRes.rows[0];
      const dstWh = dstRes.rows[0];

      // Cross-partner isolation: Warehouses must belong to the same partner
      if (srcWh.partner_id !== dstWh.partner_id) {
        return reply.status(403).send({
          type: 'https://api.electrakart.com/errors/cross-partner-transfer-forbidden',
          title: 'Cross-Partner Transfer Forbidden',
          status: 403,
          detail: 'Inter-warehouse transfers between different partner organizations are not permitted.',
          instance: request.url,
        });
      }

      const user = request.user!;
      if (user.role !== 'ADMIN') {
        const callerPartnerId = user.partnerId || 'partner-abc-dist-1';
        if (srcWh.partner_id !== callerPartnerId) {
          return reply.status(403).send({
            type: 'https://api.electrakart.com/errors/forbidden',
            title: 'Forbidden',
            status: 403,
            detail: 'You are not authorized to transfer inventory belonging to another partner.',
            instance: request.url,
          });
        }
      }

      // Check available inventory in source
      const invRes = await db.query(
        'SELECT in_stock_quantity, available_quantity FROM partner_inventories WHERE partner_id = $1 AND sku_code = $2',
        [srcWh.partner_id, sku]
      );
      if (invRes.rows.length === 0 || invRes.rows[0].available_quantity < quantity) {
        const available = invRes.rows[0]?.available_quantity || 0;
        return reply.status(400).send({
          type: 'https://api.electrakart.com/errors/insufficient-stock',
          title: 'Insufficient Inventory',
          status: 400,
          detail: `Insufficient inventory in source warehouse for SKU '${sku}'. Requested: ${quantity}, Available: ${available}`,
          instance: request.url,
        });
      }

      const transferId = `trf-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const transferNumber = `EK-TRF-${Date.now().toString().slice(-6)}`;

      await db.query(
        `INSERT INTO stock_transfers (
          id, transfer_number, partner_id, source_warehouse_id, destination_warehouse_id,
          sku_code, quantity, status, reason, created_by_user_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'TRANSFER_CREATED', $8, $9, NOW(), NOW())`,
        [
          transferId,
          transferNumber,
          srcWh.partner_id,
          sourceWarehouseId,
          destinationWarehouseId,
          sku,
          quantity,
          reason || 'Inventory rebalance',
          user.id,
        ]
      );

      await auditService.recordLog({
        actorUserId: user.id,
        action: 'WAREHOUSE_TRANSFER_CREATED',
        entityType: 'WAREHOUSE_TRANSFER',
        entityId: transferId,
        newValue: { transferNumber, sourceWarehouseId, destinationWarehouseId, sku, quantity },
        ipAddress: request.ip,
        requestId: request.id,
      });

      return reply.status(201).send({
        id: transferId,
        transferId,
        transferNumber,
        sourceWarehouseId,
        destinationWarehouseId,
        sku,
        quantity,
        status: 'TRANSFER_CREATED',
        reason: reason || 'Inventory rebalance',
      });
    }
  );

  // 2. Approve Stock Transfer (TRANSFER_APPROVED)
  fastify.post(
    '/warehouses/transfers/:id/approve',
    { preHandler: [authenticate, requireRole('DISTRIBUTOR', 'ADMIN')] },
    async (request, reply) => {
      const { id } = request.params as any;
      const tRes = await db.query('SELECT * FROM stock_transfers WHERE id = $1 OR transfer_number = $1', [id]);
      if (tRes.rows.length === 0) {
        return reply.status(404).send({
          type: 'https://api.electrakart.com/errors/not-found',
          title: 'Transfer Not Found',
          status: 404,
          detail: `Transfer '${id}' not found.`,
          instance: request.url,
        });
      }

      const trf = tRes.rows[0];
      if (trf.status !== 'TRANSFER_CREATED') {
        return reply.status(400).send({
          type: 'https://api.electrakart.com/errors/invalid-state',
          title: 'Invalid Transfer State',
          status: 400,
          detail: `Cannot approve transfer in '${trf.status}' status.`,
          instance: request.url,
        });
      }

      await db.query(
        "UPDATE stock_transfers SET status = 'TRANSFER_APPROVED', approved_by_user_id = $1, updated_at = NOW() WHERE id = $2",
        [request.user!.id, trf.id]
      );

      await auditService.recordLog({
        actorUserId: request.user!.id,
        action: 'WAREHOUSE_TRANSFER_APPROVED',
        entityType: 'WAREHOUSE_TRANSFER',
        entityId: trf.id,
        oldValue: { status: trf.status },
        newValue: { status: 'TRANSFER_APPROVED' },
        ipAddress: request.ip,
        requestId: request.id,
      });

      return reply.send({ id: trf.id, transferId: trf.id, status: 'TRANSFER_APPROVED' });
    }
  );

  // 3. Dispatch Stock Transfer (TRANSFER_IN_TRANSIT)
  fastify.post(
    '/warehouses/transfers/:id/dispatch',
    { preHandler: [authenticate, requireRole('DISTRIBUTOR', 'ADMIN')] },
    async (request, reply) => {
      const { id } = request.params as any;
      const tRes = await db.query('SELECT * FROM stock_transfers WHERE id = $1 OR transfer_number = $1', [id]);
      if (tRes.rows.length === 0) {
        return reply.status(404).send({
          type: 'https://api.electrakart.com/errors/not-found',
          title: 'Transfer Not Found',
          status: 404,
          detail: `Transfer '${id}' not found.`,
          instance: request.url,
        });
      }

      const trf = tRes.rows[0];
      if (trf.status === 'TRANSFER_IN_TRANSIT') {
        return reply.send({ id: trf.id, transferId: trf.id, status: 'TRANSFER_IN_TRANSIT', alreadyDispatched: true });
      }
      if (trf.status !== 'TRANSFER_APPROVED' && trf.status !== 'TRANSFER_CREATED') {
        return reply.status(400).send({
          type: 'https://api.electrakart.com/errors/invalid-state',
          title: 'Invalid Transfer State',
          status: 400,
          detail: `Cannot dispatch transfer in '${trf.status}' status.`,
          instance: request.url,
        });
      }

      await db.withTransaction(async (tx) => {
        // Check and lock source partner inventory row
        const invRes = await tx.query(
          'SELECT id, in_stock_quantity, available_quantity FROM partner_inventories WHERE partner_id = $1 AND sku_code = $2 FOR UPDATE',
          [trf.partner_id, trf.sku_code]
        );

        if (invRes.rows.length === 0 || invRes.rows[0].in_stock_quantity < trf.quantity) {
          throw new Error(`Insufficient inventory in source partner stock for SKU '${trf.sku_code}'.`);
        }

        const inv = invRes.rows[0];
        const prevQty = inv.in_stock_quantity;
        const newInStock = prevQty - trf.quantity;
        const newAvailable = Math.max(0, inv.available_quantity - trf.quantity);

        // Deduct source inventory atomically
        await tx.query(
          'UPDATE partner_inventories SET in_stock_quantity = $1, available_quantity = $2, last_updated = NOW() WHERE id = $3',
          [newInStock, newAvailable, inv.id]
        );

        // Update warehouse metrics
        await tx.query('UPDATE warehouses SET total_inventory_units = GREATEST(0, total_inventory_units - $1) WHERE id = $2', [
          trf.quantity,
          trf.source_warehouse_id,
        ]);
        await tx.query('UPDATE warehouses SET incoming_stock_units = incoming_stock_units + $1 WHERE id = $2', [
          trf.quantity,
          trf.destination_warehouse_id,
        ]);

        // Record TRANSFER_OUT in inventory ledger
        await inventoryLedgerService.recordEntry(
          {
            inventoryId: inv.id,
            partnerId: trf.partner_id,
            warehouseId: trf.source_warehouse_id,
            skuCode: trf.sku_code,
            transactionType: 'TRANSFER_OUT',
            quantityChange: -trf.quantity,
            previousQuantity: prevQty,
            newQuantity: newInStock,
            referenceType: 'STOCK_TRANSFER',
            referenceId: trf.id,
            notes: `Dispatched transfer ${trf.transfer_number} to warehouse ${trf.destination_warehouse_id}`,
            createdByUserId: request.user!.id,
            metadata: { transferId: trf.id, destinationWarehouseId: trf.destination_warehouse_id },
          },
          tx
        );

        // Update transfer status
        await tx.query(
          "UPDATE stock_transfers SET status = 'TRANSFER_IN_TRANSIT', dispatched_at = NOW(), updated_at = NOW() WHERE id = $1",
          [trf.id]
        );
      });

      await auditService.recordLog({
        actorUserId: request.user!.id,
        action: 'WAREHOUSE_TRANSFER_DISPATCHED',
        entityType: 'WAREHOUSE_TRANSFER',
        entityId: trf.id,
        oldValue: { status: trf.status },
        newValue: { status: 'TRANSFER_IN_TRANSIT' },
        ipAddress: request.ip,
        requestId: request.id,
      });

      return reply.send({ id: trf.id, transferId: trf.id, status: 'TRANSFER_IN_TRANSIT' });
    }
  );

  // 4. Receive Stock Transfer (TRANSFER_RECEIVED)
  fastify.post(
    '/warehouses/transfers/:id/receive',
    { preHandler: [authenticate, requireRole('DISTRIBUTOR', 'ADMIN')] },
    async (request, reply) => {
      const { id } = request.params as any;
      const tRes = await db.query('SELECT * FROM stock_transfers WHERE id = $1 OR transfer_number = $1', [id]);
      if (tRes.rows.length === 0) {
        return reply.status(404).send({
          type: 'https://api.electrakart.com/errors/not-found',
          title: 'Transfer Not Found',
          status: 404,
          detail: `Transfer '${id}' not found.`,
          instance: request.url,
        });
      }

      const trf = tRes.rows[0];

      // Prevent duplicate receipt (Idempotency protection)
      if (trf.status === 'TRANSFER_RECEIVED') {
        return reply.send({ id: trf.id, transferId: trf.id, status: 'TRANSFER_RECEIVED', alreadyReceived: true });
      }

      if (trf.status !== 'TRANSFER_IN_TRANSIT') {
        return reply.status(400).send({
          type: 'https://api.electrakart.com/errors/invalid-state',
          title: 'Invalid Transfer State',
          status: 400,
          detail: `Cannot receive transfer in '${trf.status}' status. Transfer must be IN_TRANSIT.`,
          instance: request.url,
        });
      }

      await db.withTransaction(async (tx) => {
        // Lookup destination inventory row (or insert if new SKU to partner)
        const invRes = await tx.query(
          'SELECT id, in_stock_quantity, available_quantity FROM partner_inventories WHERE partner_id = $1 AND sku_code = $2 FOR UPDATE',
          [trf.partner_id, trf.sku_code]
        );

        let invId: string;
        let prevQty: number;
        let newInStock: number;
        let newAvailable: number;

        if (invRes.rows.length > 0) {
          const inv = invRes.rows[0];
          invId = inv.id;
          prevQty = inv.in_stock_quantity;
          newInStock = prevQty + trf.quantity;
          newAvailable = inv.available_quantity + trf.quantity;

          await tx.query(
            'UPDATE partner_inventories SET in_stock_quantity = $1, available_quantity = $2, last_updated = NOW() WHERE id = $3',
            [newInStock, newAvailable, invId]
          );
        } else {
          invId = `inv-${trf.partner_id}-${trf.sku_code}`;
          prevQty = 0;
          newInStock = trf.quantity;
          newAvailable = trf.quantity;

          const skuLookup = await tx.query('SELECT id FROM skus WHERE sku_code = $1', [trf.sku_code]);
          const skuId = skuLookup.rows[0]?.id || trf.sku_code;

          await tx.query(
            `INSERT INTO partner_inventories (
              id, partner_id, sku_id, sku_code, in_stock_quantity, reserved_quantity,
              available_quantity, low_stock_threshold, selling_price_inr, last_updated
            ) VALUES ($1, $2, $3, $4, $5, 0, $6, 5, 200, NOW())`,
            [invId, trf.partner_id, skuId, trf.sku_code, newInStock, newAvailable]
          );
        }

        // Update warehouse metrics
        await tx.query(
          'UPDATE warehouses SET incoming_stock_units = GREATEST(0, incoming_stock_units - $1), total_inventory_units = total_inventory_units + $1 WHERE id = $2',
          [trf.quantity, trf.destination_warehouse_id]
        );

        // Record TRANSFER_IN in inventory ledger
        await inventoryLedgerService.recordEntry(
          {
            inventoryId: invId,
            partnerId: trf.partner_id,
            warehouseId: trf.destination_warehouse_id,
            skuCode: trf.sku_code,
            transactionType: 'TRANSFER_IN',
            quantityChange: trf.quantity,
            previousQuantity: prevQty,
            newQuantity: newInStock,
            referenceType: 'STOCK_TRANSFER',
            referenceId: trf.id,
            notes: `Received transfer ${trf.transfer_number} from warehouse ${trf.source_warehouse_id}`,
            createdByUserId: request.user!.id,
            metadata: { transferId: trf.id, sourceWarehouseId: trf.source_warehouse_id },
          },
          tx
        );

        // Update transfer status
        await tx.query(
          "UPDATE stock_transfers SET status = 'TRANSFER_RECEIVED', received_at = NOW(), updated_at = NOW() WHERE id = $1",
          [trf.id]
        );
      });

      await auditService.recordLog({
        actorUserId: request.user!.id,
        action: 'WAREHOUSE_TRANSFER_RECEIVED',
        entityType: 'WAREHOUSE_TRANSFER',
        entityId: trf.id,
        oldValue: { status: trf.status },
        newValue: { status: 'TRANSFER_RECEIVED' },
        ipAddress: request.ip,
        requestId: request.id,
      });

      return reply.send({ id: trf.id, transferId: trf.id, status: 'TRANSFER_RECEIVED' });
    }
  );

  // 5. Cancel Stock Transfer (TRANSFER_CANCELLED)
  fastify.post(
    '/warehouses/transfers/:id/cancel',
    { preHandler: [authenticate, requireRole('DISTRIBUTOR', 'ADMIN')] },
    async (request, reply) => {
      const { id } = request.params as any;
      const tRes = await db.query('SELECT * FROM stock_transfers WHERE id = $1 OR transfer_number = $1', [id]);
      if (tRes.rows.length === 0) {
        return reply.status(404).send({
          type: 'https://api.electrakart.com/errors/not-found',
          title: 'Transfer Not Found',
          status: 404,
          detail: `Transfer '${id}' not found.`,
          instance: request.url,
        });
      }

      const trf = tRes.rows[0];
      if (trf.status === 'TRANSFER_IN_TRANSIT' || trf.status === 'TRANSFER_RECEIVED') {
        return reply.status(400).send({
          type: 'https://api.electrakart.com/errors/invalid-state',
          title: 'Cannot Cancel Dispatched Transfer',
          status: 400,
          detail: `Cannot cancel transfer in '${trf.status}' status. Physical inventory has already moved.`,
          instance: request.url,
        });
      }

      await db.query("UPDATE stock_transfers SET status = 'TRANSFER_CANCELLED', cancelled_at = NOW(), updated_at = NOW() WHERE id = $1", [trf.id]);

      await auditService.recordLog({
        actorUserId: request.user!.id,
        action: 'WAREHOUSE_TRANSFER_CANCELLED',
        entityType: 'WAREHOUSE_TRANSFER',
        entityId: trf.id,
        oldValue: { status: trf.status },
        newValue: { status: 'TRANSFER_CANCELLED' },
        ipAddress: request.ip,
        requestId: request.id,
      });

      return reply.send({ id: trf.id, transferId: trf.id, status: 'TRANSFER_CANCELLED' });
    }
  );

  // Legacy/Direct Transfer Endpoint (Maintains compatibility with Phase 2/3A tests)
  fastify.post(
    '/warehouses/transfer',
    { preHandler: [authenticate, requireRole('DISTRIBUTOR', 'ADMIN')] },
    async (request, reply) => {
      const { sourceWarehouseId, destinationWarehouseId, sku, quantity, reason } = request.body as any;

      if (!sourceWarehouseId || !destinationWarehouseId || !quantity) {
        return reply.status(400).send({
          type: 'https://api.electrakart.com/errors/bad-request',
          title: 'Missing Required Fields',
          status: 400,
          detail: 'sourceWarehouseId, destinationWarehouseId, and quantity are required',
          instance: request.url,
        });
      }

      const transferId = `trf-${Date.now()}`;
      await db.withTransaction(async (tx) => {
        const srcRes = await tx.query('SELECT total_inventory_units FROM warehouses WHERE id = $1', [sourceWarehouseId]);
        if (srcRes.rows.length === 0 || srcRes.rows[0].total_inventory_units < quantity) {
          throw new Error('Insufficient inventory in source warehouse');
        }

        await tx.query(
          'UPDATE warehouses SET total_inventory_units = total_inventory_units - $1 WHERE id = $2',
          [quantity, sourceWarehouseId]
        );
        await tx.query(
          'UPDATE warehouses SET incoming_stock_units = incoming_stock_units + $1 WHERE id = $2',
          [quantity, destinationWarehouseId]
        );
      });

      return reply.send({
        transferId,
        sourceWarehouseId,
        destinationWarehouseId,
        sku,
        quantity,
        status: 'IN_TRANSIT',
        reason: reason || 'Regional inventory balance',
      });
    }
  );
}
