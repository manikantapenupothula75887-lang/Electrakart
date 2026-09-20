export type LocationSource = 'GPS' | 'MANUAL' | 'SAVED_ADDRESS' | 'CHECKOUT_ADDRESS';
export type AddressType = 'HOME' | 'OFFICE' | 'OTHER';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy_m?: number;
}

export interface CustomerAddress {
  id: string;
  user_id: string;
  recipient_name: string;
  phone_number: string;
  address_line1: string;
  address_line2?: string | null;
  landmark?: string | null;
  city: string;
  state: string;
  pincode: string;
  country: string;
  address_type: AddressType;
  is_default: boolean;
  source: LocationSource;
  latitude?: number | null;
  longitude?: number | null;
  normalized_address?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateAddressInput {
  recipient_name: string;
  phone_number: string;
  address_line1: string;
  address_line2?: string;
  landmark?: string;
  city: string;
  state?: string;
  pincode: string;
  country?: string;
  address_type?: AddressType;
  is_default?: boolean;
  source?: LocationSource;
  latitude?: number;
  longitude?: number;
}

export interface UpdateAddressInput {
  recipient_name?: string;
  phone_number?: string;
  address_line1?: string;
  address_line2?: string;
  landmark?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  address_type?: AddressType;
  is_default?: boolean;
  source?: LocationSource;
  latitude?: number;
  longitude?: number;
}

export interface GeocodingResult {
  latitude: number;
  longitude: number;
  formatted_address: string;
  city: string;
  state: string;
  pincode: string;
  confidence: number;
  provider: string;
  is_fallback: boolean;
}

export interface DistanceResult {
  distance_km: number;
  duration_minutes: number;
  provider: string;
  mode: 'ROAD_NETWORK' | 'GEODESIC_FALLBACK';
  is_fallback: boolean;
  calculated_at: string;
}
