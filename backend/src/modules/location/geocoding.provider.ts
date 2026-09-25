import { config } from '../../config/environment.js';
import { LocationCoordinates, GeocodingResult } from './location.types.js';

export interface IGeocodingProvider {
  name: string;
  geocode(query: string): Promise<GeocodingResult>;
  reverseGeocode(coords: LocationCoordinates): Promise<GeocodingResult>;
}

// Known regional geographic centers for deterministic mock geocoding & fallback
interface KnownLocation {
  city: string;
  state: string;
  pincode: string;
  latitude: number;
  longitude: number;
  formatted_address: string;
}

const KNOWN_LOCATIONS: Record<string, KnownLocation> = {
  '520002': {
    city: 'Vijayawada',
    state: 'Andhra Pradesh',
    pincode: '520002',
    latitude: 16.5167,
    longitude: 80.6333,
    formatted_address: 'Governorpet, Vijayawada, Andhra Pradesh 520002',
  },
  '520003': {
    city: 'Vijayawada',
    state: 'Andhra Pradesh',
    pincode: '520003',
    latitude: 16.5200,
    longitude: 80.6400,
    formatted_address: 'Eluru Road, Vijayawada, Andhra Pradesh 520003',
  },
  '520007': {
    city: 'Vijayawada',
    state: 'Andhra Pradesh',
    pincode: '520007',
    latitude: 16.5000,
    longitude: 80.6800,
    formatted_address: 'Auto Nagar Phase 2, Vijayawada, Andhra Pradesh 520007',
  },
  '520010': {
    city: 'Vijayawada',
    state: 'Andhra Pradesh',
    pincode: '520010',
    latitude: 16.5062,
    longitude: 80.6517,
    formatted_address: 'Moghalrajpuram, Vijayawada, Andhra Pradesh 520010',
  },
  '522002': {
    city: 'Guntur',
    state: 'Andhra Pradesh',
    pincode: '522002',
    latitude: 16.3067,
    longitude: 80.4365,
    formatted_address: 'Brodipet, Guntur, Andhra Pradesh 522002',
  },
  '500018': {
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500018',
    latitude: 17.4560,
    longitude: 78.4410,
    formatted_address: 'Sanathnagar Industrial Estate, Hyderabad, Telangana 500018',
  },
  '530012': {
    city: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    pincode: '530012',
    latitude: 17.6900,
    longitude: 83.2100,
    formatted_address: 'Gajuwaka, Visakhapatnam, Andhra Pradesh 530012',
  },
  '530001': {
    city: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    pincode: '530001',
    latitude: 17.7041,
    longitude: 83.2977,
    formatted_address: 'Jagadamba Centre, Visakhapatnam, Andhra Pradesh 530001',
  },
};

export class MockGeocodingProvider implements IGeocodingProvider {
  name = 'mock';

  async geocode(query: string): Promise<GeocodingResult> {
    const qLower = query.toLowerCase();

    // Check pincode matches
    const pincodeMatch = query.match(/\b(5\d{5})\b/);
    if (pincodeMatch && KNOWN_LOCATIONS[pincodeMatch[1]]) {
      const loc = KNOWN_LOCATIONS[pincodeMatch[1]];
      return {
        latitude: loc.latitude,
        longitude: loc.longitude,
        formatted_address: query,
        city: loc.city,
        state: loc.state,
        pincode: loc.pincode,
        confidence: 0.95,
        provider: this.name,
        is_fallback: false,
      };
    }

    // Check city/locality names
    if (qLower.includes('guntur')) {
      const loc = KNOWN_LOCATIONS['522002'];
      return {
        latitude: loc.latitude,
        longitude: loc.longitude,
        formatted_address: query,
        city: loc.city,
        state: loc.state,
        pincode: loc.pincode,
        confidence: 0.90,
        provider: this.name,
        is_fallback: false,
      };
    }

    if (qLower.includes('hyderabad') || qLower.includes('sanathnagar')) {
      const loc = KNOWN_LOCATIONS['500018'];
      return {
        latitude: loc.latitude,
        longitude: loc.longitude,
        formatted_address: query,
        city: loc.city,
        state: loc.state,
        pincode: loc.pincode,
        confidence: 0.90,
        provider: this.name,
        is_fallback: false,
      };
    }

    if (qLower.includes('visakhapatnam') || qLower.includes('vizag') || qLower.includes('gajuwaka')) {
      const loc = KNOWN_LOCATIONS['530012'];
      return {
        latitude: loc.latitude,
        longitude: loc.longitude,
        formatted_address: query,
        city: loc.city,
        state: loc.state,
        pincode: loc.pincode,
        confidence: 0.90,
        provider: this.name,
        is_fallback: false,
      };
    }

    // Default to Vijayawada Governorpet
    const loc = KNOWN_LOCATIONS['520002'];
    return {
      latitude: loc.latitude,
      longitude: loc.longitude,
      formatted_address: query,
      city: loc.city,
      state: loc.state,
      pincode: loc.pincode,
      confidence: 0.85,
      provider: this.name,
      is_fallback: false,
    };
  }

