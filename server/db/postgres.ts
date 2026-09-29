import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// PostgreSQL connection configuration
const connectionString = process.env.DATABASE_URL;

export const pool = new Pool(
  connectionString
    ? {
        connectionString,
        ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
      }
    : {
        host: process.env.PGHOST || '127.0.0.1',
        port: parseInt(process.env.PGPORT || '5432', 10),
        user: process.env.PGUSER || 'postgres',
        password: process.env.PGPASSWORD || '',
        database: process.env.PGDATABASE || 'notenest',
        ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
      }
);

let isConnected = false;

// Parameterized query execution
export async function query<T = any>(text: string, params: any[] = []): Promise<pg.QueryResult<T>> {
  const start = Date.now();
  try {
    const res = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    if (process.env.DEBUG_SQL === 'true') {
      console.log('Executed SQL query:', { text, duration, rows: res.rowCount });
    }
    return res;
  } catch (err: any) {
    console.error('PostgreSQL Query Error:', {
      text,
      params,
      message: err.message,
      code: err.code,
    });
    throw err;
  }
}

// Auto-run schema migration on startup
export async function initPostgresSchema(): Promise<boolean> {
  try {
    const client = await pool.connect();
    try {
      console.log('Connected to PostgreSQL successfully.');
      const schemaPath = path.join(__dirname, 'schema.sql');
      if (fs.existsSync(schemaPath)) {
        const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
        await client.query(schemaSql);
        console.log('PostgreSQL schema initialized successfully (tables & indexes verified).');
      }
      isConnected = true;
      return true;
    } finally {
      client.release();
    }
  } catch (err: any) {
    isConnected = false;
    console.warn(`PostgreSQL connection notice: ${err.message}`);
    console.warn('Set DATABASE_URL or PGHOST, PGUSER, PGPASSWORD, PGDATABASE in your .env file to enable PostgreSQL persistence.');
    return false;
  }
}

export function isPostgresAvailable(): boolean {
  return isConnected;
}

// Graceful pool shutdown on exit
process.on('SIGINT', async () => {
  try {
    await pool.end();
  } catch (e) {
    // Ignore error on close
  }
});
