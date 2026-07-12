# Hifzer Badge Style — “Ink Path”

Quiet craftsmanship: manuscript / night study / path of learning. One family of circular seals with unique center marks.

## Direction

**Ink Path** — shared double-ring circular shell; each badge is a single geometric mark about sequence, practice, or persistence. Calm ink/mist tones with restrained gold accents. Not arcade medals, not purple neon, not Qur’anic calligraphy.

## Colors

| Role | Hex | Use |
|------|-----|-----|
| Deep teal-ink | `#1a3d38` | Darkest shell / elite depth |
| Ink teal | `#27514c` | Experienced |
| Path teal | `#2d645d` | Surah Master |
| Mist teal | `#3a7d74` | First Surah |
| Soft teal | `#549a90` | Five-Card Ace |
| Night slate | `#4a6b8a` | First Juz' |
| Lamp gold | `#b8922e` | Persistent / السابقون |
| Soft gold | `#c9a84a` | 3-Day Streak |
| Deep gold | `#9a7b24` | Juz Amma / Elite |
| Ember gold | `#7a611c` | 7-Day Streak |
| Mist fill (locked) | `#6a7471` | Locked shell |
| Mark (earned) | `#ffffff` | Center symbol |
| Rim gold | `#d4c08a` | Soft outer ring (earned, ~40–55% opacity) |
| Inner mist | `#e8eeec` | Inner ring (earned, ~20–30% opacity) |

## Shell

- Perfect circle; outer radius ~30 on a 64×64 canvas (2px padding).
- Flat fill (badge color). No gradients, no metallic bevels, no glow.
- Thin outer rim (gold on earned, muted mist on locked).
- Quieter inner ring for depth — manuscript seal, not game medal.
- Center mark sits in ~48×48 optical area; keep ~18–22% safe margin from rim.

## Stroke & shape

- Prefer **filled silhouettes** over outlines for 32px legibility.
- If stroke is used: ~2px at 48 viewBox (~1px when displayed at 32).
- Corner radius on cards/rects: 2–3px only.
- One idea per mark; max ~3–4 shapes.
- Avoid tiny gaps, hairlines, or text inside the mark.

## Earned vs locked

| | Earned | Locked |
|---|--------|--------|
| Shell | Badge color fill | `#6a7471` mist |
| Rim | Soft gold | Muted white/mist |
| Mark | White (`#fff`) | White @ ~55% or solid `#c5d0cd` |
| Extra | Optional soft shadow in UI only | `opacity ~0.45` + `grayscale(1)` OK in CSS |

**Preferred integration:** one mark SVG using `fill="currentColor"`; shell color from `badgeCatalog`; locked via muted bg + grayscale (matches current `BadgeIcon`).

## Do

- Keep marks geometric and abstract (path nodes, lamp flame, shield, fan of cards, crescent).
- Reuse the same shell for every badge.
- Test at 32px and 56px.
- Treat gold as accent, not the whole shell (except gold-family badges).

## Don’t

- Purple gradients, neon, glow, sparkles, cartoon ribbons.
- Realistic faces, 3D chrome, RPG shields with gems.
- Qur’anic verse calligraphy or decorative Arabic as decoration.
- Different shell styles per badge.
- Fine engraved detail that disappears when small.