  async reverseGeocode(coords: LocationCoordinates): Promise<GeocodingResult> {
    // Find closest known location
    let closestKey = '520002';
    let minDistanceSq = Number.MAX_VALUE;

    for (const [pin, loc] of Object.entries(KNOWN_LOCATIONS)) {
      const dLat = loc.latitude - coords.latitude;
      const dLng = loc.longitude - coords.longitude;
      const distSq = dLat * dLat + dLng * dLng;
      if (distSq < minDistanceSq) {
        minDistanceSq = distSq;
        closestKey = pin;
      }
    }

    const loc = KNOWN_LOCATIONS[closestKey];
    return {
      latitude: coords.latitude,
      longitude: coords.longitude,
      formatted_address: `${loc.city}, ${loc.state} ${loc.pincode}`,
      city: loc.city,
      state: loc.state,
      pincode: loc.pincode,
      confidence: 0.90,
      provider: this.name,
      is_fallback: false,
    };
  }
}

export class GoogleMapsGeocodingProvider implements IGeocodingProvider {
  name = 'google_maps';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async geocode(query: string): Promise<GeocodingResult> {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&region=in&key=${this.apiKey}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Google Maps Geocoding HTTP error: ${res.status}`);
    }

    const data = (await res.json()) as any;
    if (data.status !== 'OK' || !data.results?.length) {
      throw new Error(`Google Maps Geocoding failed: ${data.status}`);
    }

    const first = data.results[0];
    let city = 'Vijayawada';
    let state = 'Andhra Pradesh';
    let pincode = '520002';

    for (const comp of first.address_components || []) {
      if (comp.types.includes('locality')) city = comp.long_name;
      if (comp.types.includes('administrative_area_level_1')) state = comp.long_name;
      if (comp.types.includes('postal_code')) pincode = comp.long_name;
    }

    return {
      latitude: first.geometry.location.lat,
      longitude: first.geometry.location.lng,
      formatted_address: first.formatted_address,
      city,
      state,
      pincode,
      confidence: 0.98,
      provider: this.name,
      is_fallback: false,
    };
  }

  async reverseGeocode(coords: LocationCoordinates): Promise<GeocodingResult> {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.latitude},${coords.longitude}&region=in&key=${this.apiKey}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Google Maps Reverse Geocoding HTTP error: ${res.status}`);
    }

    const data = (await res.json()) as any;
    if (data.status !== 'OK' || !data.results?.length) {
      throw new Error(`Google Maps Reverse Geocoding failed: ${data.status}`);
    }

    const first = data.results[0];
    let city = 'Vijayawada';
    let state = 'Andhra Pradesh';
    let pincode = '520002';

    for (const comp of first.address_components || []) {
      if (comp.types.includes('locality')) city = comp.long_name;
      if (comp.types.includes('administrative_area_level_1')) state = comp.long_name;
      if (comp.types.includes('postal_code')) pincode = comp.long_name;
    }

    return {
      latitude: coords.latitude,
      longitude: coords.longitude,
      formatted_address: first.formatted_address,
      city,
      state,
      pincode,
      confidence: 0.98,
      provider: this.name,
      is_fallback: false,
    };
  }
}

export class DisabledGeocodingProvider implements IGeocodingProvider {
  name = 'disabled';

