import { getDistanceProvider, calculateHaversineDistanceKm } from './distance.provider.js';
import { DistanceResult, LocationCoordinates } from './location.types.js';

export class DistanceService {
  /**
   * Calculates distance between origin and destination using the active provider.
   */
  async calculateDistance(
    origin: LocationCoordinates,
    destination: LocationCoordinates
  ): Promise<DistanceResult> {
    const provider = getDistanceProvider();
    return provider.calculateDistance(origin, destination);
  }

  /**
   * Calculates straight-line distance directly using the Haversine formula.
   */
  calculateGeodesicDistance(
    origin: LocationCoordinates,
    destination: LocationCoordinates
  ): number {
    return calculateHaversineDistanceKm(
      origin.latitude,
      origin.longitude,
      destination.latitude,
      destination.longitude
    );
  }

  /**
   * Batch calculates distances from an origin to multiple candidate destinations.
   */
  async calculateBatchDistances(
    origin: LocationCoordinates,
    destinations: { id: string; coords: LocationCoordinates }[]
  ): Promise<Map<string, DistanceResult>> {
    const results = new Map<string, DistanceResult>();
    const provider = getDistanceProvider();

    await Promise.all(
      destinations.map(async (d) => {
        try {
          const res = await provider.calculateDistance(origin, d.coords);
          results.set(d.id, res);
        } catch (err) {
          console.warn(`[DistanceService] Failed calculating distance to ${d.id}, falling back:`, err);
          const straight = this.calculateGeodesicDistance(origin, d.coords);
          results.set(d.id, {
            distance_km: straight,
            duration_minutes: 0,
            provider: 'geodesic_haversine',
            mode: 'GEODESIC_FALLBACK',
            is_fallback: true,
            calculated_at: new Date().toISOString(),
          });
        }
      })
    );

    return results;
  }
}

export const distanceService = new DistanceService();
