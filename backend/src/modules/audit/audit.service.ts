import { db, DbClient } from '../../db/connection.js';

export interface RecordAuditLogInput {
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: Record<string, any> | null;
  newValue?: Record<string, any> | null;
  ipAddress?: string | null;
  requestId?: string | null;
}

export interface AuditLogRecord {
  id: string;
  actorUserId: string | null;
  actorName?: string;
  actorEmail?: string;
  actorRole?: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue: Record<string, any> | null;
  newValue: Record<string, any> | null;
  ipAddress: string | null;
  requestId: string | null;
  createdAt: string;
}

const SENSITIVE_KEYS = new Set([
  'password',
  'password_hash',
  'token',
  'accesstoken',
  'refreshtoken',
  'secret',
  'webhook_secret',
  'api_key',
  'apikey',
  'signature',
  'auth_token',
  'bank_account',
]);

function scrubAuditPayload(payload: any): any {
  if (!payload || typeof payload !== 'object') return payload;
  if (Array.isArray(payload)) return payload.map(scrubAuditPayload);

  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(payload)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lowerKey) || lowerKey.includes('password') || lowerKey.includes('secret')) {
      cleaned[key] = '[REDACTED]';
    } else if (value && typeof value === 'object') {
      cleaned[key] = scrubAuditPayload(value);
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

export class AuditService {
  /**
   * Records an auditable system event with scrubbed payload.
   */
  async recordLog(input: RecordAuditLogInput, client?: DbClient): Promise<string> {
    const logId = `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const scrubbedOld = input.oldValue ? scrubAuditPayload(input.oldValue) : null;
    const scrubbedNew = input.newValue ? scrubAuditPayload(input.newValue) : null;
    const dbClient = client || db;

    try {
      await dbClient.query(
        `INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, old_value, new_value, ip_address, request_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
        [
          logId,
          input.actorUserId || null,
          input.action,
          input.entityType,
          input.entityId,
          scrubbedOld ? JSON.stringify(scrubbedOld) : null,
          scrubbedNew ? JSON.stringify(scrubbedNew) : null,
          input.ipAddress || null,
          input.requestId || null,
        ]
      );
    } catch (err) {
      console.error('[AuditService] Failed to insert audit log:', err);
    }

    return logId;
  }

  /**
   * Queries audit logs with pagination and RBAC filter.
   */
  async getLogs(filters: {
    actorUserId?: string;
    action?: string;
    entityType?: string;
    entityId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ total: number; logs: AuditLogRecord[] }> {
    let sql = `
      SELECT a.*, u.full_name, u.email, u.role
      FROM audit_logs a
      LEFT JOIN users u ON a.actor_user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters.actorUserId) {
      params.push(filters.actorUserId);
      sql += ` AND a.actor_user_id = $${params.length}`;
    }
    if (filters.action) {
      params.push(filters.action);
      sql += ` AND a.action = $${params.length}`;
    }
    if (filters.entityType) {
      params.push(filters.entityType);
      sql += ` AND a.entity_type = $${params.length}`;
    }
    if (filters.entityId) {
      params.push(filters.entityId);
      sql += ` AND a.entity_id = $${params.length}`;
    }

    // Count
    const countSql = `SELECT COUNT(*) AS total FROM (${sql}) AS sub`;
    const countRes = await db.query(countSql, params);
    const total = parseInt(countRes.rows[0]?.total || '0', 10);

    // Pagination
    sql += ' ORDER BY a.created_at DESC';
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;
    params.push(limit);
    sql += ` LIMIT $${params.length}`;
    params.push(offset);
    sql += ` OFFSET $${params.length}`;

    const res = await db.query(sql, params);
    const logs: AuditLogRecord[] = res.rows.map((r) => ({
      id: r.id,
      actorUserId: r.actor_user_id,
      actorName: r.full_name,
      actorEmail: r.email,
      actorRole: r.role,
      action: r.action,
      entityType: r.entity_type,
      entityId: r.entity_id,
      oldValue: typeof r.old_value === 'string' ? JSON.parse(r.old_value) : r.old_value,
      newValue: typeof r.new_value === 'string' ? JSON.parse(r.new_value) : r.new_value,
      ipAddress: r.ip_address,
      requestId: r.request_id,
      createdAt: r.created_at,
    }));

    return { total, logs };
  }
}

export const auditService = new AuditService();
