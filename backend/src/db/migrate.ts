import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function ensureMigrationTable(): Promise<void> {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

export async function getAppliedMigrations(): Promise<string[]> {
  await ensureMigrationTable();
  const res = await db.query<{ name: string }>('SELECT name FROM schema_migrations ORDER BY id ASC');
  return res.rows.map((r) => r.name);
}

export function getMigrationsDirectory(): string {
  const candidatePaths = [
    path.resolve(__dirname, 'migrations'),
    path.resolve(__dirname, '../../src/db/migrations'),
    path.resolve(process.cwd(), 'src/db/migrations'),
    path.resolve(process.cwd(), 'backend/src/db/migrations'),
    path.resolve(process.cwd(), 'dist/db/migrations'),
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p) && fs.readdirSync(p).some((f) => f.endsWith('.sql'))) {
      return p;
    }
  }

  // Default fallback
  return path.resolve(__dirname, 'migrations');
}

export async function getPendingMigrations(): Promise<string[]> {
  const migrationsDir = getMigrationsDirectory();
  if (!fs.existsSync(migrationsDir)) {
    return [];
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const applied = await getAppliedMigrations();
  return files.filter((f) => !applied.includes(f));
}

export async function runMigrations(): Promise<void> {
  console.log('[Migration] Checking ElectraKart database migrations...');
  await ensureMigrationTable();

  const pending = await getPendingMigrations();

  if (pending.length === 0) {
    console.log('[Migration] Database is up to date. No pending migrations.');
    return;
  }

  console.log(`[Migration] Found ${pending.length} pending migration(s): ${pending.join(', ')}`);

  const migrationsDir = getMigrationsDirectory();

  for (const filename of pending) {
    const filePath = path.join(migrationsDir, filename);
    const sql = fs.readFileSync(filePath, 'utf-8');

    console.log(`[Migration] Applying ${filename}...`);
    try {
      await db.exec(sql);
      await db.query('INSERT INTO schema_migrations (name) VALUES ($1)', [filename]);
      console.log(`[Migration] Successfully applied ${filename}.`);
    } catch (err) {
      console.error(`[Migration] Error applying ${filename}:`, err);
      throw err;
    }
  }

  console.log('[Migration] All migrations completed successfully.');
}

// If run directly: tsx src/db/migrate.ts
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations()
    .then(() => {
      console.log('[Migration] Done.');
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
