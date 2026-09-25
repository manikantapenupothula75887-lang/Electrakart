/**
 * Mock Delivery Provider
 * Deterministic carrier simulator for local development and integration test suites.
 */

import { DeliveryProvider } from './delivery.interface.js';
import {
  CreateDeliveryRequest,
  DeliveryBookingResult,
  DeliveryStatusResult,
  CancelDeliveryResult,
} from './delivery.types.js';

export class MockDeliveryProvider implements DeliveryProvider {
  readonly name = 'mock';

  isConfigured(): boolean {
    return true;
  }

  async createDelivery(request: CreateDeliveryRequest): Promise<DeliveryBookingResult> {
    const bookingId = `mock-rapido-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const trackingUrl = `https://track.electrakart.in/mock-rapido/${bookingId}`;

    return {
      success: true,
      provider: this.name,
      providerBookingId: bookingId,
      trackingUrl,
      status: 'BOOKED',
      estimatedFeeInr: 45.0,
      estimatedDeliveryTime: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
      riderName: 'Suresh Kumar (Rapido Captain)',
      riderPhone: '+919876543210',
      riderVehicleNumber: 'AP 16 AB 1234',
    };
  }

  async getDeliveryStatus(providerBookingId: string): Promise<DeliveryStatusResult> {
    return {
      status: 'IN_TRANSIT',
      providerBookingId,
      riderName: 'Suresh Kumar (Rapido Captain)',
      riderPhone: '+919876543210',
      riderVehicleNumber: 'AP 16 AB 1234',
      trackingUrl: `https://track.electrakart.in/mock-rapido/${providerBookingId}`,
      rawPayload: { simulated: true, bookingId: providerBookingId },
    };
  }

  async cancelDelivery(_providerBookingId: string, _reason?: string): Promise<CancelDeliveryResult> {
    return { success: true };
  }

  async getDeliveryDetails(providerBookingId: string): Promise<DeliveryStatusResult> {
    return this.getDeliveryStatus(providerBookingId);
  }
}
