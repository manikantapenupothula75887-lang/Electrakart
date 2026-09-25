/**
 * ElectraKart Automated Delivery Integration Automated Test Suite
 * Rigorous validation of carrier abstraction, Rapido configuration guards,
 * fulfillment dispatch triggers, idempotency, audit trail, and admin retry.
 */

import assert from 'node:assert/strict';
import { db } from '../src/db/connection.js';
import { RapidoDeliveryProvider } from '../src/modules/delivery/rapido.provider.js';
import { MockDeliveryProvider } from '../src/modules/delivery/mock.provider.js';
import { DeliveryService } from '../src/modules/delivery/delivery.service.js';

export async function runAutomatedDeliveryTests() {
  console.log('\n--- Running Automated Delivery Integration Test Suite ---');

  // Reset delivery tables
  await db.exec(`
    DELETE FROM delivery_status_history;
    DELETE FROM delivery_bookings;
  `);

  const custRes = await db.query("SELECT id FROM users WHERE role = 'CUSTOMER' LIMIT 1");
  const testCustomerId = custRes.rows.length > 0 ? custRes.rows[0].id : null;

  console.log('  ✓ Test 1: Rapido Credentials Guard (RAPIDO_NOT_CONFIGURED check)');
  const rapido = new RapidoDeliveryProvider();
  // In standard test environment without real credentials, isConfigured() is false
  assert.equal(rapido.isConfigured(), false);

  const failedResult = await rapido.createDelivery({
    orderId: 'ORD-TEST-1',
    fulfillmentId: 'FUL-TEST-1',
    idempotencyKey: 'key-1',
    pickup: {
      name: 'Depot',
      phone: '+919848011223',
      address: 'Besant Rd',
      city: 'Vijayawada',
      pincode: '520002',
      latitude: 16.51,
      longitude: 80.64,
    },
    drop: {
      name: 'Customer',
      phone: '+919848199882',
      address: 'Guru Nanak Colony',
      city: 'Vijayawada',
      pincode: '520008',
      latitude: 16.505,
      longitude: 80.65,
    },
  });

  assert.equal(failedResult.status, 'FAILED');
  assert.equal(failedResult.errorCode, 'RAPIDO_NOT_CONFIGURED');
  assert.ok(failedResult.error?.includes('RAPIDO_NOT_CONFIGURED') || failedResult.error?.includes('Rapido API credentials'));

  const rapidoService = new DeliveryService(rapido);
  const statusCheck = rapidoService.getProviderStatus();
  assert.equal(statusCheck.status, 'RAPIDO_NOT_CONFIGURED');
  assert.equal(statusCheck.isConfigured, false);

  console.log('  ✓ Test 2: Delivery Booking via Provider Abstraction (Mock Provider)');
  const mockProvider = new MockDeliveryProvider();
  assert.equal(mockProvider.isConfigured(), true);
  const deliveryService = new DeliveryService(mockProvider);

  // Ensure test order and fulfillment exist
  const orderId = `ord-del-test-${Date.now()}`;
  const fulfillmentId = `ful-del-test-${Date.now()}`;
  const partnerId = 'partner-vja-elec-1';

  await db.query(`
    INSERT INTO orders (
      id, order_number, customer_id, customer_name, customer_phone, delivery_address,
      city, pincode, delivery_method, payment_method, payment_status, overall_status,
      subtotal_inr, gst_total_inr, grand_total_inr, created_at, updated_at
    ) VALUES (
      $1, $2, $3, 'Anil Kumar Reddy', '+919848199882', 'Flat 301, Sri Sai Residency',
      'Vijayawada', '520008', 'STANDARD', 'UPI', 'PAID', 'CONFIRMED', 1000.00, 180.00, 1180.00, NOW(), NOW()
    )
  `, [orderId, `ORD-NUM-${Date.now().toString().slice(-6)}`, testCustomerId]);

  await db.query(`
    INSERT INTO order_fulfillments (
      id, order_id, fulfillment_index, partner_id, partner_name, partner_type,
      partner_address, status, estimated_delivery_time, handover_otp, created_at, last_updated
    ) VALUES (
      $1, $2, 1, $3, 'Vijayawada Electricals', 'RETAILER', 'Besant Road',
      'CONFIRMED', '30-45 mins', '4892', NOW(), NOW()
    )
  `, [fulfillmentId, orderId, partnerId]);

  // Book delivery for fulfillment
  const booking1 = await deliveryService.bookDeliveryForFulfillment(orderId, fulfillmentId);
  assert.ok(booking1.id);
  assert.equal(booking1.status, 'BOOKED');
  assert.equal(booking1.provider, 'mock');
  assert.ok(booking1.trackingUrl);
  assert.ok(booking1.distanceKm >= 0);

  console.log('  ✓ Test 3: Idempotency Guarantee (Zero duplicate bookings)');
  // Re-invoking booking with same orderId & fulfillmentId must return existing booking
  const booking2 = await deliveryService.bookDeliveryForFulfillment(orderId, fulfillmentId);
  assert.equal(booking1.id, booking2.id);
  assert.equal(booking1.idempotencyKey, booking2.idempotencyKey);

  // Check database count: exactly 1 booking row must exist
  const countRes = await db.query(
    'SELECT COUNT(*) as count FROM delivery_bookings WHERE fulfillment_id = $1',
    [fulfillmentId]
  );
  assert.equal(parseInt(countRes.rows[0].count, 10), 1);

  console.log('  ✓ Test 4: Delivery Status History Audit Log');
  const historyRes = await db.query(
    'SELECT * FROM delivery_status_history WHERE delivery_booking_id = $1 ORDER BY created_at ASC',
    [booking1.id]
  );
  assert.ok(historyRes.rows.length >= 1);
  assert.equal(historyRes.rows[0].status, 'BOOKED');

  console.log('  ✓ Test 5: Carrier Status Synchronization');
  const synced = await deliveryService.syncDeliveryStatus(booking1.id);
  assert.equal(synced.status, 'IN_TRANSIT');
  assert.ok(synced.riderName);
  assert.ok(synced.riderPhone);

  console.log('  ✓ Test 6: Failed Delivery & Admin Retry Mechanics');
  // Simulate a failed booking
  const failedOrderId = `ord-fail-${Date.now()}`;
  const failedFulfillmentId = `ful-fail-${Date.now()}`;

  await db.query(`
    INSERT INTO orders (
      id, order_number, customer_id, customer_name, customer_phone, delivery_address,
      city, pincode, delivery_method, payment_method, payment_status, overall_status,
      subtotal_inr, gst_total_inr, grand_total_inr, created_at, updated_at
    ) VALUES (
      $1, $2, $3, 'Anil Kumar Reddy', '+919848199882', 'Flat 301, Sri Sai Residency',
      'Vijayawada', '520008', 'STANDARD', 'UPI', 'PAID', 'CONFIRMED', 500.00, 90.00, 590.00, NOW(), NOW()
    )
  `, [failedOrderId, `ORD-FAIL-${Date.now().toString().slice(-6)}`, testCustomerId]);

  await db.query(`
    INSERT INTO order_fulfillments (
      id, order_id, fulfillment_index, partner_id, partner_name, partner_type,
      partner_address, status, estimated_delivery_time, handover_otp, created_at, last_updated
    ) VALUES (
      $1, $2, 1, $3, 'Vijayawada Electricals', 'RETAILER', 'Besant Road',
      'CONFIRMED', '30-45 mins', '4892', NOW(), NOW()
    )
  `, [failedFulfillmentId, failedOrderId, partnerId]);

  // Insert failed booking
  const failedBookingId = `del-failed-${Date.now()}`;
  await db.query(`
    INSERT INTO delivery_bookings (
      id, order_id, fulfillment_id, idempotency_key, provider, status,
      pickup_name, pickup_phone, pickup_address, pickup_city, pickup_pincode,
      pickup_latitude, pickup_longitude, drop_name, drop_phone, drop_address,
      drop_city, drop_pincode, drop_latitude, drop_longitude, distance_km,
      delivery_fee_inr, retry_count, last_error, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, 'rapido', 'FAILED',
      'Vijayawada Electricals', '+919848011223', 'Besant Road', 'Vijayawada', '520002',
      16.51, 80.64, 'Anil Kumar', '+919848199882', 'Guru Nanak Colony',
      'Vijayawada', '520008', 16.505, 80.65, 3.5,
      0.0, 0, 'No captains available in zone', NOW(), NOW()
    )
  `, [failedBookingId, failedOrderId, failedFulfillmentId, `rapido_booking_${failedOrderId}_${failedFulfillmentId}`]);

  // Admin triggers retry using mock provider
  const retriedBooking = await deliveryService.retryFailedBooking(failedBookingId);
  assert.equal(retriedBooking.status, 'BOOKED');
  assert.equal(retriedBooking.retryCount, 1);

  console.log('  🎉 All Automated Delivery tests passed successfully!');
}
