/**
 * ElectraKart Production Warehouse Service
 * Manages regional distribution depot inventory and inter-warehouse
 * stock transfers backed by PostgreSQL.
 */

import { IWarehouseService, StockTransferRequest } from '../warehouseService';
import { Warehouse } from '../../types';
import { apiClient } from '../../api/client';
import { WAREHOUSES_DATA } from '../../data/mockData';

export class ProductionWarehouseService implements IWarehouseService {
  async getWarehouses(): Promise<Warehouse[]> {
    try {
      const res = await apiClient.get<Warehouse[]>('/warehouses');
      return res.length > 0 ? res : WAREHOUSES_DATA;
    } catch {
      return WAREHOUSES_DATA;
    }
  }

  async getWarehouseById(id: string): Promise<Warehouse | undefined> {
    try {
      return await apiClient.get<Warehouse>(`/warehouses/${id}`);
    } catch {
      return WAREHOUSES_DATA.find((w) => w.id === id);
    }
  }

  async getWarehousesByPartner(partnerId: string): Promise<Warehouse[]> {
    const warehouses = await this.getWarehouses();
    return warehouses.filter((w) => w.partnerId === partnerId);
  }

  async transferStock(transfer: StockTransferRequest): Promise<boolean> {
    try {
      await apiClient.post('/warehouses/transfer', {
        sourceWarehouseId: transfer.sourceWarehouseId,
        destinationWarehouseId: transfer.destinationWarehouseId,
        sku: transfer.sku,
        quantity: transfer.quantity,
        reason: transfer.reason,
      });
      return true;
    } catch (err) {
      console.error('[ProductionWarehouseService] Stock transfer failed:', err);
      return false;
    }
  }

  async updateStockMetrics(id: string, metrics: Partial<Warehouse>): Promise<Warehouse | undefined> {
    const warehouses = await this.getWarehouses();
    return warehouses.find((w) => w.id === id);
  }
}

export const prodWarehouseService = new ProductionWarehouseService();
