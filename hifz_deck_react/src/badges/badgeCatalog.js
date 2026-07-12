/** Badge definitions — shared shell colors + symbol keys for BadgeIcon. */

export const JUZ_AMMA_SURAH_COUNT = 37;

export const BADGE_CATALOG = [
  {
    id: 'first_surah',
    title: 'First Surah',
    description: 'Complete your first surah.',
    color: '#3a7d74',
    symbol: 'star',
  },
  {
    id: 'juz_amma',
    title: 'Juz Amma',
    description: 'Complete all 37 Juz Amma surahs at least once (forward).',
    color: '#9a7b24',
    symbol: 'scroll',
  },
  {
    id: 'persistent_pb',
    title: 'Persistent',
    description: 'Beat your own best time on the same surah for a 3rd time.',
    color: '#b8922e',
    symbol: 'flame',
  },
  {
    id: 'experienced_initiate',
    title: 'Experienced',
    description: 'Win a game on Experienced level.',
    color: '#27514c',
    symbol: 'shield',
  },
  {
    id: 'five_card_ace',
    title: 'Five-Card Ace',
    description: 'Complete a surah with 5 choices shown.',
    color: '#549a90',
    symbol: 'cards',
  },
  {
    id: 'streak_3',
    title: '3-Day Streak',
    description: 'Play at least one game three days in a row.',
    color: '#c9a84a',
    symbol: 'streak',
  },
  {
    id: 'streak_7',
    title: '7-Day Streak',
    description: 'Play at least one game seven days in a row.',
    color: '#7a611c',
    symbol: 'streak',
  },
  {
    id: 'surah_master',
    title: 'Surah Master',
    description: 'Clear a surah on Experienced with 5 cards under the time target.',
    color: '#2d645d',
    symbol: 'crown',
  },
  {
    id: 'sabiqoon',
    title: 'السابقون',
    description: 'Unlock reverse play by completing 10 unique surahs forward.',
    color: '#b8922e',
    symbol: 'moon',
  },
  {
    id: 'elite',
    title: 'السابقون Elite',
    description: 'Complete 3 unique surahs in reverse.',
    color: '#9a7b24',
    symbol: 'elite',
  },
];

export const BADGE_BY_ID = Object.fromEntries(BADGE_CATALOG.map((b) => [b.id, b]));
