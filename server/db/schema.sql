-- =========================================================================
-- PostgreSQL Database Schema for Note Nest / Hify API
-- Fully supports Users, Notes, Reminders, Media Posts, and Chat Messages
-- =========================================================================

-- Enable UUID extension if available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------
-- 1. USERS TABLE
-- ----------------------------------------------------
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

-- ----------------------------------------------------
-- 2. NOTES TABLE
-- ----------------------------------------------------
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
CREATE INDEX IF NOT EXISTS idx_notes_is_archived ON notes (is_archived);
CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes (updated_at DESC);

-- ----------------------------------------------------
-- 3. REMINDERS TABLE
-- ----------------------------------------------------
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

-- ----------------------------------------------------
-- 4. MEDIA POSTS TABLE
-- ----------------------------------------------------
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
CREATE INDEX IF NOT EXISTS idx_media_posts_created_at ON media_posts (created_at DESC);

-- ----------------------------------------------------
-- 5. CHAT MESSAGES TABLE
-- ----------------------------------------------------
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

CREATE INDEX IF NOT EXISTS idx_chat_messages_recipient ON chat_messages (recipient_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp ON chat_messages (timestamp DESC);
