/**
 * ElectraKart Service Layer
 * Central export for all modular, production-ready business service interfaces,
 * production PostgreSQL services, and demo implementations.
 */

// Export Types & Interfaces
export type { AuthSession, IAuthService } from './authService';
export type { ProductFilterParams, IProductService } from './productService';
export type { IInventoryService } from './inventoryService';
export type { CartPricingSummary, IPricingService } from './pricingService';
export type { IEstimateService } from './estimateService';
export type { IQuotationService } from './quotationService';
export type { ICartService } from './cartService';
export type { CreateOrderInput, IOrderService } from './orderService';
export type { IPartnerService } from './partnerService';
export type { StockTransferRequest, IWarehouseService } from './warehouseService';
export type { INotificationService } from './notificationService';
export { INITIAL_NOTIFICATIONS } from './notificationService';

// Demo Services
export { authService as demoAuthService } from './authService';
export { productService as demoProductService } from './productService';
export { inventoryService as demoInventoryService } from './inventoryService';
export { pricingService as demoPricingService } from './pricingService';
export { estimateService as demoEstimateService } from './estimateService';
export { quotationService as demoQuotationService } from './quotationService';
export { cartService as demoCartService } from './cartService';
export { orderService as demoOrderService } from './orderService';
export { partnerService as demoPartnerService } from './partnerService';
export { warehouseService as demoWarehouseService } from './warehouseService';
export { notificationService as demoNotificationService } from './notificationService';

// Production Service Implementations (Connected to Node.js Fastify + PostgreSQL)
export * from './production/prodAuthService';
export * from './production/prodProductService';
export * from './production/prodInventoryService';
export * from './production/prodPricingService';
export * from './production/prodEstimateService';
export * from './production/prodQuotationService';
export * from './production/prodCartService';
export * from './production/prodOrderService';
export * from './production/prodPartnerService';
export * from './production/prodWarehouseService';
export * from './production/prodNotificationService';

import { prodAuthService } from './production/prodAuthService';
import { prodProductService } from './production/prodProductService';
import { prodInventoryService } from './production/prodInventoryService';
import { prodPricingService } from './production/prodPricingService';
import { prodEstimateService } from './production/prodEstimateService';
import { prodQuotationService } from './production/prodQuotationService';
import { prodCartService } from './production/prodCartService';
import { prodOrderService } from './production/prodOrderService';
import { prodPartnerService } from './production/prodPartnerService';
import { prodWarehouseService } from './production/prodWarehouseService';
import { prodNotificationService } from './production/prodNotificationService';

import { authService as demoAuthService } from './authService';
import { productService as demoProductService } from './productService';
import { inventoryService as demoInventoryService } from './inventoryService';
import { pricingService as demoPricingService } from './pricingService';
import { estimateService as demoEstimateService } from './estimateService';
import { quotationService as demoQuotationService } from './quotationService';
import { cartService as demoCartService } from './cartService';
import { orderService as demoOrderService } from './orderService';
import { partnerService as demoPartnerService } from './partnerService';
import { warehouseService as demoWarehouseService } from './warehouseService';
import { notificationService as demoNotificationService } from './notificationService';

import { apiClient } from '../api/client';

// Active Singletons (Defaults to Production PostgreSQL services with resilient fallbacks)
export const authService = prodAuthService;
export const productService = prodProductService;
export const inventoryService = prodInventoryService;
export const pricingService = prodPricingService;
export const estimateService = prodEstimateService;
export const quotationService = prodQuotationService;
export const cartService = prodCartService;
export const orderService = prodOrderService;
export const partnerService = prodPartnerService;
export const warehouseService = prodWarehouseService;
export const notificationService = prodNotificationService;

export const services = {
  auth: prodAuthService,
  product: prodProductService,
  inventory: prodInventoryService,
  pricing: prodPricingService,
  estimate: prodEstimateService,
  quotation: prodQuotationService,
  cart: prodCartService,
  order: prodOrderService,
  partner: prodPartnerService,
  warehouse: prodWarehouseService,
  notification: prodNotificationService,
};

export const demoServices = {
  auth: demoAuthService,
  product: demoProductService,
  inventory: demoInventoryService,
  pricing: demoPricingService,
  estimate: demoEstimateService,
  quotation: demoQuotationService,
  cart: demoCartService,
  order: demoOrderService,
  partner: demoPartnerService,
  warehouse: demoWarehouseService,
  notification: demoNotificationService,
};

export async function checkBackendHealth(): Promise<{ ok: boolean; database?: string; timestamp?: string }> {
  try {
    const res = await apiClient.get<any>('/health');
    return {
      ok: res.status === 'ok' || res.status === 'healthy',
      database: res.database?.status || res.database,
      timestamp: res.timestamp,
    };
  } catch (err) {
    return { ok: false };
  }
}
