# Data Migration from Supabase to Cloudflare D1

Your D1 database is now set up! Here's how to migrate your existing data from Supabase.

## Database Information

- **Database ID**: `c79f88b8-0673-4eea-8461-67abaf565888`
- **Name**: `hifz_deck_db`
- **Location**: WNAM (Western North America)
- **Tables**: 6 (users, profiles, completed_surahs, user_badges, oauth_providers, password_reset_tokens)
- **Status**: ✅ Ready for data import

## Step 1: Export Data from Supabase

### Option A: Using Supabase Dashboard (Easiest)

1. Go to https://supabase.com/dashboard/project/gdytlwuwlkeconmculeu
2. Navigate to **SQL Editor**
3. Run these queries and **copy the results**:

```sql
-- Export profiles
SELECT 
    id,
    username,
    avatar_url,
    current_streak,
    last_play_date,
    created_at,
    updated_at
FROM public.profiles;

-- Export completed_surahs
SELECT 
    user_id,
    surah_id,
    duration_seconds,
    difficulty,
    card_count,
    play_direction,
    points,
    juz,
    hizb,
    ayah_start,
    ayah_end,
    created_at
FROM public.completed_surahs;

-- Export user_badges
SELECT 
    user_id,
    badge_id,
    created_at
FROM public.user_badges;

-- Count your data
SELECT 
    (SELECT COUNT(*) FROM public.profiles) as profile_count,
    (SELECT COUNT(*) FROM public.completed_surahs) as completion_count,
    (SELECT COUNT(*) FROM public.user_badges) as badge_count;
```

### Option B: Using `supabase` CLI

```bash
# Export to CSV
supabase db dump --csv --table profiles > profiles.csv
supabase db dump --csv --table completed_surahs > completed_surahs.csv
supabase db dump --csv --table user_badges > user_badges.csv
```

## Step 2: Import Data to D1

### Quick Import (Small Datasets)

Save your export as JSON and I can import it using the Cloudflare MCP tools.

**Format example:**
```json
{
  "profiles": [
    {
      "id": "uuid-here",
      "username": "user1",
      "avatar_url": null,
      "current_streak": 5,
      "last_play_date": "2026-07-25",
      "created_at": "2026-01-01T00:00:00Z",
      "updated_at": "2026-07-25T12:00:00Z"
    }
  ],
  "completed_surahs": [...],
  "user_badges": [...]
}
```

### Manual Import (Larger Datasets)

1. Create SQL INSERT statements from your export
2. Use `wrangler d1 execute` to run them:

```bash
cd workers
npx wrangler d1 execute hifz_deck_db --file=import.sql
```

## Important Notes

### ⚠️ User Authentication

**Passwords cannot be migrated** because:
- Supabase uses bcrypt with specific settings
- Our Workers use SHA-256 (simpler for Cloudflare)

**Solutions:**
1. **Send password reset emails** to all users (recommended)
2. **Provide a one-time migration link** where users set new passwords
3. **Keep Supabase Auth running temporarily** alongside Cloudflare

### 🔄 OAuth Users (Google Sign-In)

If users signed up with Google OAuth:
1. Their accounts exist in `auth.users` (Supabase)
2. Export from: `SELECT * FROM auth.users WHERE email IS NOT NULL`
3. Create entries in both:
   - `users` table (with a placeholder password hash)
   - `oauth_providers` table (with Google provider info)

### 📊 Data Integrity

After import, verify:
```sql
-- Run in D1
SELECT COUNT(*) FROM profiles;
SELECT COUNT(*) FROM completed_surahs;
SELECT COUNT(*) FROM user_badges;
```

## Step 3: Deploy the Worker

Once data is imported:

```bash
cd workers

# Set JWT secret
npx wrangler secret put JWT_SECRET
# Generate with: openssl rand -base64 32

# Deploy
npm run deploy
```

Your API will be live at: `https://hifz-deck-api.<your-subdomain>.workers.dev`

## Step 4: Update Frontend

```bash
cd ../hifz_deck_react

# Create .env
cp .env.example .env

# Edit .env and set:
# VITE_API_URL=https://hifz-deck-api.<your-subdomain>.workers.dev

# Deploy
npm run build
npm run deploy
```

## Need Help?

If you share your exported data (or a sample), I can:
1. Generate the correct SQL INSERT statements
2. Import it directly using Cloudflare MCP
3. Verify the migration completed successfully

Just paste the data or let me know how many records you have!
