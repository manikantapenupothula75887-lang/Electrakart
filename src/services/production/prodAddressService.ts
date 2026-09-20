/**
 * ElectraKart Production Address Service
 * Manages customer saved delivery profiles, GPS geocoding, and normalized addresses.
 */

import { apiClient } from '../../api/client';
import { handleFallbackOrThrow } from './fallbackPolicy';

export interface CustomerAddress {
  id: string;
  user_id?: string;
  address_type: 'HOME' | 'WORK' | 'PROJECT_SITE' | 'OTHER';
  recipient_name?: string;
  recipient_phone?: string;
  street_address: string;
  landmark?: string;
  area?: string;
  city: string;
  district?: string;
  state: string;
  pincode: string;
  country?: string;
  latitude: number | null;
  longitude: number | null;
  source?: 'MANUAL_ENTRY' | 'GPS_DEVICE' | 'MAP_PIN' | 'GEOCODED';
  normalized_address?: string;
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateAddressInput {
  address_type?: 'HOME' | 'WORK' | 'PROJECT_SITE' | 'OTHER';
  recipient_name?: string;
  recipient_phone?: string;
  street_address: string;
  landmark?: string;
  area?: string;
  city: string;
  district?: string;
  state: string;
  pincode: string;
  country?: string;
  latitude?: number | null;
  longitude?: number | null;
  source?: 'MANUAL_ENTRY' | 'GPS_DEVICE' | 'MAP_PIN' | 'GEOCODED';
  is_default?: boolean;
}

export interface LocationResolveInput {
  raw_query?: string;
  latitude?: number;
  longitude?: number;
  address_line?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface ResolvedLocation {
  latitude: number;
  longitude: number;
  normalized_address: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  confidence: number;
  provider: string;
}

export class ProductionAddressService {
  async getAddresses(): Promise<CustomerAddress[]> {
    try {
      return await apiClient.get<CustomerAddress[]>('/customers/me/addresses');
    } catch (err) {
      return handleFallbackOrThrow('ProductionAddressService', 'getAddresses', err, []);
    }
  }

  async getAddressById(id: string): Promise<CustomerAddress | undefined> {
    try {
      return await apiClient.get<CustomerAddress>(`/customers/me/addresses/${id}`);
    } catch (err) {
      return handleFallbackOrThrow('ProductionAddressService', 'getAddressById', err, undefined);
    }
  }

  async createAddress(input: CreateAddressInput): Promise<CustomerAddress> {
    try {
      return await apiClient.post<CustomerAddress>('/customers/me/addresses', input);
    } catch (err) {
      console.error('[ProductionAddressService] Failed to create address:', err);
      throw err;
    }
  }

  async updateAddress(id: string, input: Partial<CreateAddressInput>): Promise<CustomerAddress> {
    try {
      return await apiClient.patch<CustomerAddress>(`/customers/me/addresses/${id}`, input);
    } catch (err) {
      console.error('[ProductionAddressService] Failed to update address:', err);
      throw err;
    }
  }

  async deleteAddress(id: string): Promise<boolean> {
    try {
      await apiClient.delete(`/customers/me/addresses/${id}`);
      return true;
    } catch (err) {
      console.error('[ProductionAddressService] Failed to delete address:', err);
      throw err;
    }
  }

  async resolveLocation(input: LocationResolveInput): Promise<ResolvedLocation> {
    try {
      return await apiClient.post<ResolvedLocation>('/location/resolve', input);
    } catch (err) {
      console.error('[ProductionAddressService] Failed to resolve location:', err);
      throw err;
    }
  }
}

export const prodAddressService = new ProductionAddressService();
