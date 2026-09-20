/**
 * ElectraKart Payment & Financial Transaction Service
 * Orchestrates server-authoritative calculations, provider orders,
 * atomic transactional confirmation, webhook processing, retries,
 * cancellations with inventory rollback, partner settlements, and invoices.
 */

import { db } from '../../db/connection.js';
import { getPaymentProvider } from './payment.provider.js';
import {
  CreatePaymentOrderInput,
  VerifyPaymentInput,
  RefundPaymentInput,
  AuthoritativePricingResult,
  PaymentRecord,
  InvoiceRecord,
  PartnerSettlementRecord,
} from './payment.types.js';
import { notificationService } from '../notifications/notification.service.js';

export class PaymentService {
  /**
   * Recalculates authoritative order pricing directly from PostgreSQL.
   * NEVER trusts client-submitted prices, discounts, delivery fees, or totals.
   */
  async calculateAuthoritativePricing(
    cart: any[],
    defaultPartnerId = 'partner-vja-elec-1'
  ): Promise<AuthoritativePricingResult> {
    if (!Array.isArray(cart) || cart.length === 0) {
      throw new Error('Cannot calculate pricing for an empty cart.');
    }

    let subtotal = 0;
    const partnerGroups = new Map<string, any[]>();

    for (const item of cart) {
      const skuCode = item.product?.sku || item.sku;
      const qty = item.quantity || 1;
      const partnerId = item.selectedStore?.partnerId || defaultPartnerId;

      if (!skuCode || qty <= 0) {
        throw new Error(`Invalid item in cart: SKU '${skuCode}', quantity ${qty}`);
      }

      // Authoritative database price and stock lookup
      const invRes = await db.query(
        `SELECT id, in_stock_quantity, reserved_quantity, available_quantity, selling_price_inr 
         FROM partner_inventories 
         WHERE partner_id = $1 AND sku_code = $2`,
        [partnerId, skuCode]
      );

      if (invRes.rows.length === 0) {
        throw new Error(`SKU '${skuCode}' is not stocked by store '${partnerId}'`);
      }

      const inv = invRes.rows[0];
      const availableStock = inv.in_stock_quantity - inv.reserved_quantity;

      if (availableStock < qty) {
        throw new Error(
          `Insufficient stock for '${skuCode}' at store '${partnerId}'. Requested: ${qty}, Available: ${availableStock}`
        );
      }

      const sellingPrice = parseFloat(inv.selling_price_inr);
      const lineTotal = sellingPrice * qty;
      subtotal += lineTotal;

      if (!partnerGroups.has(partnerId)) {
        partnerGroups.set(partnerId, []);
      }

      partnerGroups.get(partnerId)!.push({
        skuCode,
        productName: item.product?.name || skuCode,
        brand: item.product?.brand || 'Polycab',
        series: item.product?.series || 'Standard',
        unit: item.product?.unit || 'Nos',
        quantity: qty,
        resolvedSellingPrice: sellingPrice,
        inventoryId: inv.id,
      });
    }

    // Authoritative promotional & business logic
    const discount = subtotal > 10000 ? 500 : 0;
    const deliveryFee = subtotal >= 5000 ? 0 : 150;
    const gstTotal = Math.round((subtotal - discount) * 0.18);
    const grandTotal = subtotal - discount + gstTotal + deliveryFee;

    return {
      subtotal,
      discount,
      deliveryFee,
      gstTotal,
      grandTotal,
      partnerGroups,
    };
  }

