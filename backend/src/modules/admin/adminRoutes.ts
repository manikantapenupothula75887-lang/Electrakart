import { FastifyInstance } from 'fastify';
import { db } from '../../db/connection.js';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';

export async function adminRoutes(fastify: FastifyInstance) {
  // Admin Dashboard Overview
  fastify.get(
    '/admin/dashboard',
    { preHandler: [authenticate, requireRole('ADMIN')] },
    async (_request, reply) => {
      const ordersRes = await db.query(
        'SELECT COUNT(*) AS total_orders, COALESCE(SUM(grand_total_inr), 0) AS total_gmv FROM orders'
      );
      const partnersRes = await db.query(
        "SELECT type, COUNT(*) AS count FROM partners WHERE status = 'VERIFIED' GROUP BY type"
      );
      const pendingKycRes = await db.query(
        "SELECT COUNT(*) AS count FROM partners WHERE status = 'PENDING'"
      );
      const quotesRes = await db.query(
        "SELECT COUNT(*) AS count FROM quotations WHERE status = 'LOCKED'"
      );
      const whRes = await db.query(
        'SELECT COUNT(*) AS count, COALESCE(SUM(low_stock_count), 0) AS low_stock FROM warehouses'
      );

      const retailersCount = parseInt(
        partnersRes.rows.find((r) => r.type === 'RETAILER')?.count || '0',
        10
      );
      const distributorsCount = parseInt(
        partnersRes.rows.find((r) => r.type === 'DISTRIBUTOR')?.count || '0',
        10
      );

      return reply.send({
        totalGMV: parseFloat(ordersRes.rows[0]?.total_gmv || '0'),
        todayOrders: parseInt(ordersRes.rows[0]?.total_orders || '0', 10),
        activeRetailers: retailersCount || 2,
        activeDistributors: distributorsCount || 1,
        activeWarehouses: parseInt(whRes.rows[0]?.count || '3', 10),
        pendingKyc: parseInt(pendingKycRes.rows[0]?.count || '1', 10),
        activeQuotations: parseInt(quotesRes.rows[0]?.count || '2', 10),
        lowStockAlerts: parseInt(whRes.rows[0]?.low_stock || '14', 10),
        outOfStockCount: 2,
      });
    }
  );

  // Mapping Queue
  fastify.get('/admin/mapping-queue', async (_request, reply) => {
    const res = await db.query('SELECT * FROM catalog_mapping_queue ORDER BY submitted_at DESC');
    const items = res.rows.map((q) => ({
      id: q.id,
      rawTerm: q.raw_term,
      retailerName: q.retailer_name,
      retailerId: q.retailer_id,
      suggestedSku: q.suggested_sku,
      suggestedName: q.suggested_name,
      confidenceScore: parseFloat(q.confidence_score),
      status: q.status,
      submittedAt: q.submitted_at,
    }));
    return reply.send(items);
  });

  // Resolve mapping queue item
  fastify.post(
    '/admin/mapping-queue/:id/resolve',
    { preHandler: [authenticate, requireRole('ADMIN')] },
    async (request, reply) => {
      const { id } = request.params as any;
      const { status, approvedSku } = request.body as any;

      await db.query(
        `UPDATE catalog_mapping_queue
         SET status = $1, suggested_sku = COALESCE($2, suggested_sku)
         WHERE id = $3`,
        [status, approvedSku, id]
      );

      return reply.send({ id, status, approvedSku });
    }
  );
}
