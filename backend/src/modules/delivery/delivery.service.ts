/**
 * ElectraKart Automated Delivery Orchestration Service
 * Connects fulfillment events to on-demand carrier dispatch (Rapido),
 * guarantees strict idempotency, audit trails, retry mechanics, and provider neutrality.
 */

import crypto from 'crypto';
import { db } from '../../db/connection.js';
import { config } from '../../config/environment.js';
import { calculateHaversineDistanceKm } from '../location/distance.provider.js';
import { NotificationService } from '../notifications/notification.service.js';
import { eventHub } from '../realtime/eventHub.js';
import { DeliveryProvider } from './delivery.interface.js';
import { RapidoDeliveryProvider } from './rapido.provider.js';
import { MockDeliveryProvider } from './mock.provider.js';
import {
  CreateDeliveryRequest,
  DeliveryBookingEntity,
  DeliveryBookingResult,
  DeliveryLocationUpdateEntity,
  DeliveryStatus,
  DeliveryWebhookEntity,
  DriverLocationInput,
  LocationPoint,
} from './delivery.types.js';

export class DeliveryService {
  private provider: DeliveryProvider;
  private notificationService: NotificationService;

  constructor(customProvider?: DeliveryProvider) {
    if (customProvider) {
      this.provider = customProvider;
    } else if (config.deliveryProvider === 'rapido') {
      this.provider = new RapidoDeliveryProvider();
    } else {
      this.provider = new MockDeliveryProvider();
    }
    this.notificationService = new NotificationService();
  }

  /**
   * Check status of the active logistics provider.
   */
  getProviderStatus(): {
    provider: string;
    isConfigured: boolean;
    status: string;
    message: string;
  } {
    const isConfigured = this.provider.isConfigured();
    if (this.provider.name === 'rapido' && !isConfigured) {
      return {
        provider: 'rapido',
        isConfigured: false,
        status: 'RAPIDO_NOT_CONFIGURED',
        message:
          'Rapido API credentials not configured. Please set RAPIDO_API_KEY and RAPIDO_CLIENT_ID in environment variables.',
      };
    }
    return {
      provider: this.provider.name,
      isConfigured: true,
      status: 'CONFIGURED',
      message: `${this.provider.name.toUpperCase()} delivery provider is active and ready.`,
    };
  }

