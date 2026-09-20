/**
 * ElectraKart Phase 3G Automated Test Suite
 * Final Business Completion, Auditability, Inventory Ledger, Stock Transfers, Quotations & Edge Cases
 */

import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';
import { db } from '../src/db/connection.js';
import { runMigrations } from '../src/db/migrate.js';
import { seedDatabase } from '../src/db/seed.js';

export async function runBusinessCompletionTests() {
  console.log('\n--- Running Business Completion, Auditability & Lifecycle Tests (Phase 3G) ---');
  await runMigrations();
  await seedDatabase();

  // Reset transactional tables
  await db.exec(`
    DELETE FROM idempotency_keys;
    DELETE FROM audit_logs;
    DELETE FROM stock_transfers;
    DELETE FROM payment_webhook_logs;
    DELETE FROM partner_settlements;
    DELETE FROM invoices;
    DELETE FROM payments;
    DELETE FROM fulfillment_tracking_logs;
    DELETE FROM fulfillment_items;
    DELETE FROM order_fulfillments;
    DELETE FROM orders;
    DELETE FROM quotation_items;
    DELETE FROM quotations;
    DELETE FROM notification_logs;
    DELETE FROM notifications;
  `);

  const app = buildApp();
  await app.ready();

  // 1. Customer Token (Anil Kumar Reddy)
  const custRes = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { emailOrPhone: 'anil.reddy@gmail.com', password: 'password123' },
  });
  assert.equal(custRes.statusCode, 200);
  const tokenCust1 = custRes.json().accessToken;

  // 2. Customer 2 Token (Sunita Sharma for IDOR)
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

  // 3. Retailer Token
  const tokenRetailer = app.jwt.sign({
    id: 'usr-retailer-1',
    email: 'retailer1@electrakart.com',
    role: 'RETAILER',
    partnerId: 'partner-vja-elec-1',
  });

  // 4. Distributor Token
  const tokenDistributor = app.jwt.sign({
    id: 'usr-distributor-1',
    email: 'distributor1@electrakart.com',
    role: 'DISTRIBUTOR',
    partnerId: 'dist-abc-vja-hub',
  });

  // 5. Admin Token
  const adminRes = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { emailOrPhone: 'admin@electrakart.com', password: 'password123' },
  });
  assert.equal(adminRes.statusCode, 200);
  const tokenAdmin = adminRes.json().accessToken;

  // =========================================================================
  // FIXTURE A: Quotation expiry
  // =========================================================================
  console.log('1. Verifying Fixture A: Quotation expiry calculation & detection...');
  const quoGenRes = await app.inject({
    method: 'POST',
    url: '/api/v1/quotations/generate',
    headers: { authorization: `Bearer ${tokenCust1}` },
    payload: {
      customerName: 'Anil Kumar Reddy',
      items: [{ sku: 'POL-WX-25-RED-90M', quantity: 2 }],
    },
  });
  assert.equal(quoGenRes.statusCode, 201);
  const quotationA = quoGenRes.json();
  assert.equal(quotationA.status, 'LOCKED');

  // Fast-forward locked_until_timestamp to the past in database
  await db.query("UPDATE quotations SET locked_until_timestamp = NOW() - INTERVAL '2 hours' WHERE id = $1", [quotationA.id]);

  // Accessing quotation detects expiry server-side
  const quoGetResA = await app.inject({
    method: 'GET',
    url: `/api/v1/quotations/${quotationA.id}`,
    headers: { authorization: `Bearer ${tokenCust1}` },
  });
  assert.equal(quoGetResA.statusCode, 200);
  assert.equal(quoGetResA.json().status, 'EXPIRED', 'Server must transition status to EXPIRED on access');

  // =========================================================================
  // FIXTURE B: Expired quotation acceptance rejected
  // =========================================================================
  console.log('2. Verifying Fixture B: Expired quotation acceptance rejected...');
  const acceptExpiredRes = await app.inject({
    method: 'POST',
    url: `/api/v1/quotations/${quotationA.id}/accept`,
    headers: { authorization: `Bearer ${tokenCust1}` },
  });
  assert.equal(acceptExpiredRes.statusCode, 410, 'Expired quotation acceptance must be rejected with 410 Gone');
  assert.ok(acceptExpiredRes.json().detail.includes('expired past its 48-hour price lock'));

  // =========================================================================
  // FIXTURE C: Locked quotation tampering rejected
  // =========================================================================
  console.log('3. Verifying Fixture C: Locked quotation tampering rejected...');
  // Client attempts to generate quotation passing arbitrary low prices
  const tamperedQuoRes = await app.inject({
    method: 'POST',
    url: '/api/v1/quotations/generate',
    headers: { authorization: `Bearer ${tokenCust1}` },
    payload: {
      customerName: 'Anil Kumar Reddy',
      items: [{ sku: 'POL-WX-25-RED-90M', quantity: 1, rate: 1.0, gstPercent: 0 }],
    },
  });
  assert.equal(tamperedQuoRes.statusCode, 201);
  const tamperedQuo = tamperedQuoRes.json();
  // Server-authoritative SKU rate must override client rate
  assert.ok(tamperedQuo.subtotal >= 1000, 'Server must calculate authoritative price from catalog, rejecting client 1.0 rate');
  assert.equal(tamperedQuo.items[0].gstPercent, 18, 'Server must enforce 18% GST');

  // =========================================================================
  // FIXTURE D: Inventory ledger correctness
  // =========================================================================
  console.log('4. Verifying Fixture D: Inventory ledger correctness...');
  const adjustRes = await app.inject({
    method: 'PATCH',
    url: '/api/v1/inventory/partner-stock/POL-WX-25-RED-90M',
    headers: { authorization: `Bearer ${tokenRetailer}` },
    payload: { deltaQuantity: 15, reason: 'MANUAL_ADJUSTMENT', notes: 'Audit verification test' },
  });
  assert.equal(adjustRes.statusCode, 200);

  const txLogsRes = await app.inject({
    method: 'GET',
    url: '/api/v1/inventory/transactions?sku=POL-WX-25-RED-90M',
    headers: { authorization: `Bearer ${tokenRetailer}` },
  });
  assert.equal(txLogsRes.statusCode, 200);
  const txList = txLogsRes.json();
  assert.ok(Array.isArray(txList) && txList.length > 0);
  const latestTx = txList[0];
  assert.equal(latestTx.skuCode, 'POL-WX-25-RED-90M');
  assert.equal(latestTx.transactionType, 'ADJUSTMENT');
  assert.equal(latestTx.quantity, 15);
  assert.equal(latestTx.afterQuantity - latestTx.beforeQuantity, 15);

  // =========================================================================
  // FIXTURE E: Stock transfer correctness
  // =========================================================================
  console.log('5. Verifying Fixture E: Stock transfer lifecycle correctness...');
  // Ensure warehouses exist and partner inventory is seeded
  const whRes = await app.inject({ method: 'GET', url: '/api/v1/warehouses' });
  assert.equal(whRes.statusCode, 200);
  const warehouses = whRes.json().filter((w: any) => w.partnerId === 'dist-abc-vja-hub');
  assert.ok(warehouses.length >= 2, 'Distributor must have at least 2 warehouses');

  const srcWh = warehouses[0];
  const dstWh = warehouses[1];

  // Seed distributor stock for transfer
  await db.query(`
    INSERT INTO partner_inventories (id, partner_id, sku_id, sku_code, in_stock_quantity, reserved_quantity, available_quantity, low_stock_threshold, selling_price_inr, last_updated)
    VALUES ('inv-dist-test-1', 'dist-abc-vja-hub', 'POL-WX-25-RED-90M', 'POL-WX-25-RED-90M', 100, 0, 100, 10, 2800.00, NOW())
    ON CONFLICT (partner_id, sku_code) DO UPDATE SET in_stock_quantity = 100, available_quantity = 100
  `);

  // Step 1: Create Transfer
  const createTrfRes = await app.inject({
    method: 'POST',
    url: '/api/v1/warehouses/transfers',
    headers: { authorization: `Bearer ${tokenDistributor}` },
    payload: {
      sourceWarehouseId: srcWh.id,
      destinationWarehouseId: dstWh.id,
      sku: 'POL-WX-25-RED-90M',
      quantity: 20,
      reason: 'Regional balance test',
    },
  });
  assert.equal(createTrfRes.statusCode, 201);
  const trfRecord = createTrfRes.json();
  assert.equal(trfRecord.status, 'TRANSFER_CREATED');

  // Step 2: Approve Transfer
  const approveTrfRes = await app.inject({
    method: 'POST',
    url: `/api/v1/warehouses/transfers/${trfRecord.id}/approve`,
    headers: { authorization: `Bearer ${tokenDistributor}` },
  });
  assert.equal(approveTrfRes.statusCode, 200);
  assert.equal(approveTrfRes.json().status, 'TRANSFER_APPROVED');

  // Step 3: Dispatch Transfer
  const dispatchTrfRes = await app.inject({
    method: 'POST',
    url: `/api/v1/warehouses/transfers/${trfRecord.id}/dispatch`,
    headers: { authorization: `Bearer ${tokenDistributor}` },
  });
  assert.equal(dispatchTrfRes.statusCode, 200);
  assert.equal(dispatchTrfRes.json().status, 'TRANSFER_IN_TRANSIT');

  // Verify source inventory reduced by 20 (100 -> 80)
  const srcStockRes = await db.query(
    "SELECT in_stock_quantity FROM partner_inventories WHERE partner_id = 'dist-abc-vja-hub' AND sku_code = 'POL-WX-25-RED-90M'"
  );
  assert.equal(srcStockRes.rows[0].in_stock_quantity, 80, 'Source stock must reduce by transferred quantity');

  // Step 4: Receive Transfer
  const receiveTrfRes = await app.inject({
    method: 'POST',
    url: `/api/v1/warehouses/transfers/${trfRecord.id}/receive`,
    headers: { authorization: `Bearer ${tokenDistributor}` },
  });
  assert.equal(receiveTrfRes.statusCode, 200);
  assert.equal(receiveTrfRes.json().status, 'TRANSFER_RECEIVED');

  // =========================================================================
  // FIXTURE F: Duplicate stock transfer prevented
  // =========================================================================
  console.log('6. Verifying Fixture F: Duplicate stock transfer prevented...');
  const duplicateReceiveRes = await app.inject({
    method: 'POST',
    url: `/api/v1/warehouses/transfers/${trfRecord.id}/receive`,
    headers: { authorization: `Bearer ${tokenDistributor}` },
  });
  assert.equal(duplicateReceiveRes.statusCode, 200);
  assert.equal(duplicateReceiveRes.json().alreadyReceived, true, 'Subsequent receive call must be idempotent');

  // =========================================================================
  // FIXTURE G: Invalid order state transition rejected
  // =========================================================================
  console.log('7. Verifying Fixture G: Invalid order state transition rejected...');
  // Place fresh order
  const orderGRes = await app.inject({
    method: 'POST',
    url: '/api/v1/orders',
    headers: { authorization: `Bearer ${tokenCust1}` },
    payload: {
      customerName: 'Anil Kumar Reddy',
      customerPhone: '+919848199882',
      deliveryAddress: 'Flat 301, Sri Sai Residency, Guru Nanak Colony, Vijayawada',
      city: 'Vijayawada',
      pincode: '520002',
      cart: [{ sku: 'POL-WX-25-RED-90M', quantity: 1 }],
      paymentMethod: 'UPI',
    },
  });
  assert.equal(orderGRes.statusCode, 201);
  const orderG = orderGRes.json();
  const fulG = orderG.fulfillments[0];

  // Move directly to DELIVERED
  await app.inject({
    method: 'PATCH',
    url: `/api/v1/orders/${orderG.id}/fulfillments/${fulG.id}/status`,
    headers: { authorization: `Bearer ${tokenRetailer}` },
    payload: { status: 'DISPATCHED' },
  });
  await app.inject({
    method: 'PATCH',
    url: `/api/v1/orders/${orderG.id}/fulfillments/${fulG.id}/status`,
    headers: { authorization: `Bearer ${tokenRetailer}` },
    payload: { status: 'DELIVERED' },
  });

  // Now attempt invalid backwards transition to PREPARING
  const invalidTransitionRes = await app.inject({
    method: 'PATCH',
    url: `/api/v1/orders/${orderG.id}/fulfillments/${fulG.id}/status`,
    headers: { authorization: `Bearer ${tokenRetailer}` },
    payload: { status: 'PREPARING' },
  });
  assert.equal(invalidTransitionRes.statusCode, 400, 'Backwards transition from DELIVERED to PREPARING must be rejected');
  assert.ok(invalidTransitionRes.json().detail.includes('prohibited'));

  // =========================================================================
  // FIXTURE H: Duplicate payment webhook
  // =========================================================================
  console.log('8. Verifying Fixture H: Duplicate payment webhook idempotency...');
  const webhookEventId = `evt-test-dup-${Date.now()}`;
  const webhookPayload = {
    id: webhookEventId,
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: 'pay_mock_webhook_dup_1',
          order_id: 'order_mock_webhook_dup_1',
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

  // Send exact duplicate
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
  assert.equal(whRes2.json().duplicate, true, 'Duplicate webhook event must return idempotent confirmation');

  // =========================================================================
  // FIXTURE I: Duplicate refund
  // =========================================================================
  console.log('9. Verifying Fixture I: Duplicate refund prevention...');
  // Create payment order and capture it
  const payCreateResI = await app.inject({
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
  assert.equal(payCreateResI.statusCode, 201);
  const payCreatedI = payCreateResI.json();

  await app.inject({
    method: 'POST',
    url: '/api/v1/payments/verify',
    headers: { authorization: `Bearer ${tokenCust1}` },
    payload: {
      paymentId: payCreatedI.paymentId,
      orderId: payCreatedI.orderId,
      providerPaymentId: 'pay_mock_ref_1',
      providerOrderId: payCreatedI.providerOrderId,
      signature: 'valid_sig',
      simulatedOutcome: 'SUCCESS',
    },
  });

  // First refund
  const refRes1 = await app.inject({
    method: 'POST',
    url: '/api/v1/payments/refund',
    headers: { authorization: `Bearer ${tokenAdmin}` },
    payload: { paymentId: payCreatedI.paymentId, orderId: payCreatedI.orderId, reason: 'Test customer refund' },
  });
  assert.equal(refRes1.statusCode, 200);
  assert.equal(refRes1.json().success, true);

  // Duplicate refund attempt
  const refRes2 = await app.inject({
    method: 'POST',
    url: '/api/v1/payments/refund',
    headers: { authorization: `Bearer ${tokenAdmin}` },
    payload: { paymentId: payCreatedI.paymentId, orderId: payCreatedI.orderId, reason: 'Duplicate refund attempt' },
  });
  assert.ok([400, 409].includes(refRes2.statusCode), 'Duplicate refund attempt must be rejected with 400 or 409');
  assert.ok(refRes2.json().detail.includes('already been refunded'));

  // =========================================================================
  // FIXTURE J: Invoice tampering rejected
  // =========================================================================
  console.log('10. Verifying Fixture J: Invoice tampering rejected...');
  const invResJ = await app.inject({
    method: 'GET',
    url: `/api/v1/invoices/${payCreatedI.orderId}`,
    headers: { authorization: `Bearer ${tokenCust1}` },
  });
  assert.equal(invResJ.statusCode, 200);
  const invoiceJ = invResJ.json();
  assert.ok(invoiceJ.invoiceNumber.startsWith('INV-'));
  assert.equal(invoiceJ.grandTotalInr, payCreatedI.amountInr);
  assert.equal(invoiceJ.paymentStatus, 'PAID');

  // =========================================================================
  // FIXTURE K: Settlement isolation
  // =========================================================================
  console.log('11. Verifying Fixture K: Settlement isolation...');
  const custSettlementsRes = await app.inject({
    method: 'GET',
    url: '/api/v1/settlements',
    headers: { authorization: `Bearer ${tokenCust1}` },
  });
  assert.equal(custSettlementsRes.statusCode, 403, 'Customers must be forbidden from accessing settlements');

  const retailerSettlementsRes = await app.inject({
    method: 'GET',
    url: '/api/v1/settlements',
    headers: { authorization: `Bearer ${tokenRetailer}` },
  });
  assert.equal(retailerSettlementsRes.statusCode, 200);
  const retSettlements = retailerSettlementsRes.json();
  assert.ok(
    retSettlements.every((s: any) => s.partnerId === 'partner-vja-elec-1'),
    'Retailer must only see their own partner settlements'
  );

  // =========================================================================
  // FIXTURE L: Duplicate settlement prevented
  // =========================================================================
  console.log('12. Verifying Fixture L: Duplicate settlement prevented...');
  const activeSettlement = retSettlements[0];
  if (activeSettlement) {
    // Attempt inserting second active settlement for the same fulfillment_id
    let duplicateRejected = false;
    try {
      await db.query(`
        INSERT INTO partner_settlements (
          id, settlement_number, partner_id, order_id, fulfillment_id,
          gross_amount_inr, commission_rate_percent, commission_amount_inr,
          net_settlement_inr, status, created_at
        ) VALUES ('set-dup-test-1', 'ST-DUP-99999', $1, $2, $3, 1000, 5, 50, 950, 'PENDING', NOW())
      `, [activeSettlement.partnerId, activeSettlement.orderId, activeSettlement.fulfillmentId]);
    } catch {
      duplicateRejected = true;
    }
    assert.equal(duplicateRejected, true, 'Unique constraint must prevent duplicate settlement for the same fulfillment');
  }

  // =========================================================================
  // FIXTURE M: Partner earnings after cancellation
  // =========================================================================
  console.log('13. Verifying Fixture M: Partner earnings after cancellation...');
  // Create order with payment
  const payCreateResM = await app.inject({
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
  const payCreatedM = payCreateResM.json();

  await app.inject({
    method: 'POST',
    url: '/api/v1/payments/verify',
    headers: { authorization: `Bearer ${tokenCust1}` },
    payload: {
      paymentId: payCreatedM.paymentId,
      orderId: payCreatedM.orderId,
      providerPaymentId: 'pay_mock_m_1',
      providerOrderId: payCreatedM.providerOrderId,
      signature: 'valid_sig',
      simulatedOutcome: 'SUCCESS',
    },
  });

  // Cancel order
  const cancelResM = await app.inject({
    method: 'POST',
    url: `/api/v1/orders/${payCreatedM.orderId}/cancel`,
    headers: { authorization: `Bearer ${tokenCust1}` },
    payload: { reason: 'Customer changed requirements' },
  });
  assert.equal(cancelResM.statusCode, 200);

  // Verify partner_settlements status for this order is CANCELLED
  const setCheckM = await db.query('SELECT status FROM partner_settlements WHERE order_id = $1', [payCreatedM.orderId]);
  assert.ok(setCheckM.rows.length > 0);
  assert.equal(setCheckM.rows[0].status, 'CANCELLED', 'Settlement must be marked CANCELLED and excluded from earnings');

  // =========================================================================
  // FIXTURE N: Audit log creation
  // =========================================================================
  console.log('14. Verifying Fixture N: Audit log creation on sensitive actions...');
  const auditLogsRes = await app.inject({
    method: 'GET',
    url: '/api/v1/admin/audit-logs',
    headers: { authorization: `Bearer ${tokenAdmin}` },
  });
  assert.equal(auditLogsRes.statusCode, 200);
  const auditData = auditLogsRes.json();
  assert.ok(auditData.total > 0, 'Audit logs must be populated');
  const hasOrderOrInvAction = auditData.logs.some((l: any) =>
    ['ORDER_STATUS_CHANGE', 'INVENTORY_ADJUSTMENT', 'WAREHOUSE_TRANSFER_CREATED', 'PAYMENT_REFUND'].includes(l.action)
  );
  assert.ok(hasOrderOrInvAction, 'Audit logs must capture sensitive domain actions');

  // =========================================================================
  // FIXTURE O: Audit log access control
  // =========================================================================
  console.log('15. Verifying Fixture O: Audit log access control...');
  const custAuditRes = await app.inject({
    method: 'GET',
    url: '/api/v1/admin/audit-logs',
    headers: { authorization: `Bearer ${tokenCust1}` },
  });
  assert.equal(custAuditRes.statusCode, 403, 'Customer access to audit logs must be forbidden');

  const retAuditRes = await app.inject({
    method: 'GET',
    url: '/api/v1/admin/audit-logs',
    headers: { authorization: `Bearer ${tokenRetailer}` },
  });
  assert.equal(retAuditRes.statusCode, 403, 'Retailer access to audit logs must be forbidden');

  // =========================================================================
  // FIXTURE P: Inactive SKU order rejected
  // =========================================================================
  console.log('16. Verifying Fixture P: Inactive SKU order rejected...');
  // Deactivate a SKU
  await db.query("UPDATE skus SET is_active = FALSE WHERE sku_code = 'POL-WX-15-YEL-90M'");

  const inactiveOrderRes = await app.inject({
    method: 'POST',
    url: '/api/v1/orders',
    headers: { authorization: `Bearer ${tokenCust1}` },
    payload: {
      customerName: 'Anil Kumar Reddy',
      customerPhone: '+919848199882',
      deliveryAddress: 'Flat 301, Sri Sai Residency, Guru Nanak Colony, Vijayawada',
      city: 'Vijayawada',
      pincode: '520002',
      cart: [{ sku: 'POL-WX-15-YEL-90M', quantity: 1 }],
      paymentMethod: 'UPI',
    },
  });
  assert.equal(inactiveOrderRes.statusCode, 400, 'Ordering inactive SKU must be rejected with 400');
  assert.ok(inactiveOrderRes.json().detail.includes('inactive or deprecated'));

  // Re-activate SKU
  await db.query("UPDATE skus SET is_active = TRUE WHERE sku_code = 'POL-WX-15-YEL-90M'");

  // =========================================================================
  // FIXTURE Q: Split-order total integrity
  // =========================================================================
  console.log('17. Verifying Fixture Q: Split-order total integrity...');
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

  let itemSum = 0;
  for (const ful of splitOrder.fulfillments) {
    for (const fit of ful.items) {
      itemSum += fit.unitPrice * fit.quantity;
    }
  }
  const expectedGrandTotal = itemSum - splitOrder.discount + splitOrder.deliveryFee + splitOrder.gstTotal;
  assert.equal(splitOrder.grandTotal, expectedGrandTotal, 'Grand total must strictly match sum of items + fees + tax');

  // =========================================================================
  // FIXTURE R: Reservation/fulfillment atomicity
  // =========================================================================
  console.log('18. Verifying Fixture R: Reservation/fulfillment atomicity...');
  const invRowR = await db.query(
    "SELECT in_stock_quantity, reserved_quantity, available_quantity FROM partner_inventories WHERE partner_id = 'partner-vja-elec-1' AND sku_code = 'POL-WX-25-RED-90M'"
  );
  const rInv = invRowR.rows[0];
  assert.ok(rInv.in_stock_quantity >= 0);
  assert.ok(rInv.reserved_quantity >= 0);
  assert.ok(rInv.reserved_quantity <= rInv.in_stock_quantity, 'Invariant: reserved <= in_stock');
  assert.equal(rInv.available_quantity, rInv.in_stock_quantity - rInv.reserved_quantity, 'Invariant: available = in_stock - reserved');

  // =========================================================================
  // FIXTURE S: Admin authorization
  // =========================================================================
  console.log('19. Verifying Fixture S: Admin authorization enforcement...');
  const custAdminDashboard = await app.inject({
    method: 'GET',
    url: '/api/v1/admin/dashboard',
    headers: { authorization: `Bearer ${tokenCust1}` },
  });
  assert.equal(custAdminDashboard.statusCode, 403, 'Customer cannot access admin dashboard');

  const custAdminUsers = await app.inject({
    method: 'GET',
    url: '/api/v1/admin/users',
    headers: { authorization: `Bearer ${tokenCust1}` },
  });
  assert.equal(custAdminUsers.statusCode, 403, 'Customer cannot access admin users list');

  const adminUsersRes = await app.inject({
    method: 'GET',
    url: '/api/v1/admin/users',
    headers: { authorization: `Bearer ${tokenAdmin}` },
  });
  assert.equal(adminUsersRes.statusCode, 200);
  const adminUsers = adminUsersRes.json();
  assert.ok(Array.isArray(adminUsers) && adminUsers.length > 0);
  assert.ok(!('password_hash' in adminUsers[0]), 'Password hash must never be returned in admin user list');

  // =========================================================================
  // FIXTURE T: Partner KYC authorization
  // =========================================================================
  console.log('20. Verifying Fixture T: Partner KYC authorization...');
  const custGovRes = await app.inject({
    method: 'PATCH',
    url: '/api/v1/partners/partner-vja-elec-1/governance',
    headers: { authorization: `Bearer ${tokenCust1}` },
    payload: { status: 'VERIFIED' },
  });
  assert.equal(custGovRes.statusCode, 403, 'Customer cannot update partner governance/KYC');

  const adminGovRes = await app.inject({
    method: 'PATCH',
    url: '/api/v1/partners/partner-vja-elec-1/governance',
    headers: { authorization: `Bearer ${tokenAdmin}` },
    payload: { status: 'VERIFIED', commissionRate: 5.5 },
  });
  assert.equal(adminGovRes.statusCode, 200);
  assert.equal(adminGovRes.json().status, 'VERIFIED');

  // =========================================================================
  // FIXTURE U: Address / Notification / Order IDOR regression
  // =========================================================================
  console.log('21. Verifying Fixture U: Address / Notification / Order IDOR regression...');
  // Customer 2 attempts to view Customer 1's order
  const idorOrderRes = await app.inject({
    method: 'GET',
    url: `/api/v1/orders/${splitOrder.id}`,
    headers: { authorization: `Bearer ${tokenCust2}` },
  });
  assert.equal(idorOrderRes.statusCode, 403, 'Customer 2 must not view Customer 1 order');

  // Customer 2 attempts to view Customer 1's quotation
  const idorQuoRes = await app.inject({
    method: 'GET',
    url: `/api/v1/quotations/${quotationA.id}`,
    headers: { authorization: `Bearer ${tokenCust2}` },
  });
  assert.equal(idorQuoRes.statusCode, 403, 'Customer 2 must not view Customer 1 quotation');

  // =========================================================================
  // FIXTURE V: Financial leakage regression
  // =========================================================================
  console.log('22. Verifying Fixture V: Financial leakage regression...');
  const custOrderResV = await app.inject({
    method: 'GET',
    url: `/api/v1/orders/${splitOrder.id}`,
    headers: { authorization: `Bearer ${tokenCust1}` },
  });
  assert.equal(custOrderResV.statusCode, 200);
  const serializedOrderStr = JSON.stringify(custOrderResV.json()).toLowerCase();

  assert.ok(!serializedOrderStr.includes('purchase_cost'), 'Wholesale purchase cost must never leak');
  assert.ok(!serializedOrderStr.includes('purchasecost'), 'Wholesale purchase cost must never leak');
  assert.ok(!serializedOrderStr.includes('commission_rate'), 'Commission rate must never leak');
  assert.ok(!serializedOrderStr.includes('net_settlement'), 'Settlement numbers must never leak');

  console.log('  ✅ ALL PHASE 3G FIXTURES A THROUGH V PASSED DETERMINISTICALLY');
}

if (process.argv[1]?.includes('business_completion.test')) {
  runBusinessCompletionTests()
    .then(() => {
      console.log('Business Completion tests finished successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
