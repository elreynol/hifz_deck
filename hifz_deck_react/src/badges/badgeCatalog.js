/**
 * Badge definitions — bright kid-friendly shell colors + metadata.
 * Center marks live in badgeMarks.jsx.
 */

/** Surahs that live entirely in Juz' 30 (Juz Amma). */
export const JUZ_AMMA_SURAH_COUNT = 37;

export const BADGE_CATALOG = [
  {
    id: 'first_surah',
    title: 'First Surah',
    description: 'Finish every section of a surah (short surahs take one game).',
    color: '#20C997', // mint
  },
  {
    id: 'first_juz',
    title: 'First Juz\'',
    description: 'Clear every section in any juz\'.',
    color: '#339AF0', // sky
  },
  {
    id: 'juz_amma',
    title: 'Juz Amma',
    description: 'Complete all 37 Juz Amma surahs (Juz\' 30).',
    color: '#FAB005', // sunny gold
  },
  {
    id: 'persistent_pb',
    title: 'Persistent',
    description: 'Beat your own best time on the same section for a 3rd time.',
    color: '#FF6B6B', // coral flame
  },
  {
    id: 'experienced_initiate',
    title: 'Experienced',
    description: 'Win a game on Experienced level.',
    color: '#15AABF', // bright cyan
  },
  {
    id: 'five_card_ace',
    title: 'Five-Card Ace',
    description: 'Complete a section with 5 choices shown.',
    color: '#51CF66', // lime
  },
  {
    id: 'streak_3',
    title: '3-Day Streak',
    description: 'Play at least one game three days in a row.',
    color: '#FFD43B', // lemon
  },
  {
    id: 'streak_7',
    title: '7-Day Streak',
    description: 'Play at least one game seven days in a row.',
    color: '#FF922B', // orange
  },
  {
    id: 'surah_master',
    title: 'Surah Master',
    description: 'Clear a section on Experienced with 5 cards under the time target.',
    color: '#22B8CF', // aqua
  },
  {
    id: 'sabiqoon',
    title: 'السابقون',
    description: 'Unlock reverse play by completing 10 unique sections forward.',
    color: '#4C6EF5', // bright indigo-blue
  },
  {
    id: 'elite',
    title: 'السابقون Elite',
    description: 'Complete 3 unique sections in reverse.',
    color: '#F59F00', // amber trophy
  },
];

export const BADGE_BY_ID = Object.fromEntries(BADGE_CATALOG.map((b) => [b.id, b]));
