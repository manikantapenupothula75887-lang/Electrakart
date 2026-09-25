/**
 * ElectraKart Electrician Marketplace Service
 * Authoritative business logic for electrician registration, verification lifecycle,
 * location search, atomic job acceptance, state machine progression, and rating engine.
 */

import bcrypt from 'bcryptjs';
import { db } from '../../db/connection.js';
import { calculateHaversineDistanceKm } from '../location/distance.provider.js';
import { NotificationService } from '../notifications/notification.service.js';
import { eventHub } from '../realtime/eventHub.js';
import {
  ElectricianProfileEntity,
  ElectricianRegisterInput,
  ElectricianSearchQuery,
  ElectricianSearchResult,
  ElectricianSpecialization,
  ElectricianVerificationStatus,
  CreateServiceRequestInput,
  ServiceRequestEntity,
  ServiceRequestStatus,
  SubmitRatingInput,
} from './electrician.types.js';

export class ElectricianService {
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = new NotificationService();
  }

  /**
   * Register a new Electrician.
   * Creates a user account with role ELECTRICIAN and a profile with PENDING_VERIFICATION.
   */
  async registerElectrician(input: ElectricianRegisterInput): Promise<{
    user: { id: string; email?: string; role: string; fullName: string };
    profile: ElectricianProfileEntity;
  }> {
    const email = input.email?.trim().toLowerCase() || `electrician.${input.phone}@electrakart.in`;
    const phone = input.phone.trim();

    // Check uniqueness
    const existing = await db.query(
      'SELECT id, email, phone_number FROM users WHERE email = $1 OR phone_number = $2',
      [email, phone]
    );

    if (existing.rows.length > 0) {
      throw new Error('A user with this email or phone number already exists.');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(input.password || 'electrician123', salt);

    const userId = `usr-elec-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const profileId = `elec-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    return await db.withTransaction(async (tx) => {
      // 1. Create user
      await tx.query(
        `INSERT INTO users (
          id, email, phone_number, password_hash, full_name, role, city, pincode, is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, 'ELECTRICIAN', $6, $7, TRUE, NOW(), NOW())`,
        [userId, email, phone, passwordHash, input.fullName.trim(), input.city.trim(), input.pincode.trim()]
      );

      // 2. Create electrician profile
      const serviceRadius = input.serviceRadiusKm ?? 10.0;
      const inspectionFee = input.inspectionFeeInr ?? 199.0;

      await tx.query(
        `INSERT INTO electrician_profiles (
          id, user_id, full_name, phone, email, experience_years, service_radius_km,
          city, pincode, address, latitude, longitude, id_proof_url, license_url,
          profile_photo_url, inspection_fee_inr, verification_status, is_online, is_busy,
          rating_avg, rating_count, completed_jobs_count, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
          'PENDING_VERIFICATION', FALSE, FALSE, 0.00, 0, 0, NOW(), NOW()
        )`,
        [
          profileId,
          userId,
          input.fullName.trim(),
          phone,
          email,
          input.experienceYears || 0,
          serviceRadius,
          input.city.trim(),
          input.pincode.trim(),
          input.address.trim(),
          input.latitude,
          input.longitude,
          input.idProofUrl || null,
          input.licenseUrl || null,
          input.profilePhotoUrl || null,
          inspectionFee,
        ]
      );

      // 3. Insert specializations
      if (input.specializations && input.specializations.length > 0) {
        for (const spec of input.specializations) {
          const specId = `spec-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
          await tx.query(
            `INSERT INTO electrician_specializations (id, electrician_id, category, created_at)
             VALUES ($1, $2, $3, NOW())
             ON CONFLICT (electrician_id, category) DO NOTHING`,
            [specId, profileId, spec]
          );
        }
      }

      const profile = await this.getProfileById(profileId, tx);
      return {
        user: { id: userId, email, role: 'ELECTRICIAN', fullName: input.fullName.trim() },
        profile: profile!,
      };
    });
  }

  /**
   * Get an electrician profile by ID (including specializations).
   */
  async getProfileById(
    id: string,
    executor: { query: (sql: string, params?: any[]) => Promise<any> } = db
  ): Promise<ElectricianProfileEntity | null> {
    const res = await executor.query('SELECT * FROM electrician_profiles WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;

    const row = res.rows[0];
    const specRes = await executor.query(
      'SELECT category FROM electrician_specializations WHERE electrician_id = $1 ORDER BY category ASC',
      [id]
    );

    return {
      id: row.id,
      userId: row.user_id,
      fullName: row.full_name,
      phone: row.phone,
      email: row.email,
      experienceYears: Number(row.experience_years),
      serviceRadiusKm: Number(row.service_radius_km),
      city: row.city,
      pincode: row.pincode,
      address: row.address,
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      idProofUrl: row.id_proof_url,
      licenseUrl: row.license_url,
      profilePhotoUrl: row.profile_photo_url,
      inspectionFeeInr: Number(row.inspection_fee_inr),
      verificationStatus: row.verification_status,
      rejectionReason: row.rejection_reason,
      isOnline: Boolean(row.is_online),
      isBusy: Boolean(row.is_busy),
      ratingAvg: Number(row.rating_avg),
      ratingCount: Number(row.rating_count),
      completedJobsCount: Number(row.completed_jobs_count),
      specializations: specRes.rows.map((r: any) => r.category as ElectricianSpecialization),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Get an electrician profile by user ID.
   */
  async getProfileByUserId(userId: string): Promise<ElectricianProfileEntity | null> {
    const res = await db.query('SELECT id FROM electrician_profiles WHERE user_id = $1', [userId]);
    if (res.rows.length === 0) return null;
    return this.getProfileById(res.rows[0].id);
  }

  /**
   * Toggle Online / Offline status for an electrician.
   * STRICT GUARD: Only APPROVED electricians can go online.
   */
  async updateOnlineStatus(electricianId: string, isOnline: boolean): Promise<ElectricianProfileEntity> {
    const profile = await this.getProfileById(electricianId);
    if (!profile) {
      throw new Error(`Electrician with ID '${electricianId}' not found.`);
    }

    if (isOnline && profile.verificationStatus !== 'APPROVED') {
      throw new Error('Only verified and approved electricians can go online.');
    }

    await db.query(
      'UPDATE electrician_profiles SET is_online = $1, updated_at = NOW() WHERE id = $2',
      [isOnline, electricianId]
    );

    return (await this.getProfileById(electricianId))!;
  }

  /**
   * Update Profile & Specializations.
   */
  async updateProfile(
    electricianId: string,
    updates: Partial<ElectricianRegisterInput>
  ): Promise<ElectricianProfileEntity> {
    const existing = await this.getProfileById(electricianId);
    if (!existing) throw new Error('Electrician not found.');

    await db.withTransaction(async (tx) => {
      const full_name = updates.fullName ?? existing.fullName;
      const experience_years = updates.experienceYears ?? existing.experienceYears;
      const service_radius_km = updates.serviceRadiusKm ?? existing.serviceRadiusKm;
      const city = updates.city ?? existing.city;
      const pincode = updates.pincode ?? existing.pincode;
      const address = updates.address ?? existing.address;
      const latitude = updates.latitude ?? existing.latitude;
      const longitude = updates.longitude ?? existing.longitude;
      const inspection_fee_inr = updates.inspectionFeeInr ?? existing.inspectionFeeInr;

      await tx.query(
        `UPDATE electrician_profiles
         SET full_name = $1, experience_years = $2, service_radius_km = $3,
             city = $4, pincode = $5, address = $6, latitude = $7, longitude = $8,
             inspection_fee_inr = $9, updated_at = NOW()
         WHERE id = $10`,
        [
          full_name,
          experience_years,
          service_radius_km,
          city,
          pincode,
          address,
          latitude,
          longitude,
          inspection_fee_inr,
          electricianId,
        ]
      );

      if (updates.specializations) {
        await tx.query('DELETE FROM electrician_specializations WHERE electrician_id = $1', [electricianId]);
        for (const spec of updates.specializations) {
          const specId = `spec-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
          await tx.query(
            `INSERT INTO electrician_specializations (id, electrician_id, category, created_at)
             VALUES ($1, $2, $3, NOW())`,
            [specId, electricianId, spec]
          );
        }
      }
    });

    return (await this.getProfileById(electricianId))!;
  }

  /**
   * Customer Search for Nearby Electricians.
   * Enforces:
   * - Must be APPROVED
   * - Must be ONLINE and not busy
   * - Must be within electrician's service radius
   * - Must match requested category (if specified)
   * - Privacy: Strips government IDs, bank details, and home address
   */
  async searchElectricians(query: ElectricianSearchQuery): Promise<ElectricianSearchResult[]> {
    const lat = Number(query.latitude);
    const lon = Number(query.longitude);

    if (isNaN(lat) || isNaN(lon)) {
      throw new Error('Valid customer latitude and longitude are required.');
    }

    let sql = `
      SELECT p.*, ARRAY_AGG(s.category) as specializations
      FROM electrician_profiles p
      LEFT JOIN electrician_specializations s ON p.id = s.electrician_id
      WHERE p.verification_status = 'APPROVED'
        AND p.is_online = TRUE
        AND p.is_busy = FALSE
    `;
    const params: any[] = [];

    if (query.category) {
      params.push(query.category);
      sql += ` AND p.id IN (SELECT electrician_id FROM electrician_specializations WHERE category = $${params.length})`;
    }

    sql += ` GROUP BY p.id`;

    const res = await db.query(sql, params);
    const candidates: ElectricianSearchResult[] = [];

    for (const row of res.rows) {
      const elecLat = Number(row.latitude);
      const elecLon = Number(row.longitude);
      const distance = calculateHaversineDistanceKm(lat, lon, elecLat, elecLon);
      const serviceRadius = Number(row.service_radius_km);

      // Verify distance is within service radius (and optional max distance)
      if (distance <= serviceRadius && (!query.maxDistanceKm || distance <= query.maxDistanceKm)) {
        candidates.push({
          id: row.id,
          fullName: row.full_name,
          phone: row.phone,
          experienceYears: Number(row.experience_years),
          ratingAvg: Number(row.rating_avg),
          ratingCount: Number(row.rating_count),
          completedJobsCount: Number(row.completed_jobs_count),
          inspectionFeeInr: Number(row.inspection_fee_inr),
          distanceKm: Math.round(distance * 10) / 10,
          city: row.city,
          pincode: row.pincode,
          specializations: (row.specializations || []).filter(Boolean) as ElectricianSpecialization[],
          isOnline: Boolean(row.is_online),
        });
      }
    }

    // Deterministic sort: Distance ASC, Rating DESC, Jobs Completed DESC
    candidates.sort((a, b) => {
      if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
      if (b.ratingAvg !== a.ratingAvg) return b.ratingAvg - a.ratingAvg;
      return b.completedJobsCount - a.completedJobsCount;
    });

    return candidates;
  }

  /**
   * Customer creates a service request.
   */
  async createServiceRequest(
    customerId: string,
    input: CreateServiceRequestInput
  ): Promise<ServiceRequestEntity> {
    const userRes = await db.query('SELECT full_name, phone_number FROM users WHERE id = $1', [customerId]);
    if (userRes.rows.length === 0) throw new Error('Customer account not found.');

    const customer = userRes.rows[0];
    const requestId = `req-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const requestNumber = `SR-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    let inspectionFee = 199.0;
    if (input.assignedElectricianId) {
      const elec = await this.getProfileById(input.assignedElectricianId);
      if (elec) inspectionFee = elec.inspectionFeeInr;
    }

    await db.query(
      `INSERT INTO electrician_service_requests (
        id, request_number, customer_id, customer_name, customer_phone,
        category, description, address, city, pincode, latitude, longitude,
        preferred_time, status, assigned_electrician_id, inspection_fee_inr,
        requested_at, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'REQUESTED', $14, $15,
        NOW(), NOW(), NOW()
      )`,
      [
        requestId,
        requestNumber,
        customerId,
        customer.full_name,
        customer.phone_number,
        input.category,
        input.description.trim(),
        input.address.trim(),
        input.city.trim(),
        input.pincode.trim(),
        input.latitude,
        input.longitude,
        input.preferredTime || 'IMMEDIATE',
        input.assignedElectricianId || null,
        inspectionFee,
      ]
    );

    // If direct assignment, publish in-app notification to electrician
    if (input.assignedElectricianId) {
      const elecProfile = await this.getProfileById(input.assignedElectricianId);
      if (elecProfile) {
        await this.notificationService.publishEvent({
          eventType: 'ELECTRICIAN_REQUEST_CREATED',
          userId: elecProfile.userId,
          role: 'ELECTRICIAN',
          title: 'New Service Request',
          message: `Customer ${customer.full_name} has requested your service for ${input.category}.`,
          entityType: 'ELECTRICIAN_REQUEST',
          entityId: requestId,
        });
      }
    }

    return (await this.getServiceRequestById(requestId))!;
  }

  /**
   * Get single service request by ID.
   */
  async getServiceRequestById(requestId: string): Promise<ServiceRequestEntity | null> {
    const res = await db.query(
      `SELECT r.*, p.full_name as electrician_name, p.phone as electrician_phone
       FROM electrician_service_requests r
       LEFT JOIN electrician_profiles p ON r.assigned_electrician_id = p.id
       WHERE r.id = $1`,
      [requestId]
    );

    if (res.rows.length === 0) return null;
    const r = res.rows[0];

    return {
      id: r.id,
      requestNumber: r.request_number,
      customerId: r.customer_id,
      customerName: r.customer_name,
      customerPhone: r.customer_phone,
      category: r.category as ElectricianSpecialization,
      description: r.description,
      address: r.address,
      city: r.city,
      pincode: r.pincode,
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
      preferredTime: r.preferred_time,
      status: r.status as ServiceRequestStatus,
      assignedElectricianId: r.assigned_electrician_id,
      electricianName: r.electrician_name,
      electricianPhone: r.electrician_phone,
      inspectionFeeInr: Number(r.inspection_fee_inr),
      totalChargesInr: r.total_charges_inr ? Number(r.total_charges_inr) : undefined,
      cancellationReason: r.cancellation_reason,
      cancelledBy: r.cancelled_by,
      requestedAt: r.requested_at,
      acceptedAt: r.accepted_at,
      customerNotifiedAt: r.customer_notified_at,
      arrivedAt: r.arrived_at,
      workStartedAt: r.work_started_at,
      completedAt: r.completed_at,
      cancelledAt: r.cancelled_at,
    };
  }

  /**
   * Get available open service requests for an electrician.
   * Matches electrician radius, online status, and specialization.
   */
  async getAvailableRequestsForElectrician(electricianId: string): Promise<ServiceRequestEntity[]> {
    const elec = await this.getProfileById(electricianId);
    if (!elec || !elec.isOnline || elec.verificationStatus !== 'APPROVED') {
      return [];
    }

    const res = await db.query(
      `SELECT * FROM electrician_service_requests
       WHERE status = 'REQUESTED'
         AND (assigned_electrician_id IS NULL OR assigned_electrician_id = $1)
       ORDER BY requested_at DESC`,
      [electricianId]
    );

    const available: ServiceRequestEntity[] = [];
    for (const row of res.rows) {
      const distance = calculateHaversineDistanceKm(
        elec.latitude,
        elec.longitude,
        Number(row.latitude),
        Number(row.longitude)
      );

      // Check radius and category match
      const hasSpecialization = !elec.specializations?.length || elec.specializations.includes(row.category);
      if (distance <= elec.serviceRadiusKm && hasSpecialization) {
        available.push(await this.getServiceRequestById(row.id) as ServiceRequestEntity);
      }
    }

    return available;
  }

  /**
   * STRICT ATOMIC ACCEPTANCE:
   * Only one electrician can accept a given request.
   * Uses conditional database update to strictly prevent race conditions.
   */
  async acceptRequestAtomic(requestId: string, electricianId: string): Promise<ServiceRequestEntity> {
    const elec = await this.getProfileById(electricianId);
    if (!elec) {
      throw new Error(`Electrician '${electricianId}' not found.`);
    }

    if (elec.verificationStatus !== 'APPROVED') {
      throw new Error('Only approved electricians can accept requests.');
    }

    if (!elec.isOnline) {
      throw new Error('You must be online to accept service requests.');
    }

    // Atomic conditional SQL update
    const updateRes = await db.query(
      `UPDATE electrician_service_requests
       SET status = 'ACCEPTED',
           assigned_electrician_id = $1,
           accepted_at = NOW(),
           customer_notified_at = NOW(),
           updated_at = NOW()
       WHERE id = $2
         AND status = 'REQUESTED'
         AND (assigned_electrician_id IS NULL OR assigned_electrician_id = $1)
       RETURNING *`,
      [electricianId, requestId]
    );

    if (updateRes.rows.length === 0) {
      const existing = await this.getServiceRequestById(requestId);
      if (!existing) {
        throw new Error('Service request not found.');
      }
      throw new Error(
        `JOB_ALREADY_ASSIGNED: Service request #${existing.requestNumber} is no longer available.`
      );
    }

    // Mark electrician as busy
    await db.query('UPDATE electrician_profiles SET is_busy = TRUE WHERE id = $1', [electricianId]);

    // Send instant transactional notification to the customer
    const req = await this.getServiceRequestById(requestId);
    if (req) {
      await this.notificationService.publishEvent({
        eventType: 'ELECTRICIAN_REQUEST_ACCEPTED',
        userId: req.customerId,
        role: 'CUSTOMER',
        title: 'Electrician Assigned',
        message: `${elec.fullName} has accepted your service request and is on the way.`,
        entityType: 'ELECTRICIAN_REQUEST',
        entityId: req.requestNumber,
        metadata: {
          electricianName: elec.fullName,
          electricianPhone: elec.phone,
          requestId: req.id,
          requestNumber: req.requestNumber,
        },
      });
    }

    return req!;
  }

  /**
   * Update Request Status progression:
   * ACCEPTED -> ON_THE_WAY -> ARRIVED -> WORK_STARTED -> COMPLETED
   */
  async updateRequestStatus(
    requestId: string,
    electricianId: string,
    status: ServiceRequestStatus,
    totalCharges?: number
  ): Promise<ServiceRequestEntity> {
    const req = await this.getServiceRequestById(requestId);
    if (!req) throw new Error('Service request not found.');

    if (req.assignedElectricianId !== electricianId) {
      throw new Error('You are not authorized to update this service request.');
    }

    const validTransitions: Record<string, ServiceRequestStatus[]> = {
      ACCEPTED: ['ON_THE_WAY', 'CANCELLED'],
      ON_THE_WAY: ['ARRIVED', 'CANCELLED'],
      ARRIVED: ['WORK_STARTED', 'CANCELLED'],
      WORK_STARTED: ['COMPLETED'],
      COMPLETED: [],
      CANCELLED: [],
    };

    const allowed = validTransitions[req.status] || [];
    if (!allowed.includes(status)) {
      throw new Error(
        `Invalid status transition from '${req.status}' to '${status}'. Backward or invalid transitions are prohibited.`
      );
    }

    let timestampColumn = '';
    if (status === 'ON_THE_WAY') timestampColumn = ', updated_at = NOW()';
    else if (status === 'ARRIVED') timestampColumn = ', arrived_at = NOW(), updated_at = NOW()';
    else if (status === 'WORK_STARTED') timestampColumn = ', work_started_at = NOW(), updated_at = NOW()';
    else if (status === 'COMPLETED') timestampColumn = ', completed_at = NOW(), updated_at = NOW()';

    await db.withTransaction(async (tx) => {
      const fee = totalCharges ?? req.inspectionFeeInr;
      await tx.query(
        `UPDATE electrician_service_requests
         SET status = $1, total_charges_inr = COALESCE($2, total_charges_inr) ${timestampColumn}
         WHERE id = $3`,
        [status, fee, requestId]
      );

      if (status === 'COMPLETED') {
        // Free up electrician
        await tx.query(
          `UPDATE electrician_profiles
           SET is_busy = FALSE, completed_jobs_count = completed_jobs_count + 1
           WHERE id = $1`,
          [electricianId]
        );
      }
    });

    const updated = (await this.getServiceRequestById(requestId))!;

    // Publish event
    const eventMap: Partial<Record<ServiceRequestStatus, any>> = {
      ON_THE_WAY: 'ELECTRICIAN_ON_THE_WAY',
      ARRIVED: 'ELECTRICIAN_ARRIVED',
      WORK_STARTED: 'ELECTRICIAN_WORK_STARTED',
      COMPLETED: 'ELECTRICIAN_REQUEST_COMPLETED',
    };

    if (eventMap[status]) {
      await this.notificationService.publishEvent({
        eventType: eventMap[status],
        userId: updated.customerId,
        role: 'CUSTOMER',
        title: `Service Request ${status.replace('_', ' ')}`,
        message: `Your electrician service request #${updated.requestNumber} status is now ${status.replace('_', ' ')}.`,
        entityType: 'ELECTRICIAN_REQUEST',
        entityId: updated.requestNumber,
      });
    }

    return updated;
  }

  /**
   * Cancel service request. Allowed before WORK_STARTED.
   */
  async cancelRequest(
    requestId: string,
    actorId: string,
    actorRole: string,
    reason: string
  ): Promise<ServiceRequestEntity> {
    const req = await this.getServiceRequestById(requestId);
    if (!req) throw new Error('Service request not found.');

    if (['WORK_STARTED', 'COMPLETED', 'CANCELLED'].includes(req.status)) {
      throw new Error(`Cannot cancel a service request in status '${req.status}'.`);
    }

    await db.withTransaction(async (tx) => {
      await tx.query(
        `UPDATE electrician_service_requests
         SET status = 'CANCELLED', cancellation_reason = $1, cancelled_by = $2, cancelled_at = NOW(), updated_at = NOW()
         WHERE id = $3`,
        [reason, actorRole, requestId]
      );

      if (req.assignedElectricianId) {
        await tx.query('UPDATE electrician_profiles SET is_busy = FALSE WHERE id = $1', [
          req.assignedElectricianId,
        ]);
      }
    });

    return (await this.getServiceRequestById(requestId))!;
  }

  /**
   * Submit Customer Rating & Review.
   * Strictly server-authoritative, prevents duplicate reviews, recalculates average.
   */
  async submitRating(
    serviceRequestId: string,
    customerId: string,
    input: SubmitRatingInput
  ): Promise<{ ratingAvg: number; ratingCount: number }> {
    const req = await this.getServiceRequestById(serviceRequestId);
    if (!req) throw new Error('Service request not found.');

    if (req.status !== 'COMPLETED') {
      throw new Error('Rating can only be submitted for completed service requests.');
    }

    if (req.customerId !== customerId) {
      throw new Error('Only the customer who requested the service can submit a rating.');
    }

    if (!req.assignedElectricianId) {
      throw new Error('No electrician assigned to this request.');
    }

    const ratingVal = Math.round(input.rating);
    if (ratingVal < 1 || ratingVal > 5) {
      throw new Error('Rating must be an integer between 1 and 5.');
    }

    // Check duplicate
    const existing = await db.query(
      'SELECT id FROM electrician_ratings WHERE service_request_id = $1',
      [serviceRequestId]
    );

    if (existing.rows.length > 0) {
      throw new Error('A rating has already been submitted for this service request.');
    }

    const ratingId = `rate-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    return await db.withTransaction(async (tx) => {
      await tx.query(
        `INSERT INTO electrician_ratings (id, service_request_id, customer_id, electrician_id, rating, review, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [ratingId, serviceRequestId, customerId, req.assignedElectricianId, ratingVal, input.review || null]
      );

      // Recalculate average server-side
      const agg = await tx.query(
        `SELECT COUNT(*) as count, AVG(rating) as avg
         FROM electrician_ratings
         WHERE electrician_id = $1`,
        [req.assignedElectricianId]
      );

      const count = parseInt(agg.rows[0].count, 10);
      const avg = Math.round(parseFloat(agg.rows[0].avg) * 10) / 10;

      await tx.query(
        'UPDATE electrician_profiles SET rating_avg = $1, rating_count = $2 WHERE id = $3',
        [avg, count, req.assignedElectricianId]
      );

      return { ratingAvg: avg, ratingCount: count };
    });
  }

  /**
   * Super Admin: List all registered electricians with status filter.
   */
  async adminListElectricians(status?: ElectricianVerificationStatus): Promise<ElectricianProfileEntity[]> {
    let sql = 'SELECT * FROM electrician_profiles';
    const params: any[] = [];
    if (status) {
      sql += ' WHERE verification_status = $1';
      params.push(status);
    }
    sql += ' ORDER BY created_at DESC';

    const res = await db.query(sql, params);
    const profiles: ElectricianProfileEntity[] = [];

    for (const row of res.rows) {
      const p = await this.getProfileById(row.id);
      if (p) profiles.push(p);
    }

    return profiles;
  }

  /**
   * Super Admin: Verify / Approve / Reject / Suspend Electrician.
   */
  async adminVerifyElectrician(
    electricianId: string,
    status: ElectricianVerificationStatus,
    rejectionReason?: string
  ): Promise<ElectricianProfileEntity> {
    const existing = await this.getProfileById(electricianId);
    if (!existing) throw new Error('Electrician not found.');

    if (status === 'REJECTED' && !rejectionReason?.trim()) {
      throw new Error('A rejection reason is required when rejecting an electrician.');
    }

    const isOnline = status === 'APPROVED' ? existing.isOnline : false;

    await db.query(
      `UPDATE electrician_profiles
       SET verification_status = $1, rejection_reason = $2, is_online = $3, updated_at = NOW()
       WHERE id = $4`,
      [status, rejectionReason || null, isOnline, electricianId]
    );

    return (await this.getProfileById(electricianId))!;
  }

  /**
   * Super Admin: Get Marketplace Metrics.
   */
  async adminGetMetrics(): Promise<{
    totalElectricians: number;
    approvedCount: number;
    pendingCount: number;
    onlineCount: number;
    totalRequests: number;
    completedRequests: number;
    cancelledRequests: number;
    averagePlatformRating: number;
  }> {
    const elecRes = await db.query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN verification_status = 'APPROVED' THEN 1 END) as approved,
        COUNT(CASE WHEN verification_status = 'PENDING_VERIFICATION' THEN 1 END) as pending,
        COUNT(CASE WHEN is_online = TRUE THEN 1 END) as online
      FROM electrician_profiles
    `);

    const reqRes = await db.query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) as cancelled
      FROM electrician_service_requests
    `);

    const rateRes = await db.query('SELECT AVG(rating) as avg FROM electrician_ratings');

    const e = elecRes.rows[0];
    const r = reqRes.rows[0];
    const avg = rateRes.rows[0].avg ? Math.round(parseFloat(rateRes.rows[0].avg) * 10) / 10 : 0.0;

    return {
      totalElectricians: parseInt(e.total, 10),
      approvedCount: parseInt(e.approved, 10),
      pendingCount: parseInt(e.pending, 10),
      onlineCount: parseInt(e.online, 10),
      totalRequests: parseInt(r.total, 10),
      completedRequests: parseInt(r.completed, 10),
      cancelledRequests: parseInt(r.cancelled, 10),
      averagePlatformRating: avg,
    };
  }

  /**
   * Get requests for a specific customer or electrician.
   */
  async getMyRequests(userId: string, role: string): Promise<ServiceRequestEntity[]> {
    if (role === 'CUSTOMER') {
      const res = await db.query(
        `SELECT id FROM electrician_service_requests WHERE customer_id = $1 ORDER BY created_at DESC`,
        [userId]
      );
      const items: ServiceRequestEntity[] = [];
      for (const row of res.rows) {
        const item = await this.getServiceRequestById(row.id);
        if (item) items.push(item);
      }
      return items;
    } else if (role === 'ELECTRICIAN') {
      const profile = await this.getProfileByUserId(userId);
      if (!profile) return [];
      const res = await db.query(
        `SELECT id FROM electrician_service_requests WHERE assigned_electrician_id = $1 ORDER BY created_at DESC`,
        [profile.id]
      );
      const items: ServiceRequestEntity[] = [];
      for (const row of res.rows) {
        const item = await this.getServiceRequestById(row.id);
        if (item) items.push(item);
      }
      return items;
    }
    return [];
  }

  /**
   * Ingest electrician live GPS telemetry.
   * Privacy rule: Only allowed if electrician is APPROVED and either ONLINE or assigned to an active job.
   */
  async recordLocation(
    electricianId: string,
    params: {
      latitude: number;
      longitude: number;
      accuracy?: number;
      heading?: number;
      speed?: number;
      jobId?: string;
    }
  ) {
    const profile = await this.getProfileById(electricianId);
    if (!profile) throw new Error('Electrician profile not found.');
    if (profile.verificationStatus !== 'APPROVED') {
      throw new Error('Electrician must be approved to transmit location telemetry.');
    }

    let activeJob: ServiceRequestEntity | null = null;
    if (params.jobId) {
      activeJob = await this.getServiceRequestById(params.jobId);
    }

    // Privacy Guard: If offline and not on an active job (ON_THE_WAY, ARRIVED, WORK_STARTED), block tracking
    const hasActiveJob =
      activeJob && ['ACCEPTED', 'ON_THE_WAY', 'ARRIVED', 'WORK_STARTED'].includes(activeJob.status);
    if (!profile.isOnline && !hasActiveJob) {
      throw new Error(
        'Privacy Guard: Location telemetry is disabled while offline and without an active assigned job.'
      );
    }

    const id = `elu-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();

    await db.query(
      `INSERT INTO electrician_location_updates (
        id, electrician_id, job_id, latitude, longitude, accuracy, heading, speed, recorded_at, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
      [
        id,
        electricianId,
        params.jobId || null,
        params.latitude,
        params.longitude,
        params.accuracy || 10.0,
        params.heading || 0.0,
        params.speed || 0.0,
      ]
    );

    // Update profile coordinates
    await db.query(
      `UPDATE electrician_profiles SET latitude = $1, longitude = $2, updated_at = NOW() WHERE id = $3`,
      [params.latitude, params.longitude, electricianId]
    );

    const telemetry = {
      id,
      electricianId,
      jobId: params.jobId,
      latitude: params.latitude,
      longitude: params.longitude,
      accuracy: params.accuracy,
      heading: params.heading,
      speed: params.speed,
      recordedAt: now,
    };

    // Broadcast event
    if (params.jobId) {
      eventHub.publish(`electrician:${params.jobId}`, {
        eventType: 'ELECTRICIAN_LOCATION_UPDATED',
        entityType: 'ELECTRICIAN',
        entityId: params.jobId,
        payload: telemetry,
      });
    }

    return telemetry;
  }

  /**
   * Get live technician tracking payload for customer view.
   */
  async getJobTracking(requestId: string, customerId?: string) {
    const req = await this.getServiceRequestById(requestId);
    if (!req) throw new Error('Service request not found.');

    if (customerId && req.customerId !== customerId) {
      throw new Error('Forbidden: You can only track your own service request.');
    }

    if (!req.assignedElectricianId) {
      return {
        requestId: req.id,
        status: req.status,
        assigned: false,
        message: 'Looking for nearby verified technicians...',
      };
    }

    const elec = await this.getProfileById(req.assignedElectricianId);
    if (!elec) throw new Error('Assigned electrician profile not found.');

    // Get latest telemetry
    const locRes = await db.query(
      `SELECT * FROM electrician_location_updates 
       WHERE (job_id = $1 OR electrician_id = $2) 
       ORDER BY recorded_at DESC LIMIT 1`,
      [req.id, elec.id]
    );

    const latestLoc = locRes.rows[0];
    const curLat = latestLoc ? Number(latestLoc.latitude) : elec.latitude;
    const curLon = latestLoc ? Number(latestLoc.longitude) : elec.longitude;

    const distanceKm =
      Math.round(calculateHaversineDistanceKm(curLat, curLon, req.latitude, req.longitude) * 10) / 10;
    const etaMinutes = Math.max(3, Math.round((distanceKm / 20) * 60) + 4);
    const isStale = latestLoc ? Date.now() - new Date(latestLoc.recorded_at).getTime() > 60000 : false;

    return {
      requestId: req.id,
      requestNumber: req.requestNumber,
      status: req.status,
      category: req.category,
      customer: {
        name: req.customerName,
        phone: req.customerPhone,
        address: req.address,
        city: req.city,
        latitude: req.latitude,
        longitude: req.longitude,
      },
      electrician: {
        id: elec.id,
        fullName: elec.fullName,
        phone: elec.phone,
        ratingAvg: elec.ratingAvg,
        ratingCount: elec.ratingCount,
        experienceYears: elec.experienceYears,
        profilePhotoUrl: elec.profilePhotoUrl,
      },
      telemetry: {
        latitude: curLat,
        longitude: curLon,
        distanceRemainingKm: distanceKm,
        etaMinutes,
        recordedAt: latestLoc?.recorded_at || elec.updatedAt,
        isStale,
      },
      acceptedAt: req.acceptedAt,
      arrivedAt: req.arrivedAt,
      workStartedAt: req.workStartedAt,
      completedAt: req.completedAt,
    };
  }
}
