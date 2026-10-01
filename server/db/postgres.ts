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

const isRemoteHost = connInfo.host !== 'localhost' && connInfo.host !== '127.0.0.1';
const useSsl = process.env.PGSSL === 'true' || 
  rawUrl.includes('sslmode=require') || 
  rawUrl.includes('.neon.tech') || 
  rawUrl.includes('.supabase.co') || 
  (Boolean(process.env.DATABASE_URL) && isRemoteHost);

export let pool = new Pool({
  connectionString: connInfo.targetUrl,
  ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  connectionTimeoutMillis: 6000,
});

let isConnected = false;
let initPromise: Promise<boolean> | null = null;

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

const FALLBACK_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    username VARCHAR(64) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    cover_url TEXT,
    status VARCHAR(30) DEFAULT 'offline',
    custom_status TEXT,
    bio TEXT,
    role VARCHAR(100) DEFAULT 'Collaborator',
    location VARCHAR(100),
    skills JSONB DEFAULT '[]'::jsonb,
    work_history JSONB DEFAULT '[]'::jsonb,
    connections JSONB DEFAULT '[]'::jsonb,
    github_url TEXT,
    linkedin_url TEXT,
    website_url TEXT,
    preferences JSONB DEFAULT '{"theme":"dark","soundEnabled":true,"notificationsEnabled":true}'::jsonb,
    last_active TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users (LOWER(username));
CREATE INDEX IF NOT EXISTS idx_users_email ON users (LOWER(email));

CREATE TABLE IF NOT EXISTS notes (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    owner_username VARCHAR(64) NOT NULL,
    owner_name VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT DEFAULT '',
    checklist JSONB DEFAULT '[]'::jsonb,
    color VARCHAR(32) DEFAULT 'default',
    tags JSONB DEFAULT '[]'::jsonb,
    is_pinned BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    is_trash BOOLEAN DEFAULT FALSE,
    collaborators JSONB DEFAULT '[]'::jsonb,
    reminder_id VARCHAR(64),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes (user_id);
CREATE INDEX IF NOT EXISTS idx_notes_is_trash ON notes (is_trash);
CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes (updated_at DESC);

CREATE TABLE IF NOT EXISTS reminders (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    note_id VARCHAR(64),
    note_title VARCHAR(255),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date_time TIMESTAMPTZ NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium',
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders (user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_due ON reminders (due_date_time);

CREATE TABLE IF NOT EXISTS media_posts (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_name VARCHAR(255) NOT NULL,
    user_username VARCHAR(64) NOT NULL,
    user_avatar TEXT,
    user_role VARCHAR(100),
    title VARCHAR(255) NOT NULL,
    caption TEXT,
    type VARCHAR(20) NOT NULL DEFAULT 'photo',
    media_url TEXT NOT NULL,
    thumbnail_url TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    likes JSONB DEFAULT '[]'::jsonb,
    comments JSONB DEFAULT '[]'::jsonb,
    visibility VARCHAR(20) DEFAULT 'public',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_media_posts_user_id ON media_posts (user_id);

CREATE TABLE IF NOT EXISTS chat_messages (
    id VARCHAR(64) PRIMARY KEY,
    sender_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender_name VARCHAR(255) NOT NULL,
    sender_username VARCHAR(64) NOT NULL,
    sender_avatar TEXT,
    recipient_id VARCHAR(64) NOT NULL,
    text TEXT NOT NULL,
    attached_note_id VARCHAR(64),
    attached_note_title VARCHAR(255),
    attached_note_color VARCHAR(32),
    is_read BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
`;

// Auto-provision database and run schema migration
export async function initPostgresSchema(): Promise<boolean> {
  // Step 1: Ensure target database exists by connecting to 'postgres' administrative database (local only)
  if (!isRemoteHost) {
    try {
      const adminClient = new Client({
        connectionString: connInfo.adminUrl,
        ssl: useSsl ? { rejectUnauthorized: false } : undefined,
      });
      await adminClient.connect();
      try {
        const checkRes = await adminClient.query(
          'SELECT 1 FROM pg_database WHERE datname = $1',
          [connInfo.targetDb]
        );
        if (checkRes.rowCount === 0) {
          console.log(`Database "${connInfo.targetDb}" does not exist yet. Creating database...`);
          const safeDbName = connInfo.targetDb.replace(/[^a-zA-Z0-9_]/g, '');
          await adminClient.query(`CREATE DATABASE "${safeDbName}";`);
          console.log(`Database "${safeDbName}" created successfully.`);
        }
      } finally {
        await adminClient.end();
      }
    } catch (adminErr: any) {
      if (adminErr.message.includes('password authentication failed')) {
        console.error('\n' + '='.repeat(70));
        console.error('❌ [POSTGRESQL PASSWORD MISMATCH]');
        console.error(`PostgreSQL rejected password for user "${connInfo.user}".`);
        console.error('='.repeat(70) + '\n');
        isConnected = false;
        return false;
      }
    }
  }

  // Step 2: Connect pool to target database and execute schema
  try {
    const client = await pool.connect();
    try {
      console.log(`Connected to PostgreSQL database "${connInfo.targetDb}" successfully.`);
      const schemaPath = path.join(__dirname, 'schema.sql');
      let schemaSql = FALLBACK_SCHEMA_SQL;
      if (fs.existsSync(schemaPath)) {
        try {
          schemaSql = fs.readFileSync(schemaPath, 'utf-8');
        } catch (e) {}
      }
      await client.query(schemaSql);
      console.log('PostgreSQL schema initialized successfully (users, notes, reminders tables & indexes active).');
      isConnected = true;
      return true;
    } finally {
      client.release();
    }
  } catch (err: any) {
    isConnected = false;
    console.warn('[PostgreSQL notice] Database connection notice:', err.message);
    return false;
  }
}

export async function ensurePostgresConnected(): Promise<boolean> {
  if (isConnected) return true;
  if (!initPromise) {
    initPromise = initPostgresSchema().finally(() => {
      // Allow retry if it failed
      if (!isConnected) {
        initPromise = null;
      }
    });
  }
  return initPromise;
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
