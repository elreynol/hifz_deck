-- Hifz Deck Database Schema for D1 (SQLite)
-- Migrated from Supabase PostgreSQL

-- Users table (replaces auth.users from Supabase)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, -- UUID as text
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    email_verified INTEGER DEFAULT 0, -- SQLite doesn't have BOOLEAN, use 0/1
    last_sign_in_at TEXT
);

-- Profiles table (public user profiles)
CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY, -- References users.id
    username TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    current_streak INTEGER DEFAULT 0,
    last_play_date TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE
);

-- Completed Surahs (progress tracking)
CREATE TABLE IF NOT EXISTS completed_surahs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    surah_id INTEGER NOT NULL,
    duration_seconds INTEGER NOT NULL,
    difficulty TEXT DEFAULT 'beginner', -- 'beginner' or 'experienced'
    card_count INTEGER DEFAULT 5, -- 3, 4, or 5
    play_direction TEXT DEFAULT 'forward', -- 'forward' or 'reverse'
    points INTEGER NOT NULL,
    juz INTEGER,
    hizb INTEGER,
    ayah_start INTEGER,
    ayah_end INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- User Badges
CREATE TABLE IF NOT EXISTS user_badges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    badge_id TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, badge_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- OAuth providers (for Google OAuth)
CREATE TABLE IF NOT EXISTS oauth_providers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    provider TEXT NOT NULL, -- 'google'
    provider_user_id TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(provider, provider_user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at TEXT NOT NULL,
    used INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_completed_surahs_user_id ON completed_surahs(user_id);
CREATE INDEX IF NOT EXISTS idx_completed_surahs_surah_id ON completed_surahs(surah_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_providers_user_id ON oauth_providers(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
