// Authentication routes

import { Hono } from 'hono';
import type { Env, AuthContext } from '../types';
import { generateUUID, hashPassword, verifyPassword, generateResetToken } from '../utils/crypto';
import { createToken } from '../utils/jwt';
import { authMiddleware } from '../middleware/auth';

const auth = new Hono<{ Bindings: Env; Variables: { auth: AuthContext } }>();

/**
 * POST /auth/signup
 * Create a new user account
 */
auth.post('/signup', async (c) => {
  try {
    const body = await c.req.json();
    const { email, password, username } = body;
    
    if (!email || !password) {
      return c.json({ error: 'Email and password are required.' }, 400);
    }
    
    // Determine final username
    let finalUsername = username?.trim();
    if (!finalUsername || finalUsername.length < 3) {
      if (finalUsername && finalUsername.length > 0 && finalUsername.length < 3) {
        return c.json({ error: 'Provided username must be at least 3 characters long.' }, 400);
      }
      finalUsername = email.split('@')[0];
    }
    
    // Validate username
    if (finalUsername.includes('@') || /^YOUR_[A-Z0-9_]+$/i.test(finalUsername) || /^<.*>$/.test(finalUsername)) {
      return c.json({ error: 'Please choose a public username (not an email or placeholder).' }, 400);
    }
    
    // Check if user already exists
    const existingUser = await c.env.DB.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).bind(email).first();
    
    if (existingUser) {
      return c.json({ error: 'User already registered' }, 409);
    }
    
    // Check if username is taken
    const existingUsername = await c.env.DB.prepare(
      'SELECT id FROM profiles WHERE username = ?'
    ).bind(finalUsername).first();
    
    if (existingUsername) {
      return c.json({ error: 'Username already taken' }, 409);
    }
    
    // Create user
    const userId = generateUUID();
    const passwordHash = await hashPassword(password);
    const now = new Date().toISOString();
    
    await c.env.DB.prepare(
      'INSERT INTO users (id, email, password_hash, created_at, updated_at, email_verified, last_sign_in_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(userId, email, passwordHash, now, now, 0, now).run();
    
    // Create profile
    await c.env.DB.prepare(
      'INSERT INTO profiles (id, username, created_at, updated_at, current_streak, last_play_date) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(userId, finalUsername, now, now, 0, null).run();
    
    // Create session token
    const token = await createToken(userId, email, c.env.JWT_SECRET);
    
    return c.json({
      message: 'Signup successful! Username processed.',
      user: { id: userId, email },
      session: { access_token: token },
      username: finalUsername,
    }, 201);
    
  } catch (error: any) {
    console.error('Signup error:', error);
    return c.json({ error: 'An unexpected server error occurred.' }, 500);
  }
});

/**
 * POST /auth/login
 * Sign in with email and password
 */
auth.post('/login', async (c) => {
  try {
    const body = await c.req.json();
    const { email, password } = body;
    
    if (!email || !password) {
      return c.json({ error: 'Email and password are required.' }, 400);
    }
    
    // Find user
    const user = await c.env.DB.prepare(
      'SELECT id, email, password_hash FROM users WHERE email = ?'
    ).bind(email).first() as any;
    
    if (!user) {
      return c.json({ error: 'Invalid email or password' }, 401);
    }
    
    // Verify password
    const isValid = await verifyPassword(password, user.password_hash);
    
    if (!isValid) {
      return c.json({ error: 'Invalid email or password' }, 401);
    }
    
    // Update last sign in
    const now = new Date().toISOString();
    await c.env.DB.prepare(
      'UPDATE users SET last_sign_in_at = ?, updated_at = ? WHERE id = ?'
    ).bind(now, now, user.id).run();
    
    // Create session token
    const token = await createToken(user.id, user.email, c.env.JWT_SECRET);
    
    return c.json({
      message: 'Login successful',
      user: { id: user.id, email: user.email },
      session: { access_token: token },
    }, 200);
    
  } catch (error: any) {
    console.error('Login error:', error);
    return c.json({ error: 'An unexpected server error occurred.' }, 500);
  }
});

/**
 * POST /auth/update-password
 * Update user password (requires authentication)
 */
auth.post('/update-password', authMiddleware, async (c) => {
  try {
    const body = await c.req.json();
    const { password } = body;
    
    if (!password) {
      return c.json({ error: 'Password is required.' }, 400);
    }
    
    const auth = c.get('auth');
    const passwordHash = await hashPassword(password);
    const now = new Date().toISOString();
    
    await c.env.DB.prepare(
      'UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?'
    ).bind(passwordHash, now, auth.user.id).run();
    
    return c.json({ message: 'Password updated successfully' }, 200);
    
  } catch (error: any) {
    console.error('Update password error:', error);
    return c.json({ error: 'An unexpected server error occurred.' }, 500);
  }
});

/**
 * POST /auth/update-username
 * Update username (requires authentication)
 */
auth.post('/update-username', authMiddleware, async (c) => {
  try {
    const body = await c.req.json();
    const { username } = body;
    
    if (!username || username.trim().length < 3) {
      return c.json({ error: 'Username must be at least 3 characters long.' }, 400);
    }
    
    const finalUsername = username.trim();
    
    // Validate username
    if (finalUsername.includes('@') || /^YOUR_[A-Z0-9_]+$/i.test(finalUsername) || /^<.*>$/.test(finalUsername)) {
      return c.json({ error: 'Please choose a public username (not an email or placeholder).' }, 400);
    }
    
    // Check if username is taken
    const auth = c.get('auth');
    const existingUsername = await c.env.DB.prepare(
      'SELECT id FROM profiles WHERE username = ? AND id != ?'
    ).bind(finalUsername, auth.user.id).first();
    
    if (existingUsername) {
      return c.json({ error: 'Username already taken' }, 409);
    }
    
    // Update username
    const now = new Date().toISOString();
    await c.env.DB.prepare(
      'UPDATE profiles SET username = ?, updated_at = ? WHERE id = ?'
    ).bind(finalUsername, now, auth.user.id).run();
    
    return c.json({ message: 'Username updated successfully', username: finalUsername }, 200);
    
  } catch (error: any) {
    console.error('Update username error:', error);
    // Check for unique constraint violation
    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      return c.json({ error: 'Username already taken' }, 409);
    }
    return c.json({ error: 'An unexpected server error occurred.' }, 500);
  }
});

/**
 * GET /auth/profile
 * Get current user profile
 */
auth.get('/profile', authMiddleware, async (c) => {
  const auth = c.get('auth');
  return c.json({
    user: auth.user,
    profile: auth.profile,
  });
});

export default auth;
