export interface FulfillmentCartItem {
  sku_id?: string;
  sku_code: string;
  quantity: number;
  preferred_partner_id?: string;
}

export interface FulfillmentCandidate {
  partner_id: string;
  partner_type: 'RETAILER' | 'DISTRIBUTOR';
  business_name: string;
  distance_km: number;
  duration_minutes: number;
  service_radius_km: number;
  available_items: {
    sku_code: string;
    available_quantity: number;
    allocated_quantity: number;
  }[];
  can_fulfill_all: boolean;
  distance_mode: 'ROAD_NETWORK' | 'GEODESIC_FALLBACK';
  is_fallback: boolean;
}

export interface FulfillmentGroupItem {
  sku_code: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  item_name?: string;
}

export interface FulfillmentGroup {
  partner_id: string;
  partner_type: 'RETAILER' | 'DISTRIBUTOR';
  partner_name: string;
  distance_km: number;
  duration_minutes: number;
  distance_mode: 'ROAD_NETWORK' | 'GEODESIC_FALLBACK';
  items: FulfillmentGroupItem[];
  group_total: number;
  estimated_delivery_hours: number;
}

export interface UnfulfillableItem {
  sku_code: string;
  requested_quantity: number;
  available_quantity: number;
  reason: 'OUT_OF_STOCK' | 'OUT_OF_SERVICE_RADIUS' | 'INACTIVE_PARTNER' | 'UNKNOWN_SKU';
}

export interface FulfillmentPlan {
  is_fulfillable: boolean;
  fulfillment_type: 'SINGLE_PARTNER' | 'SPLIT_FULFILLMENT' | 'UNSERVICEABLE';
  delivery_location: {
    latitude: number;
    longitude: number;
    city: string;
    pincode: string;
    normalized_address?: string;
  };
  groups: FulfillmentGroup[];
  unfulfillable_items: UnfulfillableItem[];
  summary: {
    total_items: number;
    fulfilled_items: number;
    total_amount: number;
    group_count: number;
  };
  calculated_at: string;
}

export interface NearbyAvailabilityResponse {
  sku_code: string;
  is_available_nearby: boolean;
  min_distance_km: number | null;
  earliest_eta_hours: number | null;
}
