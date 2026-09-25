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
  paymentProvider: 'mock' | 'razorpay' | 'cashfree';
  razorpayKeyId: string;
  razorpayKeySecret: string;
  razorpayWebhookSecret: string;
  cashfreeAppId: string;
  cashfreeSecretKey: string;
  cashfreeApiVersion: string;
  ocrProvider: 'mock' | 'google_document_ai' | 'aws_textract';
  googleDocAiProjectId: string;
  googleDocAiLocation: string;
  googleDocAiProcessorId: string;
  awsTextractRegion: string;
  awsTextractAccessKeyId: string;
  awsTextractSecretAccessKey: string;
  mapsProvider: 'mock' | 'google_maps' | 'mapbox';
  googleMapsApiKey: string;
  mapboxAccessToken: string;
  emailEnabled: boolean;
  emailProvider: 'mock' | 'resend' | 'sendgrid' | 'smtp';
  resendApiKey: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  emailFrom: string;
  emailWebhookSecret: string;
  smsEnabled: boolean;
  smsProvider: 'mock' | 'twilio' | 'msg91' | 'fast2sms';
  twilioAccountSid: string;
  twilioAuthToken: string;
  twilioFromNumber: string;
  smsWebhookSecret: string;
  whatsappEnabled: boolean;
  whatsappProvider: 'mock' | 'meta_whatsapp' | 'twilio_whatsapp';
  whatsappApiToken: string;
  whatsappPhoneNumberId: string;
  whatsappWebhookSecret: string;
  deliveryProvider: 'mock' | 'rapido';
  rapidoApiKey: string;
  rapidoClientId: string;
  rapidoClientSecret: string;
  rapidoBaseUrl: string;
  rapidoWebhookSecret: string;
}

