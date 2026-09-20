/**
 * ElectraKart Mock Payment Provider (Dev & Test Only)
 * Deterministic simulator for local development, CI/CD, and automated integration tests.
 * STRICTLY prohibited in production.
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

export class MockPaymentProvider implements IPaymentProvider {
  readonly providerName = 'MOCK';

  async createPaymentOrder(params: CreateProviderOrderParams): Promise<ProviderOrderResult> {
    const providerOrderId = `order_mock_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    return {
      provider: 'MOCK',
      providerOrderId,
      amountInr: params.amountInr,
      currency: params.currency || 'INR',
      keyId: 'mock_key_electrakart_dev',
      notes: {
        orderId: params.orderId,
        orderNumber: params.orderNumber,
        simulatedOutcome: params.simulatedOutcome || 'SUCCESS',
      },
      rawResponse: {
        id: providerOrderId,
        entity: 'order',
        amount: Math.round(params.amountInr * 100), // in paise
        currency: params.currency || 'INR',
        receipt: params.orderNumber,
        status: 'created',
        created_at: Math.floor(Date.now() / 1000),
      },
    };
  }

  async verifyPayment(params: VerifyPaymentInput): Promise<PaymentVerificationResult> {
    // 1. Explicit simulated failure or cancellation
    if (
      params.simulatedOutcome === 'FAILURE' ||
      params.signature === 'fail' ||
      params.signature === 'invalid_mock_sig' ||
      params.providerPaymentId?.includes('fail')
    ) {
      return {
        isVerified: false,
        providerPaymentId: params.providerPaymentId || `pay_mock_failed_${Date.now()}`,
        providerOrderId: params.providerOrderId,
        amountInr: 0,
        status: 'FAILED',
        failureReason: 'Payment authorization declined by simulated issuer bank or card network.',
      };
    }

    if (params.simulatedOutcome === 'CANCEL') {
      return {
        isVerified: false,
        providerPaymentId: params.providerPaymentId || `pay_mock_cancelled_${Date.now()}`,
        providerOrderId: params.providerOrderId,
        amountInr: 0,
        status: 'CANCELLED',
        failureReason: 'Customer dismissed simulated checkout modal before authorization.',
      };
    }

    // 2. Verified success
    const providerPaymentId = params.providerPaymentId || `pay_mock_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    return {
      isVerified: true,
      providerPaymentId,
      providerOrderId: params.providerOrderId,
      amountInr: 0, // Service layer will assign authoritative amount
      status: 'CAPTURED',
      rawResponse: {
        id: providerPaymentId,
        order_id: params.providerOrderId,
        status: 'captured',
        method: 'upi',
        bank: 'SBI_SIMULATOR',
        captured: true,
      },
    };
  }

  async refundPayment(
    params: RefundPaymentInput,
    originalPayment: { providerPaymentId?: string; amountInr: number }
  ): Promise<PaymentRefundResult> {
    const refundAmount = params.amountInr && params.amountInr > 0 ? params.amountInr : originalPayment.amountInr;
    const isPartial = refundAmount < originalPayment.amountInr;
    const refundId = `rfnd_mock_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    return {
      success: true,
      refundId,
      amountInr: refundAmount,
      refundStatus: isPartial ? 'PARTIALLY_REFUNDED' : 'REFUNDED',
      rawResponse: {
        id: refundId,
        payment_id: originalPayment.providerPaymentId,
        amount: Math.round(refundAmount * 100),
        status: 'processed',
        speed_processed: 'instant',
      },
    };
  }

  verifyWebhookSignature(rawBody: string, signature: string, secret?: string): boolean {
    if (!signature || signature === 'invalid_signature') {
      return false;
    }
    // Accept valid test mock signatures or HMAC matching test secret
    if (signature.startsWith('mock_sig_')) {
      return true;
    }
    if (secret) {
      const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
      return expected === signature;
    }
    return true;
  }

  parseWebhookPayload(rawBody: string | any, headers: Record<string, any>): WebhookEventPayload {
    const body = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
    const eventId = body.event_id || body.id || `evt_mock_${Date.now()}`;
    const eventType = body.event || body.event_type || 'payment.captured';
    const payloadData = body.payload?.payment?.entity || body.data || body;

    const providerOrderId = payloadData.order_id || payloadData.provider_order_id;
    const providerPaymentId = payloadData.id || payloadData.provider_payment_id;
    const amountInr = payloadData.amount ? payloadData.amount / 100 : undefined;

    let status: any = 'CAPTURED';
    if (eventType.includes('failed')) status = 'FAILED';
    if (eventType.includes('refund')) status = 'REFUNDED';

    return {
      provider: 'MOCK',
      eventId,
      eventType,
      providerOrderId,
      providerPaymentId,
      amountInr,
      status,
      failureReason: payloadData.error_description,
      rawPayload: body,
    };
  }
}
