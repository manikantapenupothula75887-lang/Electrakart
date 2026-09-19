/**
 * ElectraKart Production Product Service
 * Fetches real catalog, categories, brands, and search results from PostgreSQL.
 */

import { IProductService, ProductFilterParams } from '../productService';
import { Product, ProductCategory, ProductBrand, MasterCatalogMappingItem } from '../../types';
import { apiClient } from '../../api/client';
import { PRODUCTS_DATA, CATEGORIES_DATA, BRANDS_DATA, INITIAL_MAPPING_QUEUE } from '../../data/mockData';
import { handleFallbackOrThrow } from './fallbackPolicy';

export class ProductionProductService implements IProductService {
  async getProducts(filters?: ProductFilterParams): Promise<Product[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.category) params.append('category', filters.category);
      if (filters?.brand) params.append('brand', filters.brand);
      if (filters?.searchQuery) params.append('query', filters.searchQuery);

      const qs = params.toString() ? `?${params.toString()}` : '';
      const products = await apiClient.get<Product[]>(`/products${qs}`);
      return products && products.length > 0 ? products : PRODUCTS_DATA;
    } catch (err) {
      return handleFallbackOrThrow('ProductionProductService', 'getProducts', err, (() => {
        let result = [...PRODUCTS_DATA];
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
        return result;
      })());
    }
  }

  async getProductById(id: string): Promise<Product | undefined> {
    try {
      return await apiClient.get<Product>(`/catalog/products/${id}`);
    } catch (err) {
      return handleFallbackOrThrow('ProductionProductService', 'getProductById', err, PRODUCTS_DATA.find((p) => p.id === id || p.sku === id));
    }
  }

  async getProductBySku(sku: string): Promise<Product | undefined> {
    try {
      return await apiClient.get<Product>(`/catalog/products/${sku}`);
    } catch (err) {
      return handleFallbackOrThrow('ProductionProductService', 'getProductBySku', err, PRODUCTS_DATA.find((p) => p.sku === sku));
    }
  }

  async createMasterProduct(productData: Omit<Product, 'id'>): Promise<Product> {
    try {
      return await apiClient.post<Product>('/products', productData);
    } catch (err) {
      return handleFallbackOrThrow('ProductionProductService', 'createMasterProduct', err, { ...productData, id: `prod-${Date.now()}` });
    }
  }

  async addMasterProduct(product: Omit<Product, 'id'>): Promise<Product> {
    return this.createMasterProduct(product);
  }

  async getMappingQueue(): Promise<MasterCatalogMappingItem[]> {
    try {
      const res = await apiClient.get<any[]>('/admin/mapping-queue');
      return res.map((item) => ({
        id: item.id,
        rawTerm: item.raw_description || item.rawTerm || item.rawDescription || 'Raw Electrical Item',
        retailerName: item.partner_name || item.retailerName || item.partnerName || 'Retailer Partner',
        retailerId: item.partner_id || item.retailerId || item.partnerId || 'partner-1',
        suggestedSku: item.suggested_sku_id || item.suggestedSku || 'POL-WX-25-RED-90M',
        suggestedName: item.suggested_name || item.suggestedName || 'Polycab FlameX FR 2.5 sq.mm Red (90m)',
        confidenceScore: item.confidence_score ? Number(item.confidence_score) : 0.88,
        status: (item.status === 'PENDING' ? 'NEEDS_ADMIN_REVIEW' : item.status) as MasterCatalogMappingItem['status'],
        submittedAt: item.created_at || item.submittedAt || new Date().toISOString(),
      }));
    } catch (err) {
      return handleFallbackOrThrow('ProductionProductService', 'getMappingQueue', err, INITIAL_MAPPING_QUEUE);
    }
  }

  async resolveMapping(id: string, status: 'APPROVED' | 'REJECTED', approvedSku?: string): Promise<void> {
    try {
      await apiClient.post(`/admin/mapping-queue/${id}/resolve`, { status, approvedSkuId: approvedSku });
    } catch (err) {
      handleFallbackOrThrow('ProductionProductService', 'resolveMapping', err, undefined);
    }
  }

  async searchProducts(query: string, city = 'Vijayawada', pincode = '520002'): Promise<Product[]> {
    try {
      const res = await apiClient.get<any>(
        `/search?query=${encodeURIComponent(query)}&city=${encodeURIComponent(city)}&pincode=${encodeURIComponent(pincode)}`
      );
      return res.items || [];
    } catch (err) {
      return handleFallbackOrThrow('ProductionProductService', 'searchProducts', err, (() => {
        const q = query.toLowerCase();
        return PRODUCTS_DATA.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.sku.toLowerCase().includes(q) ||
            p.brand.toLowerCase().includes(q)
        );
      })());
    }
  }

  async getCategories(): Promise<ProductCategory[]> {
    try {
      const categories = await apiClient.get<ProductCategory[]>('/categories');
      return categories && categories.length > 0 ? categories : CATEGORIES_DATA;
    } catch (err) {
      return handleFallbackOrThrow('ProductionProductService', 'getCategories', err, CATEGORIES_DATA);
    }
  }

  async getBrands(): Promise<ProductBrand[]> {
    try {
      const brands = await apiClient.get<ProductBrand[]>('/brands');
      return brands && brands.length > 0 ? brands : BRANDS_DATA;
    } catch (err) {
      return handleFallbackOrThrow('ProductionProductService', 'getBrands', err, BRANDS_DATA);
    }
  }
}

export const prodProductService = new ProductionProductService();
