// Progress tracking routes

import { Hono } from 'hono';
import type { Env, AuthContext } from '../types';
import { authMiddleware } from '../middleware/auth';

const progress = new Hono<{ Bindings: Env; Variables: { auth: AuthContext } }>();

// Point calculation multipliers (matching Supabase Edge Function logic)
const CARD_MULT: Record<number, number> = { 3: 1.0, 4: 1.25, 5: 1.5 };
const LEVEL_MULT: Record<string, number> = { beginner: 1.0, experienced: 1.75 };
const DIRECTION_MULT: Record<string, number> = { forward: 1.0, reverse: 1.5 };

function computePoints(opts: {
  ayahCount: number;
  durationSeconds: number;
  cardCount: number;
  difficulty: string;
  playDirection: string;
  stopwatchEnabled: boolean;
}): number {
  const ayahs = Math.max(1, opts.ayahCount || 1);
  const duration = Math.max(1, Math.round(opts.durationSeconds || 1));
  const cardMult = CARD_MULT[opts.cardCount] ?? 1.0;
  const levelMult = LEVEL_MULT[opts.difficulty] ?? 1.0;
  const directionMult = DIRECTION_MULT[opts.playDirection] ?? 1.0;
  
  if (!opts.stopwatchEnabled) {
    return Math.round(ayahs * 10 * cardMult * levelMult * directionMult);
  }
  
  return Math.round(((ayahs * 100) / duration) * cardMult * levelMult * directionMult);
}

/**
 * POST /progress
 * Record completion progress
 */
progress.post('/', authMiddleware, async (c) => {
  try {
    const body = await c.req.json();
    const auth = c.get('auth');
    
    const surah_id = parseInt(String(body.surah_id), 10);
    const duration_seconds = Math.max(1, parseInt(String(body.duration_seconds), 10) || 0);
    const ayah_count = Math.max(1, parseInt(String(body.ayah_count ?? 1), 10) || 1);
    const card_count = [3, 4, 5].includes(Number(body.card_count)) ? Number(body.card_count) : 5;
    const difficulty = body.difficulty === 'experienced' ? 'experienced' : 'beginner';
    const play_direction = body.play_direction === 'reverse' ? 'reverse' : 'forward';
    const stopwatch_enabled = body.stopwatch_enabled !== false;
    const juz = body.juz != null ? parseInt(String(body.juz), 10) : null;
    const hizb = body.hizb != null ? parseInt(String(body.hizb), 10) : null;
    const ayah_start = body.ayah_start != null ? parseInt(String(body.ayah_start), 10) : null;
    const ayah_end = body.ayah_end != null ? parseInt(String(body.ayah_end), 10) : null;
    const badge_ids = Array.isArray(body.badge_ids)
      ? body.badge_ids.filter((id: any) => typeof id === 'string')
      : [];
    const current_streak = Math.max(0, parseInt(String(body.current_streak ?? 0), 10) || 0);
    const last_play_date = typeof body.last_play_date === 'string' ? body.last_play_date : null;
    
    if (isNaN(surah_id) || surah_id <= 0) {
      return c.json({ error: 'surah_id must be a positive number.' }, 400);
    }
    
    // Calculate points
    const points = computePoints({
      ayahCount: ayah_count,
      durationSeconds: duration_seconds,
      cardCount: card_count,
      difficulty,
      playDirection: play_direction,
      stopwatchEnabled: stopwatch_enabled,
    });
    
    // Insert completion record
    const now = new Date().toISOString();
    
    // Build insert query dynamically based on optional fields
    let insertQuery = `
      INSERT INTO completed_surahs 
      (user_id, surah_id, duration_seconds, difficulty, card_count, play_direction, points, created_at
    `;
    let values = [auth.user.id, surah_id, duration_seconds, difficulty, card_count, play_direction, points, now];
    
    if (juz != null && !isNaN(juz)) {
      insertQuery += ', juz';
      values.push(juz);
    }
    if (hizb != null && !isNaN(hizb)) {
      insertQuery += ', hizb';
      values.push(hizb);
    }
    if (ayah_start != null && !isNaN(ayah_start)) {
      insertQuery += ', ayah_start';
      values.push(ayah_start);
    }
    if (ayah_end != null && !isNaN(ayah_end)) {
      insertQuery += ', ayah_end';
      values.push(ayah_end);
    }
    
    insertQuery += ') VALUES (' + values.map(() => '?').join(', ') + ')';
    
    const result = await c.env.DB.prepare(insertQuery).bind(...values).run();
    
    // Update profile streak if last_play_date is provided
    if (last_play_date) {
      await c.env.DB.prepare(
        'UPDATE profiles SET last_play_date = ?, current_streak = ?, updated_at = ? WHERE id = ?'
      ).bind(last_play_date, current_streak, now, auth.user.id).run();
    }
    
    // Insert badges if provided
    if (badge_ids.length > 0) {
      for (const badge_id of badge_ids) {
        await c.env.DB.prepare(
          'INSERT OR IGNORE INTO user_badges (user_id, badge_id, created_at) VALUES (?, ?, ?)'
        ).bind(auth.user.id, badge_id, now).run();
      }
    }
    
    // Fetch the inserted record
    const recorded = await c.env.DB.prepare(
      'SELECT * FROM completed_surahs WHERE id = ?'
    ).bind(result.meta.last_row_id).first();
    
    return c.json({
      message: 'Progress recorded successfully!',
      recorded_progress: recorded,
      points,
    }, 201);
    
  } catch (error: any) {
    console.error('Progress recording error:', error);
    return c.json({
      error: 'Failed to record progress.',
      details: error.message,
    }, 500);
  }
});

/**
 * GET /progress/user/:username
 * Get user's progress by username
 */
progress.get('/user/:username', async (c) => {
  try {
    const username = c.req.param('username');
    
    // Get profile
    const profile = await c.env.DB.prepare(
      'SELECT * FROM profiles WHERE username = ?'
    ).bind(username).first();
    
    if (!profile) {
      return c.json({ error: 'Profile not found' }, 404);
    }
    
    // Get completed surahs
    const completions = await c.env.DB.prepare(
      'SELECT * FROM completed_surahs WHERE user_id = ? ORDER BY created_at DESC'
    ).bind((profile as any).id).all();
    
    // Get badges
    const badges = await c.env.DB.prepare(
      'SELECT badge_id, created_at FROM user_badges WHERE user_id = ?'
    ).bind((profile as any).id).all();
    
    return c.json({
      profile,
      completions: completions.results,
      badges: badges.results,
    });
    
  } catch (error: any) {
    console.error('Get progress error:', error);
    return c.json({ error: 'An unexpected server error occurred.' }, 500);
  }
});

export default progress;
