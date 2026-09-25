/**
 * Delivery Provider Abstraction Interface
 */

import {
  CreateDeliveryRequest,
  DeliveryBookingResult,
  DeliveryStatusResult,
  CancelDeliveryResult,
} from './delivery.types.js';

export interface DeliveryProvider {
  readonly name: string;

  /**
   * Check if the provider has all required production API credentials configured.
   */
  isConfigured(): boolean;

  /**
   * Dispatch delivery request to the logistics partner.
   */
  createDelivery(request: CreateDeliveryRequest): Promise<DeliveryBookingResult>;

  /**
   * Query the latest real-time status of a delivery.
   */
  getDeliveryStatus(providerBookingId: string): Promise<DeliveryStatusResult>;

  /**
   * Cancel an ongoing or scheduled delivery booking.
   */
  cancelDelivery(providerBookingId: string, reason?: string): Promise<CancelDeliveryResult>;

  /**
   * Fetch full delivery details and rider information.
   */
  getDeliveryDetails(providerBookingId: string): Promise<DeliveryStatusResult>;
}
