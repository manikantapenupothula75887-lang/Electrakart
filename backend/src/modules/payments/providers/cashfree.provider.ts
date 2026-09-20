/**
 * ElectraKart Cashfree Payment Provider Adapter
 * Production adapter for Cashfree PG Orders, Verification, Webhooks and Refunds.
 */

import crypto from 'crypto';
import { IPaymentProvider, CreateProviderOrderParams } from '../payment.provider.js';
import {
  ProviderOrderResult,
  PaymentVerificationResult,
  PaymentRefundResult,
  VerifyPaymentInput,
  RefundPaymentInput,
  WebhookEventPayload,
} from '../payment.types.js';

export interface CashfreeConfig {
  appId: string;
  secretKey: string;
  apiVersion?: string;
}

export class CashfreePaymentProvider implements IPaymentProvider {
  readonly providerName = 'CASHFREE';
  private appId: string;
  private secretKey: string;
  private apiVersion: string;

  constructor(config: CashfreeConfig) {
    this.appId = config.appId;
    this.secretKey = config.secretKey;
    this.apiVersion = config.apiVersion || '2023-08-01';
  }

  async createPaymentOrder(params: CreateProviderOrderParams): Promise<ProviderOrderResult> {
    if (!this.appId || !this.secretKey) {
      throw new Error('[CashfreeProvider] Missing CASHFREE_APP_ID or CASHFREE_SECRET_KEY.');
    }

    const providerOrderId = `cf_ord_${params.orderNumber}_${Date.now()}`;

    const response = await fetch('https://api.cashfree.com/pg/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': this.appId,
        'x-client-secret': this.secretKey,
        'x-api-version': this.apiVersion,
      },
      body: JSON.stringify({
        order_id: providerOrderId,
        order_amount: params.amountInr,
        order_currency: params.currency || 'INR',
        customer_details: {
          customer_id: `cust_${params.customerPhone.replace(/\D/g, '')}`,
          customer_name: params.customerName,
          customer_phone: params.customerPhone.replace(/\D/g, '').slice(-10),
        },
        order_meta: {
          return_url: `https://electrakart.com/customer/orders/${params.orderId}`,
        },
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`[CashfreeProvider] Order creation failed (${response.status}): ${errBody}`);
    }

    const data: any = await response.json();

    return {
      provider: 'CASHFREE',
      providerOrderId: data.order_id,
      amountInr: data.order_amount,
      currency: data.order_currency,
      keyId: this.appId,
      rawResponse: data,
    };
  }

  async verifyPayment(params: VerifyPaymentInput): Promise<PaymentVerificationResult> {
    if (!params.providerOrderId) {
      return {
        isVerified: false,
        providerPaymentId: params.providerPaymentId,
        providerOrderId: params.providerOrderId,
        amountInr: 0,
        status: 'FAILED',
        failureReason: 'Missing Cashfree order ID.',
      };
    }

    const response = await fetch(`https://api.cashfree.com/pg/orders/${params.providerOrderId}/payments`, {
      headers: {
        'x-client-id': this.appId,
        'x-client-secret': this.secretKey,
        'x-api-version': this.apiVersion,
      },
    });

    if (!response.ok) {
      return {
        isVerified: false,
        providerPaymentId: params.providerPaymentId,
        providerOrderId: params.providerOrderId,
        amountInr: 0,
        status: 'FAILED',
        failureReason: 'Could not fetch Cashfree payment verification record.',
      };
    }

    const payments = ((await response.json()) as any[]) || [];
    const successfulPayment = payments.find((p) => p.payment_status === 'SUCCESS');

    if (!successfulPayment) {
      return {
        isVerified: false,
        providerPaymentId: params.providerPaymentId,
        providerOrderId: params.providerOrderId,
        amountInr: 0,
        status: 'FAILED',
        failureReason: 'Payment not in SUCCESS state on Cashfree.',
      };
    }

    return {
      isVerified: true,
      providerPaymentId: successfulPayment.cf_payment_id?.toString() || params.providerPaymentId,
      providerOrderId: params.providerOrderId,
      amountInr: successfulPayment.payment_amount,
      status: 'CAPTURED',
    };
  }

  async refundPayment(
    params: RefundPaymentInput,
    originalPayment: { providerPaymentId?: string; amountInr: number }
  ): Promise<PaymentRefundResult> {
    const refundAmount = params.amountInr && params.amountInr > 0 ? params.amountInr : originalPayment.amountInr;
    const refundId = `rfnd_cf_${Date.now()}`;

    const response = await fetch(`https://api.cashfree.com/pg/orders/${params.orderId}/refunds`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': this.appId,
        'x-client-secret': this.secretKey,
        'x-api-version': this.apiVersion,
      },
      body: JSON.stringify({
        refund_id: refundId,
        refund_amount: refundAmount,
        refund_note: params.reason,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      return {
        success: false,
        refundId: '',
        amountInr: refundAmount,
        refundStatus: 'FAILED',
        failureReason: errBody,
      };
    }

    const data: any = await response.json();
    const isPartial = refundAmount < originalPayment.amountInr;

    return {
      success: true,
      refundId: data.cf_refund_id?.toString() || refundId,
      amountInr: refundAmount,
      refundStatus: isPartial ? 'PARTIALLY_REFUNDED' : 'REFUNDED',
      rawResponse: data,
    };
  }

  verifyWebhookSignature(rawBody: string, signature: string, secret?: string): boolean {
    const effectiveSecret = secret || this.secretKey;
    if (!signature || !effectiveSecret) return false;

    // Cashfree computes HMAC-SHA256
    const expected = crypto.createHmac('sha256', effectiveSecret).update(rawBody).digest('base64');
    return expected === signature;
  }

  parseWebhookPayload(rawBody: string | any, headers: Record<string, any>): WebhookEventPayload {
    const body = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
    const eventId = headers['x-webhook-id'] || `evt_cf_${Date.now()}`;
    const eventType = body.type || 'PAYMENT_SUCCESS_WEBHOOK';
    const orderData = body.data?.order || {};
    const paymentData = body.data?.payment || {};

    let status: any = 'CAPTURED';
    if (eventType.includes('FAILED')) status = 'FAILED';
    if (eventType.includes('USER_DROPPED')) status = 'CANCELLED';

    return {
      provider: 'CASHFREE',
      eventId,
      eventType,
      providerOrderId: orderData.order_id,
      providerPaymentId: paymentData.cf_payment_id?.toString(),
      amountInr: paymentData.payment_amount,
      status,
      failureReason: paymentData.payment_message,
      rawPayload: body,
    };
  }
}
