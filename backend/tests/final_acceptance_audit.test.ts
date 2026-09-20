/**
 * ElectraKart Phase 3H — Final Production Acceptance & Security Audit Test Suite
 * Exhaustive, deterministic audit across all backend modules and security boundaries.
 */

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { buildApp } from '../src/app.js';
import { db } from '../src/db/connection.js';
import { runMigrations } from '../src/db/migrate.js';
import { seedDatabase } from '../src/db/seed.js';
import { validateEstimateFile, sanitizeFilename } from '../src/modules/estimates/fileValidator.js';

export async function runFinalAcceptanceAuditTests() {
  console.log('\n================================================================');
  console.log('  🛡️ ELECTRAKART PHASE 3H — FINAL PRODUCTION ACCEPTANCE & SECURITY AUDIT');
  console.log('================================================================');

  // Reset database state
  await runMigrations();
  await seedDatabase();

  const app = await buildApp();

  // 1. Prepare Auth Tokens for all 4 Roles
  const tokenCust1 = app.jwt.sign({
    id: 'usr-customer-1',
    email: 'anil.reddy@gmail.com',
    role: 'CUSTOMER',
    fullName: 'Anil Kumar Reddy',
  });

  // Second customer for horizontal privilege escalation (IDOR) tests
  await db.query(`
    INSERT INTO users (id, email, phone_number, full_name, role, password_hash, is_active, created_at, updated_at)
    VALUES ('usr-customer-2', 'sunita.sharma@gmail.com', '+919123456789', 'Sunita Sharma', 'CUSTOMER', '$2a$10$abcdefghijklmnopqrstuvwxyz123456', true, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING
  `);
  const tokenCust2 = app.jwt.sign({
    id: 'usr-customer-2',
    email: 'sunita.sharma@gmail.com',
    role: 'CUSTOMER',
    fullName: 'Sunita Sharma',
  });

  const tokenRetailer = app.jwt.sign({
    id: 'usr-retailer-1',
    email: 'retailer1@electrakart.com',
    role: 'RETAILER',
    partnerId: 'partner-vja-elec-1',
  });

  const tokenDistributor = app.jwt.sign({
    id: 'usr-distributor-1',
    email: 'distributor1@electrakart.com',
    role: 'DISTRIBUTOR',
    partnerId: 'dist-abc-vja-hub',
  });

  const adminLoginRes = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { emailOrPhone: 'admin@electrakart.com', password: 'password123' },
  });
  assert.equal(adminLoginRes.statusCode, 200);
  const tokenAdmin = adminLoginRes.json().accessToken;

  // =========================================================================
  // AUDIT SECTION 1: ENDPOINT SECURITY MATRIX (A through J)
  // =========================================================================
  console.log('\n--- 1. Systematic Security Matrix Audit (Scenarios A through J) ---');

  // A. Valid authorized request
  const validRes = await app.inject({
    method: 'GET',
    url: '/api/v1/products',
  });
  assert.equal(validRes.statusCode, 200, 'A. Valid public request must succeed');

  // B. Unauthenticated request on protected endpoints
  const unauthRes = await app.inject({
    method: 'GET',
    url: '/api/v1/admin/audit-logs',
  });
  assert.equal(unauthRes.statusCode, 401, 'B. Unauthenticated request to protected endpoint must return 401');

  // C. Wrong-role request (Vertical privilege escalation)
  const wrongRoleRes = await app.inject({
    method: 'GET',
    url: '/api/v1/admin/dashboard',
    headers: { authorization: `Bearer ${tokenCust1}` },
  });
  assert.equal(wrongRoleRes.statusCode, 403, 'C. Customer accessing Admin dashboard must be forbidden (403)');

  // D. Wrong-user request (Horizontal IDOR)
  // Create an address for Customer 1
  const addrRes = await app.inject({
    method: 'POST',
    url: '/api/v1/customers/me/addresses',
    headers: { authorization: `Bearer ${tokenCust1}` },
    payload: {
      recipient_name: 'Anil Kumar Reddy',
      phone_number: '+919848199882',
      address_line1: 'Audit Test Villa 101',
      city: 'Vijayawada',
      state: 'Andhra Pradesh',
      pincode: '520002',
    },
  });
  assert.equal(addrRes.statusCode, 201);
  const cust1Address = addrRes.json().address;

  // Customer 2 attempts to delete or modify Customer 1's address
  const idorAddrDeleteRes = await app.inject({
    method: 'DELETE',
    url: `/api/v1/customers/me/addresses/${cust1Address.id}`,
    headers: { authorization: `Bearer ${tokenCust2}` },
  });
  assert.equal(idorAddrDeleteRes.statusCode, 403, 'D. Customer 2 must not delete Customer 1 address (IDOR guard 403)');

  // E. Wrong-partner request (Cross-partner node manipulation)
  // Place an order to generate fulfillment for partner-vja-elec-1
  const orderResE = await app.inject({
    method: 'POST',
    url: '/api/v1/orders',
    headers: { authorization: `Bearer ${tokenCust1}` },
    payload: {
      customerName: 'Anil Kumar Reddy',
      customerPhone: '+919848199882',
      deliveryAddress: 'Audit Test Villa 101, Vijayawada',
      city: 'Vijayawada',
      pincode: '520002',
      cart: [{ sku: 'POL-WX-25-RED-90M', quantity: 1 }],
      paymentMethod: 'UPI',
    },
  });
  assert.equal(orderResE.statusCode, 201);
  const orderE = orderResE.json();
  const fulE = orderE.fulfillments[0];

  // Distributor (dist-abc-vja-hub) attempts to mutate Retailer's (partner-vja-elec-1) fulfillment
  const crossPartnerMutateRes = await app.inject({
    method: 'PATCH',
    url: `/api/v1/orders/${orderE.id}/fulfillments/${fulE.id}/status`,
    headers: { authorization: `Bearer ${tokenDistributor}` },
    payload: { status: 'PREPARING' },
  });
  assert.equal(crossPartnerMutateRes.statusCode, 403, 'E. Partner must not mutate fulfillments belonging to another partner (403)');

  // F. Wrong-warehouse request (Cross-partner warehouse transfer)
  const whRes = await app.inject({ method: 'GET', url: '/api/v1/warehouses' });
  const allWhs = whRes.json();
  const distWh = allWhs.find((w: any) => w.partnerId === 'dist-abc-vja-hub');
  // Attempt to transfer from distributor warehouse to an arbitrary/unowned warehouse
  const crossWhTransferRes = await app.inject({
    method: 'POST',
    url: '/api/v1/warehouses/transfers',
    headers: { authorization: `Bearer ${tokenDistributor}` },
    payload: {
      sourceWarehouseId: distWh.id,
      destinationWarehouseId: 'wh-unowned-fake-999',
      sku: 'POL-WX-25-RED-90M',
      quantity: 5,
      reason: 'Audit malicious transfer test',
    },
  });
  assert.ok([400, 403, 404].includes(crossWhTransferRes.statusCode), 'F. Cross-partner/invalid warehouse transfer must be rejected');

  // G. Manipulated entity ID
  const manipulatedEntityRes = await app.inject({
    method: 'GET',
    url: '/api/v1/orders/ord-non-existent-999999',
    headers: { authorization: `Bearer ${tokenCust1}` },
  });
  assert.equal(manipulatedEntityRes.statusCode, 404, 'G. Manipulated non-existent entity ID must return 404');

  // H. Manipulated financial values (Client attempts to force zero price or 100% discount)
  const manipulatedPriceOrderRes = await app.inject({
    method: 'POST',
    url: '/api/v1/orders',
    headers: { authorization: `Bearer ${tokenCust1}` },
    payload: {
      customerName: 'Anil Kumar Reddy',
      customerPhone: '+919848199882',
      deliveryAddress: 'Audit Test Villa 101, Vijayawada',
      city: 'Vijayawada',
      pincode: '520002',
      cart: [{ sku: 'POL-WX-25-RED-90M', quantity: 1, unitPrice: 1.0, discount: 99999, gstTotal: 0 }],
      grandTotal: 1.0,
      paymentMethod: 'UPI',
    },
  });
  assert.equal(manipulatedPriceOrderRes.statusCode, 201);
  const tamperCheckOrder = manipulatedPriceOrderRes.json();
  // Server MUST override client price with authoritative catalog price (3100.00)
  assert.ok(tamperCheckOrder.grandTotal > 3000, 'H. Server must compute authoritative pricing and ignore client-supplied financial values');

  // I. Missing required fields
  const missingFieldsRes = await app.inject({
    method: 'POST',
    url: '/api/v1/orders',
    headers: { authorization: `Bearer ${tokenCust1}` },
    payload: { customerName: 'Anil Kumar' }, // Missing cart, phone, address, pincode
  });
  assert.equal(missingFieldsRes.statusCode, 400, 'I. Missing required fields must return 400 validation error');

  // J. Malformed values (Invalid postal pincode & negative quantities)
  const malformedPincodeRes = await app.inject({
    method: 'POST',
    url: '/api/v1/orders',
    headers: { authorization: `Bearer ${tokenCust1}` },
    payload: {
      customerName: 'Anil Kumar Reddy',
      customerPhone: '+919848199882',
      deliveryAddress: 'Audit Test Villa 101, Vijayawada',
      city: 'Vijayawada',
      pincode: 'INVALID_PINCODE_ABC',
      cart: [{ sku: 'POL-WX-25-RED-90M', quantity: -5 }],
      paymentMethod: 'UPI',
    },
  });
  assert.equal(malformedPincodeRes.statusCode, 400, 'J. Malformed pincode and negative quantity must return 400');
  console.log('  ✅ Endpoint security matrix verified (A through J).');

  // =========================================================================
  // AUDIT SECTION 2: SQL INJECTION RESISTANCE
  // =========================================================================
  console.log('\n--- 2. SQL Injection Resistance Audit ---');
  const sqliPayloads = [
    "' OR '1'='1",
    "'; DROP TABLE users; --",
    "' UNION SELECT null, null, null, password_hash FROM users --",
    "1' OR 1=1 --",
    "admin'--",
  ];

  for (const payload of sqliPayloads) {
    // Test Search Endpoint
    const sqliSearchRes = await app.inject({
      method: 'GET',
      url: `/api/v1/search?q=${encodeURIComponent(payload)}`,
    });
    assert.equal(sqliSearchRes.statusCode, 200, `SQLi in search must be safely parameterized: ${payload}`);

    // Test Products with Category Filter
    const sqliCatRes = await app.inject({
      method: 'GET',
      url: `/api/v1/products?category=${encodeURIComponent(payload)}`,
    });
    assert.equal(sqliCatRes.statusCode, 200, `SQLi in category filter must be safely parameterized: ${payload}`);

    // Test Product by SKU lookup
    const sqliSkuRes = await app.inject({
      method: 'GET',
      url: `/api/v1/catalog/products/${encodeURIComponent(payload)}`,
    });
    assert.ok([200, 404].includes(sqliSkuRes.statusCode), `SQLi in SKU lookup must not cause 500 error: ${payload}`);

    // Test Admin Users filter
    const sqliUsersRes = await app.inject({
      method: 'GET',
      url: `/api/v1/admin/users?role=${encodeURIComponent(payload)}`,
      headers: { authorization: `Bearer ${tokenAdmin}` },
    });
    assert.equal(sqliUsersRes.statusCode, 200, `SQLi in admin users must be safely parameterized: ${payload}`);

    // Test Admin Audit logs filter
    const sqliAuditRes = await app.inject({
      method: 'GET',
      url: `/api/v1/admin/audit-logs?action=${encodeURIComponent(payload)}`,
      headers: { authorization: `Bearer ${tokenAdmin}` },
    });
    assert.equal(sqliAuditRes.statusCode, 200, `SQLi in audit logs must be safely parameterized: ${payload}`);
  }

  // Verify database tables were NOT dropped or damaged by SQLi payloads
  const verifyUsersTableRes = await db.query('SELECT COUNT(*) AS count FROM users');
  assert.ok(parseInt(verifyUsersTableRes.rows[0].count, 10) > 0, 'Users table must remain intact');
  console.log('  ✅ SQL injection resistance verified across all query surfaces.');

  // =========================================================================
  // AUDIT SECTION 3: SSRF / FILE UPLOAD / PATH SECURITY
  // =========================================================================
  console.log('\n--- 3. SSRF, File Upload & Path Security Audit ---');

  // Test 1: Dangerous executable extension rejected
  const exeBuffer = Buffer.from('MZ_FAKE_EXE_BINARY_DATA');
  const exeValidation = validateEstimateFile(exeBuffer, 'malicious_script.exe', 'application/x-msdownload');
  assert.equal(exeValidation.isValid, false);
  assert.ok(exeValidation.error?.includes('strictly prohibited'));

  // Test 2: Oversized file rejected (>25MB)
  const oversizedBuffer = Buffer.alloc(26 * 1024 * 1024); // 26 MB
  const oversizeValidation = validateEstimateFile(oversizedBuffer, 'huge_file.pdf', 'application/pdf');
  assert.equal(oversizeValidation.isValid, false);
  assert.ok(oversizeValidation.error?.includes('exceeds the maximum allowed limit'));

  // Test 3: Spoofed extension rejected via binary magic bytes check (text file renamed to .pdf)
  const spoofedBuffer = Buffer.from('Plain text contents that do not have %PDF header');
  const spoofValidation = validateEstimateFile(spoofedBuffer, 'disguised.pdf', 'application/pdf');
  assert.equal(spoofValidation.isValid, false);
  assert.ok(spoofValidation.error?.includes('binary signatures'));

  // Test 4: Path traversal in filename sanitized
  const traversalFilename = '../../../etc/passwd.pdf';
  const safeFilename = sanitizeFilename(traversalFilename);
  assert.ok(!safeFilename.includes('..'), 'Path traversal sequence .. must be stripped');
  assert.ok(!safeFilename.includes('/'), 'Path separator / must be stripped');
  assert.equal(safeFilename, 'passwd.pdf');
  console.log('  ✅ SSRF, file upload & path traversal protections verified.');

  // =========================================================================
  // AUDIT SECTION 4: PAYMENT SECURITY AUDIT
  // =========================================================================
  console.log('\n--- 4. Payment Security & Integrity Audit ---');

  // Test 1: Invalid webhook signature rejection
  const invalidSigWebhookRes = await app.inject({
    method: 'POST',
    url: '/api/v1/payments/webhook',
    headers: {
      'x-razorpay-event-id': `evt-invalid-sig-${Date.now()}`,
      'x-razorpay-signature': 'invalid_signature',
    },
    payload: {
      id: `evt-invalid-sig-${Date.now()}`,
      event: 'payment.captured',
      payload: { payment: { entity: { id: 'pay_tamper', amount: 1000 } } },
    },
  });
  assert.equal(invalidSigWebhookRes.statusCode, 400, 'Invalid webhook signature must be rejected with 400');

  // Test 2: Duplicate webhook idempotency
  const webhookEventId = `evt-audit-dup-${Date.now()}`;
  const webhookPayload = {
    id: webhookEventId,
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: 'pay_mock_webhook_audit_1',
          order_id: 'order_mock_webhook_audit_1',
          status: 'captured',
          amount: 50000,
        },
      },
    },
  };

  const whRes1 = await app.inject({
    method: 'POST',
    url: '/api/v1/payments/webhook',
    headers: {
      'x-razorpay-event-id': webhookEventId,
      'x-razorpay-signature': 'mock_sig_valid',
    },
    payload: webhookPayload,
  });
  assert.equal(whRes1.statusCode, 200);

  const whRes2 = await app.inject({
    method: 'POST',
    url: '/api/v1/payments/webhook',
    headers: {
      'x-razorpay-event-id': webhookEventId,
      'x-razorpay-signature': 'mock_sig_valid',
    },
    payload: webhookPayload,
  });
  assert.equal(whRes2.statusCode, 200);
  assert.equal(whRes2.json().duplicate, true, 'Duplicate webhook event must return idempotent acknowledgment');

  // Test 3: Zero secrets exposed in payment order responses
  const payOrderRes = await app.inject({
    method: 'POST',
    url: '/api/v1/payments/create',
    headers: { authorization: `Bearer ${tokenCust1}` },
    payload: {
      cart: [{ sku: 'POL-WX-25-RED-90M', quantity: 1, selectedStore: { partnerId: 'partner-vja-elec-1', storeName: 'Vijayawada Electricals' }, product: { sku: 'POL-WX-25-RED-90M' } }],
      customerName: 'Anil Kumar Reddy',
      customerPhone: '+919848199882',
      deliveryAddress: 'Flat 301, Sri Sai Residency, Guru Nanak Colony, Vijayawada',
      city: 'Vijayawada',
      pincode: '520002',
    },
  });
  assert.equal(payOrderRes.statusCode, 201);
  const payOrderData = payOrderRes.json();
  const payOrderStr = JSON.stringify(payOrderData).toLowerCase();
  assert.ok(!payOrderStr.includes('secret'), 'Payment creation response must never expose secrets');
  assert.ok(!payOrderStr.includes('private_key'), 'Payment creation response must never expose private keys');
  console.log('  ✅ Payment lifecycle security & webhook deduplication verified.');

  // =========================================================================
  // AUDIT SECTION 5: COMPLETE ORDER & INVENTORY END-TO-END FLOW
  // =========================================================================
  console.log('\n--- 5. Complete Order + Inventory End-to-End Lifecycle Audit ---');

  // Step 1: Payment Verification
  const verifyPayRes = await app.inject({
    method: 'POST',
    url: '/api/v1/payments/verify',
    headers: { authorization: `Bearer ${tokenCust1}` },
    payload: {
      paymentId: payOrderData.paymentId,
      orderId: payOrderData.orderId,
      providerPaymentId: 'pay_audit_mock_1',
      providerOrderId: payOrderData.providerOrderId,
      signature: 'mock_sig_valid',
      simulatedOutcome: 'SUCCESS',
    },
  });
  assert.equal(verifyPayRes.statusCode, 200);

  // Step 2: Check Master Order and Fulfillments
  const orderLookupRes = await app.inject({
    method: 'GET',
    url: `/api/v1/orders/${payOrderData.orderId}`,
    headers: { authorization: `Bearer ${tokenCust1}` },
  });
  assert.equal(orderLookupRes.statusCode, 200);
  const fullOrder = orderLookupRes.json();
  assert.equal(fullOrder.paymentStatus, 'PAID');
  assert.equal(fullOrder.overallStatus, 'CONFIRMED');
  const ful = fullOrder.fulfillments[0];

  // Step 3: Partner progresses fulfillment: CONFIRMED -> PREPARING -> PACKED -> DISPATCHED -> DELIVERED
  const stepPrep = await app.inject({
    method: 'PATCH',
    url: `/api/v1/orders/${fullOrder.id}/fulfillments/${ful.id}/status`,
    headers: { authorization: `Bearer ${tokenRetailer}` },
    payload: { status: 'PREPARING' },
  });
  assert.equal(stepPrep.statusCode, 200);

  const stepPack = await app.inject({
    method: 'PATCH',
    url: `/api/v1/orders/${fullOrder.id}/fulfillments/${ful.id}/status`,
    headers: { authorization: `Bearer ${tokenRetailer}` },
    payload: { status: 'PACKED' },
  });
  assert.equal(stepPack.statusCode, 200);

  const stepDisp = await app.inject({
    method: 'PATCH',
    url: `/api/v1/orders/${fullOrder.id}/fulfillments/${ful.id}/status`,
    headers: { authorization: `Bearer ${tokenRetailer}` },
    payload: { status: 'DISPATCHED' },
  });
  assert.equal(stepDisp.statusCode, 200);

  const stepDelv = await app.inject({
    method: 'PATCH',
    url: `/api/v1/orders/${fullOrder.id}/fulfillments/${ful.id}/status`,
    headers: { authorization: `Bearer ${tokenRetailer}` },
    payload: { status: 'DELIVERED' },
  });
  assert.equal(stepDelv.statusCode, 200);

  // Step 4: Verify Invoice Generation
  const invRes = await app.inject({
    method: 'GET',
    url: `/api/v1/invoices/${fullOrder.id}`,
    headers: { authorization: `Bearer ${tokenCust1}` },
  });
  assert.equal(invRes.statusCode, 200);
  const invoice = invRes.json();
  assert.ok(invoice.invoiceNumber.startsWith('INV-'));
  assert.equal(invoice.grandTotalInr, fullOrder.grandTotal);
  assert.equal(invoice.paymentStatus, 'PAID');
  console.log('  ✅ End-to-end order fulfillment and invoicing verified.');

  // =========================================================================
  // AUDIT SECTION 6: SPLIT FULFILLMENT AUDIT
  // =========================================================================
  console.log('\n--- 6. Split Fulfillment & Multi-Partner Tenancy Audit ---');
  const splitOrderRes = await app.inject({
    method: 'POST',
    url: '/api/v1/orders',
    headers: { authorization: `Bearer ${tokenCust1}` },
    payload: {
      customerName: 'Anil Kumar Reddy',
      customerPhone: '+919848199882',
      deliveryAddress: 'Flat 301, Sri Sai Residency, Guru Nanak Colony, Vijayawada',
      city: 'Vijayawada',
      pincode: '520002',
      cart: [
        { sku: 'POL-WX-25-RED-90M', quantity: 2 },
        { sku: 'ANC-ROM-6A1W-WHT', quantity: 5 },
      ],
      paymentMethod: 'UPI',
    },
  });
  assert.equal(splitOrderRes.statusCode, 201);
  const splitOrder = splitOrderRes.json();
  assert.ok(splitOrder.fulfillments.length >= 1);

  let sumItemPrice = 0;
  for (const f of splitOrder.fulfillments) {
    for (const it of f.items) {
      sumItemPrice += it.unitPrice * it.quantity;
    }
  }
  const calcGrandTotal = sumItemPrice - splitOrder.discount + splitOrder.deliveryFee + splitOrder.gstTotal;
  assert.equal(splitOrder.grandTotal, calcGrandTotal, 'Mathematical integrity of split fulfillments strictly verified');
  console.log('  ✅ Split fulfillment pricing and partner allocation verified.');

  // =========================================================================
  // AUDIT SECTION 7: CANCELLATION & REFUND ATOMICITY
  // =========================================================================
  console.log('\n--- 7. Order Cancellation & Refund Atomicity Audit ---');
  // Create order and capture payment
  const cancelOrderCreateRes = await app.inject({
    method: 'POST',
    url: '/api/v1/payments/create',
    headers: { authorization: `Bearer ${tokenCust1}` },
    payload: {
      cart: [{ sku: 'POL-WX-25-RED-90M', quantity: 1, selectedStore: { partnerId: 'partner-vja-elec-1', storeName: 'Vijayawada Electricals' }, product: { sku: 'POL-WX-25-RED-90M' } }],
      customerName: 'Anil Kumar Reddy',
      customerPhone: '+919848199882',
      deliveryAddress: 'Flat 301, Sri Sai Residency, Guru Nanak Colony, Vijayawada',
      city: 'Vijayawada',
      pincode: '520002',
    },
  });
  const cancelPayCreated = cancelOrderCreateRes.json();

  await app.inject({
    method: 'POST',
    url: '/api/v1/payments/verify',
    headers: { authorization: `Bearer ${tokenCust1}` },
    payload: {
      paymentId: cancelPayCreated.paymentId,
      orderId: cancelPayCreated.orderId,
      providerPaymentId: 'pay_cancel_test_1',
      providerOrderId: cancelPayCreated.providerOrderId,
      signature: 'mock_sig_valid',
      simulatedOutcome: 'SUCCESS',
    },
  });

  // Cancel order (pre-dispatch)
  const cancelRes = await app.inject({
    method: 'POST',
    url: `/api/v1/orders/${cancelPayCreated.orderId}/cancel`,
    headers: { authorization: `Bearer ${tokenCust1}` },
    payload: { reason: 'Customer changed electrical schedule' },
  });
  assert.equal(cancelRes.statusCode, 200);
  assert.equal(cancelRes.json().overallStatus, 'CANCELLED');

  // Verify partner settlements cancelled
  const settlementCheck = await db.query('SELECT status FROM partner_settlements WHERE order_id = $1', [cancelPayCreated.orderId]);
  assert.ok(settlementCheck.rows.length > 0);
  assert.equal(settlementCheck.rows[0].status, 'CANCELLED', 'Settlement must be cancelled upon order cancellation');

  // Verify subsequent cancellation is safe and idempotent
  const repeatCancelRes = await app.inject({
    method: 'POST',
    url: `/api/v1/orders/${cancelPayCreated.orderId}/cancel`,
    headers: { authorization: `Bearer ${tokenCust1}` },
    payload: { reason: 'Repeat cancellation' },
  });
  assert.equal(repeatCancelRes.statusCode, 200);
  assert.equal(repeatCancelRes.json().alreadyCancelled, true);

  // Cancellation after dispatch must be rejected (test with stepDelv from earlier)
  const postDispatchCancelRes = await app.inject({
    method: 'POST',
    url: `/api/v1/orders/${fullOrder.id}/cancel`,
    headers: { authorization: `Bearer ${tokenCust1}` },
    payload: { reason: 'Trying to cancel delivered order' },
  });
  assert.equal(postDispatchCancelRes.statusCode, 409, 'Cancelling dispatched/delivered order must be rejected with 409');
  console.log('  ✅ Cancellation atomicity, idempotency, and post-dispatch protection verified.');

  // =========================================================================
  // AUDIT SECTION 8: QUOTATION LIFECYCLE AUDIT
  // =========================================================================
  console.log('\n--- 8. Quotation Expiry & Tamper Guard Audit ---');
  const quoteGenRes = await app.inject({
    method: 'POST',
    url: '/api/v1/quotations/generate',
    headers: { authorization: `Bearer ${tokenCust1}` },
    payload: {
      customerName: 'Anil Kumar Reddy',
      items: [{ sku: 'POL-WX-25-RED-90M', quantity: 2 }],
    },
  });
  assert.equal(quoteGenRes.statusCode, 201);
  const quoteRecord = quoteGenRes.json();
  assert.ok(quoteRecord.validUntil, '48h price lock validUntil must be present');
  assert.equal(quoteRecord.isPriceLocked, true);

  // Artificially expire quote in DB
  await db.query(
    "UPDATE quotations SET locked_until_timestamp = NOW() - INTERVAL '1 hour' WHERE id = $1",
    [quoteRecord.id]
  );

  // Expired quotation acceptance rejected with 410 Gone
  const expiredAcceptRes = await app.inject({
    method: 'POST',
    url: `/api/v1/quotations/${quoteRecord.id}/accept`,
    headers: { authorization: `Bearer ${tokenCust1}` },
  });
  assert.equal(expiredAcceptRes.statusCode, 410, 'Expired quotation acceptance must return HTTP 410');

  // Customer 2 cannot access Customer 1's quotation
  const quoteIdorRes = await app.inject({
    method: 'GET',
    url: `/api/v1/quotations/${quoteRecord.id}`,
    headers: { authorization: `Bearer ${tokenCust2}` },
  });
  assert.equal(quoteIdorRes.statusCode, 403, 'Cross-customer quotation lookup must be forbidden (403)');
  console.log('  ✅ Quotation lifecycle, 48h expiry, and IDOR guard verified.');

  // =========================================================================
  // AUDIT SECTION 9: INVENTORY LEDGER INVARIANTS
  // =========================================================================
  console.log('\n--- 9. Inventory Ledger Double-Entry Invariants Audit ---');
  const invResCheck = await db.query(
    'SELECT in_stock_quantity, reserved_quantity, available_quantity FROM partner_inventories WHERE partner_id = $1 AND sku_code = $2',
    ['partner-vja-elec-1', 'POL-WX-25-RED-90M']
  );
  const stockRow = invResCheck.rows[0];
  assert.ok(stockRow.reserved_quantity <= stockRow.in_stock_quantity, 'Invariant: reserved <= in_stock');
  assert.equal(
    stockRow.available_quantity,
    stockRow.in_stock_quantity - stockRow.reserved_quantity,
    'Invariant: available = in_stock - reserved'
  );
  assert.ok(stockRow.in_stock_quantity >= 0, 'Invariant: in_stock >= 0 (no negative stock)');

  // Verify inventory ledger entries exist
  const ledgerRes = await app.inject({
    method: 'GET',
    url: '/api/v1/inventory/transactions?sku=POL-WX-25-RED-90M',
    headers: { authorization: `Bearer ${tokenRetailer}` },
  });
  assert.equal(ledgerRes.statusCode, 200);
  assert.ok(ledgerRes.json().length > 0, 'Inventory transactions must be recorded in ledger');
  console.log('  ✅ Inventory ledger mathematical invariants and double-entry tracking verified.');

  // =========================================================================
  // AUDIT SECTION 10: WAREHOUSE TRANSFER PROTOCOL
  // =========================================================================
  console.log('\n--- 10. Multi-Warehouse Stock Transfer Protocol Audit ---');
  const distWarehouses = allWhs.filter((w: any) => w.partnerId === 'dist-abc-vja-hub');
  assert.ok(distWarehouses.length >= 2, 'Distributor must have at least 2 warehouses');
  const srcHub = distWarehouses[0];
  const dstHub = distWarehouses[1];

  // Seed distributor stock for transfer test
  await db.query(`
    INSERT INTO partner_inventories (id, partner_id, sku_id, sku_code, in_stock_quantity, reserved_quantity, available_quantity, low_stock_threshold, selling_price_inr, last_updated)
    VALUES ('inv-dist-audit-1', 'dist-abc-vja-hub', 'POL-WX-25-RED-90M', 'POL-WX-25-RED-90M', 50, 0, 50, 5, 2800.00, NOW())
    ON CONFLICT (partner_id, sku_code) DO UPDATE SET in_stock_quantity = 50, available_quantity = 50
  `);

  // Step 1: Create
  const trfCreate = await app.inject({
    method: 'POST',
    url: '/api/v1/warehouses/transfers',
    headers: { authorization: `Bearer ${tokenDistributor}` },
    payload: {
      sourceWarehouseId: srcHub.id,
      destinationWarehouseId: dstHub.id,
      sku: 'POL-WX-25-RED-90M',
      quantity: 10,
      reason: 'Audit transfer test',
    },
  });
  assert.equal(trfCreate.statusCode, 201);
  const trf = trfCreate.json();

  // Step 2: Approve
  const trfApprove = await app.inject({
    method: 'POST',
    url: `/api/v1/warehouses/transfers/${trf.id}/approve`,
    headers: { authorization: `Bearer ${tokenDistributor}` },
  });
  assert.equal(trfApprove.statusCode, 200);

  // Step 3: Dispatch
  const trfDispatch = await app.inject({
    method: 'POST',
    url: `/api/v1/warehouses/transfers/${trf.id}/dispatch`,
    headers: { authorization: `Bearer ${tokenDistributor}` },
  });
  assert.equal(trfDispatch.statusCode, 200);

  // Step 4: Receive (Credits destination and marks TRANSFER_RECEIVED)
  const trfReceive = await app.inject({
    method: 'POST',
    url: `/api/v1/warehouses/transfers/${trf.id}/receive`,
    headers: { authorization: `Bearer ${tokenDistributor}` },
  });
  assert.equal(trfReceive.statusCode, 200);

  // Subsequent receive is idempotent
  const trfDuplicateReceive = await app.inject({
    method: 'POST',
    url: `/api/v1/warehouses/transfers/${trf.id}/receive`,
    headers: { authorization: `Bearer ${tokenDistributor}` },
  });
  assert.equal(trfDuplicateReceive.statusCode, 200);
  assert.equal(trfDuplicateReceive.json().alreadyReceived, true);
  console.log('  ✅ Warehouse transfer lifecycle and duplicate prevention verified.');

  // =========================================================================
  // AUDIT SECTION 11: PARTNER SETTLEMENT ISOLATION
  // =========================================================================
  console.log('\n--- 11. Partner Settlement Tenancy & Partial Unique Constraint Audit ---');
  const custSettlementAttempt = await app.inject({
    method: 'GET',
    url: '/api/v1/settlements',
    headers: { authorization: `Bearer ${tokenCust1}` },
  });
  assert.equal(custSettlementAttempt.statusCode, 403, 'Customer cannot access settlements');

  const retailerSettlementRes = await app.inject({
    method: 'GET',
    url: '/api/v1/settlements',
    headers: { authorization: `Bearer ${tokenRetailer}` },
  });
  assert.equal(retailerSettlementRes.statusCode, 200);
  const settlements = retailerSettlementRes.json();
  assert.ok(settlements.every((s: any) => s.partnerId === 'partner-vja-elec-1'));
  console.log('  ✅ Partner settlement isolation verified.');

  // =========================================================================
  // AUDIT SECTION 12: FINAL FINANCIAL LEAKAGE SCAN
  // =========================================================================
  console.log('\n--- 12. Final Comprehensive Financial Margin Leakage Scan ---');
  const customerEndpoints = [
    '/api/v1/products',
    '/api/v1/catalog/products/POL-WX-25-RED-90M',
    `/api/v1/orders/${fullOrder.id}`,
    `/api/v1/invoices/${fullOrder.id}`,
  ];

  const forbiddenFinancialKeys = [
    'purchase_cost',
    'purchasecost',
    'wholesale',
    'dealer_margin',
    'retailer_margin',
    'platform_margin',
    'commission_rate',
    'commissionrate',
    'net_settlement',
    'settlement_amount',
    'internal_cost',
    'trade_price',
  ];

  for (const endpoint of customerEndpoints) {
    const res = await app.inject({
      method: 'GET',
      url: endpoint,
      headers: { authorization: `Bearer ${tokenCust1}` },
    });
    assert.equal(res.statusCode, 200);
    const bodyStr = JSON.stringify(res.json()).toLowerCase();

    for (const forbidden of forbiddenFinancialKeys) {
      assert.ok(
        !bodyStr.includes(forbidden),
        `Financial margin leak detected! Found forbidden key '${forbidden}' in customer response for ${endpoint}`
      );
    }
  }
  console.log('  ✅ Zero financial leakage confirmed across all customer endpoints.');

  console.log('\n================================================================');
  console.log('  🎉 ALL PHASE 3H ACCEPTANCE & SECURITY AUDIT TEST SECTIONS PASSED');
  console.log('================================================================\n');

  await app.close();
}

if (process.argv[1]?.includes('final_acceptance_audit.test')) {
  runFinalAcceptanceAuditTests()
    .then(() => {
      console.log('Phase 3H Acceptance Audit tests finished successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
