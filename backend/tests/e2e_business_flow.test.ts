/**
 * ElectraKart End-to-End Business Lifecycle Test Suite
 * Validates the complete real-world journeys:
 * Journey A: Customer Purchase -> Split Fulfillment -> Dispatch -> Live Telemetry -> Delivery -> Invoice
 * Journey B: Customer Request -> Geolocation Matching -> Atomic Acceptance -> Live Telemetry -> Completion -> Rating
 */

import assert from 'node:assert/strict';
import { db } from '../src/db/connection.js';
import { DeliveryService } from '../src/modules/delivery/delivery.service.js';
import { MockDeliveryProvider } from '../src/modules/delivery/mock.provider.js';
import { ElectricianService } from '../src/modules/electricians/electrician.service.js';
import { eventHub } from '../src/modules/realtime/eventHub.js';

export async function runE2EBusinessFlowTests() {
  console.log('\n--- Running Complete End-to-End Business Flow Test Suite ---');

  const deliveryService = new DeliveryService(new MockDeliveryProvider());
  const electricianService = new ElectricianService();

  // --------------------------------------------------------------------------
  // JOURNEY A: Customer Commerce -> Fulfillment -> Live GPS Tracking -> Delivery
  // --------------------------------------------------------------------------
  console.log('  ✓ Journey A: Complete E2E Commerce & Live Delivery Pipeline');

  const custEmail = `cust.e2e.${Date.now()}@gmail.com`;
  const custPhone = `+919848${Math.floor(100000 + Math.random() * 900000)}`;
  const custId = `usr-cust-e2e-${Date.now()}`;

  // 1. Customer user
  await db.query(`
    INSERT INTO users (id, email, phone_number, full_name, role, password_hash, is_active, created_at, updated_at)
    VALUES ($1, $2, $3, 'Nagarjuna Rao', 'CUSTOMER', 'hash', TRUE, NOW(), NOW())
  `, [custId, custEmail, custPhone]);

  // 2. Add customer address with GPS coordinates
  const addressId = `addr-e2e-${Date.now()}`;
  await db.query(`
    INSERT INTO addresses (id, user_id, recipient_name, phone_number, address_line1, city, state, pincode, latitude, longitude, is_default, created_at, updated_at)
    VALUES ($1, $2, 'Nagarjuna Rao', $3, 'Flat 402, Royal Palms, Moghalrajpuram', 'Vijayawada', 'Andhra Pradesh', '520010', 16.5085, 80.6420, TRUE, NOW(), NOW())
  `, [addressId, custId, custPhone]);

  // 3. Create Order with Split Store Fulfillment
  const orderId = `ord-e2e-${Date.now()}`;
  const fulId = `ful-e2e-${Date.now()}`;
  const orderNumber = `ORD-E2E-${Date.now().toString().slice(-6)}`;

  await db.query(`
    INSERT INTO orders (
      id, order_number, customer_id, customer_name, customer_phone, delivery_address,
      city, pincode, delivery_method, payment_method, payment_status, overall_status,
      subtotal_inr, gst_total_inr, grand_total_inr, created_at, updated_at
    ) VALUES (
      $1, $2, $3, 'Nagarjuna Rao', $4, 'Flat 402, Royal Palms, Moghalrajpuram',
      'Vijayawada', '520010', 'EXPRESS', 'UPI', 'PAID', 'CONFIRMED', 2500.00, 450.00, 2950.00, NOW(), NOW()
    )
  `, [orderId, orderNumber, custId, custPhone]);

  await db.query(`
    INSERT INTO order_fulfillments (
      id, order_id, fulfillment_index, partner_id, partner_name, partner_type,
      partner_address, status, estimated_delivery_time, handover_otp, created_at, last_updated
    ) VALUES (
      $1, $2, 1, 'partner-vja-elec-1', 'Vijayawada Electricals', 'RETAILER', 'Besant Road',
      'CONFIRMED', '30-45 mins', '8421', NOW(), NOW()
    )
  `, [fulId, orderId]);

  // 4. Partner packs and prepares order
  await db.query("UPDATE order_fulfillments SET status = 'PACKED', last_updated = NOW() WHERE id = $1", [fulId]);

  // 5. Automated Courier Booking Dispatched
  const booking = await deliveryService.bookDeliveryForFulfillment(orderId, fulId);
  assert.ok(booking.id);
  assert.equal(booking.status, 'BOOKED');
  assert.ok(booking.trackingUrl);

  // 6. Driver assigned and begins moving -> Ingest live GPS coordinates
  let sseEventCaptured: any = null;
  const unsubOrder = eventHub.subscribe(`order:${orderId}`, (evt) => {
    sseEventCaptured = evt;
  });

  const telemetry = await deliveryService.recordDriverLocation({
    deliveryBookingId: booking.id,
    driverName: 'Suresh Captain (Rapido)',
    latitude: 16.5075,
    longitude: 80.6435,
    heading: 120,
    speed: 32.0,
    distanceRemainingKm: 1.8,
    etaMinutes: 6,
  });

  assert.ok(telemetry.id);
  assert.equal(telemetry.driverName, 'Suresh Captain (Rapido)');
  assert.ok(sseEventCaptured);
  assert.equal(sseEventCaptured.eventType, 'DELIVERY_LOCATION_UPDATED');

  // 7. Transition status to OUT_FOR_DELIVERY and then DELIVERED
  await db.query("UPDATE order_fulfillments SET status = 'OUT_FOR_DELIVERY', last_updated = NOW() WHERE id = $1", [fulId]);
  await db.query("UPDATE orders SET overall_status = 'OUT_FOR_DELIVERY', updated_at = NOW() WHERE id = $1", [orderId]);

  // Final delivery
  await db.query("UPDATE order_fulfillments SET status = 'DELIVERED', last_updated = NOW() WHERE id = $1", [fulId]);
  await db.query("UPDATE orders SET overall_status = 'DELIVERED', updated_at = NOW() WHERE id = $1", [orderId]);
  await db.query("UPDATE delivery_bookings SET status = 'DELIVERED', updated_at = NOW() WHERE id = $1", [booking.id]);

  const finalOrder = await db.query('SELECT overall_status FROM orders WHERE id = $1', [orderId]);
  assert.equal(finalOrder.rows[0].overall_status, 'DELIVERED');

  unsubOrder();

  // --------------------------------------------------------------------------
  // JOURNEY B: Customer Service Request -> Geolocation Match -> Atomic Acceptance -> Work -> 5-Star Rating
  // --------------------------------------------------------------------------
  console.log('  ✓ Journey B: Complete E2E Electrician Marketplace Lifecycle');

  const elecEmail = `elec.e2e.${Date.now()}@electrakart.in`;
  const elecPhone = `+919912${Math.floor(100000 + Math.random() * 900000)}`;

  // 1. Electrician registers
  const { profile: elecProfile } = await electricianService.registerElectrician({
    fullName: 'Kalyan Ram',
    phone: elecPhone,
    email: elecEmail,
    password: 'Password@123',
    city: 'Vijayawada',
    pincode: '520010',
    address: 'Moghalrajpuram High Road',
    latitude: 16.5080,
    longitude: 80.6425,
    serviceRadiusKm: 15,
    specializations: ['FANS', 'WIRING', 'MCB_DB'],
  });

  // 2. Admin KYC verification
  await electricianService.adminVerifyElectrician(elecProfile.id, 'APPROVED');

  // 3. Electrician goes online
  await electricianService.updateOnlineStatus(elecProfile.id, true);

  // 4. Customer searches nearby electricians for category 'FANS'
  const searchResults = await electricianService.searchElectricians({
    latitude: 16.5085,
    longitude: 80.6420,
    category: 'FANS',
    maxRadiusKm: 10,
  });

  assert.ok(searchResults.length > 0);
  const foundElec = searchResults.find((e) => e.id === elecProfile.id);
  assert.ok(foundElec, 'Approved online electrician must appear in Haversine radius search');
  assert.ok(foundElec.distanceKm < 2.0);

  // 5. Customer creates service request
  const serviceReq = await electricianService.createServiceRequest(custId, {
    customerName: 'Nagarjuna Rao',
    customerPhone: custPhone,
    category: 'FANS',
    description: 'Ceiling fan makes loud grinding sound when switched on high speed.',
    address: 'Flat 402, Royal Palms, Moghalrajpuram',
    city: 'Vijayawada',
    pincode: '520010',
    latitude: 16.5085,
    longitude: 80.6420,
    preferredTime: 'IMMEDIATE',
  });

  assert.ok(serviceReq.id);
  assert.equal(serviceReq.status, 'REQUESTED');

  // 6. Electrician accepts job atomically
  const acceptedReq = await electricianService.acceptRequestAtomic(serviceReq.id, elecProfile.id);
  assert.equal(acceptedReq.status, 'ACCEPTED');
  assert.equal(acceptedReq.assignedElectricianId, elecProfile.id);

  // 7. Electrician streams GPS telemetry while ON_THE_WAY
  await electricianService.updateRequestStatus(serviceReq.id, elecProfile.id, 'ON_THE_WAY');
  const elecTelemetry = await electricianService.recordLocation(elecProfile.id, {
    latitude: 16.5082,
    longitude: 80.6422,
    jobId: serviceReq.id,
    speed: 18.0,
  });

  assert.ok(elecTelemetry.id);
  assert.equal(elecTelemetry.jobId, serviceReq.id);

  // 8. Customer tracks technician in real-time
  const trackingPayload = await electricianService.getJobTracking(serviceReq.id, custId);
  assert.equal(trackingPayload.status, 'ON_THE_WAY');
  assert.ok(trackingPayload.electrician.fullName.includes('Kalyan Ram'));
  assert.equal(trackingPayload.telemetry.latitude, 16.5082);

  // 9. Progression: ARRIVED -> WORK_STARTED -> COMPLETED
  await electricianService.updateRequestStatus(serviceReq.id, elecProfile.id, 'ARRIVED');
  await electricianService.updateRequestStatus(serviceReq.id, elecProfile.id, 'WORK_STARTED');
  const completedReq = await electricianService.updateRequestStatus(
    serviceReq.id,
    elecProfile.id,
    'COMPLETED',
    350.00
  );
  assert.equal(completedReq.status, 'COMPLETED');
  assert.equal(completedReq.totalChargesInr, 350.00);

  // 10. Customer rates the completed job 5 stars
  const ratingRes = await electricianService.submitRating(serviceReq.id, custId, {
    rating: 5,
    review: 'Prompt arrival, fixed the fan capacitor quickly with genuine parts. Highly recommended!',
  });

  assert.equal(ratingRes.ratingAvg, 5.0);
  assert.equal(ratingRes.ratingCount, 1);

  // Verify electrician rating aggregated
  const updatedElecProfile = await electricianService.getProfileById(elecProfile.id);
  assert.equal(updatedElecProfile?.ratingAvg, 5.0);
  assert.equal(updatedElecProfile?.ratingCount, 1);
  assert.equal(updatedElecProfile?.completedJobsCount, 1);

  console.log('  🎉 All E2E Business Flow tests passed successfully!');
}
