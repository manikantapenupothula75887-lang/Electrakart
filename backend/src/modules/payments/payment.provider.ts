/**
 * ElectraKart Payment Provider Abstraction
 * Defines the contract for all payment providers (Mock, Razorpay, Cashfree).
 */

import { config } from '../../config/environment.js';
import {
  PaymentProviderType,
  ProviderOrderResult,
  PaymentVerificationResult,
  PaymentRefundResult,
  VerifyPaymentInput,
  RefundPaymentInput,
  WebhookEventPayload,
} from './payment.types.js';
import { MockPaymentProvider } from './providers/mock.provider.js';
import { RazorpayPaymentProvider } from './providers/razorpay.provider.js';
import { CashfreePaymentProvider } from './providers/cashfree.provider.js';

export interface CreateProviderOrderParams {
  orderId: string;
  orderNumber: string;
  amountInr: number;
  currency?: string;
  customerName: string;
  customerPhone: string;
  simulatedOutcome?: 'SUCCESS' | 'FAILURE' | 'CANCEL';
}

export interface IPaymentProvider {
  readonly providerName: PaymentProviderType;

  /**
   * Creates an order with the payment provider.
   */
  createPaymentOrder(params: CreateProviderOrderParams): Promise<ProviderOrderResult>;

  /**
   * Cryptographically verifies the payment from provider response.
   */
  verifyPayment(params: VerifyPaymentInput): Promise<PaymentVerificationResult>;

  /**
   * Refunds a captured payment.
   */
  refundPayment(
    params: RefundPaymentInput,
    originalPayment: { providerPaymentId?: string; amountInr: number }
  ): Promise<PaymentRefundResult>;

  /**
   * Validates webhook signature.
   */
  verifyWebhookSignature(rawBody: string, signature: string, secret?: string): boolean;

  /**
   * Parses webhook payload into a normalized format.
   */
  parseWebhookPayload(rawBody: string | any, headers: Record<string, any>): WebhookEventPayload;
}

/**
 * Factory function to retrieve configured payment provider instance.
 */
export function getPaymentProvider(requestedProvider?: string): IPaymentProvider {
  const provider = (requestedProvider || config.paymentProvider || 'mock').toUpperCase() as PaymentProviderType;

  if (config.isProduction && provider === 'MOCK') {
    throw new Error('[Payment Factory Error] Mock payment provider is strictly prohibited in production.');
  }

  switch (provider) {
    case 'RAZORPAY':
      return new RazorpayPaymentProvider({
        keyId: config.razorpayKeyId,
        keySecret: config.razorpayKeySecret,
        webhookSecret: config.razorpayWebhookSecret,
      });

    case 'CASHFREE':
      return new CashfreePaymentProvider({
        appId: config.cashfreeAppId,
        secretKey: config.cashfreeSecretKey,
        apiVersion: config.cashfreeApiVersion,
      });

    case 'MOCK':
    default:
      return new MockPaymentProvider();
  }
}
