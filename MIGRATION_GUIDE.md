# Migration Guide: Supabase to Cloudflare

This guide explains how to migrate the Hifz Deck application from Supabase to Cloudflare Workers with D1.

## Overview

The migration replaces:
- **Supabase Auth** → Custom JWT authentication with Cloudflare Workers
- **PostgreSQL (Supabase)** → D1 (SQLite on Cloudflare)
- **Supabase Edge Functions** → Cloudflare Workers with Hono framework
- **PostgREST API** → Custom REST API routes

## Architecture Changes

### Before (Supabase)
```
React App → Supabase Client → Supabase Services
                              ├── Auth
                              ├── PostgreSQL + PostgREST
                              └── Edge Functions
```

### After (Cloudflare)
```
React App → API Client → Cloudflare Workers → D1 Database
                                            └── JWT Auth
```

## Setup Instructions

### 1. Set Up Cloudflare Workers Backend

```bash
cd workers
npm install

# Login to Cloudflare
npx wrangler login

# Create D1 database
npm run db:create
# Copy the database_id output and update wrangler.toml

# Initialize database schema
npm run db:init

# Set secrets
npx wrangler secret put JWT_SECRET
# Generate a strong secret: openssl rand -base64 32
```

### 2. Deploy the Worker

```bash
# Test locally first
npm run dev

# Deploy to production
npm run deploy
```

Your API will be available at: `https://hifz-deck-api.<your-subdomain>.workers.dev`

### 3. Migrate Data from Supabase

If you have existing data in Supabase, you'll need to export and import it:

#### Export from Supabase

```sql
-- Export users and profiles
SELECT * FROM auth.users;
SELECT * FROM public.profiles;
SELECT * FROM public.completed_surahs;
SELECT * FROM public.user_badges;
```

#### Import to D1

Create SQL INSERT statements for your data and run:

```bash
npx wrangler d1 execute hifz_deck_db --file=./import.sql
```

**Note**: Passwords cannot be migrated as they're hashed differently. Users will need to reset passwords or create new accounts.

### 4. Update React App Configuration

```bash
cd hifz_deck_react

# Create .env file
cp .env.example .env

# Edit .env and set your Worker URL
# VITE_API_URL=https://hifz-deck-api.<your-subdomain>.workers.dev
```

### 5. Test the Application

```bash
npm run dev
```

Test the following functionality:
- [ ] User signup
- [ ] User login
- [ ] Progress recording
- [ ] Leaderboard display
- [ ] Profile viewing
- [ ] Username/password updates

### 6. Deploy Updated Frontend

```bash
npm run build
npm run deploy
```

## Key Differences

### Authentication

**Supabase:**
```javascript
const { data, error } = await supabase.auth.signUp({ email, password });
const { data: { session } } = await supabase.auth.getSession();
```

**Cloudflare:**
```javascript
const { data, error } = await auth.signup(email, password, username);
// Token is stored automatically in localStorage
```

### Database Queries

**Supabase (PostgREST):**
```javascript
const { data } = await supabase
  .from('profiles')
  .select('*')
  .eq('username', username)
  .single();
```

**Cloudflare:**
```javascript
const { data } = await profiles.getByUsername(username);
```

### Edge Functions

**Supabase:**
```javascript
const { data } = await supabase.functions.invoke('progress', {
  body: { surah_id, duration_seconds }
});
```

**Cloudflare:**
```javascript
const { data } = await apiProgress.record({
  surah_id,
  duration_seconds
});
```

## Not Yet Implemented

The following features from Supabase are not yet implemented in the Cloudflare version:

1. **Google OAuth** - Social login needs to be implemented
2. **Password Reset Emails** - Email service integration needed
3. **Row Level Security (RLS)** - Security is now handled in application code

### Implementing Google OAuth

To add Google OAuth:

1. Set up OAuth in Google Cloud Console
2. Add OAuth flow to Workers (see `/workers/README.md`)
3. Set secrets: `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`

### Implementing Password Reset

To add password reset:

1. Choose an email service (Resend, SendGrid, etc.)
2. Add email sending to Workers
3. Implement reset token generation and verification
4. Update frontend forms

## Rollback Plan

If you need to rollback to Supabase:

1. Keep the old Supabase configuration
2. Don't delete Supabase project immediately
3. Git checkout the pre-migration commit
4. Redeploy the frontend

## Cost Comparison

### Supabase Free Tier
- 500MB database
- 2GB bandwidth
- 50,000 monthly active users
- Edge Functions included

### Cloudflare Free Tier
- 5GB D1 database (25 billion row reads/month)
- 100,000 Workers requests/day
- Unlimited bandwidth on Workers
- 10ms CPU time per request

For most small to medium applications, Cloudflare's free tier is more generous.

## Support

For issues or questions:
1. Check the Workers README: `/workers/README.md`
2. Review Cloudflare D1 docs: https://developers.cloudflare.com/d1/
3. Review Workers docs: https://developers.cloudflare.com/workers/

## Troubleshooting

### "Failed to fetch" errors

Check that:
- Worker is deployed and accessible
- VITE_API_URL is set correctly
- CORS is enabled in the Worker (it should be by default)

### "Unauthorized" errors

Check that:
- JWT_SECRET is set in Worker secrets
- Token is being stored in localStorage
- Token hasn't expired (7 day default)

### Database errors

Check that:
- D1 database is created and bound in wrangler.toml
- Schema is initialized with `npm run db:init`
- Database_id matches in wrangler.toml

## Next Steps

After successful migration:

1. **Monitor** your Workers dashboard for performance and errors
2. **Set up** monitoring/logging (e.g., Sentry, LogTail)
3. **Implement** rate limiting for security
4. **Add** automated tests
5. **Document** your API endpoints
6. **Consider** adding caching for frequently accessed data

## Additional Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [D1 Documentation](https://developers.cloudflare.com/d1/)
- [Hono Framework](https://hono.dev/)
- [JWT Best Practices](https://datatracker.ietf.org/doc/html/rfc8725)
