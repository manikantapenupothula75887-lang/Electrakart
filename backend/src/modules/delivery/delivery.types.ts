/**
 * ElectraKart Automated Delivery Integration Types
 */

export type DeliveryStatus =
  | 'PENDING'
  | 'BOOKING_REQUESTED'
  | 'BOOKED'
  | 'PICKUP_ASSIGNED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'FAILED';

export interface LocationPoint {
  name: string;
  phone: string;
  address: string;
  city: string;
  pincode: string;
  latitude: number;
  longitude: number;
}

export interface CreateDeliveryRequest {
  orderId: string;
  fulfillmentId: string;
  idempotencyKey: string;
  pickup: LocationPoint;
  drop: LocationPoint;
  packageDetails?: {
    weightKg?: number;
    description?: string;
    itemCount?: number;
    declaredValueInr?: number;
  };
}

export interface DeliveryBookingResult {
  success: boolean;
  provider: string;
  providerBookingId?: string;
  trackingUrl?: string;
  status: DeliveryStatus;
  estimatedFeeInr?: number;
  estimatedDeliveryTime?: string;
  riderName?: string;
  riderPhone?: string;
  riderVehicleNumber?: string;
  error?: string;
  errorCode?: string;
}

export interface DeliveryStatusResult {
  status: DeliveryStatus;
  providerBookingId: string;
  riderName?: string;
  riderPhone?: string;
  riderVehicleNumber?: string;
  trackingUrl?: string;
  rawPayload?: any;
}

export interface CancelDeliveryResult {
  success: boolean;
  message?: string;
  error?: string;
}

export interface DeliveryBookingEntity {
  id: string;
  orderId: string;
  fulfillmentId: string;
  idempotencyKey: string;
  provider: string;
  providerBookingId?: string;
  trackingUrl?: string;
  status: DeliveryStatus;
  pickupName: string;
  pickupPhone: string;
  pickupAddress: string;
  pickupCity: string;
  pickupPincode: string;
  pickupLatitude: number;
  pickupLongitude: number;
  dropName: string;
  dropPhone: string;
  dropAddress: string;
  dropCity: string;
  dropPincode: string;
  dropLatitude: number;
  dropLongitude: number;
  distanceKm: number;
  riderName?: string;
  riderPhone?: string;
  riderVehicleNumber?: string;
  estimatedDeliveryTime?: string;
  deliveryFeeInr: number;
  retryCount: number;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryStatusHistoryEntity {
  id: string;
  deliveryBookingId: string;
  status: DeliveryStatus;
  description?: string;
  rawPayload?: any;
  createdAt: string;
}

export interface DeliveryLocationUpdateEntity {
  id: string;
  deliveryBookingId: string;
  driverName?: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  distanceRemainingKm?: number;
  etaMinutes?: number;
  recordedAt: string;
  createdAt: string;
}

export interface DeliveryWebhookEntity {
  id: string;
  provider: string;
  providerEventId: string;
  eventType: string;
  payloadHash: string;
  payload: any;
  status: string;
  receivedAt: string;
  processedAt: string;
}

export interface DriverLocationInput {
  deliveryBookingId: string;
  driverName?: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  distanceRemainingKm?: number;
  etaMinutes?: number;
}

