import { BADGE_CATALOG, JUZ_AMMA_SURAH_COUNT } from './badgeCatalog';

/**
 * Decide which new badges unlock after a completion.
 * @returns {string[]} newly earned badge ids
 */
export function evaluateNewBadges({
  earnedIds = [],
  forwardCount = 0,
  reverseCount = 0,
  uniqueForwardSurahs = 0,
  difficulty = 'beginner',
  cardCount = 5,
  playDirection = 'forward',
  durationSeconds = 1,
  ayahCount = 1,
  pbBeatCountForSurah = 0,
  currentStreak = 0,
  justUnlockedReverse = false,
  justUnlockedElite = false,
}) {
  const earned = new Set(earnedIds);
  const newly = [];

  const tryEarn = (id) => {
    if (!earned.has(id)) {
      newly.push(id);
      earned.add(id);
    }
  };

  if (forwardCount >= 1 || uniqueForwardSurahs >= 1) tryEarn('first_surah');
  if (uniqueForwardSurahs >= JUZ_AMMA_SURAH_COUNT) tryEarn('juz_amma');
  if (pbBeatCountForSurah >= 3) tryEarn('persistent_pb');
  if (difficulty === 'experienced') tryEarn('experienced_initiate');
  if (cardCount === 5) tryEarn('five_card_ace');
  if (currentStreak >= 3) tryEarn('streak_3');
  if (currentStreak >= 7) tryEarn('streak_7');

  const masterTarget = ayahCount * 4;
  if (
    difficulty === 'experienced' &&
    cardCount === 5 &&
    durationSeconds > 0 &&
    durationSeconds <= masterTarget
  ) {
    tryEarn('surah_master');
  }

  if (justUnlockedReverse || forwardCount >= 10) tryEarn('sabiqoon');
  if (justUnlockedElite || reverseCount >= 3) tryEarn('elite');

  // Only return ids that exist in the catalog
  const valid = new Set(BADGE_CATALOG.map((b) => b.id));
  return newly.filter((id) => valid.has(id));
}

/** Local calendar date YYYY-MM-DD */
export function todayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Yesterday YYYY-MM-DD in local time */
export function yesterdayKey(date = new Date()) {
  const y = new Date(date);
  y.setDate(y.getDate() - 1);
  return todayKey(y);
}

/**
 * Update streak given last play date and today.
 * @returns {{ currentStreak: number, lastPlayDate: string }}
 */
export function advanceStreak(lastPlayDate, currentStreak, now = new Date()) {
  const today = todayKey(now);
  const yesterday = yesterdayKey(now);
  if (lastPlayDate === today) {
    return { currentStreak: Math.max(1, currentStreak || 1), lastPlayDate: today };
  }
  if (lastPlayDate === yesterday) {
    return { currentStreak: (currentStreak || 0) + 1, lastPlayDate: today };
  }
  return { currentStreak: 1, lastPlayDate: today };
}
