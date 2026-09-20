/**
 * ElectraKart Razorpay Payment Provider Adapter
 * Production adapter for Razorpay Orders, Verification, Webhooks and Refunds.
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

export interface RazorpayConfig {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
}

export class RazorpayPaymentProvider implements IPaymentProvider {
  readonly providerName = 'RAZORPAY';
  private keyId: string;
  private keySecret: string;
  private webhookSecret: string;

  constructor(config: RazorpayConfig) {
    this.keyId = config.keyId;
    this.keySecret = config.keySecret;
    this.webhookSecret = config.webhookSecret;
  }

  async createPaymentOrder(params: CreateProviderOrderParams): Promise<ProviderOrderResult> {
    if (!this.keyId || !this.keySecret) {
      throw new Error('[RazorpayProvider] Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET.');
    }

    const amountPaise = Math.round(params.amountInr * 100);

    // Call Razorpay REST API
    const authHeader = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${authHeader}`,
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: params.currency || 'INR',
        receipt: params.orderNumber,
        notes: {
          orderId: params.orderId,
          customerName: params.customerName,
          customerPhone: params.customerPhone,
        },
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`[RazorpayProvider] Order creation failed (${response.status}): ${errBody}`);
    }

    const orderData: any = await response.json();

    return {
      provider: 'RAZORPAY',
      providerOrderId: orderData.id,
      amountInr: params.amountInr,
      currency: orderData.currency || 'INR',
      keyId: this.keyId,
      rawResponse: orderData,
    };
  }

  async verifyPayment(params: VerifyPaymentInput): Promise<PaymentVerificationResult> {
    if (!params.signature) {
      return {
        isVerified: false,
        providerPaymentId: params.providerPaymentId,
        providerOrderId: params.providerOrderId,
        amountInr: 0,
        status: 'FAILED',
        failureReason: 'Missing payment signature.',
      };
    }

    const payload = `${params.providerOrderId}|${params.providerPaymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', this.keySecret)
      .update(payload)
      .digest('hex');

    const isMatch =
      expectedSignature.length === params.signature.length &&
      crypto.timingSafeEqual(Buffer.from(expectedSignature, 'utf-8'), Buffer.from(params.signature, 'utf-8'));

    if (!isMatch) {
      return {
        isVerified: false,
        providerPaymentId: params.providerPaymentId,
        providerOrderId: params.providerOrderId,
        amountInr: 0,
        status: 'FAILED',
        failureReason: 'Cryptographic signature mismatch. Possible payment tampering.',
      };
    }

    return {
      isVerified: true,
      providerPaymentId: params.providerPaymentId,
      providerOrderId: params.providerOrderId,
      amountInr: 0,
      status: 'CAPTURED',
    };
  }

  async refundPayment(
    params: RefundPaymentInput,
    originalPayment: { providerPaymentId?: string; amountInr: number }
  ): Promise<PaymentRefundResult> {
    if (!originalPayment.providerPaymentId) {
      throw new Error('[RazorpayProvider] Cannot refund payment: missing provider payment ID.');
    }

    const refundAmount = params.amountInr && params.amountInr > 0 ? params.amountInr : originalPayment.amountInr;
    const amountPaise = Math.round(refundAmount * 100);

    const authHeader = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
    const response = await fetch(
      `https://api.razorpay.com/v1/payments/${originalPayment.providerPaymentId}/refund`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${authHeader}`,
        },
        body: JSON.stringify({
          amount: amountPaise,
          notes: {
            reason: params.reason,
            orderId: params.orderId,
          },
        }),
      }
    );

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

    const refundData: any = await response.json();
    const isPartial = refundAmount < originalPayment.amountInr;

    return {
      success: true,
      refundId: refundData.id,
      amountInr: refundAmount,
      refundStatus: isPartial ? 'PARTIALLY_REFUNDED' : 'REFUNDED',
      rawResponse: refundData,
    };
  }

  verifyWebhookSignature(rawBody: string, signature: string, secret?: string): boolean {
    const effectiveSecret = secret || this.webhookSecret;
    if (!signature || !effectiveSecret) {
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', effectiveSecret)
      .update(rawBody)
      .digest('hex');

    return (
      expectedSignature.length === signature.length &&
      crypto.timingSafeEqual(Buffer.from(expectedSignature, 'utf-8'), Buffer.from(signature, 'utf-8'))
    );
  }

  parseWebhookPayload(rawBody: string | any, headers: Record<string, any>): WebhookEventPayload {
    const body = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
    const eventId = body.id || `evt_rzp_${Date.now()}`;
    const eventType = body.event || 'payment.captured';
    const paymentEntity = body.payload?.payment?.entity || {};

    let status: any = 'CAPTURED';
    if (eventType === 'payment.failed') status = 'FAILED';
    if (eventType === 'refund.processed') status = 'REFUNDED';

    return {
      provider: 'RAZORPAY',
      eventId,
      eventType,
      providerOrderId: paymentEntity.order_id,
      providerPaymentId: paymentEntity.id,
      amountInr: paymentEntity.amount ? paymentEntity.amount / 100 : undefined,
      status,
      failureReason: paymentEntity.error_description,
      rawPayload: body,
    };
  }
}
