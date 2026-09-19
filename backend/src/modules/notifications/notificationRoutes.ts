import { FastifyInstance } from 'fastify';
import { db } from '../../db/connection.js';
import { optionalAuthenticate } from '../../middleware/auth.js';

export async function notificationRoutes(fastify: FastifyInstance) {
  // Get notifications
  fastify.get('/notifications', { preHandler: [optionalAuthenticate] }, async (request, reply) => {
    const { role } = request.query as any;
    const userRole = role || request.user?.role;

    let sql = 'SELECT * FROM notifications WHERE 1=1';
    const params: any[] = [];

    if (userRole) {
      params.push(userRole);
      sql += ` AND role = $${params.length}`;
    }

    sql += ' ORDER BY created_at DESC LIMIT 50';
    const res = await db.query(sql, params);

    const notifications = res.rows.map((n) => ({
      id: n.id,
      userId: n.user_id,
      role: n.role,
      title: n.title,
      message: n.message,
      type: n.type,
      isRead: n.is_read,
      linkActionUrl: n.link_action_url,
      createdAt: n.created_at,
    }));

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return reply.send({
      unreadCount,
      notifications,
    });
  });

  // Mark notification as read
  fastify.patch('/notifications/:id/read', async (request, reply) => {
    const { id } = request.params as any;
    await db.query('UPDATE notifications SET is_read = TRUE WHERE id = $1', [id]);
    return reply.status(204).send();
  });

  // Mark all as read
  fastify.post('/notifications/read-all', async (request, reply) => {
    const { role } = request.body as any;
    if (role) {
      await db.query('UPDATE notifications SET is_read = TRUE WHERE role = $1', [role]);
    } else {
      await db.query('UPDATE notifications SET is_read = TRUE');
    }
    return reply.send({ status: 'SUCCESS' });
  });
}
