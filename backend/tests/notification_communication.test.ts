/**
 * ElectraKart Notification and Communication Architecture Automated Tests (Phase 3F)
 * Fixtures A through V
 */

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { buildApp } from '../src/app.js';
import { db } from '../src/db/connection.js';
import { runMigrations } from '../src/db/migrate.js';
import { seedDatabase } from '../src/db/seed.js';
import { getValidatedConfig, config } from '../src/config/environment.js';
import { notificationService } from '../src/modules/notifications/notification.service.js';
import { mockEmailProvider } from '../src/modules/notifications/providers/mockEmail.provider.js';
import { mockSmsProvider } from '../src/modules/notifications/providers/mockSms.provider.js';
import { mockWhatsAppProvider } from '../src/modules/notifications/providers/mockWhatsApp.provider.js';
import { renderTemplates } from '../src/modules/notifications/templates.js';

export async function runNotificationCommunicationTests() {
  console.log('\n--- Running Phase 3F: Notification and Communication Architecture Tests (Fixtures A–V) ---');
  await runMigrations();
  await seedDatabase();

  const app = buildApp();
  await app.ready();

  // Reset transactional and notification tables for a clean test suite
  await db.exec(`
    DELETE FROM notification_logs;
    DELETE FROM notification_preferences;
    DELETE FROM notifications;
    DELETE FROM partner_settlements;
    DELETE FROM payments;
    DELETE FROM invoices;
    DELETE FROM inventory_transactions;
    DELETE FROM fulfillment_tracking_logs;
    DELETE FROM fulfillment_items;
    DELETE FROM order_fulfillments;
    DELETE FROM orders;
    DELETE FROM quotation_items;
    DELETE FROM quotations;
    DELETE FROM estimate_items;
    DELETE FROM estimates;
  `);

  // Reset reserved quantities to seed values
  await db.exec(`
    UPDATE partner_inventories SET reserved_quantity = 3, available_quantity = in_stock_quantity - 3 WHERE id = 'inv-vja-pol-25';
    UPDATE partner_inventories SET reserved_quantity = 6, available_quantity = in_stock_quantity - 6 WHERE id = 'inv-anc-6m-plt';
    UPDATE partner_inventories SET reserved_quantity = 2, available_quantity = in_stock_quantity - 2 WHERE id = 'inv-anc-6a1w';
  `);

  // Clear mock provider in-memory logs
  mockEmailProvider.clearSentEmails();
  mockSmsProvider.clearSentMessages();
  mockWhatsAppProvider.clearSentMessages();

  // 1. Authenticate Customer 1 (Anil Kumar Reddy)
  const cust1Login = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { emailOrPhone: 'anil.reddy@gmail.com', password: 'password123' },
  });
  assert.equal(cust1Login.statusCode, 200, 'Customer 1 login failed');
  const tokenCust1 = cust1Login.json().accessToken;

  // 2. Authenticate Customer 2 (Ravi Teja Sharma)
  const cust2Login = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { emailOrPhone: 'ravi.teja@gmail.com', password: 'password123' },
  });
  assert.equal(cust2Login.statusCode, 200, 'Customer 2 login failed');
  const tokenCust2 = cust2Login.json().accessToken;

  // 3. Authenticate Retailer 1 (Murali Krishna Raju)
  const ret1Login = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { emailOrPhone: 'murali.vjaelec@gmail.com', password: 'password123' },
  });
  assert.equal(ret1Login.statusCode, 200, 'Retailer 1 login failed');
  const tokenRet1 = ret1Login.json().accessToken;

  // 4. Authenticate Distributor 1 (Venkat Rao Choudhary)
  const dist1Login = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { emailOrPhone: 'dispatch@abcdistributors.in', password: 'password123' },
  });
  assert.equal(dist1Login.statusCode, 200, 'Distributor 1 login failed');
  const tokenDist1 = dist1Login.json().accessToken;

  // 5. Seed Retailer 2 for multi-tenant retailer IDOR testing
  const passwordHash = '$2b$10$wN9Q0gS6QJ9nZ6gS6QJ9nOe6QJ9nZ6gS6QJ9nZ6gS6QJ9nZ6gS6QJ';
  await db.query(
    `INSERT INTO users (id, email, phone_number, password_hash, full_name, role, city, pincode)
     VALUES ('usr-retailer-2', 'second.retailer@gmail.com', '+919848099999', $1, 'Second Retailer Store', 'RETAILER', 'Vijayawada', '520002')
     ON CONFLICT (id) DO NOTHING`,
    [passwordHash]
  );
  const ret2Login = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { emailOrPhone: 'second.retailer@gmail.com', password: 'password123' },
  });
  assert.equal(ret2Login.statusCode, 200, 'Retailer 2 login failed');
  const tokenRet2 = ret2Login.json().accessToken;

  // =========================================================================
  // FIXTURE A: Order placed -> notification generated
  // =========================================================================
  console.log('1. Verifying Fixture A: Order placed -> notification generated...');

  const orderResA = await app.inject({
    method: 'POST',
    url: '/api/v1/orders',
    headers: {
      authorization: `Bearer ${tokenCust1}`,
      'idempotency-key': `idem-notif-ord-${Date.now()}`,
    },
    payload: {
      customerName: 'Anil Kumar Reddy',
      customerPhone: '+919848199882',
      customerEmail: 'anil.reddy@gmail.com',
      deliveryAddress: 'Flat 301, Sri Sai Residency, Guru Nanak Colony, Vijayawada',
      city: 'Vijayawada',
      pincode: '520002',
      cart: [{ sku: 'POL-WX-25-RED-90M', quantity: 2 }],
      paymentMethod: 'ONLINE',
    },
  });
  assert.equal(orderResA.statusCode, 201, 'Order A creation failed');
  const createdOrderA = orderResA.json();

  // Wait briefly for non-blocking post-commit event dispatch
  await new Promise((r) => setTimeout(r, 100));

  // Verify in-app notification created for Customer 1
  const notifResA = await app.inject({
    method: 'GET',
    url: '/api/v1/notifications',
    headers: { authorization: `Bearer ${tokenCust1}` },
  });
  assert.equal(notifResA.statusCode, 200);
  const customerNotifsA = notifResA.json().notifications;
  const orderPlacedNotif = customerNotifsA.find((n: any) => n.type === 'ORDER_PLACED' && n.entityId === createdOrderA.id);
  assert.ok(orderPlacedNotif, 'ORDER_PLACED in-app notification must be generated for customer');
  assert.match(orderPlacedNotif.title, new RegExp(createdOrderA.orderNumber));

  // Verify notification delivery logs
  const logsResA = await db.query(
    'SELECT * FROM notification_logs WHERE notification_id = $1',
    [orderPlacedNotif.id]
  );
  assert.ok(logsResA.rows.length >= 1, 'Delivery logs must be recorded for active channels');
  assert.ok(logsResA.rows.some((l: any) => l.status === 'SENT'), 'At least one channel must report status SENT');

  // Verify retailer received FULFILLMENT_ASSIGNED notification
  const retNotifResA = await app.inject({
    method: 'GET',
    url: '/api/v1/notifications',
    headers: { authorization: `Bearer ${tokenRet1}` },
  });
  assert.equal(retNotifResA.statusCode, 200);
  const retNotifsA = retNotifResA.json().notifications;
  const fulAssignedNotif = retNotifsA.find((n: any) => n.type === 'FULFILLMENT_ASSIGNED');
  assert.ok(fulAssignedNotif, 'Retailer must receive FULFILLMENT_ASSIGNED notification');

  // =========================================================================
  // FIXTURE B: Payment success -> notification generated
  // =========================================================================
  console.log('2. Verifying Fixture B: Payment success -> notification generated...');

  // 1. Create fresh payment order from cart
  const payCreateResB = await app.inject({
    method: 'POST',
    url: '/api/v1/payments/create',
    headers: { authorization: `Bearer ${tokenCust1}` },
    payload: {
      customerName: 'Anil Kumar Reddy',
      customerPhone: '+919848199882',
      deliveryAddress: 'Flat 301, Sri Sai Residency, Guru Nanak Colony, Vijayawada',
      city: 'Vijayawada',
      pincode: '520008',
      paymentMethod: 'UPI',
      cart: [
        {
          sku: 'POL-WX-25-RED-90M',
          quantity: 2,
          selectedStore: { partnerId: 'partner-vja-elec-1', storeName: 'Vijayawada Electricals' },
          product: { sku: 'POL-WX-25-RED-90M', name: 'Polycab FlameX 2.5 sq.mm' },
        },
      ],
    },
  });
  assert.equal(payCreateResB.statusCode, 201, 'Payment order creation failed');
  const payCreatedB = payCreateResB.json();

  // 2. Verify payment with success
  const payVerifyResB = await app.inject({
    method: 'POST',
    url: '/api/v1/payments/verify',
    headers: { authorization: `Bearer ${tokenCust1}` },
    payload: {
      paymentId: payCreatedB.paymentId,
      orderId: payCreatedB.orderId,
      providerPaymentId: 'pay_mock_success_123',
      providerOrderId: payCreatedB.providerOrderId,
      signature: 'mock_valid_signature_hash',
      simulatedOutcome: 'SUCCESS',
    },
  });
  assert.equal(payVerifyResB.statusCode, 200, 'Payment verify failed');

  await new Promise((r) => setTimeout(r, 100));

  const notifResB = await app.inject({
    method: 'GET',
    url: '/api/v1/notifications',
    headers: { authorization: `Bearer ${tokenCust1}` },
  });
  const customerNotifsB = notifResB.json().notifications;
  const paySuccessNotif = customerNotifsB.find(
    (n: any) => n.type === 'ORDER_PAYMENT_SUCCESS' && n.entityId === payCreatedB.orderId
  );
  assert.ok(paySuccessNotif, 'ORDER_PAYMENT_SUCCESS notification must be generated for customer');
  assert.match(paySuccessNotif.message, /payment of ₹/i);

  // =========================================================================
  // FIXTURE C: Payment failure -> notification generated
  // =========================================================================
  console.log('3. Verifying Fixture C: Payment failure -> notification generated...');

  const payCreateResC = await app.inject({
    method: 'POST',
    url: '/api/v1/payments/create',
    headers: { authorization: `Bearer ${tokenCust1}` },
    payload: {
      customerName: 'Anil Kumar Reddy',
      customerPhone: '+919848199882',
      deliveryAddress: 'Flat 301, Sri Sai Residency, Guru Nanak Colony, Vijayawada',
      city: 'Vijayawada',
      pincode: '520008',
      paymentMethod: 'CREDIT_CARD',
      cart: [
        {
          sku: 'ANC-ROM-6M-PLT-WHT',
          quantity: 1,
          selectedStore: { partnerId: 'partner-anchor-exclusive', storeName: 'Sri Balaji Anchor World' },
          product: { sku: 'ANC-ROM-6M-PLT-WHT', name: 'Anchor Roma 6M Plate' },
        },
      ],
    },
  });
  assert.equal(payCreateResC.statusCode, 201);
  const payCreatedC = payCreateResC.json();

  // Verify payment with simulated failure
  const payVerifyResC = await app.inject({
    method: 'POST',
    url: '/api/v1/payments/verify',
    headers: { authorization: `Bearer ${tokenCust1}` },
    payload: {
      paymentId: payCreatedC.paymentId,
      orderId: payCreatedC.orderId,
      providerPaymentId: 'pay_mock_failed_456',
      providerOrderId: payCreatedC.providerOrderId,
      signature: 'invalid_sig',
      simulatedOutcome: 'FAILURE',
      failureReason: 'Insufficient funds on credit card',
    },
  });
  assert.equal(payVerifyResC.statusCode, 402, 'Payment failure expected 402');

  await new Promise((r) => setTimeout(r, 100));

  const notifResC = await app.inject({
    method: 'GET',
    url: '/api/v1/notifications',
    headers: { authorization: `Bearer ${tokenCust1}` },
  });
  const payFailedNotif = notifResC.json().notifications.find(
    (n: any) => n.type === 'ORDER_PAYMENT_FAILED' && n.entityId === payCreatedC.orderId
  );
  assert.ok(payFailedNotif, 'ORDER_PAYMENT_FAILED notification must be generated');
  assert.match(payFailedNotif.message, /not authorized/i);

  // =========================================================================
  // FIXTURE D: Order dispatched -> notification generated
  // =========================================================================
  console.log('4. Verifying Fixture D: Order dispatched -> notification generated...');

  const fulfillmentA = createdOrderA.fulfillments[0];
  const dispatchRes = await app.inject({
    method: 'PATCH',
    url: `/api/v1/orders/${createdOrderA.id}/fulfillments/${fulfillmentA.id}/status`,
    headers: { authorization: `Bearer ${tokenRet1}` },
    payload: {
      status: 'DISPATCHED',
      trackingDetails: { carrier: 'ElectraKart Express', trackingNumber: 'EK-TRK-9901' },
    },
  });
  assert.equal(dispatchRes.statusCode, 200, 'Fulfillment status dispatch update failed');

  await new Promise((r) => setTimeout(r, 100));

  const notifResD = await app.inject({
    method: 'GET',
    url: '/api/v1/notifications',
    headers: { authorization: `Bearer ${tokenCust1}` },
  });
  const dispatchNotif = notifResD.json().notifications.find(
    (n: any) => n.type === 'ORDER_DISPATCHED' && n.entityId === createdOrderA.id
  );
  assert.ok(dispatchNotif, 'ORDER_DISPATCHED notification must be generated for customer');

  // =========================================================================
  // FIXTURE E: Order delivered -> notification generated
  // =========================================================================
  console.log('5. Verifying Fixture E: Order delivered -> notification generated...');

  const deliverRes = await app.inject({
    method: 'PATCH',
    url: `/api/v1/orders/${createdOrderA.id}/fulfillments/${fulfillmentA.id}/status`,
    headers: { authorization: `Bearer ${tokenRet1}` },
    payload: {
      status: 'DELIVERED',
      deliveredAt: new Date().toISOString(),
    },
  });
  assert.equal(deliverRes.statusCode, 200, 'Fulfillment status delivery update failed');

  await new Promise((r) => setTimeout(r, 100));

  const notifResE = await app.inject({
    method: 'GET',
    url: '/api/v1/notifications',
    headers: { authorization: `Bearer ${tokenCust1}` },
  });
  const deliveredNotif = notifResE.json().notifications.find(
    (n: any) => n.type === 'ORDER_DELIVERED' && n.entityId === createdOrderA.id
  );
  assert.ok(deliveredNotif, 'ORDER_DELIVERED notification must be generated for customer');

  // =========================================================================
  // FIXTURE F: Estimate clarification -> notification generated
  // =========================================================================
  console.log('6. Verifying Fixture F: Estimate clarification -> notification generated...');

  // Upload estimate with ambiguous item (missing series)
  const validPdfB64 = Buffer.from('%PDF-1.4 sample pdf content').toString('base64');
  const estUploadRes = await app.inject({
    method: 'POST',
    url: '/api/v1/estimates/upload',
    headers: { authorization: `Bearer ${tokenCust1}` },
    payload: {
      customerName: 'Anil Kumar Reddy',
      customerPhone: '+919848199882',
      filename: 'fixture_b_clarification.pdf',
      fileBase64: validPdfB64,
      mimeType: 'application/pdf',
      city: 'Vijayawada',
      pincode: '520002',
    },
  });
  assert.equal(estUploadRes.statusCode, 201, 'Estimate upload failed');
  const estData = estUploadRes.json();
  const estimateId = estData.estimateId;

  await new Promise((r) => setTimeout(r, 100));

  const notifResF = await app.inject({
    method: 'GET',
    url: '/api/v1/notifications',
    headers: { authorization: `Bearer ${tokenCust1}` },
  });
  const clarifyNotif = notifResF.json().notifications.find(
    (n: any) => n.type === 'ESTIMATE_NEEDS_CLARIFICATION' && n.entityId === estimateId
  );
  assert.ok(clarifyNotif, 'ESTIMATE_NEEDS_CLARIFICATION notification must be generated');
  assert.match(clarifyNotif.linkActionUrl, new RegExp(estimateId));

  // =========================================================================
  // FIXTURE G: Quotation created -> notification generated
  // =========================================================================
  console.log('7. Verifying Fixture G: Quotation created -> notification generated...');

  // Clarify the ambiguous item
  const ambiguousItem = estData.items.find((i: any) => i.matchStatus === 'AMBIGUOUS' || i.matchStatus === 'NEEDS_CLARIFICATION');
  if (ambiguousItem) {
    const clarifyItemRes = await app.inject({
      method: 'POST',
      url: `/api/v1/estimates/${estimateId}/items/${ambiguousItem.id}/clarify`,
      headers: { authorization: `Bearer ${tokenCust1}` },
      payload: {
        chosenSku: 'ANC-ROM-6A1W-WHT',
      },
    });
    assert.equal(clarifyItemRes.statusCode, 200, 'Estimate item clarification failed');
  }

  // Generate quotation
  const quoteRes = await app.inject({
    method: 'POST',
    url: `/api/v1/estimates/${estimateId}/quote`,
    headers: { authorization: `Bearer ${tokenCust1}` },
    payload: {
      customerName: 'Anil Kumar Reddy',
      customerPhone: '+919848199882',
      deliveryAddress: 'Flat 301, Sri Sai Residency, Vijayawada',
    },
  });
  assert.equal(quoteRes.statusCode, 201, 'Quotation generation failed');
  const quotationData = quoteRes.json();

  await new Promise((r) => setTimeout(r, 100));

  const notifResG = await app.inject({
    method: 'GET',
    url: '/api/v1/notifications',
    headers: { authorization: `Bearer ${tokenCust1}` },
  });
  const quoteNotif = notifResG.json().notifications.find(
    (n: any) => n.type === 'QUOTATION_CREATED' && n.entityId === quotationData.id
  );
  assert.ok(quoteNotif, 'QUOTATION_CREATED notification must be generated for customer');
  assert.match(quoteNotif.message, /price lock/i);

  // =========================================================================
  // FIXTURE H: Low stock -> partner notification (with cooldown)
  // =========================================================================
  console.log('8. Verifying Fixture H: Low stock -> partner notification with cooldown...');

  // 1st trigger: should dispatch alert
  const firstAlert = await notificationService.publishLowStockAlert({
    partnerId: 'usr-retailer-1',
    partnerRole: 'RETAILER',
    skuId: 'sku-pol-cab-25-red',
    skuCode: 'POL-CAB-25-RED',
    productName: 'Polycab 2.5 sq mm Wire Red (90m)',
    currentStock: 4,
    threshold: 10,
    recipientEmail: 'murali.vjaelec@gmail.com',
    recipientPhone: '+919848012345',
    cooldownMinutes: 60,
  });
  assert.equal(firstAlert.dispatched, true, 'First low stock alert must dispatch');
  assert.ok(firstAlert.notification?.inAppId);

  // 2nd immediate trigger for same SKU: should be suppressed by cooldown
  const secondAlert = await notificationService.publishLowStockAlert({
    partnerId: 'usr-retailer-1',
    partnerRole: 'RETAILER',
    skuId: 'sku-pol-cab-25-red',
    skuCode: 'POL-CAB-25-RED',
    productName: 'Polycab 2.5 sq mm Wire Red (90m)',
    currentStock: 4,
    threshold: 10,
    recipientEmail: 'murali.vjaelec@gmail.com',
    recipientPhone: '+919848012345',
    cooldownMinutes: 60,
  });
  assert.equal(secondAlert.dispatched, false, 'Second low stock alert must be suppressed by cooldown');
  assert.match(secondAlert.reason || '', /COOLDOWN_ACTIVE/);

  // =========================================================================
  // FIXTURE I: Customer cannot access another customer's notification (IDOR)
  // =========================================================================
  console.log('9. Verifying Fixture I: Customer IDOR isolation...');

  // Create private notification for Customer 2
  const cust2NotifResult = await notificationService.publishEvent({
    eventType: 'ORDER_PLACED',
    userId: 'usr-customer-2',
    role: 'CUSTOMER',
    title: 'Customer 2 Confidential Order',
    message: 'Private message intended solely for Customer 2',
    entityType: 'ORDER',
    entityId: 'ord-cust-2-priv',
  });
  const cust2NotifId = cust2NotifResult.inAppId;

  // Customer 1 queries their notifications
  const cust1ListRes = await app.inject({
    method: 'GET',
    url: '/api/v1/notifications',
    headers: { authorization: `Bearer ${tokenCust1}` },
  });
  const cust1Notifs = cust1ListRes.json().notifications;
  assert.equal(
    cust1Notifs.some((n: any) => n.id === cust2NotifId),
    false,
    'Customer 1 must NOT see Customer 2 notifications in list'
  );

  // Customer 1 attempts to mark Customer 2 notification as read
  const idorReadRes = await app.inject({
    method: 'PATCH',
    url: `/api/v1/notifications/${cust2NotifId}/read`,
    headers: { authorization: `Bearer ${tokenCust1}` },
  });
  assert.equal(idorReadRes.statusCode, 403, 'Cross-customer notification read must return 403 Forbidden');

  // =========================================================================
  // FIXTURE J: Retailer cannot access another retailer's notification
  // =========================================================================
  console.log('10. Verifying Fixture J: Retailer tenancy isolation...');

  // Create private store alert for Retailer 2
  const ret2NotifResult = await notificationService.publishEvent({
    eventType: 'ADMIN_ALERT',
    userId: 'usr-retailer-2',
    role: 'RETAILER',
    title: 'Store Audit: Retailer 2 Only',
    message: 'Confidential store audit results for Retailer 2',
    entityType: 'USER',
    entityId: 'usr-retailer-2',
  });
  const ret2NotifId = ret2NotifResult.inAppId;

  // Retailer 1 queries notifications
  const ret1ListRes = await app.inject({
    method: 'GET',
    url: '/api/v1/notifications',
    headers: { authorization: `Bearer ${tokenRet1}` },
  });
  const ret1Notifs = ret1ListRes.json().notifications;
  assert.equal(
    ret1Notifs.some((n: any) => n.id === ret2NotifId),
    false,
    'Retailer 1 must NOT see Retailer 2 user-scoped notification'
  );

  // Retailer 1 attempts to mark Retailer 2 notification as read
  const retIdorRes = await app.inject({
    method: 'PATCH',
    url: `/api/v1/notifications/${ret2NotifId}/read`,
    headers: { authorization: `Bearer ${tokenRet1}` },
  });
  assert.equal(retIdorRes.statusCode, 403, 'Cross-retailer notification read must return 403 Forbidden');

  // =========================================================================
  // FIXTURE K: Distributor cannot access unrelated notifications
  // =========================================================================
  console.log('11. Verifying Fixture K: Distributor tenancy isolation...');

  // Distributor queries notifications
  const distListRes = await app.inject({
    method: 'GET',
    url: '/api/v1/notifications',
    headers: { authorization: `Bearer ${tokenDist1}` },
  });
  const distNotifs = distListRes.json().notifications;
  assert.equal(
    distNotifs.some((n: any) => n.id === cust2NotifId),
    false,
    'Distributor must NOT see customer private notifications'
  );
  assert.equal(
    distNotifs.some((n: any) => n.id === ret2NotifId),
    false,
    'Distributor must NOT see retailer private notifications'
  );

  // Distributor attempts to mark customer notification as read
  const distReadRes = await app.inject({
    method: 'PATCH',
    url: `/api/v1/notifications/${cust2NotifId}/read`,
    headers: { authorization: `Bearer ${tokenDist1}` },
  });
  assert.equal(distReadRes.statusCode, 403, 'Distributor unauthorized read must return 403 Forbidden');

  // =========================================================================
  // FIXTURE L: Duplicate webhook is ignored (idempotency)
  // =========================================================================
  console.log('12. Verifying Fixture L: Webhook delivery idempotency...');

  const knownMsgId = `mock-resend-receipt-${Date.now()}`;
  // Seed a pending delivery log
  await db.query(
    `INSERT INTO notification_logs (id, notification_id, channel, provider, provider_message_id, recipient, status, attempt_count, created_at, updated_at)
     VALUES ('log-test-idem', $1, 'EMAIL', 'resend', $2, 'test@electrakart.com', 'SENT', 1, NOW(), NOW())`,
    [orderPlacedNotif.id, knownMsgId]
  );

  const webhookPayload = {
    providerMessageId: knownMsgId,
    status: 'DELIVERED',
  };
  const rawBody = JSON.stringify(webhookPayload);
  const secret = config.emailWebhookSecret || 'test-email-webhook-secret';
  const sig = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

  // First webhook delivery receipt
  const whRes1 = await app.inject({
    method: 'POST',
    url: '/api/v1/notifications/webhooks/email',
    headers: {
      'content-type': 'application/json',
      'x-webhook-signature': sig,
    },
    payload: rawBody,
  });
  assert.equal(whRes1.statusCode, 200);
  assert.equal(whRes1.json().isDuplicate, false);
  assert.equal(whRes1.json().status, 'DELIVERED');

  // Second duplicate webhook delivery receipt
  const whRes2 = await app.inject({
    method: 'POST',
    url: '/api/v1/notifications/webhooks/email',
    headers: {
      'content-type': 'application/json',
      'x-webhook-signature': sig,
    },
    payload: rawBody,
  });
  assert.equal(whRes2.statusCode, 200);
  assert.equal(whRes2.json().isDuplicate, true, 'Duplicate webhook receipt must be flagged as duplicate');
  assert.equal(whRes2.json().status, 'ALREADY_DELIVERED');

  // =========================================================================
  // FIXTURE M: Invalid webhook signature rejected (HTTP 401/403)
  // =========================================================================
  console.log('13. Verifying Fixture M: Webhook signature security...');

  // 1. Missing signature header
  const whMissingSig = await app.inject({
    method: 'POST',
    url: '/api/v1/notifications/webhooks/email',
    payload: { providerMessageId: 'xyz' },
  });
  assert.equal(whMissingSig.statusCode, 401, 'Missing signature must return 401');

  // 2. Tampered signature header
  const whBadSig = await app.inject({
    method: 'POST',
    url: '/api/v1/notifications/webhooks/email',
    headers: {
      'content-type': 'application/json',
      'x-webhook-signature': '0000000000000000000000000000000000000000000000000000000000000000',
    },
    payload: { providerMessageId: 'xyz' },
  });
  assert.equal(whBadSig.statusCode, 403, 'Tampered signature must return 403');

  // =========================================================================
  // FIXTURE N: Provider failure does not rollback successful order
  // =========================================================================
  console.log('14. Verifying Fixture N: Provider failure isolation from orders...');

  // Configure mock email provider to throw/fail on next call
  mockEmailProvider.setFailNext(true);

  const orderResN = await app.inject({
    method: 'POST',
    url: '/api/v1/orders',
    headers: {
      authorization: `Bearer ${tokenCust1}`,
      'idempotency-key': `idem-notif-ord-fail-${Date.now()}`,
    },
    payload: {
      customerName: 'Anil Kumar Reddy',
      customerPhone: '+919848199882',
      customerEmail: 'anil.reddy@gmail.com',
      deliveryAddress: 'Flat 301, Sri Sai Residency, Guru Nanak Colony, Vijayawada',
      city: 'Vijayawada',
      pincode: '520002',
      cart: [{ sku: 'POL-WX-25-RED-90M', quantity: 1 }],
      paymentMethod: 'ONLINE',
    },
  });
  assert.equal(orderResN.statusCode, 201, 'Order must succeed even when email notification provider fails');
  const createdOrderN = orderResN.json();

  // Verify order is persisted in PostgreSQL
  const dbOrderN = await db.query('SELECT id, overall_status FROM orders WHERE id = $1', [createdOrderN.id]);
  assert.equal(dbOrderN.rows.length, 1, 'Order must be committed in PostgreSQL database');

  await new Promise((r) => setTimeout(r, 100));

  // Verify delivery log recorded FAILED status with error
  const failedLogs = await db.query(
    "SELECT * FROM notification_logs WHERE channel = 'EMAIL' AND status = 'FAILED' ORDER BY created_at DESC LIMIT 1"
  );
  assert.ok(failedLogs.rows.length > 0, 'Delivery log must record provider failure with error details');
  assert.match(failedLogs.rows[0].last_error, /Simulated email provider network timeout/i);

  // =========================================================================
  // FIXTURE O: Failed notification can be retried
  // =========================================================================
  console.log('15. Verifying Fixture O: Notification retry mechanism...');

  const failedLogId = failedLogs.rows[0].id;
  const retryRes = await app.inject({
    method: 'POST',
    url: `/api/v1/notifications/${failedLogId}/retry`,
    headers: { authorization: `Bearer ${tokenCust1}` },
  });
  assert.equal(retryRes.statusCode, 200, 'Notification retry failed');
  const retryData = retryRes.json();
  assert.equal(retryData.success, true);
  assert.equal(retryData.status, 'SENT');
  assert.equal(retryData.attemptCount, 2, 'Attempt count must increment to 2');

  // =========================================================================
  // FIXTURE P: Notification provider secrets never reach frontend
  // =========================================================================
  console.log('16. Verifying Fixture P: Secret protection & zero leakage to client...');

  const configSecrets = [
    'test-email-webhook-secret',
    'test-sms-webhook-secret',
    'test-whatsapp-webhook-secret',
  ];

  const notifEndpoints = [
    { method: 'GET' as const, url: '/api/v1/notifications', headers: { authorization: `Bearer ${tokenCust1}` } },
    { method: 'GET' as const, url: '/api/v1/notifications/unread-count', headers: { authorization: `Bearer ${tokenCust1}` } },
    { method: 'GET' as const, url: '/api/v1/notifications/preferences', headers: { authorization: `Bearer ${tokenCust1}` } },
  ];

  for (const ep of notifEndpoints) {
    const res = await app.inject(ep);
    const bodyStr = res.body;
    for (const sec of configSecrets) {
      assert.equal(
        bodyStr.includes(sec),
        false,
        `Endpoint ${ep.url} leaked confidential secret '${sec}'`
      );
    }
  }

  // =========================================================================
  // FIXTURE Q: Production mock-provider guard works
  // =========================================================================
  console.log('17. Verifying Fixture Q: Production mock-provider startup guard...');

  const baseProdEnv: Record<string, string> = {
    NODE_ENV: 'production',
    JWT_SECRET: 'super-secure-production-jwt-secret-at-least-32-chars-long!',
    DATABASE_URL: 'postgresql://prod_user:prod_pass@prod-db.internal:5432/electrakart_prod',
    CORS_ORIGIN: 'https://electrakart.com',
    PAYMENT_PROVIDER: 'razorpay',
    RAZORPAY_KEY_ID: 'rzp_live_12345',
    RAZORPAY_KEY_SECRET: 'secret12345',
    OCR_PROVIDER: 'disabled',
    MAPS_PROVIDER: 'google_maps',
    GOOGLE_MAPS_API_KEY: 'AIzaSyFakeKeyForMaps123',
  };

  // 1. Production with EMAIL_PROVIDER=mock must throw
  assert.throws(
    () => {
      getValidatedConfig({
        ...baseProdEnv,
        EMAIL_ENABLED: 'true',
        EMAIL_PROVIDER: 'mock',
        SMS_ENABLED: 'false',
        WHATSAPP_ENABLED: 'false',
      });
    },
    /EMAIL_PROVIDER cannot be "mock"/,
    'Production startup must abort when EMAIL_PROVIDER is mock'
  );

  // 2. Production with SMS_PROVIDER=mock must throw
  assert.throws(
    () => {
      getValidatedConfig({
        ...baseProdEnv,
        EMAIL_ENABLED: 'false',
        SMS_ENABLED: 'true',
        SMS_PROVIDER: 'mock',
        WHATSAPP_ENABLED: 'false',
      });
    },
    /SMS_PROVIDER cannot be "mock"/,
    'Production startup must abort when SMS_PROVIDER is mock'
  );

  // 3. Production with WHATSAPP_PROVIDER=mock must throw
  assert.throws(
    () => {
      getValidatedConfig({
        ...baseProdEnv,
        EMAIL_ENABLED: 'false',
        SMS_ENABLED: 'false',
        WHATSAPP_ENABLED: 'true',
        WHATSAPP_PROVIDER: 'mock',
      });
    },
    /WHATSAPP_PROVIDER cannot be "mock"/,
    'Production startup must abort when WHATSAPP_PROVIDER is mock'
  );

  // =========================================================================
  // FIXTURE R: Internal financial data never appears in customer notification payloads
  // =========================================================================
  console.log('18. Verifying Fixture R: Customer notification payload financial data scrubbing...');

  const custNotifications = (
    await app.inject({
      method: 'GET',
      url: '/api/v1/notifications',
      headers: { authorization: `Bearer ${tokenCust1}` },
    })
  ).json().notifications;

  const forbiddenFinancialTerms = [
    'purchase_cost',
    'purchaseCost',
    'wholesale_price',
    'wholesalePrice',
    'dealer_margin',
    'dealerMargin',
    'platform_fee',
    'platformFee',
    'settlement_amount',
    'settlementAmount',
  ];

  for (const n of custNotifications) {
    const payloadStr = JSON.stringify(n);
    for (const term of forbiddenFinancialTerms) {
      assert.equal(
        payloadStr.includes(`"${term}"`),
        false,
        `Customer notification ${n.id} contains internal financial term '${term}'`
      );
    }
  }

  // Also verify rendered email/sms templates do not leak financial terms
  const testRender = renderTemplates({
    eventType: 'ORDER_PLACED',
    userId: 'usr-customer-1',
    role: 'CUSTOMER',
    title: 'Order Confirmation',
    message: 'Your order has been placed',
    metadata: {
      orderNumber: 'EK-ORD-1234',
      grandTotal: 5000,
      wholesaleCost: 3500, // Attempted internal leak
      dealerMargin: 1500,  // Attempted internal leak
    },
  });
  assert.equal(testRender.email.htmlBody.includes('wholesaleCost'), false);
  assert.equal(testRender.email.htmlBody.includes('3500'), false);
  assert.equal(testRender.sms.text.includes('dealerMargin'), false);
  assert.equal(testRender.sms.text.includes('1500'), false);

  // =========================================================================
  // FIXTURE S: Notification preferences respected
  // =========================================================================
  console.log('19. Verifying Fixture S: User channel preferences respected...');

  // Customer 1 opts out of SMS
  const prefUpdateRes = await app.inject({
    method: 'PUT',
    url: '/api/v1/notifications/preferences',
    headers: { authorization: `Bearer ${tokenCust1}` },
    payload: {
      inApp: true,
      email: true,
      sms: false,
      whatsapp: true,
    },
  });
  assert.equal(prefUpdateRes.statusCode, 200);
  assert.equal(prefUpdateRes.json().sms, false);

  // Trigger non-critical event
  const initialSmsCount = mockSmsProvider.getSentMessages().length;
  await notificationService.publishEvent({
    eventType: 'ADMIN_ALERT',
    userId: 'usr-customer-1',
    role: 'CUSTOMER',
    title: 'ElectraKart Newsletter',
    message: 'Check out our seasonal discount on LED panels',
    recipientEmail: 'anil.reddy@gmail.com',
    recipientPhone: '+919848199882',
    isCriticalTransactional: false,
  });

  const postEventSmsCount = mockSmsProvider.getSentMessages().length;
  assert.equal(
    postEventSmsCount,
    initialSmsCount,
    'Non-critical event must NOT send SMS when user opted out'
  );

  // Now trigger critical transactional event -> must bypass opt-out
  await notificationService.publishEvent({
    eventType: 'ORDER_CONFIRMED',
    userId: 'usr-customer-1',
    role: 'CUSTOMER',
    title: 'Urgent: Order Status Update',
    message: 'Your package is out for delivery',
    recipientEmail: 'anil.reddy@gmail.com',
    recipientPhone: '+919848199882',
    isCriticalTransactional: true,
  });
  assert.equal(
    mockSmsProvider.getSentMessages().length,
    initialSmsCount + 1,
    'Critical transactional event MUST bypass optional opt-out'
  );

  // Reset preferences
  await app.inject({
    method: 'PUT',
    url: '/api/v1/notifications/preferences',
    headers: { authorization: `Bearer ${tokenCust1}` },
    payload: { sms: true },
  });

  // =========================================================================
  // FIXTURE T: Phase 3C payment -> notification integration
  // =========================================================================
  console.log('20. Verifying Fixture T: Phase 3C payment -> notification integration...');

  // Order with online payment through complete lifecycle
  const cartT = [
    {
      sku: 'POL-WX-25-RED-90M',
      quantity: 1,
      selectedStore: { partnerId: 'partner-vja-elec-1', storeName: 'Vijayawada Electricals' },
      product: { sku: 'POL-WX-25-RED-90M' },
    },
  ];

  const payCreateResT = await app.inject({
    method: 'POST',
    url: '/api/v1/payments/create',
    headers: { authorization: `Bearer ${tokenCust1}` },
    payload: {
      cart: cartT,
      customerName: 'Anil Kumar Reddy',
      customerPhone: '+919848199882',
      deliveryAddress: 'Flat 301, Sri Sai Residency, Guru Nanak Colony, Vijayawada',
      city: 'Vijayawada',
      pincode: '520002',
      deliveryMethod: 'EXPRESS',
      paymentMethod: 'UPI',
    },
  });
  assert.equal(payCreateResT.statusCode, 201);
  const payCreatedT = payCreateResT.json();

  const verifyResT = await app.inject({
    method: 'POST',
    url: '/api/v1/payments/verify',
    headers: { authorization: `Bearer ${tokenCust1}` },
    payload: {
      paymentId: payCreatedT.paymentId,
      orderId: payCreatedT.orderId,
      providerPaymentId: 'pay_mock_3c_complete',
      providerOrderId: payCreatedT.providerOrderId,
      signature: 'valid_sig',
      simulatedOutcome: 'SUCCESS',
    },
  });
  assert.equal(verifyResT.statusCode, 200);
  assert.equal(verifyResT.json().isVerified, true);

  await new Promise((r) => setTimeout(r, 100));

  const notifResT = await app.inject({
    method: 'GET',
    url: '/api/v1/notifications',
    headers: { authorization: `Bearer ${tokenCust1}` },
  });
  const paySuccessT = notifResT.json().notifications.find(
    (n: any) => n.type === 'ORDER_PAYMENT_SUCCESS' && n.entityId === payCreatedT.orderId
  );
  assert.ok(paySuccessT, 'Payment verification must generate ORDER_PAYMENT_SUCCESS notification');

  // =========================================================================
  // FIXTURE U: Phase 3D estimate -> notification integration
  // =========================================================================
  console.log('21. Verifying Fixture U: Phase 3D estimate -> notification integration...');

  // Upload unambiguous estimate
  const estUploadResU = await app.inject({
    method: 'POST',
    url: '/api/v1/estimates/upload',
    headers: { authorization: `Bearer ${tokenCust1}` },
    payload: {
      customerName: 'Anil Kumar Reddy',
      customerPhone: '+919848199882',
      filename: 'fixture_a_exact.pdf',
      fileBase64: validPdfB64,
      mimeType: 'application/pdf',
      city: 'Vijayawada',
      pincode: '520002',
    },
  });
  assert.equal(estUploadResU.statusCode, 201);
  const estDataU = estUploadResU.json();

  await new Promise((r) => setTimeout(r, 100));

  const notifResU = await app.inject({
    method: 'GET',
    url: '/api/v1/notifications',
    headers: { authorization: `Bearer ${tokenCust1}` },
  });
  const estProcNotif = notifResU.json().notifications.find(
    (n: any) => n.type === 'ESTIMATE_PROCESSED' && n.entityId === estDataU.estimateId
  );
  assert.ok(estProcNotif, 'Exact estimate processing must generate ESTIMATE_PROCESSED notification');

  // =========================================================================
  // FIXTURE V: Phase 3E fulfillment -> notification integration
  // =========================================================================
  console.log('22. Verifying Fixture V: Phase 3E fulfillment -> notification integration...');

  const fulLookup = await db.query('SELECT id FROM order_fulfillments WHERE order_id = $1 LIMIT 1', [payCreatedT.orderId]);
  const fulId = fulLookup.rows[0]?.id;
  assert.ok(fulId, 'Fulfillment must exist for the order');

  // Dispatch fulfillment
  const dispResV = await app.inject({
    method: 'PATCH',
    url: `/api/v1/orders/${payCreatedT.orderId}/fulfillments/${fulId}/status`,
    headers: { authorization: `Bearer ${tokenRet1}` },
    payload: {
      status: 'DISPATCHED',
      trackingDetails: { carrier: 'ElectraKart Hyperlocal Fleet', trackingNumber: 'EK-HYP-5521' },
    },
  });
  assert.equal(dispResV.statusCode, 200);

  // Complete delivery
  const delResV = await app.inject({
    method: 'PATCH',
    url: `/api/v1/orders/${payCreatedT.orderId}/fulfillments/${fulId}/status`,
    headers: { authorization: `Bearer ${tokenRet1}` },
    payload: {
      status: 'DELIVERED',
      deliveredAt: new Date().toISOString(),
    },
  });
  assert.equal(delResV.statusCode, 200);

  await new Promise((r) => setTimeout(r, 100));

  const notifResV = await app.inject({
    method: 'GET',
    url: '/api/v1/notifications',
    headers: { authorization: `Bearer ${tokenCust1}` },
  });
  const delNotifV = notifResV.json().notifications.find(
    (n: any) => n.type === 'ORDER_DELIVERED' && n.entityId === payCreatedT.orderId
  );
  assert.ok(delNotifV, 'Fulfillment delivery must trigger customer delivery confirmation notification');

  console.log('  ✅ ALL FIXTURES A THROUGH V PASSED DETERMINISTICALLY');
}

if (process.argv[1]?.includes('notification_communication.test')) {
  runNotificationCommunicationTests()
    .then(() => {
      console.log('Notification Communication tests finished successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

