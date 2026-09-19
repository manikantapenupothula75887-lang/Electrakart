/**
 * ElectraKart Warehouse Service
 * Manages regional distribution centers, depot capacity, multi-location
 * stock levels, and inter-warehouse logistics transfers.
 */

import { Warehouse } from '../types';
import { WAREHOUSES_DATA } from '../data/mockData';

export interface StockTransferRequest {
  sourceWarehouseId: string;
  destinationWarehouseId: string;
  sku: string;
  quantity: number;
  reason?: string;
}

export interface IWarehouseService {
  getWarehouses(): Promise<Warehouse[]>;
  getWarehouseById(id: string): Promise<Warehouse | undefined>;
  getWarehousesByPartner(partnerId: string): Promise<Warehouse[]>;
  transferStock(transfer: StockTransferRequest): Promise<boolean>;
  updateStockMetrics(id: string, metrics: Partial<Warehouse>): Promise<Warehouse | undefined>;
}

class DemoWarehouseService implements IWarehouseService {
  private readonly STORAGE_KEY = 'electrakart_warehouses';

  private loadWarehouses(): Warehouse[] {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    return saved ? JSON.parse(saved) : WAREHOUSES_DATA;
  }

  private saveWarehouses(warehouses: Warehouse[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(warehouses));
  }

  async getWarehouses(): Promise<Warehouse[]> {
    return this.loadWarehouses();
  }

  async getWarehouseById(id: string): Promise<Warehouse | undefined> {
    const warehouses = this.loadWarehouses();
    return warehouses.find((w) => w.id === id);
  }

  async getWarehousesByPartner(partnerId: string): Promise<Warehouse[]> {
    const warehouses = this.loadWarehouses();
    return warehouses.filter((w) => w.partnerId === partnerId);
  }

  async transferStock(transfer: StockTransferRequest): Promise<boolean> {
    const warehouses = this.loadWarehouses();
    const source = warehouses.find((w) => w.id === transfer.sourceWarehouseId);
    const dest = warehouses.find((w) => w.id === transfer.destinationWarehouseId);

    if (!source || !dest) return false;
    if (source.totalInventoryUnits < transfer.quantity) return false;

    source.totalInventoryUnits -= transfer.quantity;
    dest.incomingStockUnits = (dest.incomingStockUnits || 0) + transfer.quantity;

    this.saveWarehouses(warehouses);
    return true;
  }

  async updateStockMetrics(id: string, metrics: Partial<Warehouse>): Promise<Warehouse | undefined> {
    const warehouses = this.loadWarehouses();
    const index = warehouses.findIndex((w) => w.id === id);
    if (index === -1) return undefined;

    warehouses[index] = {
      ...warehouses[index],
      ...metrics,
    };
    this.saveWarehouses(warehouses);
    return warehouses[index];
  }
}

export const warehouseService: IWarehouseService = new DemoWarehouseService();
