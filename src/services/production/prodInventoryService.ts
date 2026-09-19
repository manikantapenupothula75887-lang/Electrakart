/**
 * ElectraKart Production Inventory Service
 * Manages store stock balances, cycle count adjustments,
 * and bulk import inwards against PostgreSQL.
 */

import { IInventoryService } from '../inventoryService';
import { NearbyStoreStock, PartnerInventoryItem } from '../../types';
import { apiClient } from '../../api/client';
import { NEARBY_STORES_DATA } from '../../data/mockData';

export class ProductionInventoryService implements IInventoryService {
  async getNearbyStock(productIdOrSku: string, city = 'Vijayawada'): Promise<NearbyStoreStock[]> {
    try {
      const res = await apiClient.get<NearbyStoreStock[]>(
        `/inventory/nearby?sku=${encodeURIComponent(productIdOrSku)}&city=${encodeURIComponent(city)}`
      );
      return res.length > 0 ? res : NEARBY_STORES_DATA[productIdOrSku] || [];
    } catch {
      return NEARBY_STORES_DATA[productIdOrSku] || [];
    }
  }

  async getRetailerInventory(partnerId?: string): Promise<PartnerInventoryItem[]> {
    try {
      const qs = partnerId ? `?partnerId=${encodeURIComponent(partnerId)}` : '';
      return await apiClient.get<PartnerInventoryItem[]>(`/inventory/partner-stock${qs}`);
    } catch (err) {
      console.warn('[ProductionInventoryService] getRetailerInventory fallback:', err);
      return [];
    }
  }

  async adjustStock(sku: string, delta: number): Promise<void> {
    try {
      await apiClient.patch(`/inventory/partner-stock/${sku}`, { deltaQuantity: delta });
    } catch (err) {
      console.error('[ProductionInventoryService] adjustStock failed:', err);
    }
  }

  async bulkImport(
    items: { sku: string; name: string; brand: string; stock: number; price: number }[]
  ): Promise<void> {
    try {
      await apiClient.post('/inventory/bulk-inward', { items });
    } catch (err) {
      console.error('[ProductionInventoryService] bulkImport failed:', err);
    }
  }
}

export const prodInventoryService = new ProductionInventoryService();
