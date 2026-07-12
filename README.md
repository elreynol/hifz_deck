# Hifzer

Practice ayah ordering across the Quran — pick a juz', hizb, and surah, then tap verses in order.

(Formerly “Hifz Deck.” The GitHub Pages path remains `/hifz_deck/` for now.)

## Verse data & attribution

Offline Quran text and juz/hizb structure ship in `hifz_deck_react/public/quran_data.json`, built by `scripts/build_quran_data.mjs`.

- **Source used for this build:** [Quran.com API v4](https://api.quran.com/) (Imlaei script + verse metadata)
- **Format intent:** Compatible with [Tarteel Quranic Universal Library (QUL)](https://qul.tarteel.ai/) Imlaei ayah resources

Rebuild locally:

```bash
node scripts/build_quran_data.mjs
```

## App

React client lives in `hifz_deck_react/`. See that folder’s `package.json` for `dev` / `build` scripts.

Live site: https://elreynol.github.io/hifz_deck/

## Google sign-in setup

The app already calls `supabase.auth.signInWithOAuth({ provider: 'google' })`. You still need to turn Google on in Google Cloud + Supabase.

In Google Auth Platform → Branding, set the **app name** to **Hifzer** (and add a logo if you want). That improves the consent screen; the “continue to …supabase.co” host only changes with a Supabase custom domain.

### 1. Supabase → Authentication → URL Configuration

| Setting | Value |
|--------|--------|
| **Site URL** | `https://elreynol.github.io/hifz_deck` |
| **Redirect URLs** | add all of the following |

```text
https://elreynol.github.io/hifz_deck
https://elreynol.github.io/hifz_deck/
http://localhost:5173/hifz_deck
http://localhost:5173/hifz_deck/
```

### 2. Google Cloud Console

1. Create (or select) a project at [Google Cloud Console](https://console.cloud.google.com/).
2. Configure an OAuth consent screen.
3. Create credentials → **OAuth client ID** → Application type **Web application**.
4. **Authorized JavaScript origins**
   - `https://elreynol.github.io`
   - `http://localhost:5173`
5. **Authorized redirect URIs** (must be the Supabase callback, not your app URL):

```text
https://gdytlwuwlkeconmculeu.supabase.co/auth/v1/callback
```

6. Copy the **Client ID** and **Client secret**.

### 3. Supabase → Authentication → Providers → Google

1. Enable Google.
2. Paste Client ID + Client secret.
3. Save.

### 4. Test

1. Open the app → Login → **Continue with Google**.
2. After redirect, if you have no public username, the app asks you to choose one for the leaderboard.

Docs: [Login with Google](https://supabase.com/docs/guides/auth/social-login/auth-google)