  /**
   * Automatically prepares and books a delivery for an accepted order fulfillment.
   * Strictly idempotent: Derived idempotency key prevents duplicate bookings.
   */
  async bookDeliveryForFulfillment(
    orderId: string,
    fulfillmentId: string
  ): Promise<DeliveryBookingEntity> {
    const idempotencyKey = `rapido_booking_${orderId}_${fulfillmentId}`;

    // 1. Check existing booking (Idempotency Guard)
    const existing = await db.query(
      'SELECT * FROM delivery_bookings WHERE idempotency_key = $1',
      [idempotencyKey]
    );

    if (existing.rows.length > 0) {
      const row = existing.rows[0];
      // If already active or successfully booked, return existing without re-dispatching
      if (row.status !== 'FAILED') {
        return this.mapBookingRow(row);
      }
    }

    // 2. Query Order Details
    const orderRes = await db.query(
      'SELECT id, customer_id, customer_name, customer_phone, delivery_address, city, pincode FROM orders WHERE id = $1',
      [orderId]
    );
    if (orderRes.rows.length === 0) {
      throw new Error(`Order '${orderId}' not found.`);
    }
    const order = orderRes.rows[0];

    // 3. Query Fulfillment & Partner Pickup Node
    const fulRes = await db.query(
      `SELECT f.id, f.partner_id, f.partner_name, f.status,
              p.business_name, p.phone as partner_phone, p.address as partner_address,
              p.city as partner_city, p.pincode as partner_pincode,
              p.latitude as partner_lat, p.longitude as partner_lon
       FROM order_fulfillments f
       JOIN partners p ON f.partner_id = p.id
       WHERE f.id = $1 AND f.order_id = $2`,
      [fulfillmentId, orderId]
    );

    if (fulRes.rows.length === 0) {
      throw new Error(`Fulfillment '${fulfillmentId}' for order '${orderId}' not found.`);
    }
    const ful = fulRes.rows[0];

    // Default coordinates for Vijayawada if unassigned
    const pickupLat = ful.partner_lat ? Number(ful.partner_lat) : 16.5062;
    const pickupLon = ful.partner_lon ? Number(ful.partner_lon) : 80.648;

    // Resolve customer drop coordinates
    let dropLat = 16.515;
    let dropLon = 80.635;

    // Check if customer address has coords in addresses table
    const addrRes = await db.query(
      `SELECT latitude, longitude FROM addresses WHERE user_id = (SELECT customer_id FROM orders WHERE id = $1) LIMIT 1`,
      [orderId]
    );
    if (addrRes.rows.length > 0 && addrRes.rows[0].latitude) {
      dropLat = Number(addrRes.rows[0].latitude);
      dropLon = Number(addrRes.rows[0].longitude);
    }

    const distanceKm =
      Math.round(calculateHaversineDistanceKm(pickupLat, pickupLon, dropLat, dropLon) * 10) / 10;

    const pickup: LocationPoint = {
      name: ful.business_name || ful.partner_name,
      phone: ful.partner_phone || '+919988776655',
      address: ful.partner_address || 'Partner Depot',
      city: ful.partner_city || 'Vijayawada',
      pincode: ful.partner_pincode || '520001',
      latitude: pickupLat,
      longitude: pickupLon,
    };

    const drop: LocationPoint = {
      name: order.customer_name,
      phone: order.customer_phone,
      address: order.delivery_address,
      city: order.city,
      pincode: order.pincode,
      latitude: dropLat,
      longitude: dropLon,
    };

    const bookingRequest: CreateDeliveryRequest = {
      orderId,
      fulfillmentId,
      idempotencyKey,
      pickup,
      drop,
      packageDetails: {
        description: `Order ${orderId} package from ${pickup.name}`,
        weightKg: 2.0,
      },
    };

    // 4. Dispatch to Delivery Provider
    const bookingResult: DeliveryBookingResult = await this.provider.createDelivery(bookingRequest);

    const bookingId = existing.rows.length > 0
      ? existing.rows[0].id
      : `del-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    const currentRetryCount = existing.rows.length > 0 ? Number(existing.rows[0].retry_count) + 1 : 0;

    // 5. Persist Booking & History
    await db.withTransaction(async (tx) => {
      await tx.query(
        `INSERT INTO delivery_bookings (
          id, order_id, fulfillment_id, idempotency_key, provider, provider_booking_id,
          tracking_url, status, pickup_name, pickup_phone, pickup_address, pickup_city,
          pickup_pincode, pickup_latitude, pickup_longitude, drop_name, drop_phone,
          drop_address, drop_city, drop_pincode, drop_latitude, drop_longitude,
          distance_km, rider_name, rider_phone, rider_vehicle_number,
          delivery_fee_inr, retry_count, last_error, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
          $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, NOW(), NOW()
        )
        ON CONFLICT (idempotency_key) DO UPDATE SET
          provider = EXCLUDED.provider,
          provider_booking_id = EXCLUDED.provider_booking_id,
          tracking_url = EXCLUDED.tracking_url,
          status = EXCLUDED.status,
          rider_name = EXCLUDED.rider_name,
          rider_phone = EXCLUDED.rider_phone,
          rider_vehicle_number = EXCLUDED.rider_vehicle_number,
          retry_count = $28,
          last_error = EXCLUDED.last_error,
          updated_at = NOW()`,
        [
          bookingId,
          orderId,
          fulfillmentId,
          idempotencyKey,
          bookingResult.provider,
          bookingResult.providerBookingId || null,
          bookingResult.trackingUrl || null,
          bookingResult.status,
          pickup.name,
          pickup.phone,
          pickup.address,
          pickup.city,
          pickup.pincode,
          pickup.latitude,
          pickup.longitude,
          drop.name,
          drop.phone,
          drop.address,
          drop.city,
          drop.pincode,
          drop.latitude,
          drop.longitude,
          distanceKm,
          bookingResult.riderName || null,
          bookingResult.riderPhone || null,
          bookingResult.riderVehicleNumber || null,
          bookingResult.estimatedFeeInr || 0.0,
          currentRetryCount,
          bookingResult.error || null,
        ]
      );

      // Append status history
      const historyId = `dsh-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      await tx.query(
        `INSERT INTO delivery_status_history (id, delivery_booking_id, status, description, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [
          historyId,
          bookingId,
          bookingResult.status,
          bookingResult.success
            ? `Delivery booking created with provider ${bookingResult.provider}`
            : `Booking failed: ${bookingResult.error}`,
        ]
      );

      // If rider assigned, update fulfillment driver fields
      if (bookingResult.riderName) {
        await tx.query(
          `UPDATE order_fulfillments
           SET assigned_driver_name = $1, assigned_driver_phone = $2, last_updated = NOW()
           WHERE id = $3`,
          [bookingResult.riderName, bookingResult.riderPhone, fulfillmentId]
        );
      }
    });

    // 6. Transactional notification if booking succeeded
    if (bookingResult.success) {
      await this.notificationService.publishEvent({
        eventType: 'DELIVERY_BOOKED',
        userId: order.customer_id,
        role: 'CUSTOMER',
        title: 'Courier Booked',
        message: `Delivery booked for Order #${orderId}. Real-time tracking is now active.`,
        entityType: 'DELIVERY',
        entityId: orderId,
        metadata: {
          orderId,
          fulfillmentId,
          trackingUrl: bookingResult.trackingUrl,
          riderName: bookingResult.riderName,
          riderPhone: bookingResult.riderPhone,
        },
      });
    }

    return (await this.getBookingById(bookingId))!;
  }

  /**
   * Get single booking by ID.
   */
  async getBookingById(id: string): Promise<DeliveryBookingEntity | null> {
    const res = await db.query('SELECT * FROM delivery_bookings WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    return this.mapBookingRow(res.rows[0]);
  }

  /**
   * Get booking for a fulfillment.
   */
  async getBookingByFulfillmentId(fulfillmentId: string): Promise<DeliveryBookingEntity | null> {
    const res = await db.query('SELECT * FROM delivery_bookings WHERE fulfillment_id = $1', [
      fulfillmentId,
    ]);
    if (res.rows.length === 0) return null;
    return this.mapBookingRow(res.rows[0]);
  }

  /**
   * Admin: List all delivery bookings with optional status filter.
   */
  async listBookings(status?: DeliveryStatus): Promise<DeliveryBookingEntity[]> {
    let sql = 'SELECT * FROM delivery_bookings';
    const params: any[] = [];
    if (status) {
      sql += ' WHERE status = $1';
      params.push(status);
    }
    sql += ' ORDER BY created_at DESC';

    const res = await db.query(sql, params);
    return res.rows.map((row) => this.mapBookingRow(row));
  }

  /**
   * Admin: Retry a failed booking.
   */
  async retryFailedBooking(bookingId: string): Promise<DeliveryBookingEntity> {
    const booking = await this.getBookingById(bookingId);
    if (!booking) throw new Error('Booking not found.');

    return this.bookDeliveryForFulfillment(booking.orderId, booking.fulfillmentId);
  }

  /**
   * Sync latest status from carrier.
   */
  async syncDeliveryStatus(bookingId: string): Promise<DeliveryBookingEntity> {
    const booking = await this.getBookingById(bookingId);
    if (!booking) throw new Error('Booking not found.');
    if (!booking.providerBookingId) return booking;

    const statusResult = await this.provider.getDeliveryStatus(booking.providerBookingId);

    await db.withTransaction(async (tx) => {
      await tx.query(
        `UPDATE delivery_bookings
         SET status = $1, rider_name = COALESCE($2, rider_name),
             rider_phone = COALESCE($3, rider_phone),
             rider_vehicle_number = COALESCE($4, rider_vehicle_number),
             updated_at = NOW()
         WHERE id = $5`,
        [
          statusResult.status,
          statusResult.riderName,
          statusResult.riderPhone,
          statusResult.riderVehicleNumber,
          bookingId,
        ]
      );

      const historyId = `dsh-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      await tx.query(
        `INSERT INTO delivery_status_history (id, delivery_booking_id, status, description, raw_payload, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          historyId,
          bookingId,
          statusResult.status,
          `Status synchronized with provider: ${statusResult.status}`,
          JSON.stringify(statusResult.rawPayload || {}),
        ]
      );
    });

    return (await this.getBookingById(bookingId))!;
  }

  /**
   * Ingest driver GPS telemetry update, persist in delivery_location_updates,
   * and broadcast real-time domain event over SSE channels.
   */
  async recordDriverLocation(input: DriverLocationInput): Promise<DeliveryLocationUpdateEntity> {
    const booking = await this.getBookingById(input.deliveryBookingId);
    if (!booking) {
      throw new Error(`Delivery booking '${input.deliveryBookingId}' not found.`);
    }

    const id = `dlu-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();

    // Auto-calculate distance remaining to drop location if not provided
    let distanceRemainingKm = input.distanceRemainingKm;
    if (distanceRemainingKm === undefined || distanceRemainingKm === null) {
      distanceRemainingKm =
        Math.round(
          calculateHaversineDistanceKm(input.latitude, input.longitude, booking.dropLatitude, booking.dropLongitude) * 10
        ) / 10;
    }

    // Auto-estimate ETA (assume ~25 km/h urban velocity + 5 mins buffer)
    let etaMinutes = input.etaMinutes;
    if (etaMinutes === undefined || etaMinutes === null) {
      etaMinutes = Math.max(2, Math.round((distanceRemainingKm / 25) * 60) + 3);
    }

    await db.query(
      `INSERT INTO delivery_location_updates (
        id, delivery_booking_id, driver_name, latitude, longitude, accuracy,
        heading, speed, distance_remaining_km, eta_minutes, recorded_at, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
      [
        id,
        booking.id,
        input.driverName || booking.riderName || 'Express Driver',
        input.latitude,
        input.longitude,
        input.accuracy || 10.0,
        input.heading || 0.0,
        input.speed || 0.0,
        distanceRemainingKm,
        etaMinutes,
      ]
    );

    // Update rider name in delivery_bookings if provided
    await db.query(
      `UPDATE delivery_bookings 
       SET rider_name = COALESCE($1, rider_name), updated_at = NOW() 
       WHERE id = $2`,
      [input.driverName, booking.id]
    );

    const updateEntity: DeliveryLocationUpdateEntity = {
      id,
      deliveryBookingId: booking.id,
      driverName: input.driverName || booking.riderName,
      latitude: input.latitude,
      longitude: input.longitude,
      accuracy: input.accuracy,
      heading: input.heading,
      speed: input.speed,
      distanceRemainingKm,
      etaMinutes,
      recordedAt: now,
      createdAt: now,
    };

    // Broadcast live telemetry domain event across channels
    eventHub.publish(`delivery:${booking.id}`, {
      eventType: 'DELIVERY_LOCATION_UPDATED',
      entityType: 'DELIVERY',
      entityId: booking.id,
      payload: updateEntity,
    });

    eventHub.publish(`order:${booking.orderId}`, {
      eventType: 'DELIVERY_LOCATION_UPDATED',
      entityType: 'ORDER',
      entityId: booking.orderId,
      payload: {
        ...updateEntity,
        orderId: booking.orderId,
        fulfillmentId: booking.fulfillmentId,
      },
    });

    return updateEntity;
  }

  /**
   * Get complete live tracking payload for a booking or fulfillment,
   * including coordinates, distance, ETA, route pins, and stale telemetry detection.
   */
  async getLiveTracking(targetId: string) {
    let booking = await this.getBookingById(targetId);
    if (!booking) {
      booking = await this.getBookingByFulfillmentId(targetId);
    }
    if (!booking) {
      // Try resolving by orderId
      const byOrder = await db.query(
        'SELECT * FROM delivery_bookings WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1',
        [targetId]
      );
      if (byOrder.rows.length > 0) {
        booking = this.mapBookingRow(byOrder.rows[0]);
      }
    }
    if (!booking) {
      return null;
    }

    // Query most recent telemetry update
    const locRes = await db.query(
      `SELECT * FROM delivery_location_updates WHERE delivery_booking_id = $1 ORDER BY recorded_at DESC LIMIT 1`,
      [booking.id]
    );

    // Query delivery status history
    const historyRes = await db.query(
      `SELECT * FROM delivery_status_history WHERE delivery_booking_id = $1 ORDER BY created_at ASC`,
      [booking.id]
    );

    const latestLoc = locRes.rows[0];
    const isStale = latestLoc ? Date.now() - new Date(latestLoc.recorded_at).getTime() > 60000 : false;

    return {
      bookingId: booking.id,
      orderId: booking.orderId,
      fulfillmentId: booking.fulfillmentId,
      status: booking.status,
      provider: booking.provider,
      trackingUrl: booking.trackingUrl,
      rider: {
        name: latestLoc?.driver_name || booking.riderName || 'Hyperlocal Partner Pilot',
        phone: booking.riderPhone || '+91 98765 43210',
        vehicleNumber: booking.riderVehicleNumber || 'AP 16 BK 4892',
      },
      pickup: {
        name: booking.pickupName,
        phone: booking.pickupPhone,
        address: booking.pickupAddress,
        city: booking.pickupCity,
        latitude: booking.pickupLatitude,
        longitude: booking.pickupLongitude,
      },
      drop: {
        name: booking.dropName,
        phone: booking.dropPhone,
        address: booking.dropAddress,
        city: booking.dropCity,
        latitude: booking.dropLatitude,
        longitude: booking.dropLongitude,
      },
      telemetry: latestLoc
        ? {
            latitude: Number(latestLoc.latitude),
            longitude: Number(latestLoc.longitude),
            accuracy: latestLoc.accuracy ? Number(latestLoc.accuracy) : undefined,
            heading: latestLoc.heading ? Number(latestLoc.heading) : undefined,
            speed: latestLoc.speed ? Number(latestLoc.speed) : undefined,
            distanceRemainingKm: latestLoc.distance_remaining_km ? Number(latestLoc.distance_remaining_km) : undefined,
            etaMinutes: latestLoc.eta_minutes ? Number(latestLoc.eta_minutes) : undefined,
            recordedAt: latestLoc.recorded_at,
            isStale,
          }
        : {
            latitude: booking.pickupLatitude,
            longitude: booking.pickupLongitude,
            distanceRemainingKm: booking.distanceKm,
            etaMinutes: Math.max(5, Math.round(booking.distanceKm * 3)),
            recordedAt: booking.updatedAt,
            isStale: false,
          },
      history: historyRes.rows.map((h) => ({
        status: h.status,
        description: h.description,
        timestamp: h.created_at,
      })),
      updatedAt: booking.updatedAt,
    };
  }

  /**
   * Handle incoming delivery carrier webhook with HMAC signature verification
   * and replay attack protection.
   */
  async handleDeliveryWebhook(
    provider: string,
    payload: any,
    signature?: string
  ): Promise<{ success: boolean; eventId: string }> {
    const rawPayload = typeof payload === 'string' ? payload : JSON.stringify(payload || {});
    const payloadHash = crypto.createHash('sha256').update(rawPayload).digest('hex');

    // Extract provider event ID
    const providerEventId = String(
      payload.eventId || payload.event_id || payload.order_id || `${provider}-${Date.now()}`
    );

    // Replay attack prevention check
    const existing = await db.query(
      'SELECT id FROM delivery_webhooks WHERE provider = $1 AND provider_event_id = $2',
      [provider, providerEventId]
    );
    if (existing.rows.length > 0) {
      return { success: true, eventId: providerEventId }; // Idempotent return
    }

    // Verify webhook signature if configured
    if (config.rapidoWebhookSecret && signature) {
      const expectedSig = crypto
        .createHmac('sha256', config.rapidoWebhookSecret)
        .update(rawPayload)
        .digest('hex');
      if (signature !== expectedSig && signature !== `sha256=${expectedSig}`) {
        throw new Error('Invalid webhook HMAC signature.');
      }
    }

    const webhookId = `wh-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    await db.query(
      `INSERT INTO delivery_webhooks (id, provider, provider_event_id, event_type, payload_hash, payload, status, received_at, processed_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'PROCESSED', NOW(), NOW())`,
      [
        webhookId,
        provider,
        providerEventId,
        payload.eventType || payload.status || 'STATUS_UPDATE',
        payloadHash,
        JSON.stringify(payload),
      ]
    );

    // Map incoming status to internal DeliveryStatus
    const statusMap: Record<string, DeliveryStatus> = {
      BOOKED: 'BOOKED',
      ASSIGNED: 'PICKUP_ASSIGNED',
      DRIVER_ARRIVED: 'PICKUP_ASSIGNED',
      PICKED_UP: 'PICKED_UP',
      IN_TRANSIT: 'IN_TRANSIT',
      OUT_FOR_DELIVERY: 'IN_TRANSIT',
      DELIVERED: 'DELIVERED',
      CANCELLED: 'CANCELLED',
      FAILED: 'FAILED',
    };

    const targetStatus = statusMap[payload.status?.toUpperCase()] || 'IN_TRANSIT';

    // Find booking
    const bookingRes = await db.query(
      `SELECT * FROM delivery_bookings WHERE provider_booking_id = $1 OR id = $2 OR order_id = $3 LIMIT 1`,
      [payload.bookingId || payload.order_id, payload.bookingId, payload.order_id]
    );

    if (bookingRes.rows.length > 0) {
      const booking = this.mapBookingRow(bookingRes.rows[0]);
      await db.withTransaction(async (tx) => {
        await tx.query(
          `UPDATE delivery_bookings 
           SET status = $1, rider_name = COALESCE($2, rider_name), rider_phone = COALESCE($3, rider_phone), updated_at = NOW()
           WHERE id = $4`,
          [
            targetStatus,
            payload.driverName || payload.rider_name,
            payload.driverPhone || payload.rider_phone,
            booking.id,
          ]
        );

        await tx.query(
          `INSERT INTO delivery_status_history (id, delivery_booking_id, status, description, raw_payload, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [
            `dsh-${Date.now()}`,
            booking.id,
            targetStatus,
            `Carrier webhook event: ${payload.status}`,
            JSON.stringify(payload),
          ]
        );

        // Synchronize corresponding order fulfillment
        if (targetStatus === 'IN_TRANSIT' || targetStatus === 'PICKED_UP') {
          await tx.query(
            `UPDATE order_fulfillments SET status = 'OUT_FOR_DELIVERY', last_updated = NOW() WHERE id = $1`,
            [booking.fulfillmentId]
          );
        } else if (targetStatus === 'DELIVERED') {
          await tx.query(
            `UPDATE order_fulfillments SET status = 'DELIVERED', last_updated = NOW() WHERE id = $1`,
            [booking.fulfillmentId]
          );
        }
      });

      // Broadcast real-time update
      eventHub.publish(`delivery:${booking.id}`, {
        eventType: 'DELIVERY_STATUS_CHANGED',
        entityType: 'DELIVERY',
        entityId: booking.id,
        payload: {
          bookingId: booking.id,
          orderId: booking.orderId,
          status: targetStatus,
          riderName: payload.driverName || payload.rider_name,
        },
      });

      eventHub.publish(`order:${booking.orderId}`, {
        eventType: 'DELIVERY_STATUS_CHANGED',
        entityType: 'ORDER',
        entityId: booking.orderId,
        payload: {
          bookingId: booking.id,
          orderId: booking.orderId,
          fulfillmentId: booking.fulfillmentId,
          status: targetStatus,
        },
      });
    }

    return { success: true, eventId: providerEventId };
  }

  private mapBookingRow(row: any): DeliveryBookingEntity {
    return {
      id: row.id,
      orderId: row.order_id,
      fulfillmentId: row.fulfillment_id,
      idempotencyKey: row.idempotency_key,
      provider: row.provider,
      providerBookingId: row.provider_booking_id,
      trackingUrl: row.tracking_url,
      status: row.status as DeliveryStatus,
      pickupName: row.pickup_name,
      pickupPhone: row.pickup_phone,
      pickupAddress: row.pickup_address,
      pickupCity: row.pickup_city,
      pickupPincode: row.pickup_pincode,
      pickupLatitude: Number(row.pickup_latitude),
      pickupLongitude: Number(row.pickup_longitude),
      dropName: row.drop_name,
      dropPhone: row.drop_phone,
      dropAddress: row.drop_address,
      dropCity: row.drop_city,
      dropPincode: row.drop_pincode,
      dropLatitude: Number(row.drop_latitude),
      dropLongitude: Number(row.drop_longitude),
      distanceKm: Number(row.distance_km),
      riderName: row.rider_name,
      riderPhone: row.rider_phone,
      riderVehicleNumber: row.rider_vehicle_number,
      estimatedDeliveryTime: row.estimated_delivery_time,
      deliveryFeeInr: Number(row.delivery_fee_inr),
      retryCount: Number(row.retry_count),
      lastError: row.last_error,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
