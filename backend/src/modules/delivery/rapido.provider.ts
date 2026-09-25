/**
 * Rapido Delivery Provider Adapter
 * Authoritative production logistics integration for ElectraKart on-demand courier fulfillment.
 * Strictly adheres to credentials check: when unconfigured, reports RAPIDO_NOT_CONFIGURED
 * without faking bookings or scraping.
 */

import { DeliveryProvider } from './delivery.interface.js';
import {
  CreateDeliveryRequest,
  DeliveryBookingResult,
  DeliveryStatusResult,
  CancelDeliveryResult,
} from './delivery.types.js';
import { config } from '../../config/environment.js';

export class RapidoDeliveryProvider implements DeliveryProvider {
  readonly name = 'rapido';

  isConfigured(): boolean {
    return Boolean(config.rapidoApiKey && config.rapidoClientId);
  }

  /**
   * Request an on-demand courier booking via Rapido API.
   */
  async createDelivery(request: CreateDeliveryRequest): Promise<DeliveryBookingResult> {
    if (!this.isConfigured()) {
      console.warn(
        '[RapidoDeliveryProvider] Rapido API credentials (RAPIDO_API_KEY, RAPIDO_CLIENT_ID) are not configured. Cannot dispatch booking.'
      );
      return {
        success: false,
        provider: this.name,
        status: 'FAILED',
        error: 'Rapido API credentials not configured. Please set RAPIDO_API_KEY and RAPIDO_CLIENT_ID in environment variables.',
        errorCode: 'RAPIDO_NOT_CONFIGURED',
      };
    }

    try {
      // Rapido API Payload specification
      const payload = {
        client_order_id: request.idempotencyKey,
        pickup_location: {
          name: request.pickup.name,
          phone: request.pickup.phone,
          address: request.pickup.address,
          city: request.pickup.city,
          pincode: request.pickup.pincode,
          latitude: request.pickup.latitude,
          longitude: request.pickup.longitude,
        },
        drop_location: {
          name: request.drop.name,
          phone: request.drop.phone,
          address: request.drop.address,
          city: request.drop.city,
          pincode: request.drop.pincode,
          latitude: request.drop.latitude,
          longitude: request.drop.longitude,
        },
        package_info: {
          order_id: request.orderId,
          fulfillment_id: request.fulfillmentId,
          weight_kg: request.packageDetails?.weightKg || 1.5,
          description: request.packageDetails?.description || 'Electrical components delivery',
        },
      };

      const response = await fetch(`${config.rapidoBaseUrl}/v1/orders/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.rapidoApiKey}`,
          'X-Client-Id': config.rapidoClientId,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[RapidoDeliveryProvider] API call failed with status ${response.status}: ${errorText}`);
        return {
          success: false,
          provider: this.name,
          status: 'FAILED',
          error: `Rapido API error: ${response.statusText} - ${errorText}`,
          errorCode: `ERR_RAPIDO_${response.status}`,
        };
      }

      const data = await response.json() as any;
      return {
        success: true,
        provider: this.name,
        providerBookingId: data.booking_id || data.order_id,
        trackingUrl: data.tracking_url || `https://track.rapido.bike/${data.booking_id}`,
        status: 'BOOKED',
        estimatedFeeInr: data.fare ? Number(data.fare) : undefined,
        estimatedDeliveryTime: data.eta,
      };
    } catch (err: any) {
      console.error('[RapidoDeliveryProvider] Network or execution error:', err);
      return {
        success: false,
        provider: this.name,
        status: 'FAILED',
        error: err.message || 'Failed to dispatch Rapido booking request.',
        errorCode: 'ERR_RAPIDO_NETWORK',
      };
    }
  }

  /**
   * Query status of an active booking.
   */
  async getDeliveryStatus(providerBookingId: string): Promise<DeliveryStatusResult> {
    if (!this.isConfigured()) {
      return {
        status: 'FAILED',
        providerBookingId,
        rawPayload: { error: 'RAPIDO_NOT_CONFIGURED' },
      };
    }

    try {
      const response = await fetch(`${config.rapidoBaseUrl}/v1/orders/${providerBookingId}/status`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${config.rapidoApiKey}`,
          'X-Client-Id': config.rapidoClientId,
        },
      });

      if (!response.ok) {
        throw new Error(`Rapido API error ${response.status}: ${await response.text()}`);
      }

      const data = await response.json() as any;
      const statusMap: Record<string, any> = {
        ORDER_CREATED: 'BOOKED',
        RIDER_ASSIGNED: 'PICKUP_ASSIGNED',
        ARRIVED_AT_PICKUP: 'PICKED_UP',
        PICKED_UP: 'PICKED_UP',
        IN_TRANSIT: 'IN_TRANSIT',
        DELIVERED: 'DELIVERED',
        CANCELLED: 'CANCELLED',
        FAILED: 'FAILED',
      };

      return {
        status: statusMap[data.status] || 'IN_TRANSIT',
        providerBookingId,
        riderName: data.rider?.name,
        riderPhone: data.rider?.phone,
        riderVehicleNumber: data.rider?.vehicle_number,
        trackingUrl: data.tracking_url,
        rawPayload: data,
      };
    } catch (err: any) {
      return {
        status: 'FAILED',
        providerBookingId,
        rawPayload: { error: err.message },
      };
    }
  }

  async cancelDelivery(providerBookingId: string, reason?: string): Promise<CancelDeliveryResult> {
    if (!this.isConfigured()) {
      return { success: false, error: 'RAPIDO_NOT_CONFIGURED' };
    }

    try {
      const response = await fetch(`${config.rapidoBaseUrl}/v1/orders/${providerBookingId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.rapidoApiKey}`,
          'X-Client-Id': config.rapidoClientId,
        },
        body: JSON.stringify({ reason: reason || 'Customer requested order change' }),
      });

      if (!response.ok) {
        return { success: false, error: await response.text() };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  async getDeliveryDetails(providerBookingId: string): Promise<DeliveryStatusResult> {
    return this.getDeliveryStatus(providerBookingId);
  }
}
