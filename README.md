# Hifz Deck

Practice ayah ordering across the Quran — pick a juz', hizb, and surah, then tap verses in order.

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
