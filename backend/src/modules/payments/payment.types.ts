/**
 * ElectraKart Payment & Financial Architecture Types
 */

export type PaymentProviderType = 'MOCK' | 'RAZORPAY' | 'CASHFREE';

export type PaymentStatus =
  | 'CREATED'
  | 'PENDING'
  | 'AUTHORIZED'
  | 'CAPTURED'
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED';

export type PaymentRefundStatus = 'NONE' | 'PENDING' | 'REFUNDED' | 'PARTIALLY_REFUNDED' | 'FAILED';

export interface CreatePaymentOrderInput {
  orderId?: string;
  cart?: Array<{
    sku?: string;
    product?: { sku: string; name?: string; brand?: string; series?: string; unit?: string };
    quantity: number;
    selectedStore?: { partnerId: string; storeName?: string };
  }>;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  city: string;
  pincode: string;
  deliveryMethod?: 'STANDARD' | 'EXPRESS' | 'PICKUP';
  paymentMethod?: 'UPI' | 'NET_BANKING' | 'TRADE_CREDIT' | 'COD';
  simulatedOutcome?: 'SUCCESS' | 'FAILURE' | 'CANCEL';
}

export interface AuthoritativePricingResult {
  subtotal: number;
  discount: number;
  deliveryFee: number;
  gstTotal: number;
  grandTotal: number;
  partnerGroups: Map<string, Array<{
    skuCode: string;
    productName: string;
    brand: string;
    series: string;
    unit: string;
    quantity: number;
    resolvedSellingPrice: number;
    inventoryId: string;
  }>>;
}

export interface ProviderOrderResult {
  provider: PaymentProviderType;
  providerOrderId: string;
  amountInr: number;
  currency: string;
  keyId?: string;
  notes?: Record<string, string>;
  rawResponse?: any;
}

export interface VerifyPaymentInput {
  paymentId: string;
  orderId: string;
  providerPaymentId: string;
  providerOrderId: string;
  signature?: string;
  simulatedOutcome?: 'SUCCESS' | 'FAILURE' | 'CANCEL';
}

export interface PaymentVerificationResult {
  isVerified: boolean;
  providerPaymentId: string;
  providerOrderId: string;
  amountInr: number;
  status: PaymentStatus;
  failureReason?: string;
  rawResponse?: any;
}

export interface RefundPaymentInput {
  paymentId: string;
  orderId?: string;
  amountInr?: number;
  reason: string;
}

export interface PaymentRefundResult {
  success: boolean;
  refundId: string;
  amountInr: number;
  refundStatus: PaymentRefundStatus;
  failureReason?: string;
  rawResponse?: any;
}

export interface WebhookEventPayload {
  provider: PaymentProviderType;
  eventId: string;
  eventType: string;
  providerOrderId?: string;
  providerPaymentId?: string;
  amountInr?: number;
  status?: PaymentStatus;
  failureReason?: string;
  rawPayload: any;
}

export interface PaymentRecord {
  id: string;
  orderId: string;
  provider: PaymentProviderType;
  providerOrderId?: string;
  providerPaymentId?: string;
  amountInr: number;
  currency: string;
  paymentMethod: string;
  status: PaymentStatus;
  signature?: string;
  failureReason?: string;
  refundStatus: PaymentRefundStatus;
  refundAmountInr: number;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  orderId: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  billingAddress: string;
  shippingAddress: string;
  items: any[];
  subtotalInr: number;
  discountInr: number;
  deliveryFeeInr: number;
  gstTotalInr: number;
  grandTotalInr: number;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string;
}

export interface PartnerSettlementRecord {
  id: string;
  settlementNumber: string;
  partnerId: string;
  partnerName?: string;
  orderId: string;
  fulfillmentId: string;
  grossAmountInr: number;
  commissionRatePercent: number;
  commissionAmountInr: number;
  netSettlementInr: number;
  status: 'PENDING' | 'PROCESSING' | 'SETTLED' | 'FAILED';
  settledAt?: string;
  createdAt: string;
}
