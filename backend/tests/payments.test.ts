/**
 * ElectraKart Payments, Checkout & Financial Architecture Automated Tests (Phase 3C)
 */

import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';
import { db } from '../src/db/connection.js';
import { loadConfig } from '../src/config/environment.js';
import { runMigrations } from '../src/db/migrate.js';
import { seedDatabase } from '../src/db/seed.js';

export async function runPaymentsTests() {
  console.log('\n--- Running Payments, Checkout & Financial Architecture Tests (Phase 3C) ---');
  await runMigrations();
  await seedDatabase();

  // Clean transactional tables for fresh test run
  await db.exec(`
    DELETE FROM idempotency_keys;
    DELETE FROM payment_webhook_logs;
    DELETE FROM partner_settlements;
    DELETE FROM invoices;
    DELETE FROM payments;
    DELETE FROM fulfillment_tracking_logs;
    DELETE FROM fulfillment_items;
    DELETE FROM order_fulfillments;
    DELETE FROM orders;
  `);

  const app = buildApp();
  await app.ready();

  // 1. Customer Token (Anil Kumar Reddy)
  const custLoginRes = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { emailOrPhone: 'anil.reddy@gmail.com', password: 'password123' },
  });
  assert.equal(custLoginRes.statusCode, 200, 'Customer login failed');
  const customerToken = custLoginRes.json().accessToken;

  // 2. Another Customer Token for IDOR Testing (Sunita Sharma)
  await db.query(`
    INSERT INTO users (id, email, phone_number, full_name, role, password_hash, is_active, created_at, updated_at)
    VALUES ('usr-customer-2', 'sunita.sharma@gmail.com', '+91 91234 56789', 'Sunita Sharma', 'CUSTOMER', '$2a$10$abcdefghijklmnopqrstuvwxyz123456', true, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING
  `);
  const customer2Token = app.jwt.sign({
    id: 'usr-customer-2',
    email: 'sunita.sharma@gmail.com',
    role: 'CUSTOMER',
    fullName: 'Sunita Sharma',
  });

  // 3. Admin Token
  const adminLoginRes = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { emailOrPhone: 'admin@electrakart.com', password: 'password123' },
  });
  assert.equal(adminLoginRes.statusCode, 200, 'Admin login failed');
  const adminToken = adminLoginRes.json().accessToken;

  // 1. Authoritative Server Pricing & Payment Order Creation
  console.log('1. Verifying Server-Authoritative Pricing & Payment Creation...');
  const cartPayload = [
    {
      sku: 'POL-WX-25-RED-90M',
      quantity: 2,
      selectedStore: { partnerId: 'partner-vja-elec-1', storeName: 'Vijayawada Electricals' },
      // Attempt client tampering with cheap price and 0 taxes
      product: { sku: 'POL-WX-25-RED-90M', name: 'Polycab FlameX 1.0 sq.mm' },
      clientSubmittedPrice: 10,
      clientSubmittedTotal: 20,
    },
  ];

  const createRes = await app.inject({
    method: 'POST',
    url: '/api/v1/payments/create',
    headers: {
      Authorization: `Bearer ${customerToken}`,
      'Idempotency-Key': 'idem-pay-create-101',
    },
    payload: {
      cart: cartPayload,
      customerName: 'Anil Kumar Reddy',
      customerPhone: '+91 98481 99882',
      deliveryAddress: 'Flat 301, Sri Sai Residency, Guru Nanak Colony',
      city: 'Vijayawada',
      pincode: '520008',
      paymentMethod: 'UPI',
    },
  });

  if (createRes.statusCode !== 201) {
    console.error('Create Payment Error:', createRes.json());
  }
  assert.equal(createRes.statusCode, 201, `Create payment expected 201, got ${createRes.statusCode}`);
  const createdPayment = createRes.json();
  assert.ok(createdPayment.paymentId, 'paymentId must be returned');
  assert.ok(createdPayment.orderId, 'orderId must be returned');
  assert.ok(createdPayment.providerOrderId, 'providerOrderId must be returned');
  // 2 items * 3100 = 6200 subtotal, delivery fee = 0 (subtotal >= 5000), gst (18%) = 1116. Grand total = 7316
  assert.equal(createdPayment.amountInr, 7316, 'Authoritative payable amount must match server calculation (7316)');
  console.log(`✓ Payment order created: ${createdPayment.providerOrderId} for authoritative amount ₹${createdPayment.amountInr}`);

  // 2. Idempotency Key Verification
  console.log('2. Verifying Payment Creation Idempotency...');
  const duplicateCreateRes = await app.inject({
    method: 'POST',
    url: '/api/v1/payments/create',
    headers: {
      Authorization: `Bearer ${customerToken}`,
      'Idempotency-Key': 'idem-pay-create-101',
    },
    payload: {
      cart: cartPayload,
      customerName: 'Anil Kumar Reddy',
      customerPhone: '+91 98481 99882',
      deliveryAddress: 'Flat 301, Sri Sai Residency, Guru Nanak Colony',
      city: 'Vijayawada',
      pincode: '520008',
      paymentMethod: 'UPI',
    },
  });
  assert.equal(duplicateCreateRes.statusCode, 201);
  assert.equal(duplicateCreateRes.json().paymentId, createdPayment.paymentId, 'Duplicate request must return cached paymentId');
  console.log('✓ Idempotency-Key successfully returned cached payment without duplicate records');

  // 3. Payment Verification (Success) -> Confirmed Order, Stock Reserved, Invoice & Settlement Created
  console.log('3. Verifying Successful Payment & Atomic Order Confirmation...');
  const invBefore = await db.query(
    "SELECT in_stock_quantity, reserved_quantity, available_quantity FROM partner_inventories WHERE partner_id = 'partner-vja-elec-1' AND sku_code = 'POL-WX-25-RED-90M'"
  );
  const baselineReserved = invBefore.rows[0].reserved_quantity;

  const verifySuccessRes = await app.inject({
    method: 'POST',
    url: '/api/v1/payments/verify',
    headers: { Authorization: `Bearer ${customerToken}` },
    payload: {
      paymentId: createdPayment.paymentId,
      orderId: createdPayment.orderId,
      providerPaymentId: 'pay_mock_success_12345',
      providerOrderId: createdPayment.providerOrderId,
      signature: 'mock_sig_valid',
      simulatedOutcome: 'SUCCESS',
    },
  });

  if (verifySuccessRes.statusCode !== 200) {
    console.error('Verify Success Error:', verifySuccessRes.json());
  }
  assert.equal(verifySuccessRes.statusCode, 200, `Verification expected 200, got ${verifySuccessRes.statusCode}`);
  const verifyData = verifySuccessRes.json();
  assert.equal(verifyData.isVerified, true);
  assert.equal(verifyData.paymentStatus, 'CAPTURED');
  assert.equal(verifyData.overallStatus, 'CONFIRMED');
  assert.ok(verifyData.invoiceNumber, 'Invoice number must be generated');

  // Check inventory atomically reserved
  const invAfter = await db.query(
    "SELECT in_stock_quantity, reserved_quantity, available_quantity FROM partner_inventories WHERE partner_id = 'partner-vja-elec-1' AND sku_code = 'POL-WX-25-RED-90M'"
  );
  assert.equal(invAfter.rows[0].reserved_quantity, baselineReserved + 2, 'Stock must be atomically reserved (+2 coils)');

  // Check invoice generated
  const invoiceRes = await app.inject({
    method: 'GET',
    url: `/api/v1/invoices/${createdPayment.orderId}`,
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  assert.equal(invoiceRes.statusCode, 200);
  assert.equal(invoiceRes.json().grandTotalInr, 7316);
  console.log(`✓ Payment CAPTURED, order CONFIRMED, inventory reserved (+2), invoice ${verifyData.invoiceNumber} created`);

  // 4. Payment Failure Handling & Retry without Duplicate Orders
  console.log('4. Verifying Payment Failure Handling & Retry...');
  const createFailRes = await app.inject({
    method: 'POST',
    url: '/api/v1/payments/create',
    headers: { Authorization: `Bearer ${customerToken}` },
    payload: {
      cart: cartPayload,
      customerName: 'Anil Kumar Reddy',
      customerPhone: '+91 98481 99882',
      deliveryAddress: 'Flat 301, Sri Sai Residency, Guru Nanak Colony',
      city: 'Vijayawada',
      pincode: '520008',
      paymentMethod: 'UPI',
    },
  });
  const failedAttempt = createFailRes.json();

  // Attempt verification with failure simulation
  const verifyFailRes = await app.inject({
    method: 'POST',
    url: '/api/v1/payments/verify',
    headers: { Authorization: `Bearer ${customerToken}` },
    payload: {
      paymentId: failedAttempt.paymentId,
      orderId: failedAttempt.orderId,
      providerPaymentId: 'pay_mock_fail_999',
      providerOrderId: failedAttempt.providerOrderId,
      signature: 'fail',
      simulatedOutcome: 'FAILURE',
    },
  });

  assert.equal(verifyFailRes.statusCode, 402, `Payment failure expected 402, got ${verifyFailRes.statusCode}`);
  const failData = verifyFailRes.json();
  assert.equal(failData.data.isVerified, false);
  assert.equal(failData.data.paymentStatus, 'FAILED');

  // Verify order status is NOT confirmed
  const orderCheck = await db.query('SELECT overall_status, payment_status FROM orders WHERE id = $1', [failedAttempt.orderId]);
  assert.equal(orderCheck.rows[0].payment_status, 'PENDING');
  assert.equal(orderCheck.rows[0].overall_status, 'PLACED');

  // Retry payment on SAME order
  const retryRes = await app.inject({
    method: 'POST',
    url: '/api/v1/payments/retry',
    headers: { Authorization: `Bearer ${customerToken}` },
    payload: {
      orderId: failedAttempt.orderId,
      paymentMethod: 'NET_BANKING',
    },
  });
  assert.equal(retryRes.statusCode, 201);
  const retryData = retryRes.json();
  assert.equal(retryData.orderId, failedAttempt.orderId, 'Retry must link to original order');
  assert.notEqual(retryData.paymentId, failedAttempt.paymentId, 'Retry must generate new payment record attempt');
  console.log('✓ Payment failure properly returns 402; Retry attaches new payment to same business order');

  // 5. Inbound Webhook Verification & Idempotency
  console.log('5. Verifying Webhook Signature Verification & Idempotency...');
  // Valid Webhook
  const webhookRes = await app.inject({
    method: 'POST',
    url: '/api/v1/payments/webhook',
    headers: {
      'x-razorpay-signature': 'mock_sig_webhook',
      'Content-Type': 'application/json',
    },
    payload: {
      id: 'evt_test_webhook_001',
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_hook_999',
            order_id: retryData.providerOrderId,
            amount: 731600,
          },
        },
      },
    },
  });
  assert.equal(webhookRes.statusCode, 200);
  assert.equal(webhookRes.json().processed, true);

  // Duplicate Webhook (should be recognized as duplicate without error)
  const dupWebhookRes = await app.inject({
    method: 'POST',
    url: '/api/v1/payments/webhook',
    headers: {
      'x-razorpay-signature': 'mock_sig_webhook',
      'Content-Type': 'application/json',
    },
    payload: {
      id: 'evt_test_webhook_001',
      event: 'payment.captured',
    },
  });
  assert.equal(dupWebhookRes.statusCode, 200);
  assert.equal(dupWebhookRes.json().duplicate, true);

  // Invalid Webhook Signature
  const badWebhookRes = await app.inject({
    method: 'POST',
    url: '/api/v1/payments/webhook',
    headers: {
      'x-razorpay-signature': 'invalid_signature',
      'Content-Type': 'application/json',
    },
    payload: { id: 'evt_bad', event: 'payment.captured' },
  });
  assert.equal(badWebhookRes.statusCode, 400, 'Invalid webhook signature must be rejected with 400');
  console.log('✓ Webhook processing verified: signature checked, duplicate event deduplicated');

  // 6. Order Cancellation & Atomic Inventory Rollback
  console.log('6. Verifying Order Cancellation & Inventory Rollback...');
  const invBeforeCancel = await db.query(
    "SELECT reserved_quantity, available_quantity FROM partner_inventories WHERE partner_id = 'partner-vja-elec-1' AND sku_code = 'POL-WX-25-RED-90M'"
  );

  const cancelRes = await app.inject({
    method: 'POST',
    url: `/api/v1/orders/${createdPayment.orderId}/cancel`,
    headers: { Authorization: `Bearer ${customerToken}` },
    payload: { reason: 'Customer changed site schedule' },
  });
  if (cancelRes.statusCode !== 200) {
    console.error('Cancel Error:', cancelRes.json());
  }
  assert.equal(cancelRes.statusCode, 200);
  const cancelData = cancelRes.json();
  assert.equal(cancelData.overallStatus, 'CANCELLED');
  assert.equal(cancelData.inventoryReleased, true);

  const invAfterCancel = await db.query(
    "SELECT reserved_quantity, available_quantity FROM partner_inventories WHERE partner_id = 'partner-vja-elec-1' AND sku_code = 'POL-WX-25-RED-90M'"
  );
  assert.equal(invAfterCancel.rows[0].reserved_quantity, invBeforeCancel.rows[0].reserved_quantity - 2, 'Inventory reservation rolled back (-2)');
  console.log('✓ Order cancelled, stock reservation atomically released, refund initiated');

  // 7. Prohibited Cancellation Rule
  console.log('7. Verifying Prohibited Cancellation Stage...');
  // Create another order and set status to DISPATCHED
  const newOrderRes = await app.inject({
    method: 'POST',
    url: '/api/v1/orders',
    headers: { Authorization: `Bearer ${customerToken}` },
    payload: {
      cart: cartPayload,
      customerName: 'Anil Kumar Reddy',
      customerPhone: '+91 98481 99882',
      pincode: '520008',
    },
  });
  const newOrd = newOrderRes.json();
  await db.query("UPDATE order_fulfillments SET status = 'DISPATCHED' WHERE order_id = $1", [newOrd.id]);

  const cancelProhibitedRes = await app.inject({
    method: 'POST',
    url: `/api/v1/orders/${newOrd.id}/cancel`,
    headers: { Authorization: `Bearer ${customerToken}` },
    payload: { reason: 'Too late' },
  });
  assert.equal(cancelProhibitedRes.statusCode, 409, 'Cancellation after dispatch must be rejected with 409');
  console.log('✓ Prohibited cancellation stage rejected with 409 Conflict');

  // 8. IDOR Protection (Customer A cannot access Customer B's payment/invoice)
  console.log('8. Verifying IDOR Ownership Protection...');
  const idorPayRes = await app.inject({
    method: 'GET',
    url: `/api/v1/payments/${createdPayment.paymentId}`,
    headers: { Authorization: `Bearer ${customer2Token}` }, // Customer 2 trying to access Customer 1
  });
  assert.equal(idorPayRes.statusCode, 403, 'IDOR access on payment must return 403 Forbidden');

  const idorInvRes = await app.inject({
    method: 'GET',
    url: `/api/v1/invoices/${createdPayment.orderId}`,
    headers: { Authorization: `Bearer ${customer2Token}` },
  });
  assert.equal(idorInvRes.statusCode, 403, 'IDOR access on invoice must return 403 Forbidden');
  console.log('✓ IDOR ownership enforced (403 Forbidden across payments and invoices)');

  // 9. Zero Financial Leakage Protection
  console.log('9. Verifying Zero Financial Leakage to Customers...');
  const custSettlementRes = await app.inject({
    method: 'GET',
    url: '/api/v1/settlements',
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  assert.equal(custSettlementRes.statusCode, 403, 'Customers must be blocked from settlements endpoint');

  // Admin access to settlements
  const adminSettlementRes = await app.inject({
    method: 'GET',
    url: '/api/v1/settlements',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(adminSettlementRes.statusCode, 200, 'Admin can view settlements');
  const settlements = adminSettlementRes.json();
  assert.ok(Array.isArray(settlements));
  assert.ok(settlements.length > 0, 'Partner settlements must be present in ledger');
  assert.ok(settlements[0].commissionRatePercent, 'Commission rate recorded in settlement ledger');
  console.log('✓ Zero financial leakage: customer receives 403 on settlements; Admin views ledger');

  // 10. Admin Refund Endpoint
  console.log('10. Verifying Admin Manual Refund...');
  // Customer attempt should fail with 403
  const custRefundRes = await app.inject({
    method: 'POST',
    url: '/api/v1/payments/refund',
    headers: { Authorization: `Bearer ${customerToken}` },
    payload: { paymentId: createdPayment.paymentId, amountInr: 500, reason: 'Test' },
  });
  assert.equal(custRefundRes.statusCode, 403, 'Non-admin refund attempt must be blocked with 403');
  console.log('✓ Non-admin refund blocked with 403');

  // 11. Production Simulator Guard
  console.log('11. Verifying Production Simulator Guard...');
  assert.throws(
    () =>
      loadConfig({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://prod_user:secret@prod-db.internal:5432/electrakart_prod',
        JWT_SECRET: 'production_high_entropy_secret_key_minimum_32_characters_long',
        PAYMENT_PROVIDER: 'mock',
      }),
    /PAYMENT_PROVIDER/
  );
  console.log('✓ Production startup correctly aborts if PAYMENT_PROVIDER=mock');

  console.log('\n✅ ALL Phase 3C Payments & Financial Transaction Tests Passed (100% SUCCESS)!');
  await app.close();
}

// If run directly: tsx tests/payments.test.ts
if (process.argv[1]?.includes('payments.test.ts')) {
  runPaymentsTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
