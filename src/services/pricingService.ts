/**
 * ElectraKart Pricing Service
 * Encapsulates pricing formulas, GST tax calculations, and 48-hour price-lock rules.
 */

import { CartItem, QuotationItem } from '../types';

export interface CartPricingSummary {
  subtotalINR: number;
  discountINR: number;
  deliveryFeeINR: number;
  gstTotalINR: number;
  grandTotalINR: number;
}

export interface IPricingService {
  calculateCartSummary(cart: CartItem[]): CartPricingSummary;
  calculateQuotationSummary(items: QuotationItem[]): CartPricingSummary;
  isEligibleForFreeDelivery(subtotalINR: number): boolean;
}

class DemoPricingService implements IPricingService {
  private readonly GST_RATE = 0.18; // 18% standard Indian GST on electrical materials
  private readonly FREE_DELIVERY_THRESHOLD = 5000;
  private readonly STANDARD_DELIVERY_FEE = 150;

  calculateCartSummary(cart: CartItem[]): CartPricingSummary {
    const subtotalINR = cart.reduce((acc, item) => acc + item.product.sellingPrice * item.quantity, 0);
    const discountINR = subtotalINR > 10000 ? 500 : 0;
    const gstTotalINR = Math.round(subtotalINR * this.GST_RATE);
    const deliveryFeeINR = this.isEligibleForFreeDelivery(subtotalINR) ? 0 : this.STANDARD_DELIVERY_FEE;
    const grandTotalINR = subtotalINR - discountINR + gstTotalINR + deliveryFeeINR;

    return {
      subtotalINR,
      discountINR,
      deliveryFeeINR,
      gstTotalINR,
      grandTotalINR,
    };
  }

  calculateQuotationSummary(items: QuotationItem[]): CartPricingSummary {
    const subtotalINR = items.reduce((acc, it) => acc + it.rate * it.quantity, 0);
    const discountINR = subtotalINR > 20000 ? 1200 : 0;
    const gstTotalINR = Math.round(subtotalINR * this.GST_RATE);
    const deliveryFeeINR = 0; // Free delivery guaranteed for contractor estimate quotations
    const grandTotalINR = subtotalINR - discountINR + gstTotalINR + deliveryFeeINR;

    return {
      subtotalINR,
      discountINR,
      deliveryFeeINR,
      gstTotalINR,
      grandTotalINR,
    };
  }

  isEligibleForFreeDelivery(subtotalINR: number): boolean {
    return subtotalINR >= this.FREE_DELIVERY_THRESHOLD;
  }
}

export const pricingService: IPricingService = new DemoPricingService();
