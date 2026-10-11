import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';

const { Pool } = pg;

declare global {
  var _postgresPool: pg.Pool | undefined;
}

/**
 * Checks whether a PostgreSQL connection is configured via either:
 * 1. Cloud SQL / direct host credentials (SQL_HOST)
 * 2. Supabase / PostgreSQL connection URL (SUPABASE_DB_URL, POSTGRES_URL, DATABASE_URL)
 */
export function isDatabaseConfigured(): boolean {
  if (process.env.SQL_HOST && process.env.SQL_HOST.trim().length > 0) {
    return true;
  }
  const externalUrl =
    process.env.SUPABASE_DB_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL;
  return Boolean(externalUrl && externalUrl.trim().length > 0);
}

export const createPool = () => {
  if (!global._postgresPool) {
    // 1. Prefer provisioned Cloud SQL host/socket when available in runtime
    if (process.env.SQL_HOST && process.env.SQL_HOST.trim().length > 0) {
      global._postgresPool = new Pool({
        host: process.env.SQL_HOST,
        user: process.env.SQL_USER,
        password: process.env.SQL_PASSWORD,
        database: process.env.SQL_DB_NAME,
        max: 10,
        connectionTimeoutMillis: 15000,
      });
    } else {
      // 2. External Supabase PostgreSQL / Vercel serverless deployment
      const rawUrl = (
        process.env.SUPABASE_DB_URL ||
        process.env.POSTGRES_URL ||
        process.env.DATABASE_URL ||
        ''
      ).trim();

      if (rawUrl) {
        try {
          const parsed = new URL(rawUrl);
          const isLocal =
            parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
          global._postgresPool = new Pool({
            host: parsed.hostname,
            port: Number(parsed.port || 5432),
            user: decodeURIComponent(parsed.username || 'postgres'),
            password: decodeURIComponent(parsed.password || ''),
            database: parsed.pathname.replace(/^\//, '') || 'postgres',
            ssl: isLocal ? false : { rejectUnauthorized: false },
            max: 10,
            connectionTimeoutMillis: 15000,
          });
        } catch {
          global._postgresPool = new Pool({
            host: '127.0.0.1',
            user: 'postgres',
            password: '',
            database: 'postgres',
            max: 5,
            connectionTimeoutMillis: 5000,
          });
        }
      } else {
        global._postgresPool = new Pool({
          host: '127.0.0.1',
          user: 'postgres',
          password: '',
          database: 'postgres',
          max: 5,
          connectionTimeoutMillis: 5000,
        });
      }
    }

    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }
  return global._postgresPool;
};

const pool = createPool();

export const db = drizzle(pool, { schema });
