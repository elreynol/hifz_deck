/**
 * Badge definitions — shell colors + metadata for BadgeIcon.
 * Center marks live in badgeMarks.jsx (Ink Path family).
 * Colors aligned with public/brand/badges/COLOR_MAP.txt.
 */

/** Surahs that live entirely in Juz' 30 (Juz Amma). */
export const JUZ_AMMA_SURAH_COUNT = 37;

export const BADGE_CATALOG = [
  {
    id: 'first_surah',
    title: 'First Surah',
    description: 'Finish every section of a surah (short surahs take one game).',
    color: '#3a7d74',
  },
  {
    id: 'first_juz',
    title: 'First Juz\'',
    description: 'Clear every section in any juz\'.',
    color: '#4a6b8a',
  },
  {
    id: 'juz_amma',
    title: 'Juz Amma',
    description: 'Complete all 37 Juz Amma surahs (Juz\' 30).',
    color: '#9a7b24',
  },
  {
    id: 'persistent_pb',
    title: 'Persistent',
    description: 'Beat your own best time on the same section for a 3rd time.',
    color: '#b8922e',
  },
  {
    id: 'experienced_initiate',
    title: 'Experienced',
    description: 'Win a game on Experienced level.',
    color: '#27514c',
  },
  {
    id: 'five_card_ace',
    title: 'Five-Card Ace',
    description: 'Complete a section with 5 choices shown.',
    color: '#549a90',
  },
  {
    id: 'streak_3',
    title: '3-Day Streak',
    description: 'Play at least one game three days in a row.',
    color: '#c9a84a',
  },
  {
    id: 'streak_7',
    title: '7-Day Streak',
    description: 'Play at least one game seven days in a row.',
    color: '#7a611c',
  },
  {
    id: 'surah_master',
    title: 'Surah Master',
    description: 'Clear a section on Experienced with 5 cards under the time target.',
    color: '#2d645d',
  },
  {
    id: 'sabiqoon',
    title: 'السابقون',
    description: 'Unlock reverse play by completing 10 unique sections forward.',
    color: '#b8922e',
  },
  {
    id: 'elite',
    title: 'السابقون Elite',
    description: 'Complete 3 unique sections in reverse.',
    color: '#9a7b24',
  },
];

export const BADGE_BY_ID = Object.fromEntries(BADGE_CATALOG.map((b) => [b.id, b]));
