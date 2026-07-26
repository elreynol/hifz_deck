// Type definitions for Hifz Deck API

export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
}

export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
  email_verified: number;
  last_sign_in_at: string | null;
}

export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  current_streak: number;
  last_play_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompletedSurah {
  id: number;
  user_id: string;
  surah_id: number;
  duration_seconds: number;
  difficulty: 'beginner' | 'experienced';
  card_count: 3 | 4 | 5;
  play_direction: 'forward' | 'reverse';
  points: number;
  juz?: number | null;
  hizb?: number | null;
  ayah_start?: number | null;
  ayah_end?: number | null;
  created_at: string;
}

export interface UserBadge {
  id: number;
  user_id: string;
  badge_id: string;
  created_at: string;
}

export interface JWTPayload {
  sub: string; // user_id
  email: string;
  iat: number;
  exp: number;
}

export interface AuthContext {
  user: User;
  profile: Profile;
}
