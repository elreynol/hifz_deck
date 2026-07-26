// Main Cloudflare Worker entry point for Hifz Deck API

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';

// Import routes
import auth from './routes/auth';
import progress from './routes/progress';
import leaderboard from './routes/leaderboard';

const app = new Hono<{ Bindings: Env }>();

// CORS middleware - allow all origins for development
// In production, you should restrict this to your domain
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Authorization', 'Content-Type', 'x-client-info', 'apikey'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
  credentials: false,
}));

// Health check endpoint
app.get('/', (c) => {
  return c.json({
    message: 'Hifz Deck API - Cloudflare Workers',
    version: '1.0.0',
    status: 'healthy',
  });
});

// Mount routes
app.route('/auth', auth);
app.route('/progress', progress);
app.route('/leaderboard', leaderboard);

// 404 handler
app.notFound((c) => {
  return c.json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist.',
  }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({
    error: 'Internal Server Error',
    message: err.message,
  }, 500);
});

export default app;
