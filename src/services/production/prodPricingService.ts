/**
 * ElectraKart Production Pricing Service
 * Evaluates trade tiered pricing, GST 18%, and delivery fees via PostgreSQL backend.
 */

import { IPricingService, CartPricingSummary } from '../pricingService';
import { CartItem, QuotationItem } from '../../types';
import { apiClient } from '../../api/client';
import { handleFallbackOrThrow } from './fallbackPolicy';

export class ProductionPricingService implements IPricingService {
  async calculateCartSummaryAsync(
    cart: CartItem[],
    customerTier: 'HOMEOWNER' | 'ELECTRICIAN_PRO' | 'CONTRACTOR_BULK' = 'HOMEOWNER'
  ): Promise<CartPricingSummary> {
    try {
      const items = cart.map((it) => ({
        sku: it.product.sku,
        quantity: it.quantity,
        price: it.product.sellingPrice,
      }));

      const res = await apiClient.post<any>('/pricing/evaluate-cart', {
        items,
        customerTier,
      });

      return {
        subtotalINR: res.subtotalINR,
        gstTotalINR: res.gstTotalINR,
        discountINR: res.discountINR,
        deliveryFeeINR: res.deliveryFeeINR,
        grandTotalINR: res.grandTotalINR,
      };
    } catch (err) {
      return handleFallbackOrThrow(
        'ProductionPricingService',
        'calculateCartSummaryAsync',
        err,
        this.calculateCartSummary(cart, customerTier)
      );
    }
  }

  // Synchronous fallback preserving interface signature
  calculateCartSummary(
    cart: CartItem[],
    customerTier: 'HOMEOWNER' | 'ELECTRICIAN_PRO' | 'CONTRACTOR_BULK' = 'HOMEOWNER'
  ): CartPricingSummary {
    const subtotalINR = cart.reduce((acc, it) => acc + it.product.sellingPrice * it.quantity, 0);
    const discountPercent = customerTier === 'ELECTRICIAN_PRO' ? 0.05 : customerTier === 'CONTRACTOR_BULK' ? 0.08 : 0;
    const discountINR = Math.round(subtotalINR * discountPercent);
    const taxable = Math.max(0, subtotalINR - discountINR);
    const gstTotalINR = Math.round(taxable * 0.18);
    const deliveryFeeINR = this.isEligibleForFreeDelivery(taxable) ? 0 : 150;
    const grandTotalINR = taxable + gstTotalINR + deliveryFeeINR;

    return {
      subtotalINR,
      gstTotalINR,
      discountINR,
      deliveryFeeINR,
      grandTotalINR,
    };
  }

  isEligibleForFreeDelivery(subtotalINR: number): boolean {
    return subtotalINR >= 5000;
  }

  calculateQuotationSummary(items: QuotationItem[]): {
    subtotalINR: number;
    discountINR: number;
    deliveryFeeINR: number;
    gstTotalINR: number;
    grandTotalINR: number;
  } {
    const subtotalINR = items.reduce((acc, it) => acc + it.rate * it.quantity, 0);
    const gstTotalINR = Math.round(subtotalINR * 0.18);
    const discountINR = subtotalINR > 20000 ? 1500 : 0;
    const deliveryFeeINR = 0;
    const grandTotalINR = subtotalINR + gstTotalINR - discountINR + deliveryFeeINR;

    return {
      subtotalINR,
      discountINR,
      deliveryFeeINR,
      gstTotalINR,
      grandTotalINR,
    };
  }
}

export const prodPricingService = new ProductionPricingService();