  async geocode(query: string): Promise<GeocodingResult> {
    const qLower = query.toLowerCase();

    // Check pincode matches
    const pincodeMatch = query.match(/\b(5\d{5})\b/);
    if (pincodeMatch && KNOWN_LOCATIONS[pincodeMatch[1]]) {
      const loc = KNOWN_LOCATIONS[pincodeMatch[1]];
      return {
        latitude: loc.latitude,
        longitude: loc.longitude,
        formatted_address: query,
        city: loc.city,
        state: loc.state,
        pincode: loc.pincode,
        confidence: 0.85,
        provider: 'disabled',
        is_fallback: true,
      };
    }

    // Check city/locality names
    if (qLower.includes('guntur')) {
      const loc = KNOWN_LOCATIONS['522002'];
      return {
        latitude: loc.latitude,
        longitude: loc.longitude,
        formatted_address: query,
        city: loc.city,
        state: loc.state,
        pincode: loc.pincode,
        confidence: 0.80,
        provider: 'disabled',
        is_fallback: true,
      };
    }

    if (qLower.includes('hyderabad') || qLower.includes('sanathnagar')) {
      const loc = KNOWN_LOCATIONS['500018'];
      return {
        latitude: loc.latitude,
        longitude: loc.longitude,
        formatted_address: query,
        city: loc.city,
        state: loc.state,
        pincode: loc.pincode,
        confidence: 0.80,
        provider: 'disabled',
        is_fallback: true,
      };
    }

    if (qLower.includes('visakhapatnam') || qLower.includes('vizag') || qLower.includes('gajuwaka')) {
      const loc = KNOWN_LOCATIONS['530012'];
      return {
        latitude: loc.latitude,
        longitude: loc.longitude,
        formatted_address: query,
        city: loc.city,
        state: loc.state,
        pincode: loc.pincode,
        confidence: 0.80,
        provider: 'disabled',
        is_fallback: true,
      };
    }

    // Default to Vijayawada Governorpet fallback
    const loc = KNOWN_LOCATIONS['520002'];
    return {
      latitude: loc.latitude,
      longitude: loc.longitude,
      formatted_address: query,
      city: loc.city,
      state: loc.state,
      pincode: loc.pincode,
      confidence: 0.60,
      provider: 'disabled',
      is_fallback: true,
    };
  }

  async reverseGeocode(coords: LocationCoordinates): Promise<GeocodingResult> {
    // Find closest known location
    let closestKey = '520002';
    let minDistanceSq = Number.MAX_VALUE;

    for (const [pin, loc] of Object.entries(KNOWN_LOCATIONS)) {
      const dLat = loc.latitude - coords.latitude;
      const dLng = loc.longitude - coords.longitude;
      const distSq = dLat * dLat + dLng * dLng;
      if (distSq < minDistanceSq) {
        minDistanceSq = distSq;
        closestKey = pin;
      }
    }

    const loc = KNOWN_LOCATIONS[closestKey];
    return {
      latitude: coords.latitude,
      longitude: coords.longitude,
      formatted_address: `${loc.city}, ${loc.state} ${loc.pincode}`,
      city: loc.city,
      state: loc.state,
      pincode: loc.pincode,
      confidence: 0.80,
      provider: 'disabled',
      is_fallback: true,
    };
  }
}

export function getGeocodingProvider(overrideProvider?: string): IGeocodingProvider {
  const providerType = (overrideProvider || config.mapsProvider || (config.isProduction ? 'disabled' : 'mock')).toLowerCase();

  if (config.isProduction && (providerType === 'mock' || process.env.MAPS_PROVIDER === 'mock')) {
    throw new Error(
      '[Config Error] In production, MAPS_PROVIDER cannot be "mock". A real maps provider must be configured, or set MAPS_PROVIDER=disabled.'
    );
  }

  if (providerType === 'disabled') {
    return new DisabledGeocodingProvider();
  }

  if (providerType === 'google_maps') {
    if (!config.googleMapsApiKey) {
      throw new Error('[Config Error] GOOGLE_MAPS_API_KEY must be provided when using google_maps provider.');
    }
    return new GoogleMapsGeocodingProvider(config.googleMapsApiKey);
  }

  return new MockGeocodingProvider();
}
