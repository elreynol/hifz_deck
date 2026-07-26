// Leaderboard routes

import { Hono } from 'hono';
import type { Env } from '../types';

const leaderboard = new Hono<{ Bindings: Env }>();

/**
 * GET /leaderboard
 * Get leaderboard data
 * 
 * This implements the logic of the get_leaderboard RPC function from Supabase
 */
leaderboard.get('/', async (c) => {
  try {
    const limitParam = c.req.query('limit');
    let limit = limitParam ? parseInt(limitParam, 10) : 10;
    
    if (isNaN(limit) || limit <= 0) {
      return c.json({ error: 'Invalid limit parameter. Must be a positive number.' }, 400);
    }
    
    // Cap the limit to prevent excessive queries
    limit = Math.min(limit, 100);
    
    // Query to get leaderboard data
    // This aggregates user completion data similar to the PostgreSQL RPC function
    const query = `
      SELECT 
        p.username,
        p.avatar_url,
        p.current_streak,
        COUNT(DISTINCT cs.surah_id) as total_correct_surahs,
        SUM(cs.points) as total_points,
        MAX(cs.created_at) as last_completion_date
      FROM profiles p
      LEFT JOIN completed_surahs cs ON p.id = cs.user_id
      GROUP BY p.id, p.username, p.avatar_url, p.current_streak
      HAVING COUNT(cs.id) > 0
      ORDER BY total_points DESC, total_correct_surahs DESC
      LIMIT ?
    `;
    
    const result = await c.env.DB.prepare(query).bind(limit).all();
    
    return c.json(result.results, 200);
    
  } catch (error: any) {
    console.error('Leaderboard query error:', error);
    return c.json({
      error: 'Failed to fetch leaderboard data.',
      details: error.message,
    }, 500);
  }
});

/**
 * GET /leaderboard/user/:username
 * Get leaderboard position for a specific user
 */
leaderboard.get('/user/:username', async (c) => {
  try {
    const username = c.req.param('username');
    
    // Get user's stats
    const userQuery = `
      SELECT 
        p.username,
        p.avatar_url,
        p.current_streak,
        COUNT(DISTINCT cs.surah_id) as total_correct_surahs,
        SUM(cs.points) as total_points,
        MAX(cs.created_at) as last_completion_date
      FROM profiles p
      LEFT JOIN completed_surahs cs ON p.id = cs.user_id
      WHERE p.username = ?
      GROUP BY p.id, p.username, p.avatar_url, p.current_streak
    `;
    
    const userStats = await c.env.DB.prepare(userQuery).bind(username).first();
    
    if (!userStats) {
      return c.json({ error: 'User not found' }, 404);
    }
    
    // Calculate position
    const positionQuery = `
      SELECT COUNT(*) as position
      FROM (
        SELECT 
          p.id,
          SUM(cs.points) as total_points,
          COUNT(DISTINCT cs.surah_id) as total_correct_surahs
        FROM profiles p
        LEFT JOIN completed_surahs cs ON p.id = cs.user_id
        GROUP BY p.id
        HAVING SUM(cs.points) > ? OR (SUM(cs.points) = ? AND COUNT(DISTINCT cs.surah_id) > ?)
      )
    `;
    
    const position = await c.env.DB.prepare(positionQuery)
      .bind(
        (userStats as any).total_points,
        (userStats as any).total_points,
        (userStats as any).total_correct_surahs
      )
      .first();
    
    return c.json({
      ...userStats,
      position: ((position as any)?.position || 0) + 1,
    });
    
  } catch (error: any) {
    console.error('User leaderboard position error:', error);
    return c.json({ error: 'An unexpected server error occurred.' }, 500);
  }
});

export default leaderboard;
