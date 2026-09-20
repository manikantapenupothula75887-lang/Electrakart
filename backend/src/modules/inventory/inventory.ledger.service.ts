import { db } from '../../db/connection.js';

export interface InventoryTransactionEntry {
  inventoryId: string;
  partnerId: string;
  warehouseId?: string;
  skuId?: string;
  skuCode: string;
  transactionType:
    | 'INITIAL_STOCK'
    | 'STOCK_IN'
    | 'STOCK_OUT'
    | 'RESERVATION'
    | 'RELEASE'
    | 'FULFILLMENT'
    | 'CANCELLATION_RELEASE'
    | 'ADJUSTMENT'
    | 'TRANSFER_OUT'
    | 'TRANSFER_IN'
    | 'RETURN'
    | string;
  quantityChange: number;
  previousQuantity: number;
  newQuantity: number;
  referenceType?: string;
  referenceId?: string;
  notes?: string;
  createdByUserId?: string;
  metadata?: Record<string, any>;
}

export class InventoryLedgerService {
  /**
   * Appends an auditable inventory transaction entry.
   * Can run within an existing database transaction client if passed.
   */
  async recordEntry(entry: InventoryTransactionEntry, txClient?: any): Promise<string> {
    const client = txClient || db;
    const txId = `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    // Resolve sku_id if not passed
    let skuId = entry.skuId;
    if (!skuId && entry.skuCode) {
      const skuRes = await client.query('SELECT id FROM skus WHERE sku_code = $1 LIMIT 1', [entry.skuCode]);
      skuId = skuRes.rows[0]?.id || null;
    }

    await client.query(
      `INSERT INTO inventory_transactions (
        id, inventory_id, partner_id, warehouse_id, sku_id, sku_code,
        transaction_type, quantity_change, previous_quantity, new_quantity,
        quantity, before_quantity, after_quantity, reference_type, reference_id,
        notes, created_by_user_id, metadata, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW())`,
      [
        txId,
        entry.inventoryId,
        entry.partnerId,
        entry.warehouseId || null,
        skuId || null,
        entry.skuCode,
        entry.transactionType,
        entry.quantityChange,
        entry.previousQuantity,
        entry.newQuantity,
        Math.abs(entry.quantityChange),
        entry.previousQuantity,
        entry.newQuantity,
        entry.referenceType || null,
        entry.referenceId || null,
        entry.notes || null,
        entry.createdByUserId || null,
        entry.metadata ? JSON.stringify(entry.metadata) : JSON.stringify({}),
      ]
    );

    return txId;
  }

  /**
   * Retrieves ledger transactions with RBAC / partner filtering.
   */
  async getTransactions(filters: {
    partnerId?: string;
    warehouseId?: string;
    skuCode?: string;
    referenceId?: string;
    transactionType?: string;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    let sql = 'SELECT * FROM inventory_transactions WHERE 1=1';
    const params: any[] = [];

    if (filters.partnerId) {
      params.push(filters.partnerId);
      sql += ` AND partner_id = $${params.length}`;
    }
    if (filters.warehouseId) {
      params.push(filters.warehouseId);
      sql += ` AND warehouse_id = $${params.length}`;
    }
    if (filters.skuCode) {
      params.push(filters.skuCode);
      sql += ` AND sku_code = $${params.length}`;
    }
    if (filters.referenceId) {
      params.push(filters.referenceId);
      sql += ` AND reference_id = $${params.length}`;
    }
    if (filters.transactionType) {
      params.push(filters.transactionType);
      sql += ` AND transaction_type = $${params.length}`;
    }

    sql += ' ORDER BY created_at DESC';
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;
    params.push(limit);
    sql += ` LIMIT $${params.length}`;
    params.push(offset);
    sql += ` OFFSET $${params.length}`;

    const res = await db.query(sql, params);
    return res.rows.map((row) => ({
      id: row.id,
      inventoryId: row.inventory_id,
      partnerId: row.partner_id,
      warehouseId: row.warehouse_id,
      skuId: row.sku_id,
      skuCode: row.sku_code,
      transactionType: row.transaction_type,
      quantity: row.quantity || Math.abs(row.quantity_change),
      beforeQuantity: row.before_quantity !== null && row.before_quantity !== undefined ? row.before_quantity : row.previous_quantity,
      afterQuantity: row.after_quantity !== null && row.after_quantity !== undefined ? row.after_quantity : row.new_quantity,
      referenceType: row.reference_type,
      referenceId: row.reference_id,
      notes: row.notes,
      actorUserId: row.created_by_user_id,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
      createdAt: row.created_at,
    }));
  }
}

export const inventoryLedgerService = new InventoryLedgerService();
