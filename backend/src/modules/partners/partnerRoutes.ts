import { FastifyInstance } from 'fastify';
import { db } from '../../db/connection.js';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';

export async function partnerRoutes(fastify: FastifyInstance) {
  // List partners
  fastify.get('/partners', async (request, reply) => {
    const { type, status } = request.query as any;

    let sql = 'SELECT * FROM partners WHERE 1=1';
    const params: any[] = [];

    if (type) {
      params.push(type);
      sql += ` AND type = $${params.length}`;
    }
    if (status) {
      params.push(status);
      sql += ` AND status = $${params.length}`;
    }

    sql += ' ORDER BY created_at DESC';
    const res = await db.query(sql, params);

    const partners = res.rows.map((p) => ({
      id: p.id,
      businessName: p.business_name,
      legalEntityName: p.legal_entity_name,
      ownerName: p.owner_name,
      type: p.type,
      phone: p.phone,
      email: p.email,
      gstin: p.gstin,
      pan: p.pan,
      bankAccount: p.bank_account,
      bankIfsc: p.bank_ifsc,
      status: p.status,
      commissionRate: parseFloat(p.commission_rate_percent),
      deliveryRadiusKm: parseFloat(p.delivery_radius_km),
      rating: parseFloat(p.rating),
      totalOrdersFulfilled: p.total_orders_fulfilled,
      city: p.city,
      state: p.state,
      pincode: p.pincode,
      address: p.address,
      storePhoto: p.store_photo_url,
      joinedDate: p.joined_date,
      brandsSold: ['Polycab', 'Anchor', 'Havells'],
    }));

    return reply.send(partners);
  });

  // Get partner by ID
  fastify.get('/partners/:id', async (request, reply) => {
    const { id } = request.params as any;

    const res = await db.query('SELECT * FROM partners WHERE id = $1', [id]);
    if (res.rows.length === 0) {
      return reply.status(404).send({
        type: 'https://api.electrakart.com/errors/not-found',
        title: 'Partner Not Found',
        status: 404,
        detail: `Partner '${id}' not found`,
        instance: request.url,
      });
    }

    const p = res.rows[0];
    return reply.send({
      id: p.id,
      businessName: p.business_name,
      legalEntityName: p.legal_entity_name,
      ownerName: p.owner_name,
      type: p.type,
      phone: p.phone,
      email: p.email,
      gstin: p.gstin,
      pan: p.pan,
      bankAccount: p.bank_account,
      bankIfsc: p.bank_ifsc,
      status: p.status,
      commissionRate: parseFloat(p.commission_rate_percent),
      deliveryRadiusKm: parseFloat(p.delivery_radius_km),
      rating: parseFloat(p.rating),
      totalOrdersFulfilled: p.total_orders_fulfilled,
      city: p.city,
      state: p.state,
      pincode: p.pincode,
      address: p.address,
      storePhoto: p.store_photo_url,
      joinedDate: p.joined_date,
      brandsSold: ['Polycab', 'Anchor', 'Havells'],
    });
  });

  // Register new partner (Public onboarding)
  fastify.post('/partners/register', async (request, reply) => {
    const data = request.body as any;

    const partnerId = `partner-${Date.now()}`;
    await db.query(
      `INSERT INTO partners (id, business_name, legal_entity_name, owner_name, type, phone, email, gstin, pan, bank_account, bank_ifsc, status, commission_rate_percent, delivery_radius_km, rating, total_orders_fulfilled, city, state, pincode, address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'PENDING', 5.5, 8.0, 0, 0, $12, $13, $14, $15)`,
      [
        partnerId,
        data.businessName || 'New Electrical Store',
        data.legalEntityName || data.businessName || 'Store Enterprise',
        data.ownerName || 'Store Owner',
        data.type || 'RETAILER',
        data.phone || '+91 98480 00000',
        data.email || 'partner@electrakart.com',
        data.gstin || '37XXXXX1234X1Z1',
        data.pan || 'XXXXX1234X',
        data.bankAccount || '9876543210123',
        data.bankIfsc || 'SBIN0001234',
        data.city || 'Vijayawada',
        data.state || 'Andhra Pradesh',
        data.pincode || '520002',
        data.address || 'Besant Road, Vijayawada',
      ]
    );

    // Create notification for admin
    await db.query(
      `INSERT INTO notifications (id, user_id, role, title, message, type, link_action_url)
       VALUES ($1, 'usr-admin-1', 'ADMIN', $2, $3, 'KYC_STATUS', '/admin')`,
      [
        `notif-${Date.now()}`,
        'New Partner Onboarding Pending',
        `${data.businessName || 'New Partner'} submitted GST documentation for verification.`,
      ]
    );

    return reply.status(201).send({
      id: partnerId,
      status: 'PENDING',
      message: 'Partner onboarding submitted. Documents routed to compliance admin.',
    });
  });

  // Partner Governance & Status Update (Admin Only)
  fastify.patch(
    '/partners/:id/governance',
    { preHandler: [authenticate, requireRole('ADMIN')] },
    async (request, reply) => {
      const { id } = request.params as any;
      const { status, commissionRate, commissionRatePercent, deliveryRadiusKm } = request.body as any;

      const cRate = commissionRate !== undefined ? commissionRate : commissionRatePercent;

      await db.query(
        `UPDATE partners
         SET status = COALESCE($1, status),
             commission_rate_percent = COALESCE($2, commission_rate_percent),
             delivery_radius_km = COALESCE($3, delivery_radius_km),
             updated_at = NOW()
         WHERE id = $4`,
        [status, cRate, deliveryRadiusKm, id]
      );

      return reply.send({
        id,
        status,
        commissionRate: cRate,
        deliveryRadiusKm,
        updatedAt: new Date().toISOString(),
      });
    }
  );
}
