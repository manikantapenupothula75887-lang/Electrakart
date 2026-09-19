import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment files according to NODE_ENV
const nodeEnv = process.env.NODE_ENV || 'development';
const envFile = nodeEnv === 'test' ? '.env.test' : nodeEnv === 'production' ? '.env' : '.env.development';

dotenv.config({ path: path.resolve(__dirname, '../../', envFile) });
// Also try standard .env fallback
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export interface Config {
  nodeEnv: string;
  isProduction: boolean;
  isTest: boolean;
  port: number;
  host: string;
  corsOrigins: string[];
  jwtSecret: string;
  jwtExpiresIn: number;
  databaseUrl: string;
  dbPoolMax: number;
  dbIdleTimeoutMs: number;
  dbConnectionTimeoutMs: number;
  rateLimitMax: number;
  rateLimitWindowMs: number;
  bodyLimitBytes: number;
  logLevel: string;
}

const INSECURE_DEV_SECRETS = [
  'electrakart-production-jwt-secret-key-2026-hyperlocal',
  'dev-electrakart-secret-key-384918294021',
  'CHANGE_ME_TO_A_LONG_RANDOM_PRODUCTION_SECRET',
  'CHANGE_ME_TO_A_LONG_RANDOM_SECRET',
  'electrakart_development_jwt_secret_key_32bytes_minimum',
];

export function getValidatedConfig(customEnv?: NodeJS.ProcessEnv): Config {
  const env = customEnv || process.env;
  const currentEnv = env.NODE_ENV || 'development';
  const isProd = currentEnv === 'production';
  const isTest = currentEnv === 'test';

  const jwtSecret =
    env.JWT_SECRET ||
    (isProd ? '' : isTest ? 'test-electrakart-secret-key-998877665544' : 'dev-electrakart-secret-key-384918294021');

  const databaseUrl =
    env.DATABASE_URL ||
    (isProd ? '' : isTest ? 'pglite://./data/pgdata_test' : 'pglite://./data/pgdata');

  if (isProd) {
    if (!jwtSecret || INSECURE_DEV_SECRETS.includes(jwtSecret) || jwtSecret.length < 32) {
      throw new Error(
        '[Config Error] In production, JWT_SECRET must be set to a high-entropy secret of at least 32 characters. Startup aborted.'
      );
    }

    if (
      !databaseUrl ||
      databaseUrl.startsWith('pglite://') ||
      (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://'))
    ) {
      throw new Error(
        '[Config Error] In production, DATABASE_URL must be a real PostgreSQL connection string (postgresql:// or postgres://). PGlite is prohibited in production. Startup aborted.'
      );
    }
  }

  const corsOriginRaw = env.CORS_ORIGIN || (isProd ? 'https://electrakart.com' : 'http://localhost:5173');
  const corsOrigins = corsOriginRaw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (isProd && corsOrigins.includes('*')) {
    throw new Error(
      '[Config Error] In production, CORS_ORIGIN cannot be wildcard "*" for authenticated API access. Startup aborted.'
    );
  }

  return {
    nodeEnv: currentEnv,
    isProduction: isProd,
    isTest,
    port: parseInt(env.API_PORT || env.PORT || '5000', 10),
    host: env.API_HOST || env.HOST || '0.0.0.0',
    corsOrigins,
    jwtSecret,
    jwtExpiresIn: parseInt(env.JWT_EXPIRES_IN || '86400', 10),
    databaseUrl,
    dbPoolMax: parseInt(env.DB_POOL_MAX || '20', 10),
    dbIdleTimeoutMs: parseInt(env.DB_IDLE_TIMEOUT_MS || '30000', 10),
    dbConnectionTimeoutMs: parseInt(env.DB_CONNECTION_TIMEOUT_MS || '5000', 10),
    rateLimitMax: parseInt(env.RATE_LIMIT_MAX || (isProd ? '100' : '200'), 10),
    rateLimitWindowMs: parseInt(env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    bodyLimitBytes: parseInt(env.BODY_LIMIT_BYTES || '1048576', 10),
    logLevel: env.LOG_LEVEL || (isProd ? 'info' : 'info'),
  };
}

export const config: Config = getValidatedConfig();
export const loadConfig = getValidatedConfig;
