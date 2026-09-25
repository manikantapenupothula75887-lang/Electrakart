import { config } from '../../config/environment.js';
import { LocationCoordinates, DistanceResult } from './location.types.js';

export interface IDistanceProvider {
  name: string;
  calculateDistance(
    origin: LocationCoordinates,
    destination: LocationCoordinates
  ): Promise<DistanceResult>;
}

/**
 * Standard Haversine formula for straight-line geodesic distance on Earth.
 * Explicitly used as a mathematical reference and transparent fallback.
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

export class MockDistanceProvider implements IDistanceProvider {
  name = 'mock';

  async calculateDistance(
    origin: LocationCoordinates,
    destination: LocationCoordinates
  ): Promise<DistanceResult> {
    const straightLine = calculateHaversineDistanceKm(
      origin.latitude,
      origin.longitude,
      destination.latitude,
      destination.longitude
    );

    // Realistic urban road detour factor: ~1.28x straight-line distance
    const roadDistanceKm = Math.round(Math.max(straightLine * 1.28, 0.5) * 100) / 100;

    // Average hyperlocal speed ~25 km/h in city traffic + 5 min dispatch buffer
    const durationMinutes = Math.round((roadDistanceKm / 25) * 60 + 5);

    return {
      distance_km: roadDistanceKm,
      duration_minutes: durationMinutes,
      provider: this.name,
      mode: 'ROAD_NETWORK',
      is_fallback: false,
      calculated_at: new Date().toISOString(),
    };
  }
}

export class GoogleRoutesDistanceProvider implements IDistanceProvider {
  name = 'google_maps';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async calculateDistance(
    origin: LocationCoordinates,
    destination: LocationCoordinates
  ): Promise<DistanceResult> {
    try {
      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin.latitude},${origin.longitude}&destinations=${destination.latitude},${destination.longitude}&mode=driving&region=in&key=${this.apiKey}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Google Distance Matrix HTTP status ${res.status}`);
      }

      const data = (await res.json()) as any;
      const element = data.rows?.[0]?.elements?.[0];

      if (element?.status === 'OK') {
        const distanceKm = Math.round((element.distance.value / 1000) * 100) / 100;
        const durationMinutes = Math.round(element.duration.value / 60);

        return {
          distance_km: distanceKm,
          duration_minutes: durationMinutes,
          provider: this.name,
          mode: 'ROAD_NETWORK',
          is_fallback: false,
          calculated_at: new Date().toISOString(),
        };
      }

      // Fall back transparently to geodesic if element status is NOT_FOUND or ZERO_RESULTS
      return this.geodesicFallback(origin, destination);
    } catch (err) {
      console.warn('[DistanceProvider] Google API failed, falling back to geodesic straight-line:', err);
      return this.geodesicFallback(origin, destination);
    }
  }

  private geodesicFallback(
    origin: LocationCoordinates,
    destination: LocationCoordinates
  ): DistanceResult {
    const straightLine = calculateHaversineDistanceKm(
      origin.latitude,
      origin.longitude,
      destination.latitude,
      destination.longitude
    );

    return {
      distance_km: straightLine,
      duration_minutes: 0, // Never fabricate fake ETA when routing fails
      provider: 'geodesic_haversine',
      mode: 'GEODESIC_FALLBACK',
      is_fallback: true,
      calculated_at: new Date().toISOString(),
    };
  }
}

export class DisabledDistanceProvider implements IDistanceProvider {
  name = 'disabled';

  async calculateDistance(
    origin: LocationCoordinates,
    destination: LocationCoordinates
  ): Promise<DistanceResult> {
    const straightLine = calculateHaversineDistanceKm(
      origin.latitude,
      origin.longitude,
      destination.latitude,
      destination.longitude
    );

    return {
      distance_km: straightLine,
      duration_minutes: 0,
      provider: 'geodesic_haversine',
      mode: 'GEODESIC_FALLBACK',
      is_fallback: true,
      calculated_at: new Date().toISOString(),
    };
  }
}

export function getDistanceProvider(overrideProvider?: string): IDistanceProvider {
  const providerType = (overrideProvider || config.mapsProvider || (config.isProduction ? 'disabled' : 'mock')).toLowerCase();

  if (config.isProduction && (providerType === 'mock' || process.env.MAPS_PROVIDER === 'mock')) {
    throw new Error(
      '[Config Error] In production, MAPS_PROVIDER cannot be "mock". A real maps/distance provider (e.g. google_maps or mapbox) must be configured, or set MAPS_PROVIDER=disabled.'
    );
  }

  if (providerType === 'disabled') {
    return new DisabledDistanceProvider();
  }

  if (providerType === 'google_maps') {
    if (!config.googleMapsApiKey) {
      throw new Error('[Config Error] GOOGLE_MAPS_API_KEY must be provided when using google_maps provider.');
    }
    return new GoogleRoutesDistanceProvider(config.googleMapsApiKey);
  }

  return new MockDistanceProvider();
}
