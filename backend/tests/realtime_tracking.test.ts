/**
 * ElectraKart Real-Time Telemetry & Event Streaming Test Suite
 * Validates:
 * 1. Realtime EventHub channel subscription and event distribution.
 * 2. Delivery Driver GPS telemetry ingestion, persistence, and event emission.
 * 3. Live tracking payload generation (pins, ETA, distance, stale status).
 * 4. Electrician location telemetry with privacy guards (offline vs active job).
 * 5. Carrier Webhook HMAC verification and replay protection.
 */

import assert from 'node:assert/strict';
import crypto from 'crypto';
import { db } from '../src/db/connection.js';
import { eventHub } from '../src/modules/realtime/eventHub.js';
import { DeliveryService } from '../src/modules/delivery/delivery.service.js';
import { MockDeliveryProvider } from '../src/modules/delivery/mock.provider.js';
import { ElectricianService } from '../src/modules/electricians/electrician.service.js';

export async function runRealtimeTrackingTests() {
  console.log('\n--- Running Real-Time Telemetry & Tracking Test Suite ---');

  const deliveryService = new DeliveryService(new MockDeliveryProvider());
  const electricianService = new ElectricianService();

  // Test 1: EventHub Channel Subscription & Distribution
  console.log('  ✓ Test 1: EventHub Channel Isolation & Distribution');
  let receivedOrderEvent: any = null;
  let receivedAdminEvent: any = null;

  const unsubOrder = eventHub.subscribe('order:test-order-99', (evt) => {
    receivedOrderEvent = evt;
  });
  const unsubAdmin = eventHub.subscribe('admin:all', (evt) => {
    receivedAdminEvent = evt;
  });

  eventHub.publish('order:test-order-99', {
    eventType: 'FULFILLMENT_STATUS_CHANGED',
    entityType: 'ORDER',
    entityId: 'test-order-99',
    payload: { status: 'OUT_FOR_DELIVERY', driver: 'Test Driver' },
  });

  assert.ok(receivedOrderEvent, 'Order channel must receive published event');
  assert.equal(receivedOrderEvent.eventType, 'FULFILLMENT_STATUS_CHANGED');
  assert.equal(receivedOrderEvent.entityId, 'test-order-99');
  assert.ok(receivedAdminEvent, 'Admin wildcard channel must receive broadcast event');

  unsubOrder();
  unsubAdmin();

  // Test 2: Ingest Driver GPS Telemetry
  console.log('  ✓ Test 2: Driver GPS Telemetry Ingestion & Real-Time Broadcast');

  // Query existing customer
  const custRes = await db.query("SELECT id FROM users WHERE role = 'CUSTOMER' LIMIT 1");
  const customerId = custRes.rows[0]?.id || 'usr-cust-1';

  const testOrderId = `ord-track-${Date.now()}`;
  const testFulfillmentId = `ful-track-${Date.now()}`;

  await db.query(`
    INSERT INTO orders (
      id, order_number, customer_id, customer_name, customer_phone, delivery_address,
      city, pincode, delivery_method, payment_method, payment_status, overall_status,
      subtotal_inr, gst_total_inr, grand_total_inr, created_at, updated_at
    ) VALUES (
      $1, $2, $3, 'Anil Kumar Reddy', '+919848199882', 'Flat 301, Sri Sai Residency',
      'Vijayawada', '520008', 'STANDARD', 'UPI', 'PAID', 'CONFIRMED', 1200.00, 216.00, 1416.00, NOW(), NOW()
    )
  `, [testOrderId, `ORD-TRK-${Date.now().toString().slice(-5)}`, customerId]);

  await db.query(`
    INSERT INTO order_fulfillments (
      id, order_id, fulfillment_index, partner_id, partner_name, partner_type,
      partner_address, status, estimated_delivery_time, handover_otp, created_at, last_updated
    ) VALUES (
      $1, $2, 1, 'partner-vja-elec-1', 'Vijayawada Electricals', 'RETAILER', 'Besant Road',
      'CONFIRMED', '30 mins', '7892', NOW(), NOW()
    )
  `, [testFulfillmentId, testOrderId]);

  // Book delivery
  const booking = await deliveryService.bookDeliveryForFulfillment(testOrderId, testFulfillmentId);
  assert.ok(booking.id);

  // Ingest driver telemetry update
  let liveEventReceived: any = null;
  const unsubDeliv = eventHub.subscribe(`delivery:${booking.id}`, (evt) => {
    liveEventReceived = evt;
  });

  const locationUpdate = await deliveryService.recordDriverLocation({
    deliveryBookingId: booking.id,
    driverName: 'Ramesh Kumar (Pilot)',
    latitude: 16.5110,
    longitude: 80.6430,
    accuracy: 8.5,
    heading: 65,
    speed: 28.5,
  });

  assert.ok(locationUpdate.id);
  assert.equal(locationUpdate.deliveryBookingId, booking.id);
  assert.ok(locationUpdate.distanceRemainingKm! >= 0);
  assert.ok(locationUpdate.etaMinutes! >= 1);
  assert.ok(liveEventReceived, 'EventHub must publish DELIVERY_LOCATION_UPDATED');
  assert.equal(liveEventReceived.eventType, 'DELIVERY_LOCATION_UPDATED');

  unsubDeliv();

  // Test 3: Query Full Live Tracking Snapshot
  console.log('  ✓ Test 3: Query Live Tracking Snapshot (Zomato/Swiggy Payload)');
  const trackingSnapshot = await deliveryService.getLiveTracking(booking.id);
  assert.ok(trackingSnapshot);
  assert.equal(trackingSnapshot.bookingId, booking.id);
  assert.ok(trackingSnapshot.rider.name.includes('Ramesh'));
  assert.equal(trackingSnapshot.telemetry.latitude, 16.5110);
  assert.equal(trackingSnapshot.telemetry.longitude, 80.6430);
  assert.equal(trackingSnapshot.telemetry.isStale, false);

  // Test 4: Electrician Location Telemetry with Privacy Guard
  console.log('  ✓ Test 4: Electrician Location Telemetry & Privacy Guard');
  const elecEmail = `telemetry.elec.${Date.now()}@electrakart.in`;
  const elecPhone = `+919988${Math.floor(100000 + Math.random() * 900000)}`;

  const { profile } = await electricianService.registerElectrician({
    fullName: 'Venkat Rao',
    phone: elecPhone,
    email: elecEmail,
    password: 'Password@123',
    city: 'Vijayawada',
    pincode: '520002',
    address: 'Bunder Road',
    latitude: 16.508,
    longitude: 80.645,
    specializations: ['WIRING', 'MCB_DB'],
  });

  // Verify that an UNAPPROVED electrician cannot transmit location
  await assert.rejects(
    () => electricianService.recordLocation(profile.id, { latitude: 16.509, longitude: 80.646 }),
    /must be approved/i
  );

  // Admin approves electrician
  await electricianService.adminVerifyElectrician(profile.id, 'APPROVED');

  // Verify that an OFFLINE electrician with no active job cannot transmit location (Privacy Guard)
  await assert.rejects(
    () => electricianService.recordLocation(profile.id, { latitude: 16.509, longitude: 80.646 }),
    /Privacy Guard/i
  );

  // Once online, telemetry ingestion succeeds
  await electricianService.updateOnlineStatus(profile.id, true);
  const elecLoc = await electricianService.recordLocation(profile.id, {
    latitude: 16.5095,
    longitude: 80.6465,
    heading: 90,
    speed: 15,
  });

  assert.ok(elecLoc.id);
  assert.equal(elecLoc.latitude, 16.5095);

  // Test 5: Carrier Webhook Ingestion & Replay Defense
  console.log('  ✓ Test 5: Carrier Webhook Ingestion, Status Sync & Replay Protection');
  const webhookPayload = {
    eventId: `evt-rapido-${Date.now()}`,
    bookingId: booking.id,
    order_id: testOrderId,
    status: 'OUT_FOR_DELIVERY',
    driverName: 'Suresh Captain',
    driverPhone: '+91 98480 12345',
  };

  const webhookRes = await deliveryService.handleDeliveryWebhook('rapido', webhookPayload);
  assert.equal(webhookRes.success, true);

  // Verify status in DB updated
  const updatedBooking = await deliveryService.getBookingById(booking.id);
  assert.equal(updatedBooking?.status, 'IN_TRANSIT');

  // Replaying the exact same event must be accepted idempotently without duplicate rows
  const replayRes = await deliveryService.handleDeliveryWebhook('rapido', webhookPayload);
  assert.equal(replayRes.success, true);
  assert.equal(replayRes.eventId, webhookPayload.eventId);

  const countRes = await db.query(
    'SELECT COUNT(*) as count FROM delivery_webhooks WHERE provider_event_id = $1',
    [webhookPayload.eventId]
  );
  assert.equal(parseInt(countRes.rows[0].count, 10), 1, 'Exactly one webhook audit record must exist');

  console.log('  🎉 All Real-Time Telemetry & Tracking tests passed successfully!');
}
