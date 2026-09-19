/**
 * ElectraKart Production Demo Fallback Policy
 *
 * In production (NODE_ENV=production or import.meta.env.PROD), silent demo
 * fallback is strictly prohibited.
 *
 * When backend or PostgreSQL is unavailable during a production transaction
 * (orders, quotations, inventory adjustments, pricing), services MUST throw
 * an explicit ServiceUnavailableError rather than silently returning mock/stale data.
 */

export class ServiceUnavailableError extends Error {
  public serviceName: string;
  public operation: string;

  constructor(serviceName: string, operation: string, cause?: unknown) {
    const detail = cause && typeof cause === 'object' && 'message' in cause
      ? (cause as any).message
      : String(cause || 'Backend service unreachable');
    super(`[${serviceName}] ${operation} failed: ${detail}`);
    this.name = 'ServiceUnavailableError';
    this.serviceName = serviceName;
    this.operation = operation;
  }
}

export function isDemoFallbackAllowed(): boolean {
  // 1. Explicit override if set in environment
  const envVal = import.meta.env?.VITE_ALLOW_DEMO_FALLBACK;
  if (envVal !== undefined && envVal !== '') {
    return envVal === 'true' || envVal === true;
  }

  // 2. In production, demo fallback is strictly disallowed
  if (import.meta.env?.PROD || import.meta.env?.MODE === 'production') {
    return false;
  }

  // 3. Permitted in local development & test
  return true;
}

export function handleFallbackOrThrow<T>(
  serviceName: string,
  operation: string,
  err: unknown,
  fallbackValue: T
): T {
  if (isDemoFallbackAllowed()) {
    console.warn(`[${serviceName}] DEV ONLY fallback for ${operation}:`, err);
    return fallbackValue;
  }

  throw new ServiceUnavailableError(serviceName, operation, err);
}
