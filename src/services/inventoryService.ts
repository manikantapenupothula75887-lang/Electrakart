/**
 * ElectraKart Inventory Service
 * Manages hyperlocal retailer stock, regional warehouse allocations, and bulk Tally/Excel imports.
 */

import { NearbyStoreStock, PartnerInventoryItem } from '../types';
import { NEARBY_STORES_DATA } from '../data/mockData';

export interface IInventoryService {
  getNearbyStock(productId: string, city: string): Promise<NearbyStoreStock[]>;
  getRetailerInventory(partnerId?: string): Promise<PartnerInventoryItem[]>;
  adjustStock(sku: string, delta: number): Promise<void>;
  bulkImport(items: { sku: string; name: string; brand: string; stock: number; price: number }[]): Promise<void>;
}

class DemoInventoryService implements IInventoryService {
  private retailerStock: PartnerInventoryItem[] = [
    {
      id: 'inv-1',
      sku: 'POL-WX-25-RED-90M',
      productName: 'Polycab FlameX FR 2.5 sq.mm Red (90m)',
      brand: 'Polycab',
      series: 'FlameX FR',
      category: 'Wires & Cables',
      inStock: 14,
      reserved: 3,
      available: 11,
      lowStockThreshold: 5,
      priceReference: 3100,
      lastUpdated: 'Today, 14:15',
      partnerId: 'partner-vja-elec-1',
    },
    {
      id: 'inv-2',
      sku: 'POL-WX-15-YEL-90M',
      productName: 'Polycab FlameX FR 1.5 sq.mm Yellow (90m)',
      brand: 'Polycab',
      series: 'FlameX FR',
      category: 'Wires & Cables',
      inStock: 25,
      reserved: 2,
      available: 23,
      lowStockThreshold: 6,
      priceReference: 1980,
      lastUpdated: 'Today, 12:30',
      partnerId: 'partner-vja-elec-1',
    },
    {
      id: 'inv-3',
      sku: 'ANC-ROM-6M-PLT-WHT',
      productName: 'Anchor Roma Classic 6-Module Plate White',
      brand: 'Anchor',
      series: 'Roma Classic',
      category: 'Switches & Sockets',
      inStock: 45,
      reserved: 6,
      available: 39,
      lowStockThreshold: 10,
      priceReference: 185,
      lastUpdated: 'Yesterday',
      partnerId: 'partner-vja-elec-1',
    },
    {
      id: 'inv-4',
      sku: 'ANC-PEN-6A1W-WHT',
      productName: 'Anchor Penta 6A 1-Way Switch White (Box 20)',
      brand: 'Anchor',
      series: 'Penta',
      category: 'Switches & Sockets',
      inStock: 18,
      reserved: 0,
      available: 18,
      lowStockThreshold: 5,
      priceReference: 420,
      lastUpdated: '3 days ago',
      partnerId: 'partner-vja-elec-1',
    },
    {
      id: 'inv-5',
      sku: 'SCH-ACT-16A-SP',
      productName: 'Schneider Acti9 xC60 16A SP MCB',
      brand: 'Schneider',
      series: 'Acti9 xC60',
      category: 'MCBs & Protection',
      inStock: 8,
      reserved: 0,
      available: 8,
      lowStockThreshold: 10,
      priceReference: 295,
      lastUpdated: 'Today, 09:00',
      partnerId: 'partner-vja-elec-1',
    },
  ];

  async getNearbyStock(productId: string, city: string): Promise<NearbyStoreStock[]> {
    if (NEARBY_STORES_DATA[productId]) {
      return NEARBY_STORES_DATA[productId];
    }
    return [
      {
        partnerId: 'partner-vja-elec-1',
        storeName: 'Vijayawada Electricals & Hardware',
        partnerType: 'RETAILER',
        city,
        distanceKm: 2.5,
        deliveryEtaMin: 45,
        stockCount: 15,
        price: 3100,
        rating: 4.9,
        address: 'Besant Road, Governorpet, Vijayawada',
      },
      {
        partnerId: 'dist-abc-vja-hub',
        storeName: 'ABC Electrical Distributors Central Hub',
        partnerType: 'DISTRIBUTOR',
        city,
        distanceKm: 8.2,
        deliveryEtaMin: 90,
        stockCount: 65,
        price: 3050,
        rating: 5.0,
        address: 'Auto Nagar Phase 2, Vijayawada',
      },
    ];
  }

  async getRetailerInventory(): Promise<PartnerInventoryItem[]> {
    return [...this.retailerStock];
  }

  async adjustStock(sku: string, delta: number): Promise<void> {
    this.retailerStock = this.retailerStock.map((item) => {
      if (item.sku === sku) {
        const newStock = Math.max(0, item.inStock + delta);
        return {
          ...item,
          inStock: newStock,
          available: Math.max(0, newStock - item.reserved),
          lastUpdated: 'Just now',
        };
      }
      return item;
    });
  }

  async bulkImport(items: { sku: string; name: string; brand: string; stock: number; price: number }[]): Promise<void> {
    const newItems: PartnerInventoryItem[] = items.map((it, idx) => ({
      id: `inv-bulk-${Date.now()}-${idx}`,
      sku: it.sku,
      productName: it.name,
      brand: it.brand,
      series: 'Standard',
      category: 'General Electricals',
      inStock: it.stock,
      reserved: 0,
      available: it.stock,
      lowStockThreshold: 10,
      priceReference: it.price,
      lastUpdated: 'Just imported',
      partnerId: 'partner-vja-elec-1',
    }));
    this.retailerStock.push(...newItems);
  }
}

export const inventoryService: IInventoryService = new DemoInventoryService();
