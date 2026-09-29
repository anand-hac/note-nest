import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const { Pool, Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rawUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/notenest';

// Parse connection URL to get base connection and target database
function parseConnection(connStr: string) {
  try {
    const url = new URL(connStr);
    const dbName = url.pathname.replace(/^\//, '') || 'notenest';
    
    // URL pointing to the default 'postgres' maintenance database for provisioning
    const adminUrl = new URL(connStr);
    adminUrl.pathname = '/postgres';

    return {
      targetDb: dbName,
      targetUrl: connStr,
      adminUrl: adminUrl.toString(),
      user: url.username || 'postgres',
      host: url.hostname || 'localhost',
      port: url.port || '5432',
    };
  } catch {
    return {
      targetDb: 'notenest',
      targetUrl: connStr,
      adminUrl: connStr,
      user: 'postgres',
      host: 'localhost',
      port: '5432',
    };
  }
}

const connInfo = parseConnection(rawUrl);

export let pool = new Pool({
  connectionString: connInfo.targetUrl,
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

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

// Auto-provision database and run schema migration
export async function initPostgresSchema(): Promise<boolean> {
  // Step 1: Ensure target database exists by connecting to 'postgres' administrative database
  try {
    const adminClient = new Client({
      connectionString: connInfo.adminUrl,
      ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
    });
    await adminClient.connect();
    try {
      const checkRes = await adminClient.query(
        'SELECT 1 FROM pg_database WHERE datname = $1',
        [connInfo.targetDb]
      );
      if (checkRes.rowCount === 0) {
        console.log(`Database "${connInfo.targetDb}" does not exist yet. Creating database...`);
        // Database names cannot be parameterized in CREATE DATABASE
        const safeDbName = connInfo.targetDb.replace(/[^a-zA-Z0-9_]/g, '');
        await adminClient.query(`CREATE DATABASE "${safeDbName}";`);
        console.log(`Database "${safeDbName}" created successfully.`);
      }
    } finally {
      await adminClient.end();
    }
  } catch (adminErr: any) {
    // If admin check fails due to auth or permission, continue to pool connect attempt
    if (adminErr.message.includes('password authentication failed')) {
      console.error('\n' + '='.repeat(70));
      console.error('❌ [POSTGRESQL PASSWORD MISMATCH]');
      console.error(`PostgreSQL rejected password for user "${connInfo.user}".`);
      console.error('Your data cannot save to PostgreSQL until you enter the correct password in .env:');
      console.error(`DATABASE_URL=postgresql://${connInfo.user}:<YOUR_PASSWORD>@${connInfo.host}:${connInfo.port}/${connInfo.targetDb}`);
      console.error('='.repeat(70) + '\n');
      isConnected = false;
      return false;
    }
  }

  // Step 2: Connect pool to target database and execute schema.sql
  try {
    const client = await pool.connect();
    try {
      console.log(`Connected to PostgreSQL database "${connInfo.targetDb}" successfully.`);
      const schemaPath = path.join(__dirname, 'schema.sql');
      if (fs.existsSync(schemaPath)) {
        const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
        await client.query(schemaSql);
        console.log('PostgreSQL schema initialized successfully (users, notes, reminders tables & indexes active).');
      }
      isConnected = true;
      return true;
    } finally {
      client.release();
    }
  } catch (err: any) {
    isConnected = false;
    console.error('\n' + '='.repeat(70));
    console.error('❌ [POSTGRESQL CONNECTION FAILED]');
    console.error(`Error: ${err.message}`);
    console.error('Data is temporarily falling back to local storage until PostgreSQL connects.');
    console.error('Update your DATABASE_URL in .env:');
    console.error(`DATABASE_URL=postgresql://${connInfo.user}:<YOUR_PASSWORD>@${connInfo.host}:${connInfo.port}/${connInfo.targetDb}`);
    console.error('='.repeat(70) + '\n');
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
