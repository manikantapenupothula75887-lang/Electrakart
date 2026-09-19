/**
 * ElectraKart Product & Catalog Service
 * Manages canonical taxonomy, Master SKUs, search clarification, and partner mapping.
 */

import { Product, MasterCatalogMappingItem } from '../types';
import { PRODUCTS_DATA, INITIAL_MAPPING_QUEUE } from '../data/mockData';

export interface ProductFilterParams {
  category?: string;
  brand?: string;
  searchQuery?: string;
  sortBy?: 'POPULAR' | 'PRICE_LOW' | 'PRICE_HIGH' | 'RATING';
}

export interface IProductService {
  getProducts(filters?: ProductFilterParams): Promise<Product[]>;
  getProductById(id: string): Promise<Product | undefined>;
  getProductBySku(sku: string): Promise<Product | undefined>;
  createMasterProduct(productData: Omit<Product, 'id'>): Promise<Product>;
  getMappingQueue(): Promise<MasterCatalogMappingItem[]>;
  resolveMapping(id: string, status: 'APPROVED' | 'REJECTED', approvedSku?: string): Promise<void>;
}

class DemoProductService implements IProductService {
  private products: Product[] = [...PRODUCTS_DATA];
  private mappingQueue: MasterCatalogMappingItem[] = [...INITIAL_MAPPING_QUEUE];

  async getProducts(filters?: ProductFilterParams): Promise<Product[]> {
    let result = [...this.products];

    if (filters?.category && filters.category !== 'ALL') {
      result = result.filter(
        (p) =>
          p.category.toLowerCase().replace(/[^a-z0-9]/g, '-') === filters.category ||
          p.category === filters.category
      );
    }

    if (filters?.brand && filters.brand !== 'ALL') {
      result = result.filter((p) => p.brand.toLowerCase() === filters.brand?.toLowerCase());
    }

    if (filters?.searchQuery?.trim()) {
      const q = filters.searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q)
      );
    }

    if (filters?.sortBy === 'PRICE_LOW') {
      result.sort((a, b) => a.sellingPrice - b.sellingPrice);
    } else if (filters?.sortBy === 'PRICE_HIGH') {
      result.sort((a, b) => b.sellingPrice - a.sellingPrice);
    } else if (filters?.sortBy === 'RATING') {
      result.sort((a, b) => b.rating - a.rating);
    } else {
      result.sort((a, b) => b.reviewCount - a.reviewCount);
    }

    return result;
  }

  async getProductById(id: string): Promise<Product | undefined> {
    return this.products.find((p) => p.id === id);
  }

  async getProductBySku(sku: string): Promise<Product | undefined> {
    return this.products.find((p) => p.sku === sku);
  }

  async createMasterProduct(productData: Omit<Product, 'id'>): Promise<Product> {
    const created: Product = {
      ...productData,
      id: `prod-${Date.now()}`,
    };
    this.products.unshift(created);
    return created;
  }

  async getMappingQueue(): Promise<MasterCatalogMappingItem[]> {
    return [...this.mappingQueue];
  }

  async resolveMapping(id: string, status: 'APPROVED' | 'REJECTED', approvedSku?: string): Promise<void> {
    this.mappingQueue = this.mappingQueue.map((item) =>
      item.id === id ? { ...item, status, suggestedSku: approvedSku || item.suggestedSku } : item
    );
  }
}

export const productService: IProductService = new DemoProductService();
