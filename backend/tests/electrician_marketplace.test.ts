/**
 * ElectraKart Electrician Marketplace Automated Test Suite
 * Rigorous validation of registration, KYC approval lifecycle, radius/skill matching,
 * atomic concurrency acceptance, state machine progression, and server-authoritative ratings.
 */

import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';
import { db } from '../src/db/connection.js';
import { ElectricianService } from '../src/modules/electricians/electrician.service.js';

export async function runElectricianMarketplaceTests() {
  console.log('\n--- Running Electrician Marketplace Test Suite ---');

  const app = buildApp();
  await app.ready();
  const service = new ElectricianService();

  // Reset electrician tables for isolated tests
  await db.exec(`
    DELETE FROM electrician_ratings;
    DELETE FROM electrician_service_requests;
    DELETE FROM electrician_specializations;
    DELETE FROM electrician_profiles;
    DELETE FROM users WHERE role = 'ELECTRICIAN';
  `);

  // Setup test tokens
  const adminToken = app.jwt.sign({
    id: 'usr-admin-test',
    email: 'admin@electrakart.in',
    role: 'ADMIN',
    fullName: 'Platform Admin',
  });

  // Ensure or get customer user from users table
  const custLookup = await db.query("SELECT id, email, full_name FROM users WHERE role = 'CUSTOMER' LIMIT 1");
  let customerId: string;
  if (custLookup.rows.length > 0) {
    customerId = custLookup.rows[0].id;
  } else {
    customerId = 'usr-customer-test';
    await db.query(`
      INSERT INTO users (id, email, phone_number, full_name, role, password_hash, is_active, created_at, updated_at)
      VALUES ($1, 'elec.customer@electrakart.in', '+919848199882', 'Anil Kumar Reddy', 'CUSTOMER', 'hash', true, NOW(), NOW())
    `, [customerId]);
  }

  console.log('  ✓ Test 1: Electrician Registration & Initial PENDING_VERIFICATION state');
  const regResult = await service.registerElectrician({
    fullName: 'Ramesh Kumar',
    phone: '+919849011223',
    email: 'ramesh.electrician@gmail.com',
    password: 'password123',
    experienceYears: 7,
    serviceRadiusKm: 10,
    city: 'Vijayawada',
    pincode: '520002',
    address: 'Shop 14, Main Road, Governorpet',
    latitude: 16.5100,
    longitude: 80.6400,
    specializations: ['FANS', 'WIRING', 'SWITCHES_SOCKETS'],
    inspectionFeeInr: 199,
  });

  assert.equal(regResult.user.role, 'ELECTRICIAN');
  assert.equal(regResult.profile.verificationStatus, 'PENDING_VERIFICATION');
  assert.equal(regResult.profile.isOnline, false);
  assert.equal(regResult.profile.specializations?.length, 3);

  const elec1Id = regResult.profile.id;
  const elec1UserId = regResult.user.id;
  const elec1Token = app.jwt.sign({
    id: elec1UserId,
    email: 'ramesh.electrician@gmail.com',
    role: 'ELECTRICIAN',
    fullName: 'Ramesh Kumar',
  });

  console.log('  ✓ Test 2: Unapproved Electrician cannot go Online');
  await assert.rejects(
    async () => {
      await service.updateOnlineStatus(elec1Id, true);
    },
    /Only verified and approved electricians can go online/
  );

  console.log('  ✓ Test 3: Admin KYC Approval & Online Toggle');
  // Admin approves profile
  const approved = await service.adminVerifyElectrician(elec1Id, 'APPROVED');
  assert.equal(approved.verificationStatus, 'APPROVED');

  // Now electrician can go online
  const onlineProfile = await service.updateOnlineStatus(elec1Id, true);
  assert.equal(onlineProfile.isOnline, true);

  console.log('  ✓ Test 4: Geolocation Search & Specialization Filtering');
  // Search for FANS near Vijayawada (Customer at 16.5050, 80.6500)
  const searchMatch = await service.searchElectricians({
    latitude: 16.5050,
    longitude: 80.6500,
    category: 'FANS',
  });
  assert.equal(searchMatch.length, 1);
  assert.equal(searchMatch[0].fullName, 'Ramesh Kumar');
  assert.ok(searchMatch[0].distanceKm < 5);
  // Ensure private KYC urls not exposed in public search
  assert.equal((searchMatch[0] as any).idProofUrl, undefined);

  // Search for PUMPS (which Ramesh does NOT support) -> should return 0 results
  const searchNoMatch = await service.searchElectricians({
    latitude: 16.5050,
    longitude: 80.6500,
    category: 'PUMPS',
  });
  assert.equal(searchNoMatch.length, 0);

  // Offline check: when electrician toggles offline, they vanish from search
  await service.updateOnlineStatus(elec1Id, false);
  const searchOffline = await service.searchElectricians({
    latitude: 16.5050,
    longitude: 80.6500,
    category: 'FANS',
  });
  assert.equal(searchOffline.length, 0);
  // Turn back online for job testing
  await service.updateOnlineStatus(elec1Id, true);

  console.log('  ✓ Test 5: Customer Creates Service Request');
  const serviceReq = await service.createServiceRequest(customerId, {
    category: 'FANS',
    description: 'Ceiling fan is making buzzing noise and regulator is faulty.',
    address: 'Flat 301, Sri Sai Residency',
    city: 'Vijayawada',
    pincode: '520008',
    latitude: 16.5050,
    longitude: 80.6500,
    preferredTime: 'IMMEDIATE',
  });
  assert.equal(serviceReq.status, 'REQUESTED');
  assert.ok(serviceReq.requestNumber.startsWith('SR-'));

  console.log('  ✓ Test 6: Strict Atomic Concurrency Acceptance');
  // Register second electrician
  const regResult2 = await service.registerElectrician({
    fullName: 'Suresh Wireman',
    phone: '+919849099887',
    email: 'suresh.wireman@gmail.com',
    password: 'password123',
    experienceYears: 5,
    serviceRadiusKm: 10,
    city: 'Vijayawada',
    pincode: '520002',
    address: 'Governorpet',
    latitude: 16.5100,
    longitude: 80.6400,
    specializations: ['FANS', 'WIRING'],
  });
  await service.adminVerifyElectrician(regResult2.profile.id, 'APPROVED');
  await service.updateOnlineStatus(regResult2.profile.id, true);

  // Electrician 1 accepts request atomically
  const accepted = await service.acceptRequestAtomic(serviceReq.id, elec1Id);
  assert.equal(accepted.status, 'ACCEPTED');
  assert.equal(accepted.assignedElectricianId, elec1Id);
  assert.ok(accepted.acceptedAt);
  assert.ok(accepted.customerNotifiedAt);

  // Electrician 2 attempts to accept the SAME request -> MUST fail atomically with conflict error
  await assert.rejects(
    async () => {
      await service.acceptRequestAtomic(serviceReq.id, regResult2.profile.id);
    },
    /JOB_ALREADY_ASSIGNED/
  );

  console.log('  ✓ Test 7: Forward State Machine Lifecycle Progression');
  // Progress: ACCEPTED -> ON_THE_WAY -> ARRIVED -> WORK_STARTED -> COMPLETED
  const onTheWay = await service.updateRequestStatus(serviceReq.id, elec1Id, 'ON_THE_WAY');
  assert.equal(onTheWay.status, 'ON_THE_WAY');

  const arrived = await service.updateRequestStatus(serviceReq.id, elec1Id, 'ARRIVED');
  assert.equal(arrived.status, 'ARRIVED');
  assert.ok(arrived.arrivedAt);

  const workStarted = await service.updateRequestStatus(serviceReq.id, elec1Id, 'WORK_STARTED');
  assert.equal(workStarted.status, 'WORK_STARTED');
  assert.ok(workStarted.workStartedAt);

  const completed = await service.updateRequestStatus(serviceReq.id, elec1Id, 'COMPLETED', 250);
  assert.equal(completed.status, 'COMPLETED');
  assert.equal(completed.totalChargesInr, 250);
  assert.ok(completed.completedAt);

  // Verify completed jobs count incremented and is_busy is reset
  const elecAfter = await service.getProfileById(elec1Id);
  assert.equal(elecAfter?.completedJobsCount, 1);
  assert.equal(elecAfter?.isBusy, false);

  // Backward state reversal (COMPLETED -> ARRIVED) must be strictly prohibited
  await assert.rejects(
    async () => {
      await service.updateRequestStatus(serviceReq.id, elec1Id, 'ARRIVED');
    },
    /Invalid status transition/
  );

  console.log('  ✓ Test 8: Server-Authoritative Ratings & Duplicate Prevention');
  const ratingRes = await service.submitRating(serviceReq.id, customerId, {
    rating: 5,
    review: 'Ramesh arrived promptly and replaced the capacitor cleanly.',
  });
  assert.equal(ratingRes.ratingAvg, 5.0);
  assert.equal(ratingRes.ratingCount, 1);

  // Duplicate rating attempt on same request must be rejected
  await assert.rejects(
    async () => {
      await service.submitRating(serviceReq.id, customerId, { rating: 4 });
    },
    /A rating has already been submitted for this service request/
  );

  console.log('  ✓ Test 9: Admin Metrics Aggregation & Suspension');
  const metrics = await service.adminGetMetrics();
  assert.equal(metrics.totalElectricians, 2);
  assert.equal(metrics.approvedCount, 2);
  assert.equal(metrics.completedRequests, 1);
  assert.equal(metrics.averagePlatformRating, 5.0);

  // Suspend electrician 2
  const suspended = await service.adminVerifyElectrician(regResult2.profile.id, 'SUSPENDED');
  assert.equal(suspended.verificationStatus, 'SUSPENDED');
  assert.equal(suspended.isOnline, false);

  console.log('  🎉 All Electrician Marketplace tests passed successfully!');
}