  /**
   * Creates or initializes a payment order with authoritative server pricing.
   */
  async createPaymentOrder(input: CreatePaymentOrderInput, customerUser?: { id: string; role: string }) {
    const customerId = customerUser?.id || 'usr-customer-1';
    let orderId = input.orderId;
    let orderNumber: string;
    let grandTotal: number;
    let pricing: AuthoritativePricingResult | null = null;

    // Case 1: Fresh order creation from cart
    if (!orderId) {
      if (!input.cart || input.cart.length === 0) {
        throw new Error('Cart items are required to create a new order.');
      }

      pricing = await this.calculateAuthoritativePricing(input.cart);
      orderId = `ord-${Date.now()}`;
      orderNumber = `EK-${Math.floor(10000 + Math.random() * 90000)}`;
      grandTotal = pricing.grandTotal;

      // Create order in PLACED / PENDING_PAYMENT state
      await db.withTransaction(async (tx) => {
        await tx.query(
          `INSERT INTO orders (
            id, order_number, customer_id, customer_name, customer_phone,
            delivery_address, city, pincode, delivery_method, payment_method,
            payment_status, overall_status, subtotal_inr, discount_inr,
            delivery_fee_inr, gst_total_inr, grand_total_inr, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'PENDING', 'PLACED', $11, $12, $13, $14, $15, NOW(), NOW())`,
          [
            orderId,
            orderNumber,
            customerId,
            input.customerName,
            input.customerPhone,
            input.deliveryAddress,
            input.city,
            input.pincode,
            input.deliveryMethod || 'EXPRESS',
            input.paymentMethod || 'UPI',
            pricing!.subtotal,
            pricing!.discount,
            pricing!.deliveryFee,
            pricing!.gstTotal,
            pricing!.grandTotal,
          ]
        );

        // Pre-create split fulfillments and fulfillment items
        let fulIndex = 1;
        for (const [partnerId, items] of pricing!.partnerGroups.entries()) {
          const fulId = `ful-${orderId}-${fulIndex}`;
          const pRes = await tx.query('SELECT business_name, type, address, city FROM partners WHERE id = $1', [partnerId]);
          const partner = pRes.rows[0] || { business_name: 'Vijayawada Electricals', type: 'RETAILER', address: 'Besant Road', city: 'Vijayawada' };
          const partnerAddr = `${partner.address}, ${partner.city}`;
          const otp = `${Math.floor(1000 + Math.random() * 9000)}`;

          await tx.query(
            `INSERT INTO order_fulfillments (
              id, order_id, fulfillment_index, partner_id, partner_name,
              partner_type, partner_address, status, estimated_delivery_time,
              assigned_driver_name, assigned_driver_phone, handover_otp,
              last_updated, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'CONFIRMED', $8, $9, $10, $11, NOW(), NOW())`,
            [
              fulId,
              orderId,
              fulIndex,
              partnerId,
              partner.business_name,
              partner.type,
              partnerAddr,
              fulIndex === 1 ? '30–45 mins' : '45–60 mins',
              fulIndex === 1 ? 'K. Somesh (ElectraKart Pilot)' : 'Regional Logistics Van (AP16-TE-8102)',
              '+91 99482 10928',
              otp,
            ]
          );

          let itemIndex = 1;
          for (const it of items) {
            const fitId = `fit-${fulId}-${itemIndex++}`;
            const lineTotal = Math.round(it.resolvedSellingPrice * it.quantity * 100) / 100;
            const skuLookup = await tx.query('SELECT id FROM skus WHERE sku_code = $1 OR id = $1', [it.skuCode]);
            const skuId = skuLookup.rows[0]?.id || it.skuCode;

            await tx.query(
              `INSERT INTO fulfillment_items (id, fulfillment_id, sku_id, sku_code, product_name, brand, series, quantity, unit_price_inr, line_total_inr, unit)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
              [fitId, fulId, skuId, it.skuCode, it.productName, it.brand, it.series, it.quantity, it.resolvedSellingPrice, lineTotal, it.unit]
            );
          }

          fulIndex++;
        }
      });
    } else {
      // Case 2: Existing order lookup (retry flow)
      const orderRes = await db.query('SELECT * FROM orders WHERE id = $1', [orderId]);
      if (orderRes.rows.length === 0) {
        throw new Error(`Order '${orderId}' was not found.`);
      }

      const order = orderRes.rows[0];
      if (customerUser?.role === 'CUSTOMER' && order.customer_id !== customerUser.id) {
        throw new Error('Forbidden: Cannot pay for another customer’s order.');
      }

      if (order.payment_status === 'PAID') {
        throw new Error('Order is already paid.');
      }

      orderNumber = order.order_number;
      grandTotal = parseFloat(order.grand_total_inr);
    }

    // 2. Call Payment Provider
    const provider = getPaymentProvider();
    const providerOrder = await provider.createPaymentOrder({
      orderId,
      orderNumber,
      amountInr: grandTotal,
      currency: 'INR',
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      simulatedOutcome: input.simulatedOutcome,
    });

    // 3. Record Payment Record in DB
    const paymentId = `pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    await db.query(
      `INSERT INTO payments (
        id, order_id, provider, provider_order_id, amount_inr, currency,
        payment_method, status, raw_response_payload, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'CREATED', $8, NOW(), NOW())`,
      [
        paymentId,
        orderId,
        providerOrder.provider,
        providerOrder.providerOrderId,
        grandTotal,
        providerOrder.currency,
        input.paymentMethod || 'UPI',
        JSON.stringify(providerOrder.rawResponse || {}),
      ]
    );

    return {
      paymentId,
      orderId,
      orderNumber,
      provider: providerOrder.provider,
      providerOrderId: providerOrder.providerOrderId,
      amountInr: grandTotal,
      currency: providerOrder.currency,
      keyId: providerOrder.keyId,
      notes: providerOrder.notes,
      pricing: pricing
        ? {
            subtotal: pricing.subtotal,
            discount: pricing.discount,
            deliveryFee: pricing.deliveryFee,
            gstTotal: pricing.gstTotal,
            grandTotal: pricing.grandTotal,
          }
        : undefined,
    };
  }

  /**
   * Verifies payment authorization and confirms order & reservations in a single transaction.
   */
  async verifyPayment(input: VerifyPaymentInput, customerUser?: { id: string; role: string }) {
    // 1. Find payment and order
    const payRes = await db.query(
      `SELECT p.*, o.customer_id, o.order_number, o.overall_status, o.grand_total_inr, o.customer_name, o.customer_phone, o.delivery_address, o.city, o.pincode
       FROM payments p
       JOIN orders o ON p.order_id = o.id
       WHERE p.id = $1 OR p.provider_order_id = $2`,
      [input.paymentId, input.providerOrderId]
    );

    if (payRes.rows.length === 0) {
      throw new Error(`Payment record '${input.paymentId || input.providerOrderId}' not found.`);
    }

    const payment = payRes.rows[0];

    // Ownership check (IDOR Protection)
    if (customerUser?.role === 'CUSTOMER' && payment.customer_id !== customerUser.id) {
      throw new Error('Forbidden: You do not have permission to verify payment for this order.');
    }

    // Check if already captured
    if (payment.status === 'CAPTURED') {
      return {
        isVerified: true,
        orderId: payment.order_id,
        orderNumber: payment.order_number,
        paymentStatus: 'CAPTURED',
        overallStatus: 'CONFIRMED',
        message: 'Payment already verified and captured.',
      };
    }

    // 2. Provider verification
    const provider = getPaymentProvider(payment.provider);
    const verification = await provider.verifyPayment({
      ...input,
      providerOrderId: payment.provider_order_id,
      providerPaymentId: input.providerPaymentId || payment.provider_payment_id,
    });

    if (!verification.isVerified || verification.status === 'FAILED' || verification.status === 'CANCELLED') {
      // Record failure
      await db.query(
        `UPDATE payments 
         SET status = $1, failure_reason = $2, provider_payment_id = $3, updated_at = NOW() 
         WHERE id = $4`,
        [verification.status, verification.failureReason || 'Verification failed', verification.providerPaymentId, payment.id]
      );

      // Post-Failure Notification Hook
      notificationService
        .publishEvent({
          eventType: 'ORDER_PAYMENT_FAILED',
          userId: payment.customer_id,
          role: 'CUSTOMER',
          title: `Payment Failed for Order ${payment.order_number}`,
          message: `Your payment was not authorized (${verification.failureReason || 'Failed'}). Your cart items have been saved.`,
          entityType: 'ORDER',
          entityId: payment.order_id,
          linkActionUrl: `/orders/${payment.order_id}`,
          recipientPhone: payment.customer_phone,
          metadata: {
            orderId: payment.order_id,
            orderNumber: payment.order_number,
            failureReason: verification.failureReason,
            grandTotal: payment.grand_total_inr,
          },
          isCriticalTransactional: true,
        })
        .catch((e) => console.error('[Notification Hook Error] ORDER_PAYMENT_FAILED:', e));

      return {
        isVerified: false,
        orderId: payment.order_id,
        orderNumber: payment.order_number,
        paymentStatus: verification.status,
        overallStatus: payment.overall_status,
        failureReason: verification.failureReason,
      };
    }

    // 3. ATOMIC TRANSACTION: Lock order, reserve inventory, confirm fulfillments, create invoice & settlement
    const confirmedResult = await db.withTransaction(async (tx) => {
      // Step A: Lock order row
      const oLockRes = await tx.query('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [payment.order_id]);
      const currentOrder = oLockRes.rows[0];

      // Step B: Atomically reserve stock for each fulfillment item
      const fulItemsRes = await tx.query(
        `SELECT fi.sku_code, fi.quantity, fi.unit_price_inr, fi.line_total_inr, fi.product_name, fi.brand, fi.series, fi.unit,
                f.id AS fulfillment_id, f.partner_id
         FROM fulfillment_items fi
         JOIN order_fulfillments f ON fi.fulfillment_id = f.id
         WHERE f.order_id = $1`,
        [payment.order_id]
      );

      for (const item of fulItemsRes.rows) {
        const invRes = await tx.query(
          `SELECT id, in_stock_quantity, reserved_quantity, available_quantity 
           FROM partner_inventories 
           WHERE partner_id = $1 AND sku_code = $2 FOR UPDATE`,
          [item.partner_id, item.sku_code]
        );

        if (invRes.rows.length === 0) {
          throw new Error(`Inventory not found for '${item.sku_code}' at partner '${item.partner_id}'`);
        }

        const inv = invRes.rows[0];
        const newReserved = inv.reserved_quantity + item.quantity;
        const newAvailable = inv.in_stock_quantity - newReserved;

        if (newAvailable < 0) {
          throw new Error(`Stock depleted for '${item.sku_code}' while payment was processing.`);
        }

        await tx.query(
          `UPDATE partner_inventories 
           SET reserved_quantity = $1, available_quantity = $2, last_updated = NOW() 
           WHERE id = $3`,
          [newReserved, newAvailable, inv.id]
        );

        // Record inventory transaction
        await tx.query(
          `INSERT INTO inventory_transactions (id, inventory_id, partner_id, sku_code, transaction_type, quantity_change, previous_quantity, new_quantity, reference_id, notes)
           VALUES ($1, $2, $3, $4, 'RESERVATION_ORDER', $5, $6, $7, $8, $9)`,
          [
            `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            inv.id,
            item.partner_id,
            item.sku_code,
            -item.quantity,
            inv.available_quantity,
            newAvailable,
            payment.order_id,
            `Stock reserved on payment capture for ${currentOrder.order_number}`,
          ]
        );
      }

      // Step C: Update Payment Record
      await tx.query(
        `UPDATE payments 
         SET status = 'CAPTURED', provider_payment_id = $1, signature = $2, paid_at = NOW(), updated_at = NOW() 
         WHERE id = $3`,
        [verification.providerPaymentId, input.signature, payment.id]
      );

      // Step D: Update Order
      await tx.query(
        `UPDATE orders 
         SET payment_status = 'PAID', overall_status = 'CONFIRMED', updated_at = NOW() 
         WHERE id = $1`,
        [payment.order_id]
      );

      // Step E: Update Fulfillments & Tracking Logs
      await tx.query(
        `UPDATE order_fulfillments 
         SET status = 'CONFIRMED', last_updated = NOW() 
         WHERE order_id = $1`,
        [payment.order_id]
      );

      const fulRes = await tx.query('SELECT id, partner_id, partner_name FROM order_fulfillments WHERE order_id = $1', [
        payment.order_id,
      ]);

      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      for (const ful of fulRes.rows) {
        await tx.query(
          `INSERT INTO fulfillment_tracking_logs (id, fulfillment_id, status, title, description, created_at)
           VALUES 
            ($1, $2, 'PLACED', 'Order Placed', $3, NOW() - INTERVAL '1 minute'),
            ($4, $2, 'CONFIRMED', 'Store Assigned & Paid', $5, NOW())`,
          [
            `tl-${Date.now()}-1`,
            ful.id,
            `Paid via ${payment.payment_method}`,
            `tl-${Date.now()}-2`,
            `Allocated to ${ful.partner_name}`,
          ]
        );

        // Step F: Create Partner Settlement Record (Internal Financial Ledger)
        const partnerLookup = await tx.query('SELECT commission_rate_percent FROM partners WHERE id = $1', [ful.partner_id]);
        const commissionRate = partnerLookup.rows[0]?.commission_rate_percent ? parseFloat(partnerLookup.rows[0].commission_rate_percent) : 5.5;

        // Calculate gross for this fulfillment
        const fItems = fulItemsRes.rows.filter((it: any) => it.fulfillment_id === ful.id);
        const grossAmount = fItems.reduce((sum: number, it: any) => sum + parseFloat(it.line_total_inr), 0);
        const commissionAmount = Math.round(grossAmount * (commissionRate / 100) * 100) / 100;
        const netSettlement = Math.round((grossAmount - commissionAmount) * 100) / 100;

        await tx.query(
          `INSERT INTO partner_settlements (
            id, settlement_number, partner_id, order_id, fulfillment_id,
            gross_amount_inr, commission_rate_percent, commission_amount_inr,
            net_settlement_inr, status, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'PENDING', NOW())`,
          [
            `set-${Date.now()}-${ful.partner_id.slice(-4)}`,
            `ST-${Math.floor(10000 + Math.random() * 90000)}`,
            ful.partner_id,
            payment.order_id,
            ful.id,
            grossAmount,
            commissionRate,
            commissionAmount,
            netSettlement,
          ]
        );
      }

      // Step G: Generate Customer Invoice
      const invoiceNumber = `INV-${currentOrder.order_number}-${Date.now().toString().slice(-4)}`;
      await tx.query(
        `INSERT INTO invoices (
          id, invoice_number, order_id, customer_id, customer_name, customer_phone,
          billing_address, shipping_address, items, subtotal_inr, discount_inr,
          delivery_fee_inr, gst_total_inr, grand_total_inr, payment_method, payment_status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'PAID', NOW())`,
        [
          `inv-${Date.now()}`,
          invoiceNumber,
          payment.order_id,
          payment.customer_id,
          payment.customer_name,
          payment.customer_phone,
          payment.delivery_address,
          payment.delivery_address,
          JSON.stringify(fulItemsRes.rows),
          currentOrder.subtotal_inr,
          currentOrder.discount_inr,
          currentOrder.delivery_fee_inr,
          currentOrder.gst_total_inr,
          currentOrder.grand_total_inr,
          payment.payment_method,
        ]
      );

      return {
        orderId: payment.order_id,
        orderNumber: currentOrder.order_number,
        paymentStatus: 'CAPTURED',
        overallStatus: 'CONFIRMED',
        invoiceNumber,
      };
    });

    // Post-Commit Notification Hook
    notificationService
      .publishEvent({
        eventType: 'ORDER_PAYMENT_SUCCESS',
        userId: payment.customer_id,
        role: 'CUSTOMER',
        title: `Payment Received for Order ${payment.order_number}`,
        message: `Your payment of ₹${payment.grand_total_inr} has been received. Fulfillments confirmed.`,
        entityType: 'ORDER',
        entityId: payment.order_id,
        linkActionUrl: `/orders/${payment.order_id}`,
        recipientPhone: payment.customer_phone,
        metadata: {
          orderId: payment.order_id,
          orderNumber: payment.order_number,
          grandTotal: payment.grand_total_inr,
          invoiceNumber: confirmedResult.invoiceNumber,
        },
        isCriticalTransactional: true,
      })
      .catch((e) => console.error('[Notification Hook Error] ORDER_PAYMENT_SUCCESS:', e));

    return {
      isVerified: true,
      ...confirmedResult,
    };
  }

  /**
   * Processes inbound webhook from payment gateway.
   * Performs HMAC verification, duplicate event deduplication, and state machine updates.
   */
  async handleWebhook(rawBody: string, signature: string, headers: Record<string, any>) {
    const provider = getPaymentProvider();

    // 1. Verify signature
    const isValid = provider.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      throw new Error('Invalid webhook signature.');
    }

    // 2. Parse event payload
    const event = provider.parseWebhookPayload(rawBody, headers);

    // 3. Duplicate event check (Idempotency)
    const existingLog = await db.query('SELECT id, status FROM payment_webhook_logs WHERE event_id = $1', [event.eventId]);
    if (existingLog.rows.length > 0) {
      return {
        processed: true,
        duplicate: true,
        message: `Event '${event.eventId}' was already processed.`,
      };
    }

    // 4. Log event (Sanitized: NO secrets or credentials)
    await db.query(
      `INSERT INTO payment_webhook_logs (id, provider, event_id, event_type, order_id, payment_id, status, payload_summary, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'PROCESSED', $7, NOW())`,
      [
        `whl-${Date.now()}`,
        event.provider,
        event.eventId,
        event.eventType,
        event.providerOrderId || null,
        event.providerPaymentId || null,
        JSON.stringify({
          eventType: event.eventType,
          status: event.status,
          amountInr: event.amountInr,
        }),
      ]
    );

    // 5. Update state machine based on event
    if (event.providerOrderId && (event.status === 'CAPTURED' || event.eventType.includes('captured') || event.eventType.includes('paid'))) {
      const payRes = await db.query('SELECT id FROM payments WHERE provider_order_id = $1', [event.providerOrderId]);
      if (payRes.rows.length > 0) {
        await this.verifyPayment({
          paymentId: payRes.rows[0].id,
          orderId: '',
          providerPaymentId: event.providerPaymentId || '',
          providerOrderId: event.providerOrderId,
          signature: signature || 'mock_sig_webhook',
        });
      }
    } else if (event.providerOrderId && (event.status === 'FAILED' || event.eventType.includes('failed'))) {
      await db.query(
        `UPDATE payments 
         SET status = 'FAILED', failure_reason = $1, updated_at = NOW() 
         WHERE provider_order_id = $2 AND status != 'CAPTURED'`,
        [event.failureReason || 'Payment failed via webhook notification', event.providerOrderId]
      );
    }

    return {
      processed: true,
      eventId: event.eventId,
      eventType: event.eventType,
    };
  }

  /**
   * Safely cancels an order and rolls back inventory reservations atomically.
   */
  async cancelOrder(orderId: string, user?: { id: string; role: string }, reason = 'Customer cancelled') {
    const oRes = await db.query('SELECT * FROM orders WHERE id = $1', [orderId]);
    if (oRes.rows.length === 0) {
      throw new Error(`Order '${orderId}' not found.`);
    }

    const order = oRes.rows[0];

    // Ownership check
    if (user?.role === 'CUSTOMER' && order.customer_id !== user.id) {
      throw new Error('Forbidden: You do not have permission to cancel another customer’s order.');
    }

    // Cancellation policy check: cannot cancel if DISPATCHED, OUT_FOR_DELIVERY, or DELIVERED
    const fulRes = await db.query('SELECT status FROM order_fulfillments WHERE order_id = $1', [orderId]);
    const prohibitedStatuses = ['DISPATCHED', 'OUT_FOR_DELIVERY', 'DELIVERED'];
    const hasProhibited = fulRes.rows.some((f) => prohibitedStatuses.includes(f.status));

    if (hasProhibited) {
      throw new Error(
        `Cannot cancel order '${orderId}': fulfillments are already dispatched or delivered.`
      );
    }

    return await db.withTransaction(async (tx) => {
      // Lock order
      await tx.query('SELECT id FROM orders WHERE id = $1 FOR UPDATE', [orderId]);

      // Release reserved inventory
      const itemsRes = await tx.query(
        `SELECT fi.sku_code, fi.quantity, f.partner_id
         FROM fulfillment_items fi
         JOIN order_fulfillments f ON fi.fulfillment_id = f.id
         WHERE f.order_id = $1`,
        [orderId]
      );

      for (const item of itemsRes.rows) {
        const invRes = await tx.query(
          `SELECT id, in_stock_quantity, reserved_quantity, available_quantity 
           FROM partner_inventories 
           WHERE partner_id = $1 AND sku_code = $2 FOR UPDATE`,
          [item.partner_id, item.sku_code]
        );

        if (invRes.rows.length > 0) {
          const inv = invRes.rows[0];
          const newReserved = Math.max(0, inv.reserved_quantity - item.quantity);
          const newAvailable = inv.in_stock_quantity - newReserved;

          await tx.query(
            `UPDATE partner_inventories
             SET reserved_quantity = $1, available_quantity = $2, last_updated = NOW()
             WHERE id = $3`,
            [newReserved, newAvailable, inv.id]
          );

          // Record inventory cancellation transaction
          await tx.query(
            `INSERT INTO inventory_transactions (id, inventory_id, partner_id, sku_code, transaction_type, quantity_change, previous_quantity, new_quantity, reference_id, notes)
             VALUES ($1, $2, $3, $4, 'RELEASE_CANCELLED', $5, $6, $7, $8, $9)`,
            [
              `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              inv.id,
              item.partner_id,
              item.sku_code,
              item.quantity,
              inv.available_quantity,
              newAvailable,
              orderId,
              `Reserved inventory released due to order cancellation: ${reason}`,
            ]
          );
        }
      }

      // Update fulfillments
      await tx.query(
        `UPDATE order_fulfillments 
         SET status = 'CANCELLED', last_updated = NOW() 
         WHERE order_id = $1`,
        [orderId]
      );

      // Update order
      await tx.query(
        `UPDATE orders 
         SET overall_status = 'CANCELLED', updated_at = NOW() 
         WHERE id = $1`,
        [orderId]
      );

      // If payment was captured, process refund
      let refundResult: any = null;
      const payRes = await tx.query("SELECT * FROM payments WHERE order_id = $1 AND status = 'CAPTURED'", [orderId]);
      if (payRes.rows.length > 0) {
        const payment = payRes.rows[0];
        const provider = getPaymentProvider(payment.provider);
        refundResult = await provider.refundPayment(
          { paymentId: payment.id, orderId, reason: `Order cancelled: ${reason}` },
          { providerPaymentId: payment.provider_payment_id, amountInr: parseFloat(payment.amount_inr) }
        );

        await tx.query(
          `UPDATE payments 
           SET status = 'REFUNDED', refund_status = 'REFUNDED', refund_amount_inr = amount_inr, updated_at = NOW() 
           WHERE id = $1`,
          [payment.id]
        );

        await tx.query("UPDATE orders SET payment_status = 'REFUNDED' WHERE id = $1", [orderId]);
      }

      return {
        orderId,
        orderNumber: order.order_number,
        overallStatus: 'CANCELLED',
        inventoryReleased: true,
        refundProcessed: !!refundResult,
      };
    });
  }

  /**
   * Processes refund for captured payment (Admin authorized only).
   */
  async processRefund(input: RefundPaymentInput, adminUser?: { id: string; role: string }) {
    if (adminUser && adminUser.role !== 'ADMIN') {
      throw new Error('Forbidden: Only administrators can initiate manual refunds.');
    }

    const payRes = await db.query('SELECT * FROM payments WHERE id = $1', [input.paymentId]);
    if (payRes.rows.length === 0) {
      throw new Error(`Payment '${input.paymentId}' not found.`);
    }

    const payment = payRes.rows[0];
    if (payment.status !== 'CAPTURED') {
      throw new Error(`Cannot refund payment in status '${payment.status}'. Must be CAPTURED.`);
    }

    const provider = getPaymentProvider(payment.provider);
    const refundResult = await provider.refundPayment(input, {
      providerPaymentId: payment.provider_payment_id,
      amountInr: parseFloat(payment.amount_inr),
    });

    if (refundResult.success) {
      await db.query(
        `UPDATE payments 
         SET status = $1, refund_status = $2, refund_amount_inr = $3, updated_at = NOW() 
         WHERE id = $4`,
        [
          refundResult.refundStatus === 'REFUNDED' ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
          refundResult.refundStatus,
          refundResult.amountInr,
          payment.id,
        ]
      );

      await db.query(
        `UPDATE orders 
         SET payment_status = 'REFUNDED', updated_at = NOW() 
         WHERE id = $1`,
        [payment.order_id]
      );
    }

    return refundResult;
  }

  /**
   * Retrieves payment status with strict IDOR ownership protection.
   */
  async getPaymentById(paymentId: string, user?: { id: string; role: string }): Promise<PaymentRecord> {
    const payRes = await db.query(
      `SELECT p.*, o.customer_id 
       FROM payments p
       JOIN orders o ON p.order_id = o.id
       WHERE p.id = $1`,
      [paymentId]
    );

    if (payRes.rows.length === 0) {
      throw new Error(`Payment '${paymentId}' was not found.`);
    }

    const pay = payRes.rows[0];

    if (user?.role === 'CUSTOMER' && pay.customer_id !== user.id) {
      throw new Error('Forbidden: You do not have permission to view another customer’s payment record.');
    }

    return {
      id: pay.id,
      orderId: pay.order_id,
      provider: pay.provider,
      providerOrderId: pay.provider_order_id,
      providerPaymentId: pay.provider_payment_id,
      amountInr: parseFloat(pay.amount_inr),
      currency: pay.currency,
      paymentMethod: pay.payment_method,
      status: pay.status,
      signature: pay.signature,
      failureReason: pay.failure_reason,
      refundStatus: pay.refund_status,
      refundAmountInr: parseFloat(pay.refund_amount_inr),
      paidAt: pay.paid_at,
      createdAt: pay.created_at,
      updatedAt: pay.updated_at,
    };
  }

  /**
   * Retrieves customer invoice by order ID.
   */
  async getInvoiceByOrderId(orderId: string, user?: { id: string; role: string }): Promise<InvoiceRecord> {
    const invRes = await db.query('SELECT * FROM invoices WHERE order_id = $1', [orderId]);
    if (invRes.rows.length === 0) {
      throw new Error(`Invoice for order '${orderId}' was not found.`);
    }

    const inv = invRes.rows[0];

    if (user?.role === 'CUSTOMER' && inv.customer_id && inv.customer_id !== user.id) {
      throw new Error('Forbidden: You do not have permission to view another customer’s invoice.');
    }

    return {
      id: inv.id,
      invoiceNumber: inv.invoice_number,
      orderId: inv.order_id,
      customerId: inv.customer_id,
      customerName: inv.customer_name,
      customerPhone: inv.customer_phone,
      billingAddress: inv.billing_address,
      shippingAddress: inv.shipping_address,
      items: typeof inv.items === 'string' ? JSON.parse(inv.items) : inv.items,
      subtotalInr: parseFloat(inv.subtotal_inr),
      discountInr: parseFloat(inv.discount_inr),
      deliveryFeeInr: parseFloat(inv.delivery_fee_inr),
      gstTotalInr: parseFloat(inv.gst_total_inr),
      grandTotalInr: parseFloat(inv.grand_total_inr),
      paymentMethod: inv.payment_method,
      paymentStatus: inv.payment_status,
      createdAt: inv.created_at,
    };
  }

  /**
   * Retrieves partner settlements.
   * STRICT SECURITY: Customers receive 403 Forbidden. Partners only see their own store. Admin sees all.
   */
  async getSettlements(user?: { id: string; role: string; partnerId?: string }): Promise<PartnerSettlementRecord[]> {
    if (user?.role === 'CUSTOMER') {
      throw new Error('Forbidden: Customers are strictly prohibited from viewing partner settlement records.');
    }

    let query = `
      SELECT ps.*, p.business_name AS partner_name
      FROM partner_settlements ps
      JOIN partners p ON ps.partner_id = p.id
      ORDER BY ps.created_at DESC
    `;
    const params: any[] = [];

    if ((user?.role === 'RETAILER' || user?.role === 'DISTRIBUTOR') && user.partnerId) {
      query = `
        SELECT ps.*, p.business_name AS partner_name
        FROM partner_settlements ps
        JOIN partners p ON ps.partner_id = p.id
        WHERE ps.partner_id = $1
        ORDER BY ps.created_at DESC
      `;
      params.push(user.partnerId);
    }

    const res = await db.query(query, params);
    return res.rows.map((row) => ({
      id: row.id,
      settlementNumber: row.settlement_number,
      partnerId: row.partner_id,
      partnerName: row.partner_name,
      orderId: row.order_id,
      fulfillmentId: row.fulfillment_id,
      grossAmountInr: parseFloat(row.gross_amount_inr),
      commissionRatePercent: parseFloat(row.commission_rate_percent),
      commissionAmountInr: parseFloat(row.commission_amount_inr),
      netSettlementInr: parseFloat(row.net_settlement_inr),
      status: row.status,
      settledAt: row.settled_at,
      createdAt: row.created_at,
    }));
  }
}

export const paymentService = new PaymentService();