const INSECURE_DEV_SECRETS = [
  'electrakart-production-jwt-secret-key-2026-hyperlocal',
  'dev-electrakart-secret-key-384918294021',
  'CHANGE_ME_TO_A_LONG_RANDOM_PRODUCTION_SECRET',
  'CHANGE_ME_TO_A_LONG_RANDOM_SECRET',
  'electrakart_development_jwt_secret_key_32bytes_minimum',
  'GENERATED_64_CHAR_HIGH_ENTROPY_CRYPTOGRAPHIC_KEY_STRING_HERE',
  'test-electrakart-secret-key-998877665544',
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
  const rawOrigins = corsOriginRaw
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  if (isProd && rawOrigins.includes('*')) {
    throw new Error(
      '[Config Error] In production, CORS_ORIGIN cannot be wildcard "*" for authenticated API access. Startup aborted.'
    );
  }

  const corsOrigins = Array.from(
    new Set(
      rawOrigins.flatMap((item) => {
        if (!item.startsWith('http://') && !item.startsWith('https://')) {
          return [`https://${item}`, `http://${item}`, item];
        }
        return [item];
      })
    )
  );

  const paymentProvider = (env.PAYMENT_PROVIDER || (isProd ? 'razorpay' : 'mock')).toLowerCase() as
    | 'mock'
    | 'razorpay'
    | 'cashfree';

  if (isProd && (paymentProvider === 'mock' || env.PAYMENT_PROVIDER === 'mock')) {
    throw new Error(
      '[Config Error] In production, PAYMENT_PROVIDER cannot be "mock". A real payment provider (e.g. razorpay or cashfree) must be configured. Startup aborted.'
    );
  }

  const razorpayKeyId = env.RAZORPAY_KEY_ID || '';
  const razorpayKeySecret = env.RAZORPAY_KEY_SECRET || '';
  const razorpayWebhookSecret = env.RAZORPAY_WEBHOOK_SECRET || '';
  const cashfreeAppId = env.CASHFREE_APP_ID || '';
  const cashfreeSecretKey = env.CASHFREE_SECRET_KEY || '';
  const cashfreeApiVersion = env.CASHFREE_API_VERSION || '2023-08-01';

  const ocrProvider = (env.OCR_PROVIDER || (isProd ? 'google_document_ai' : 'mock')).toLowerCase() as
    | 'mock'
    | 'google_document_ai'
    | 'aws_textract';

  if (isProd && (ocrProvider === 'mock' || env.OCR_PROVIDER === 'mock')) {
    throw new Error(
      '[Config Error] In production, OCR_PROVIDER cannot be "mock". A real OCR provider (e.g. google_document_ai or aws_textract) must be configured. Startup aborted.'
    );
  }

  const googleDocAiProjectId = env.GOOGLE_DOC_AI_PROJECT_ID || '';
  const googleDocAiLocation = env.GOOGLE_DOC_AI_LOCATION || 'us';
  const googleDocAiProcessorId = env.GOOGLE_DOC_AI_PROCESSOR_ID || '';
  const awsTextractRegion = env.AWS_TEXTRACT_REGION || env.AWS_REGION || 'ap-south-1';
  const awsTextractAccessKeyId = env.AWS_TEXTRACT_ACCESS_KEY_ID || env.AWS_ACCESS_KEY_ID || '';
  const awsTextractSecretAccessKey = env.AWS_TEXTRACT_SECRET_ACCESS_KEY || env.AWS_SECRET_ACCESS_KEY || '';

  if (isProd && ocrProvider === 'google_document_ai' && !googleDocAiProcessorId) {
    throw new Error(
      '[Config Error] In production with OCR_PROVIDER=google_document_ai, GOOGLE_DOC_AI_PROCESSOR_ID must be set. Startup aborted.'
    );
  }

  if (isProd && ocrProvider === 'aws_textract' && (!awsTextractAccessKeyId || !awsTextractSecretAccessKey)) {
    throw new Error(
      '[Config Error] In production with OCR_PROVIDER=aws_textract, AWS credentials must be set. Startup aborted.'
    );
  }

  const mapsProvider = (env.MAPS_PROVIDER || (isProd ? 'google_maps' : 'mock')).toLowerCase() as
    | 'mock'
    | 'google_maps'
    | 'mapbox';

  if (isProd && (mapsProvider === 'mock' || env.MAPS_PROVIDER === 'mock')) {
    throw new Error(
      '[Config Error] In production, MAPS_PROVIDER cannot be "mock". A real maps/distance provider (e.g. google_maps or mapbox) must be configured. Startup aborted.'
    );
  }

  const googleMapsApiKey = env.GOOGLE_MAPS_API_KEY || '';
  const mapboxAccessToken = env.MAPBOX_ACCESS_TOKEN || '';

  if (isProd && mapsProvider === 'google_maps' && !googleMapsApiKey) {
    throw new Error(
      '[Config Error] In production with MAPS_PROVIDER=google_maps, GOOGLE_MAPS_API_KEY must be set. Startup aborted.'
    );
  }

  if (isProd && mapsProvider === 'mapbox' && !mapboxAccessToken) {
    throw new Error(
      '[Config Error] In production with MAPS_PROVIDER=mapbox, MAPBOX_ACCESS_TOKEN must be set. Startup aborted.'
    );
  }

  const emailEnabled = env.EMAIL_ENABLED === 'true' || env.EMAIL_ENABLED === '1' || (!isProd && env.EMAIL_ENABLED !== 'false');
  const emailProvider = (env.EMAIL_PROVIDER || (isProd ? 'resend' : 'mock')).toLowerCase() as
    | 'mock'
    | 'resend'
    | 'sendgrid'
    | 'smtp';
  const resendApiKey = env.RESEND_API_KEY || '';
  const smtpHost = env.SMTP_HOST || '';
  const smtpPort = parseInt(env.SMTP_PORT || '587', 10);
  const smtpUser = env.SMTP_USER || '';
  const smtpPass = env.SMTP_PASS || '';
  const emailFrom = env.EMAIL_FROM || 'ElectraKart Alerts <alerts@electrakart.com>';
  const emailWebhookSecret = env.EMAIL_WEBHOOK_SECRET || (isTest ? 'test-email-webhook-secret' : '');

  if (isProd && emailEnabled && (emailProvider === 'mock' || env.EMAIL_PROVIDER === 'mock')) {
    throw new Error(
      '[Config Error] In production, EMAIL_PROVIDER cannot be "mock" when email is enabled. A real email provider (e.g. resend, sendgrid, smtp) must be configured. Startup aborted.'
    );
  }

  const smsEnabled = env.SMS_ENABLED === 'true' || env.SMS_ENABLED === '1' || (!isProd && env.SMS_ENABLED !== 'false');
  const smsProvider = (env.SMS_PROVIDER || (isProd ? 'twilio' : 'mock')).toLowerCase() as
    | 'mock'
    | 'twilio'
    | 'msg91'
    | 'fast2sms';
  const twilioAccountSid = env.TWILIO_ACCOUNT_SID || '';
  const twilioAuthToken = env.TWILIO_AUTH_TOKEN || '';
  const twilioFromNumber = env.TWILIO_FROM_NUMBER || '';
  const smsWebhookSecret = env.SMS_WEBHOOK_SECRET || (isTest ? 'test-sms-webhook-secret' : '');

  if (isProd && smsEnabled && (smsProvider === 'mock' || env.SMS_PROVIDER === 'mock')) {
    throw new Error(
      '[Config Error] In production, SMS_PROVIDER cannot be "mock" when SMS is enabled. A real SMS provider (e.g. twilio, msg91) must be configured. Startup aborted.'
    );
  }

  const whatsappEnabled = env.WHATSAPP_ENABLED === 'true' || env.WHATSAPP_ENABLED === '1' || (!isProd && env.WHATSAPP_ENABLED !== 'false');
  const whatsappProvider = (env.WHATSAPP_PROVIDER || (isProd ? 'meta_whatsapp' : 'mock')).toLowerCase() as
    | 'mock'
    | 'meta_whatsapp'
    | 'twilio_whatsapp';
  const whatsappApiToken = env.WHATSAPP_API_TOKEN || '';
  const whatsappPhoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID || '';
  const whatsappWebhookSecret = env.WHATSAPP_WEBHOOK_SECRET || (isTest ? 'test-whatsapp-webhook-secret' : '');

  if (isProd && whatsappEnabled && (whatsappProvider === 'mock' || env.WHATSAPP_PROVIDER === 'mock')) {
    throw new Error(
      '[Config Error] In production, WHATSAPP_PROVIDER cannot be "mock" when WhatsApp is enabled. A real WhatsApp Business provider must be configured. Startup aborted.'
    );
  }

  const deliveryProvider = (env.DELIVERY_PROVIDER || (isProd ? 'rapido' : 'mock')).toLowerCase() as
    | 'mock'
    | 'rapido';
  const rapidoApiKey = env.RAPIDO_API_KEY || '';
  const rapidoClientId = env.RAPIDO_CLIENT_ID || '';
  const rapidoClientSecret = env.RAPIDO_CLIENT_SECRET || '';
  const rapidoBaseUrl = env.RAPIDO_BASE_URL || 'https://api.rapido.bike';
  const rapidoWebhookSecret = env.RAPIDO_WEBHOOK_SECRET || (isTest ? 'test-rapido-webhook-secret' : '');

  return {
    nodeEnv: currentEnv,
    isProduction: isProd,
    isTest,
    port: parseInt(env.API_PORT || env.PORT || '5000', 10),
    host: env.API_HOST || env.HOST || '0.0.0.0',
    corsOrigins,
    jwtSecret,
    jwtExpiresIn: (() => {
      const raw = env.JWT_EXPIRES_IN || '86400';
      if (/^\d+h$/i.test(raw)) return parseInt(raw, 10) * 3600;
      if (/^\d+d$/i.test(raw)) return parseInt(raw, 10) * 86400;
      if (/^\d+m$/i.test(raw)) return parseInt(raw, 10) * 60;
      return parseInt(raw, 10) || 86400;
    })(),
    databaseUrl,
    dbPoolMax: parseInt(env.DB_POOL_MAX || '20', 10),
    dbIdleTimeoutMs: parseInt(env.DB_IDLE_TIMEOUT_MS || '30000', 10),
    dbConnectionTimeoutMs: parseInt(env.DB_CONNECTION_TIMEOUT_MS || '5000', 10),
    rateLimitMax: parseInt(env.RATE_LIMIT_MAX || (isProd ? '100' : '200'), 10),
    rateLimitWindowMs: parseInt(env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    bodyLimitBytes: parseInt(env.BODY_LIMIT_BYTES || '26214400', 10), // 25MB for document/photo uploads
    logLevel: env.LOG_LEVEL || (isProd ? 'info' : 'info'),
    paymentProvider,
    razorpayKeyId,
    razorpayKeySecret,
    razorpayWebhookSecret,
    cashfreeAppId,
    cashfreeSecretKey,
    cashfreeApiVersion,
    ocrProvider,
    googleDocAiProjectId,
    googleDocAiLocation,
    googleDocAiProcessorId,
    awsTextractRegion,
    awsTextractAccessKeyId,
    awsTextractSecretAccessKey,
    mapsProvider,
    googleMapsApiKey,
    mapboxAccessToken,
    emailEnabled,
    emailProvider,
    resendApiKey,
    smtpHost,
    smtpPort,
    smtpUser,
    smtpPass,
    emailFrom,
    emailWebhookSecret,
    smsEnabled,
    smsProvider,
    twilioAccountSid,
    twilioAuthToken,
    twilioFromNumber,
    smsWebhookSecret,
    whatsappEnabled,
    whatsappProvider,
    whatsappApiToken,
    whatsappPhoneNumberId,
    whatsappWebhookSecret,
    deliveryProvider,
    rapidoApiKey,
    rapidoClientId,
    rapidoClientSecret,
    rapidoBaseUrl,
    rapidoWebhookSecret,
  };
}

export const config: Config = getValidatedConfig();
export const loadConfig = getValidatedConfig;
