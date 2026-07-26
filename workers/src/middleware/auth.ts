// Authentication middleware

import { Context } from 'hono';
import type { Env, AuthContext } from '../types';
import { verifyToken, extractToken } from '../utils/jwt';

/**
 * Middleware to verify JWT and attach user to context
 */
export async function authMiddleware(c: Context<{ Bindings: Env; Variables: { auth: AuthContext } }>, next: () => Promise<void>) {
  const authHeader = c.req.header('Authorization');
  const token = extractToken(authHeader);
  
  if (!token) {
    return c.json({ error: 'Missing Authorization header.' }, 401);
  }
  
  const payload = await verifyToken(token, c.env.JWT_SECRET);
  
  if (!payload) {
    return c.json({ error: 'Invalid or expired token.' }, 401);
  }
  
  // Fetch user from database
  const user = await c.env.DB.prepare(
    'SELECT id, email, created_at, updated_at, email_verified, last_sign_in_at FROM users WHERE id = ?'
  ).bind(payload.sub).first();
  
  if (!user) {
    return c.json({ error: 'User not found.' }, 401);
  }
  
  // Fetch profile
  const profile = await c.env.DB.prepare(
    'SELECT * FROM profiles WHERE id = ?'
  ).bind(payload.sub).first();
  
  if (!profile) {
    return c.json({ error: 'Profile not found.' }, 401);
  }
  
  // Attach to context
  c.set('auth', {
    user: user as any,
    profile: profile as any,
  });
  
  await next();
}

/**
 * Optional auth middleware - doesn't fail if no token
 */
export async function optionalAuthMiddleware(c: Context<{ Bindings: Env; Variables: { auth?: AuthContext } }>, next: () => Promise<void>) {
  const authHeader = c.req.header('Authorization');
  const token = extractToken(authHeader);
  
  if (token) {
    const payload = await verifyToken(token, c.env.JWT_SECRET);
    
    if (payload) {
      const user = await c.env.DB.prepare(
        'SELECT id, email, created_at, updated_at, email_verified, last_sign_in_at FROM users WHERE id = ?'
      ).bind(payload.sub).first();
      
      const profile = await c.env.DB.prepare(
        'SELECT * FROM profiles WHERE id = ?'
      ).bind(payload.sub).first();
      
      if (user && profile) {
        c.set('auth', {
          user: user as any,
          profile: profile as any,
        });
      }
    }
  }
  
  await next();
}
