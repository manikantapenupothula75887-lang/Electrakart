import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export interface Config {
  nodeEnv: string;
  port: number;
  host: string;
  corsOrigin: string;
  jwtSecret: string;
  jwtExpiresIn: number;
  databaseUrl: string;
}

export const config: Config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.API_PORT || '5000', 10),
  host: process.env.API_HOST || '0.0.0.0',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET || 'dev-electrakart-secret-key-384918294021',
  jwtExpiresIn: parseInt(process.env.JWT_EXPIRES_IN || '86400', 10),
  databaseUrl: process.env.DATABASE_URL || 'pglite://./data/pgdata',
};
