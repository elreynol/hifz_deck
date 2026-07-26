# Hifz Deck API - Cloudflare Workers

This is the backend API for Hifz Deck, migrated from Supabase to Cloudflare Workers with D1 database.

## Features

- **Authentication**: Email/password signup and login with JWT tokens
- **Progress Tracking**: Record Quran study progress and calculate points
- **Leaderboard**: View global rankings and user statistics
- **D1 Database**: SQLite-based serverless database
- **Edge Computing**: Deploy globally on Cloudflare's network

## Setup

### Prerequisites

- Node.js 18+ and npm
- Cloudflare account ([sign up free](https://dash.cloudflare.com/sign-up))
- Wrangler CLI (installed locally in this project)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Login to Cloudflare:
```bash
npx wrangler login
```

3. Create D1 database:
```bash
npm run db:create
```

This will output a database ID. Copy it and update the `database_id` in `wrangler.toml`.

4. Initialize database schema:
```bash
npm run db:init
```

For local development:
```bash
npm run db:init-local
```

5. Set secrets:
```bash
npx wrangler secret put JWT_SECRET
# Enter a strong random string (e.g., generated with: openssl rand -base64 32)
```

For Google OAuth (optional):
```bash
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
```

## Development

Run locally with D1 local database:
```bash
npm run dev
```

The API will be available at `http://localhost:8787`

## Deployment

Deploy to Cloudflare Workers:
```bash
npm run deploy
```

Your API will be deployed to: `https://hifz-deck-api.<your-subdomain>.workers.dev`

## API Endpoints

### Authentication

- `POST /auth/signup` - Create new user account
- `POST /auth/login` - Sign in with email/password
- `POST /auth/update-password` - Update password (requires auth)
- `POST /auth/update-username` - Update username (requires auth)
- `GET /auth/profile` - Get current user profile (requires auth)

### Progress

- `POST /progress` - Record completion progress (requires auth)
- `GET /progress/user/:username` - Get user's progress by username

### Leaderboard

- `GET /leaderboard?limit=10` - Get leaderboard data
- `GET /leaderboard/user/:username` - Get user's leaderboard position

## Authentication

All authenticated endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

Tokens are returned from the `/auth/signup` and `/auth/login` endpoints.

## Database Schema

The D1 database includes the following tables:

- `users` - User accounts with authentication
- `profiles` - Public user profiles
- `completed_surahs` - Progress records
- `user_badges` - User achievements
- `oauth_providers` - OAuth integration (for Google)
- `password_reset_tokens` - Password reset functionality

See `schema.sql` for the complete schema definition.

## Migration from Supabase

This API replaces the following Supabase features:

- **Supabase Auth** → Custom JWT authentication
- **PostgreSQL** → Cloudflare D1 (SQLite)
- **Edge Functions** → Cloudflare Workers routes
- **PostgREST** → Hono framework routing

### Key Differences

1. **Database**: SQLite instead of PostgreSQL
   - No UUID type (using TEXT)
   - No SERIAL type (using INTEGER PRIMARY KEY AUTOINCREMENT)
   - Different date/time handling (using ISO 8601 strings)

2. **Authentication**: Custom JWT instead of Supabase Auth
   - Tokens expire in 7 days
   - No built-in OAuth providers (implement separately)
   - Row-level security must be handled in application code

3. **API Structure**: RESTful routes instead of PostgREST
   - More explicit routing
   - Custom middleware for authentication
   - Standard HTTP methods

## Environment Variables

Set these using `wrangler secret put`:

- `JWT_SECRET` - Secret key for JWT signing (required)
- `GOOGLE_CLIENT_ID` - Google OAuth client ID (optional)
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret (optional)

## TODO

- [ ] Implement Google OAuth flow
- [ ] Add password reset email functionality
- [ ] Implement rate limiting
- [ ] Add API request validation
- [ ] Set up monitoring and logging
- [ ] Add automated tests

## License

Same as the main Hifz Deck project.
