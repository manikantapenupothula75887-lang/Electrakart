import { FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';
import { db } from '../db/connection.js';

export async function checkIdempotency(request: FastifyRequest, reply: FastifyReply): Promise<boolean> {
  const key = request.headers['idempotency-key'] as string | undefined;
  if (!key || typeof key !== 'string') {
    return false;
  }

  try {
    const endpoint = request.url;
    const existing = await db.query(
      'SELECT response_status, response_body, request_hash, expires_at FROM idempotency_keys WHERE key = $1 AND endpoint = $2',
      [key, endpoint]
    );

    if (existing.rows.length > 0) {
      const row = existing.rows[0];
      const isExpired = new Date(row.expires_at).getTime() < Date.now();
      if (!isExpired) {
        const incomingHash = crypto
          .createHash('sha256')
          .update(JSON.stringify(request.body || {}))
          .digest('hex');

        if (row.request_hash && row.request_hash !== incomingHash) {
          reply.status(409).send({
            type: 'https://api.electrakart.com/errors/idempotency-conflict',
            title: 'Conflict',
            status: 409,
            detail: 'Idempotency key reused with different request payload.',
            instance: request.url,
            requestId: request.id,
          });
          return true;
        }

        reply
          .status(row.response_status)
          .header('X-Cache-Lookup', 'IDEMPOTENT_HIT')
          .send(row.response_body);
        return true;
      }
    }
  } catch (err) {
    request.log.warn({ err }, '[Idempotency] Error checking idempotency key');
  }

  return false;
}

export async function recordIdempotency(
  key: string,
  userId: string | undefined,
  endpoint: string,
  requestBody: any,
  responseStatus: number,
  responseBody: any
): Promise<void> {
  if (!key || typeof key !== 'string') return;

  try {
    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(requestBody || {}))
      .digest('hex');

    await db.query(
      `INSERT INTO idempotency_keys (key, user_id, endpoint, request_hash, response_status, response_body)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (key) DO UPDATE SET response_status = $5, response_body = $6`,
      [key, userId || null, endpoint, hash, responseStatus, JSON.stringify(responseBody)]
    );
  } catch (err) {
    console.warn('[Idempotency] Failed to record idempotency key:', err);
  }
}
