# ElectraKart Location Architecture & Distance Abstraction

## 1. Overview & Architectural Principles

ElectraKart requires high-precision, fraud-resistant geographical resolution to power hyperlocal deliveries (30–60 minute dispatch) from distributed local retailers, distributors, and central warehouses across Indian tier-2/tier-3 cities (e.g., Vijayawada, Guntur, Amaravati).

The location system is built upon four non-negotiable principles:
1. **Server Authoritative**: Client coordinates and addresses are treated as unverified inputs until normalized and validated on the backend.
2. **Provider Abstraction**: Decoupled geocoding and distance calculation supporting Google Maps Platform, Mapbox, and deterministic mock providers for testing.
3. **Transparent Truth in Distance**: When road network routing APIs are unreachable or offline, the system falls back to the Haversine great-circle geodesic formula. All geodesic distances are strictly labeled `GEODESIC_FALLBACK`, with duration explicitly uncalculated rather than fabricated.
4. **Production Guardrails**: In `production` environments, the server hard-aborts startup if configured with mock providers.

---

## 2. Multi-Address Customer Profile Architecture

### Database Schema (`addresses` table)

Customer delivery destinations are stored in the PostgreSQL `addresses` table, updated via migration `008_location_addresses_hyperlocal_fulfillment.sql`:

```sql
CREATE TABLE IF NOT EXISTS addresses (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    address_type VARCHAR(32) NOT NULL DEFAULT 'HOME' 
        CHECK (address_type IN ('HOME', 'WORK', 'PROJECT_SITE', 'OTHER')),
    recipient_name VARCHAR(150),
    recipient_phone VARCHAR(20),
    street_address TEXT NOT NULL,
    landmark TEXT,
    area VARCHAR(100),
    city VARCHAR(100) NOT NULL,
    district VARCHAR(100),
    state VARCHAR(100) NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    country VARCHAR(10) NOT NULL DEFAULT 'IN',
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    source VARCHAR(32) NOT NULL DEFAULT 'MANUAL_ENTRY' 
        CHECK (source IN ('MANUAL_ENTRY', 'GPS_DEVICE', 'MAP_PIN', 'GEOCODED')),
    normalized_address TEXT,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Strict IDOR Protection & Ownership Enforcement

Every address management endpoint is guarded by authentication and customer ownership checks:
- **`GET /api/v1/customers/me/addresses`**: Filtered strictly to `user_id = requestingUser.id`.
- **`POST /api/v1/customers/me/addresses`**: Forces `user_id = requestingUser.id`. Automatically resets existing default addresses if `is_default: true`.
- **`GET /api/v1/customers/me/addresses/:id`**: Returns `403 Forbidden` if `address.user_id !== requestingUser.id`.
- **`PATCH /api/v1/customers/me/addresses/:id`**: Returns `403 Forbidden` if attempting to update another user's address.
- **`DELETE /api/v1/customers/me/addresses/:id`**: Returns `403 Forbidden` if attempting to delete another user's address.

---

## 3. Geocoding & Distance Provider Abstraction

### Interface Contracts

```typescript
export interface IGeocodingProvider {
  name: string;
  geocode(address: string, city?: string, pincode?: string): Promise<GeocodedLocation>;
  reverseGeocode(latitude: number, longitude: number): Promise<GeocodedLocation>;
}

export interface IDistanceProvider {
  name: string;
  calculateDistance(origin: Coordinates, destination: Coordinates): Promise<DistanceCalculationResult>;
}
```

### Provider Matrix

| Provider | Geocoding Engine | Distance & Matrix Engine | Use Case |
|---|---|---|---|
| `mock` | Local city centroid & known coordinates lookup table | Coordinate distance with 1.25x road winding factor | Local development, CI/CD automated tests |
| `google_maps` | Google Maps Geocoding API | Google Routes / Distance Matrix API | Production deployment |

### Haversine Geodesic Fallback

When routing APIs experience network timeouts, HTTP 5xx errors, or quota exhaustion, distance resolution seamlessly falls back to the Haversine spherical formula:

$$\Delta\sigma = 2 \arcsin \sqrt{\sin^2\left(\frac{\Delta\phi}{2}\right) + \cos\phi_1 \cos\phi_2 \sin^2\left(\frac{\Delta\lambda}{2}\right)}$$
$$d = R \cdot \Delta\sigma \quad (R = 6371.0088\text{ km})$$

All results generated via this path carry:
- `distance_source: 'GEODESIC_FALLBACK'`
- `duration_seconds: null` (road travel time is NEVER hallucinated)

---

## 4. Production Startup Guard

To prevent catastrophic live deployments using simulated location or synthetic distances, `backend/src/config/environment.ts` evaluates the runtime environment on bootstrap:

```typescript
if (env.nodeEnv === 'production' && env.mapsProvider === 'mock') {
  console.error(
    'CRITICAL DEPLOYMENT ERROR: MAPS_PROVIDER cannot be "mock" in production environment.'
  );
  process.exit(1);
}
```

Verified via automated test **Fixture J**, which asserts process exit code `1` when `NODE_ENV=production` and `MAPS_PROVIDER=mock`.
