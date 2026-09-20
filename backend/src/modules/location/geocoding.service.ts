import { getGeocodingProvider } from './geocoding.provider.js';
import { GeocodingResult, LocationCoordinates } from './location.types.js';

export class GeocodingService {
  /**
   * Resolves coordinates, city, state, and pincode from either coordinates (reverse geocoding)
   * or address query/pincode (forward geocoding).
   */
  async resolveLocation(input: {
    latitude?: number;
    longitude?: number;
    address?: string;
    pincode?: string;
  }): Promise<GeocodingResult> {
    const provider = getGeocodingProvider();

    // 1. If coordinates provided, reverse geocode
    if (
      input.latitude !== undefined &&
      input.longitude !== undefined &&
      !isNaN(input.latitude) &&
      !isNaN(input.longitude)
    ) {
      try {
        return await provider.reverseGeocode({
          latitude: Number(input.latitude),
          longitude: Number(input.longitude),
        });
      } catch (err) {
        console.warn('[GeocodingService] Reverse geocoding failed, falling back to manual query:', err);
      }
    }

    // 2. Forward geocode using address or pincode
    const query = [input.address, input.pincode].filter(Boolean).join(', ') || 'Vijayawada, 520002';

    try {
      return await provider.geocode(query);
    } catch (err) {
      console.warn('[GeocodingService] Geocoding query failed, applying default hub fallback:', err);
      return {
        latitude: 16.5167,
        longitude: 80.6333,
        formatted_address: query,
        city: 'Vijayawada',
        state: 'Andhra Pradesh',
        pincode: input.pincode || '520002',
        confidence: 0.5,
        provider: 'static_fallback',
        is_fallback: true,
      };
    }
  }

  /**
   * Authoritatively formats and normalizes address components into a single coherent string.
   */
  normalizeAddress(parts: {
    address_line1: string;
    address_line2?: string | null;
    landmark?: string | null;
    city: string;
    state?: string | null;
    pincode: string;
    country?: string | null;
  }): string {
    const pieces = [
      parts.address_line1.trim(),
      parts.address_line2 ? parts.address_line2.trim() : null,
      parts.landmark ? `Near ${parts.landmark.trim()}` : null,
      parts.city.trim(),
      parts.state ? parts.state.trim() : 'Andhra Pradesh',
      parts.pincode.trim(),
      parts.country ? parts.country.trim() : 'India',
    ].filter(Boolean);

    return pieces.join(', ');
  }
}

export const geocodingService = new GeocodingService();
