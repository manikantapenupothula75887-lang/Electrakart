import pg from 'pg';
import { PGlite } from '@electric-sql/pglite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { config } from '../config/environment.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
}

export interface DbClient {
  query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>;
}

export interface IDatabase extends DbClient {
  exec(sql: string): Promise<void>;
  withTransaction<T>(callback: (client: DbClient) => Promise<T>): Promise<T>;
  healthCheck(): Promise<{ isHealthy: boolean; engine: string; serverTime: string; latencyMs: number; error?: string }>;
  validateConnection(): Promise<void>;
  close(): Promise<void>;
  getEngineType(): 'PG_POOL' | 'PGLITE';
}

class PostgresDatabase implements IDatabase {
  private pool: pg.Pool | null = null;
  private pglite: PGlite | null = null;
  private engineType: 'PG_POOL' | 'PGLITE';
  private isInitializing: Promise<void> | null = null;

  constructor() {
    const isExternalPg =
      config.databaseUrl.startsWith('postgresql://') || config.databaseUrl.startsWith('postgres://');

    if (config.isProduction && !isExternalPg) {
      throw new Error(
        '[Database Error] Production environment requires a valid PostgreSQL DATABASE_URL. PGlite is prohibited in production.'
      );
    }

    if (isExternalPg) {
      this.engineType = 'PG_POOL';
      const isRemoteHost =
        !config.databaseUrl.includes('localhost') &&
        !config.databaseUrl.includes('127.0.0.1') &&
        !config.databaseUrl.includes('postgres:5432');
      const useSsl =
        process.env.DB_SSL === 'true' ||
        (process.env.DB_SSL !== 'false' && (config.databaseUrl.includes('sslmode=') || isRemoteHost));

      this.pool = new pg.Pool({
        connectionString: config.databaseUrl,
        max: config.dbPoolMax,
        idleTimeoutMillis: config.dbIdleTimeoutMs,
        connectionTimeoutMillis: config.dbConnectionTimeoutMs,
        ssl: useSsl ? { rejectUnauthorized: false } : undefined,
      });

      this.pool.on('error', (err) => {
        console.error('[PostgreSQL Pool Error]:', err);
      });
    } else {
      this.engineType = 'PGLITE';
    }
  }

  public getEngineType(): 'PG_POOL' | 'PGLITE' {
    return this.engineType;
  }

  private async ensureInitialized(): Promise<void> {
    if (this.engineType === 'PGLITE' && !this.pglite) {
      if (!this.isInitializing) {
        this.isInitializing = (async () => {
          let dataDir = config.databaseUrl.replace('pglite://', '');
          if (!path.isAbsolute(dataDir)) {
            dataDir = path.resolve(__dirname, '../../', dataDir);
          }
          if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
          }

          this.pglite = new PGlite(dataDir);
          await this.pglite.waitReady;
        })();
      }
      await this.isInitializing;
    }
  }

  async validateConnection(): Promise<void> {
    await this.ensureInitialized();
    if (this.engineType === 'PG_POOL' && this.pool) {
      const client = await this.pool.connect();
      try {
        await client.query('SELECT 1');
      } finally {
        client.release();
      }
    } else if (this.engineType === 'PGLITE') {
      if (config.isProduction) {
        throw new Error('[Database Error] PGlite cannot be used in production.');
      }
      await this.pglite!.query('SELECT 1');
    }
  }

  async exec(sql: string): Promise<void> {
    await this.ensureInitialized();
    if (this.engineType === 'PG_POOL' && this.pool) {
      await this.pool.query(sql);
    } else if (this.pglite) {
      await this.pglite.exec(sql);
    } else {
      throw new Error('Database not initialized');
    }
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
    await this.ensureInitialized();

    if (this.engineType === 'PG_POOL' && this.pool) {
      const res = await this.pool.query(sql, params);
      return {
        rows: res.rows as T[],
        rowCount: res.rowCount ?? res.rows.length,
      };
    } else if (this.pglite) {
      const res = await this.pglite.query(sql, params);
      return {
        rows: (res.rows || []) as T[],
        rowCount: (res.rows || []).length,
      };
    }

    throw new Error('Database not initialized');
  }

  async withTransaction<T>(callback: (client: DbClient) => Promise<T>): Promise<T> {
    await this.ensureInitialized();

    if (this.engineType === 'PG_POOL' && this.pool) {
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');
        const txClient: DbClient = {
          query: async (sql, params = []) => {
            const res = await client.query(sql, params);
            return {
              rows: res.rows,
              rowCount: res.rowCount ?? res.rows.length,
            };
          },
        };
        const result = await callback(txClient);
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } else if (this.pglite) {
      return await this.pglite.transaction(async (tx) => {
        const txClient: DbClient = {
          query: async <T = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> => {
            const res = await tx.query(sql, params);
            return {
              rows: (res.rows || []) as T[],
              rowCount: (res.rows || []).length,
            };
          },
        };
        return await callback(txClient);
      });
    }

    throw new Error('Database not initialized');
  }

  async healthCheck(): Promise<{ isHealthy: boolean; engine: string; serverTime: string; latencyMs: number; error?: string }> {
    const start = Date.now();
    try {
      const res = await this.query('SELECT NOW() AS server_time');
      const latencyMs = Date.now() - start;
      const serverTime = res.rows[0]?.server_time
        ? new Date(res.rows[0].server_time).toISOString()
        : new Date().toISOString();

      return {
        isHealthy: true,
        engine: this.engineType === 'PG_POOL' ? 'PostgreSQL Native/Remote (pg.Pool)' : 'PostgreSQL 16 Embedded (PGlite)',
        serverTime,
        latencyMs,
      };
    } catch (err: any) {
      return {
        isHealthy: false,
        engine: this.engineType,
        serverTime: new Date().toISOString(),
        latencyMs: Date.now() - start,
        error: err.message,
      };
    }
  }

  async close(): Promise<void> {
    if (this.pool) {
      const p = this.pool;
      this.pool = null;
      try {
        await Promise.race([
          p.end(),
          new Promise((resolve) => setTimeout(resolve, 5000)),
        ]);
      } catch (err) {
        console.warn('[Database] Error closing pool:', err);
      }
    }
    if (this.pglite) {
      const pg = this.pglite;
      this.pglite = null;
      try {
        await pg.close();
      } catch (err) {
        console.warn('[Database] Error closing PGlite:', err);
      }
    }
  }
}

export const db: IDatabase = new PostgresDatabase();
