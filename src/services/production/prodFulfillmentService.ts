/**
 * ElectraKart Production Hyperlocal Fulfillment Service
 * Provides server-authoritative fulfillment planning, split minimization,
 * and nearby partner discovery with ZERO wholesale financial leakage.
 */

import { apiClient } from '../../api/client';
import { handleFallbackOrThrow } from './fallbackPolicy';

export interface FulfillmentPlanItemInput {
  sku_code: string;
  quantity: number;
  preferred_partner_id?: string;
}

export interface FulfillmentLocationInput {
  addressId?: string;
  latitude?: number;
  longitude?: number;
  city?: string;
  pincode?: string;
}

export interface ComputePlanInput {
  items: FulfillmentPlanItemInput[];
  location: FulfillmentLocationInput;
  required_delivery_tier?: 'HYPERLOCAL_2HR' | 'SAME_DAY' | 'NEXT_DAY' | 'STANDARD';
}

export interface CustomerFulfillmentPackage {
  package_number: number;
  origin_type: 'PARTNER_STORE' | 'CENTRAL_WAREHOUSE';
  origin_name: string;
  distance_km: number;
  distance_source: 'ROAD_NETWORK' | 'GEODESIC_FALLBACK';
  estimated_delivery_slot: string;
  items: Array<{
    sku_code: string;
    product_name: string;
    quantity: number;
  }>;
}

export interface CustomerFulfillmentPlan {
  plan_id: string;
  is_fulfillable: boolean;
  total_packages: number;
  delivery_tier: 'HYPERLOCAL_2HR' | 'SAME_DAY' | 'NEXT_DAY' | 'STANDARD';
  estimated_delivery_text: string;
  delivery_fee_inr: number;
  packages: CustomerFulfillmentPackage[];
  unserviceable_items: Array<{
    sku_code: string;
    requested_quantity: number;
    reason: string;
  }>;
}

export interface NearbyPartnerStore {
  id: string;
  name: string;
  business_name?: string;
  city: string;
  distance_km: number;
  distance_source: 'ROAD_NETWORK' | 'GEODESIC_FALLBACK';
  is_verified: boolean;
  fulfillment_type: string;
}

export class ProductionFulfillmentService {
  async computeFulfillmentPlan(input: ComputePlanInput): Promise<CustomerFulfillmentPlan> {
    try {
      return await apiClient.post<CustomerFulfillmentPlan>('/fulfillment/plan', input);
    } catch (err) {
      console.error('[ProductionFulfillmentService] Failed to compute fulfillment plan:', err);
      throw err;
    }
  }

  async getNearbyPartners(params: {
    latitude?: number;
    longitude?: number;
    radius_km?: number;
    address_id?: string;
  }): Promise<NearbyPartnerStore[]> {
    try {
      const queryParts: string[] = [];
      if (params.latitude != null) queryParts.push(`latitude=${params.latitude}`);
      if (params.longitude != null) queryParts.push(`longitude=${params.longitude}`);
      if (params.radius_km != null) queryParts.push(`radius_km=${params.radius_km}`);
      if (params.address_id) queryParts.push(`address_id=${encodeURIComponent(params.address_id)}`);
      
      const query = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
      return await apiClient.get<NearbyPartnerStore[]>(`/fulfillment/nearby${query}`);
    } catch (err) {
      return handleFallbackOrThrow('ProductionFulfillmentService', 'getNearbyPartners', err, []);
    }
  }
}

export const prodFulfillmentService = new ProductionFulfillmentService();
