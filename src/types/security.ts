/**
 * ElectraKart Security & Data Projection Contracts
 *
 * Enforces strict boundary isolation between:
 * 1. Customer-Facing Projections (Public DTOs)
 * 2. Partner Merchant Projections
 * 3. Super Admin & Platform Internal Records
 */

import { Product, NearbyStoreStock, CartItem, Order, OrderFulfillment } from './index';

// ============================================================================
// CUSTOMER-FACING SANITIZED PROJECTIONS
// Under NO circumstances must these DTOs contain:
// - purchaseCost / dealerBuyPrice
// - internalMargin / platformTakeRate
// - partnerCommissionPercent
// - internalPricingRules
// ============================================================================

export interface CustomerProductDto {
  id: string;
  sku: string;
  name: string;
  category: string;
  brand: string;
  series: string;
  specification: string;
  mrp: number;
  sellingPrice: number; // Customer wholesale/retail selling price
  gstPercent: number;
  unit: string;
  isCertified: boolean;
  certificationNumber: string;
  warranty: string;
  description: string;
  imageUrl: string;
  rating: number;
  reviewCount: number;
  // NOTE: Strictly NO purchaseCost or internal margin fields!
}

export interface CustomerStoreStockDto {
  partnerId: string;
  storeName: string;
  city: string;
  distanceKm: number;
  deliveryEtaMin: number;
  stockCount: number;
  price: number; // Selling rate to customer
  rating: number;
  address: string;
  // NOTE: Strictly NO partner purchase price or commission rate!
}

export interface CustomerOrderFulfillmentDto {
  id: string;
  fulfillmentIndex: number;
  partnerName: string;
  partnerAddress: string;
  items: {
    sku: string;
    name: string;
    quantity: number;
    unitPrice: number;
    unit: string;
  }[];
  status: string;
  eta: string;
  driverName?: string;
  handoverOtp?: string;
  trackingHistory: {
    status: string;
    timestamp: string;
    title: string;
    description: string;
  }[];
  // NOTE: Strictly NO partner payout or settlement breakdown!
}

// ============================================================================
// PARTNER & ADMIN CONFIDENTIAL FINANCIAL RECORDS
// ============================================================================

export interface PartnerConfidentialFinancials {
  partnerId: string;
  gstin: string;
  bankAccount: string;
  bankIfsc: string;
  commissionRatePercent: number;
  accumulatedPayoutPendingINR: number;
  tdsDeductionRatePercent: number;
}

export interface PlatformInternalMarginAudit {
  skuCode: string;
  mrpINR: number;
  distributorPurchaseCostINR: number;
  retailerListingPriceINR: number;
  customerFinalPriceINR: number;
  platformTakeRatePercent: number;
  platformGrossMarginINR: number;
  lockedTimestamp: string;
}

/**
 * Utility sanitizer to ensure customer data projections are stripped
 * of any sensitive financial keys before returning to UI components.
 */
export function sanitizeProductForCustomer(product: Product): CustomerProductDto {
  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    category: product.category,
    brand: product.brand,
    series: product.series,
    specification: product.specification,
    mrp: product.mrp,
    sellingPrice: product.sellingPrice,
    gstPercent: product.gstPercent,
    unit: product.unit,
    isCertified: product.isCertified,
    certificationNumber: product.certificationNumber,
    warranty: product.warranty,
    description: product.description,
    imageUrl: product.imageUrl,
    rating: product.rating,
    reviewCount: product.reviewCount,
  };
}
