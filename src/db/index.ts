import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import dotenv from 'dotenv';
import * as schema from './schema.ts';

dotenv.config();

const { Pool } = pg;

declare global {
  var _postgresPool: pg.Pool | undefined;
}

/**
 * Resolves the PostgreSQL connection configuration.
 * Supports:
 * 1. Supabase / External PostgreSQL connection string (`DATABASE_URL`, `SUPABASE_DB_URL`, `POSTGRES_URL`)
 * 2. Cloud SQL / individual host credentials (`SQL_HOST`, `SQL_USER`, `SQL_PASSWORD`, `SQL_DB_NAME`)
 */
export function isDatabaseConfigured(): boolean {
  const connUrl =
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DB_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL;
  if (connUrl && connUrl.trim().length > 0) return true;
  if (process.env.SQL_HOST && process.env.SQL_HOST.trim().length > 0) return true;
  return false;
}

export const createPool = () => {
  if (!global._postgresPool) {
    const connectionString =
      process.env.DATABASE_URL ||
      process.env.SUPABASE_DB_URL ||
      process.env.POSTGRES_URL ||
      process.env.POSTGRES_PRISMA_URL;

    if (connectionString && connectionString.trim().length > 0) {
      const isLocal =
        connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
      global._postgresPool = new Pool({
        connectionString: connectionString.trim(),
        ssl: isLocal ? false : { rejectUnauthorized: false },
        max: 10,
        connectionTimeoutMillis: 8000,
        idleTimeoutMillis: 30000,
      });
    } else {
      global._postgresPool = new Pool({
        host: process.env.SQL_HOST || '127.0.0.1',
        user: process.env.SQL_USER || 'postgres',
        password: process.env.SQL_PASSWORD || '',
        database: process.env.SQL_DB_NAME || 'postgres',
        port: Number(process.env.SQL_PORT || 5432),
        max: 10,
        connectionTimeoutMillis: 4000,
        idleTimeoutMillis: 30000,
      });
    }

    global._postgresPool.on('error', (err) => {
      console.warn('Unexpected error on idle SQL pool client:', err);
    });
  }
  return global._postgresPool;
};

const pool = createPool();

export const db = drizzle(pool, { schema });
