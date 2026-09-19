import { FastifyInstance } from 'fastify';
import { db } from '../../db/connection.js';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';

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

  // Inter-warehouse stock transfer
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
        transferId: `trf-${Date.now()}`,
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
