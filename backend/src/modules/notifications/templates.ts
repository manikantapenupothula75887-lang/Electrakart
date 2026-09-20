/**
 * ElectraKart Transactional Notification Templates
 * Renders Email, SMS, and WhatsApp content with STRICT ZERO FINANCIAL LEAKAGE.
 *
 * Rules:
 * - NO purchase cost
 * - NO dealer margin
 * - NO platform commission
 * - NO internal pricing rules
 * - NO internal partner scoring
 * - NO internal warehouse IDs
 */

import { NotificationEvent } from './notification.types.js';

export interface RenderedTemplates {
  email: {
    subject: string;
    textBody: string;
    htmlBody: string;
  };
  sms: {
    text: string;
  };
  whatsapp: {
    templateName: string;
    templateParams: Record<string, string>;
    messageText: string;
  };
}

export function renderTemplates(event: NotificationEvent): RenderedTemplates {
  const meta = event.metadata || {};
  const orderId = event.entityId || meta.orderId || 'Order';
  const customerName = meta.customerName || 'Valued Customer';
  const grandTotal = meta.grandTotal ? `₹${Number(meta.grandTotal).toLocaleString('en-IN')}` : '';
  const itemsCount = meta.itemsCount || meta.itemCount || 1;
  const otp = meta.deliveryOtp || meta.otp || '';
  const partnerName = meta.partnerName || 'ElectraKart Verified Partner';

  switch (event.eventType) {
    case 'ORDER_PLACED':
    case 'ORDER_CONFIRMED': {
      return {
        email: {
          subject: `Order Confirmed: ${orderId} - ElectraKart`,
          textBody: `Hello ${customerName},\n\nYour electrical order ${orderId} has been confirmed. Total: ${grandTotal}. We are dispatching your items from local verified suppliers.\n\nThank you for choosing ElectraKart.`,
          htmlBody: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
              <h2 style="color: #0f172a; margin-top: 0;">Order Confirmed: ${orderId}</h2>
              <p>Hello <strong>${customerName}</strong>,</p>
              <p>Your order containing <strong>${itemsCount} item(s)</strong> has been confirmed and allocated to local verified suppliers.</p>
              <p style="font-size: 16px; font-weight: bold; color: #d97706;">Total Amount: ${grandTotal}</p>
              <p style="color: #64748b; font-size: 13px;">You will receive real-time updates when packages are dispatched with your delivery OTP.</p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
              <p style="font-size: 12px; color: #94a3b8;">ElectraKart Hyperlocal Electrical Supply Network</p>
            </div>
          `,
        },
        sms: {
          text: `ElectraKart: Your order ${orderId} (${grandTotal}) is confirmed. Local dispatch in progress. Track at electrakart.com.`,
        },
        whatsapp: {
          templateName: 'order_confirmation',
          templateParams: {
            customer_name: customerName,
            order_id: orderId,
            total_amount: grandTotal,
          },
          messageText: `Hello ${customerName}, your ElectraKart order ${orderId} (${grandTotal}) is confirmed! Our local verified partners are preparing your dispatch.`,
        },
      };
    }

    case 'ORDER_PAYMENT_SUCCESS': {
      return {
        email: {
          subject: `Payment Successful for ${orderId} - ElectraKart`,
          textBody: `Hello ${customerName},\n\nWe have received your payment of ${grandTotal} for order ${orderId}. Your items and price have been authoritatively locked.\n\nThank you for choosing ElectraKart.`,
          htmlBody: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
              <h2 style="color: #059669; margin-top: 0;">Payment Received</h2>
              <p>Hello <strong>${customerName}</strong>,</p>
              <p>Your payment of <strong>${grandTotal}</strong> for order <strong>${orderId}</strong> was processed successfully.</p>
              <p style="color: #64748b; font-size: 13px;">Inventory is reserved and fulfillment has commenced.</p>
            </div>
          `,
        },
        sms: {
          text: `ElectraKart: Payment of ${grandTotal} received for order ${orderId}. Inventory is reserved.`,
        },
        whatsapp: {
          templateName: 'payment_success',
          templateParams: {
            customer_name: customerName,
            order_id: orderId,
            amount: grandTotal,
          },
          messageText: `Payment of ${grandTotal} for ElectraKart order ${orderId} was successful!`,
        },
      };
    }

    case 'ORDER_PAYMENT_FAILED': {
      const reason = meta.failureReason || 'Card / Bank authorization error';
      return {
        email: {
          subject: `Payment Failed for ${orderId} - Action Required`,
          textBody: `Hello ${customerName},\n\nYour payment for order ${orderId} could not be authorized (${reason}). Your cart has been safely preserved. Please retry your payment.`,
          htmlBody: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #fee2e2; border-radius: 12px;">
              <h2 style="color: #dc2626; margin-top: 0;">Payment Authorization Failed</h2>
              <p>Hello <strong>${customerName}</strong>,</p>
              <p>We could not process payment for order <strong>${orderId}</strong>. Reason: <em>${reason}</em>.</p>
              <p>Your cart items have been saved. You can retry with UPI, Net Banking, or Cash on Delivery.</p>
            </div>
          `,
        },
        sms: {
          text: `ElectraKart: Payment failed for ${orderId}. Your items are saved. Please retry payment at electrakart.com.`,
        },
        whatsapp: {
          templateName: 'payment_failed',
          templateParams: {
            customer_name: customerName,
            order_id: orderId,
            reason,
          },
          messageText: `Your payment for ElectraKart order ${orderId} did not complete. Your items are saved—please retry at electrakart.com.`,
        },
      };
    }

    case 'ORDER_DISPATCHED':
    case 'FULFILLMENT_HANDOVER': {
      return {
        email: {
          subject: `Package Dispatched for ${orderId} - ElectraKart`,
          textBody: `Hello ${customerName},\n\nA package for order ${orderId} has been dispatched from ${partnerName}. Delivery OTP: ${otp}. Please share OTP with the delivery agent only upon unloading.`,
          htmlBody: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
              <h2 style="color: #0f172a; margin-top: 0;">Package Dispatched!</h2>
              <p>Hello <strong>${customerName}</strong>,</p>
              <p>Your electrical package from <strong>${partnerName}</strong> is on the way.</p>
              <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 12px; border-radius: 8px; text-align: center;">
                <span style="font-size: 13px; color: #92400e; font-weight: bold;">DELIVERY VERIFICATION OTP</span><br/>
                <span style="font-size: 24px; font-weight: 800; letter-spacing: 4px; color: #78350f;">${otp || '••••'}</span>
              </div>
              <p style="color: #64748b; font-size: 12px; margin-top: 12px;">Provide this OTP only after verifying package seals and cable markings at your site.</p>
            </div>
          `,
        },
        sms: {
          text: `ElectraKart: Your package for order ${orderId} is dispatched. Handover OTP is ${otp}. Share only upon unloading.`,
        },
        whatsapp: {
          templateName: 'order_dispatched',
          templateParams: {
            customer_name: customerName,
            order_id: orderId,
            otp: otp || '••••',
          },
          messageText: `Your ElectraKart package for order ${orderId} has been dispatched! Delivery OTP: ${otp}.`,
        },
      };
    }

    case 'ORDER_DELIVERED': {
      return {
        email: {
          subject: `Order Delivered: ${orderId} - ElectraKart`,
          textBody: `Hello ${customerName},\n\nYour order ${orderId} has been delivered successfully. Thank you for choosing ElectraKart!`,
          htmlBody: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
              <h2 style="color: #059669; margin-top: 0;">Order Delivered Successfully</h2>
              <p>Hello <strong>${customerName}</strong>,</p>
              <p>All items in order <strong>${orderId}</strong> have been marked delivered.</p>
            </div>
          `,
        },
        sms: {
          text: `ElectraKart: Order ${orderId} has been successfully delivered. Thank you for your business!`,
        },
        whatsapp: {
          templateName: 'order_delivered',
          templateParams: {
            customer_name: customerName,
            order_id: orderId,
          },
          messageText: `Your ElectraKart order ${orderId} has been delivered!`,
        },
      };
    }

    case 'ESTIMATE_NEEDS_CLARIFICATION': {
      const estimateId = event.entityId || meta.estimateId || 'Estimate';
      return {
        email: {
          subject: `Clarification Needed for Electrical Estimate ${estimateId}`,
          textBody: `Hello ${customerName},\n\nWe scanned your electrical estimate ${estimateId}, but a few line items need your selection (e.g. switch series or breaker curve). Please select your preferred catalog series to generate your 48-hour locked quote.`,
          htmlBody: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
              <h2 style="color: #d97706; margin-top: 0;">Estimate Clarification Required</h2>
              <p>Hello <strong>${customerName}</strong>,</p>
              <p>We processed your uploaded estimate <strong>${estimateId}</strong>. A few items require your selection to finalize authoritative prices.</p>
              <p><a href="/customer/estimate/${estimateId}" style="display: inline-block; padding: 10px 20px; background: #0f172a; color: #fbbf24; text-decoration: none; border-radius: 8px; font-weight: bold;">Review & Select Items</a></p>
            </div>
          `,
        },
        sms: {
          text: `ElectraKart: Your estimate ${estimateId} requires a quick item series selection before quotation. Visit electrakart.com.`,
        },
        whatsapp: {
          templateName: 'estimate_clarification',
          templateParams: {
            customer_name: customerName,
            estimate_id: estimateId,
          },
          messageText: `Hello ${customerName}, your electrical estimate ${estimateId} needs your clarification to finalize locked pricing.`,
        },
      };
    }

    case 'QUOTATION_CREATED': {
      const quoteNumber = meta.quotationNumber || event.entityId || 'Quotation';
      return {
        email: {
          subject: `48-Hour Price Locked Quotation Ready: ${quoteNumber}`,
          textBody: `Hello ${customerName},\n\nYour official 48-hour locked quotation ${quoteNumber} is ready for review. Total: ${grandTotal}. All prices and inventory are guaranteed for 48 hours.`,
          htmlBody: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
              <h2 style="color: #0f172a; margin-top: 0;">48-Hour Price Lock Guarantee</h2>
              <p>Hello <strong>${customerName}</strong>,</p>
              <p>Your quotation <strong>${quoteNumber}</strong> has been generated with official 18% GST calculation.</p>
              <p style="font-size: 18px; font-weight: bold; color: #d97706;">Quotation Grand Total: ${grandTotal}</p>
              <p style="color: #64748b; font-size: 13px;">This quotation is price-locked for 48 hours.</p>
            </div>
          `,
        },
        sms: {
          text: `ElectraKart: Quotation ${quoteNumber} (${grandTotal}) is ready! Price is locked for 48 hours. View at electrakart.com.`,
        },
        whatsapp: {
          templateName: 'quotation_created',
          templateParams: {
            customer_name: customerName,
            quotation_number: quoteNumber,
            total_amount: grandTotal,
          },
          messageText: `Your 48-hour locked quotation ${quoteNumber} (${grandTotal}) is ready on ElectraKart!`,
        },
      };
    }

    case 'LOW_STOCK_ALERT': {
      const skuCode = meta.skuCode || 'SKU';
      const available = meta.availableStock ?? 0;
      return {
        email: {
          subject: `[ALERT] Low Stock Warning: ${skuCode} (${available} Remaining)`,
          textBody: `Operational Alert:\n\nSKU ${skuCode} at store ${partnerName} has fallen to ${available} units, below reorder threshold. Please arrange replenishment.`,
          htmlBody: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #fed7aa; border-radius: 12px;">
              <h3 style="color: #c2410c; margin-top: 0;">Low Stock Alert</h3>
              <p>SKU <strong>${skuCode}</strong> at <strong>${partnerName}</strong> is below reorder threshold.</p>
              <p style="font-size: 16px; font-weight: bold;">Current Available Stock: ${available}</p>
            </div>
          `,
        },
        sms: {
          text: `ElectraKart Alert: SKU ${skuCode} at ${partnerName} has only ${available} units left. Restock advised.`,
        },
        whatsapp: {
          templateName: 'low_stock_alert',
          templateParams: {
            partner_name: partnerName,
            sku_code: skuCode,
            available_stock: String(available),
          },
          messageText: `[Low Stock Alert] SKU ${skuCode} has only ${available} units left at ${partnerName}.`,
        },
      };
    }

    default: {
      return {
        email: {
          subject: event.title,
          textBody: event.message,
          htmlBody: `<div style="font-family: Arial, sans-serif; padding: 20px;"><h3>${event.title}</h3><p>${event.message}</p></div>`,
        },
        sms: {
          text: `ElectraKart: ${event.title} - ${event.message}`.slice(0, 160),
        },
        whatsapp: {
          templateName: 'general_notification',
          templateParams: {
            title: event.title,
            message: event.message,
          },
          messageText: `${event.title}: ${event.message}`,
        },
      };
    }
  }
}
