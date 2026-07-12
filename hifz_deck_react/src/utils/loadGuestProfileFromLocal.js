import { BADGE_CATALOG } from '../badges/badgeCatalog';

const LEADERBOARD_KEY = 'hifzDeckLeaderboards';
const BADGES_KEY = 'hifzDeckBadges';
const STREAK_KEY = 'hifzDeckStreak';

/**
 * Build a profile-like payload for a guest from localStorage only.
 * Guests are never on the server, so public /profile/:otherName still uses Supabase.
 */
export function loadGuestProfileFromLocal(usernameParam) {
  const username = decodeURIComponent(String(usernameParam || '')).trim();
  if (!username) return { ok: false, reason: 'missing' };

  let board = { overallPoints: [] };
  try {
    board = JSON.parse(localStorage.getItem(LEADERBOARD_KEY) || '{}') || board;
  } catch {
    /* ignore */
  }

  const pointsList = Array.isArray(board.overallPoints) ? board.overallPoints : [];
  const myEntry = pointsList.find((e) => e?.username === username);
  const totalPoints = Number(myEntry?.points) || 0;

  // Rank among local+merged board (same list the UI shows)
  const sorted = [...pointsList]
    .map((e) => ({ username: e.username, points: Number(e.points) || 0 }))
    .filter((e) => e.username)
    .sort((a, b) => b.points - a.points);
  const rankIndex = sorted.findIndex((e) => e.username === username);
  const rank = rankIndex >= 0 ? rankIndex + 1 : totalPoints > 0 ? sorted.length + 1 : null;

  let earnedBadgeIds = [];
  try {
    const badges = JSON.parse(localStorage.getItem(BADGES_KEY) || '[]');
    if (Array.isArray(badges)) {
      const valid = new Set(BADGE_CATALOG.map((b) => b.id));
      earnedBadgeIds = badges.filter((id) => valid.has(id));
    }
  } catch {
    /* ignore */
  }

  let currentStreak = 0;
  try {
    const streak = JSON.parse(localStorage.getItem(STREAK_KEY) || '{}');
    currentStreak = Number(streak.currentStreak) || 0;
  } catch {
    /* ignore */
  }

  const surahTimes = board.surahTimes || {};
  const distinctSurahs = new Set(
    Object.keys(surahTimes).map((k) => String(k).split('@')[0]).filter(Boolean)
  ).size;

  return {
    ok: true,
    isGuest: true,
    profile: {
      id: null,
      username,
      avatar_url: null,
      current_streak: currentStreak,
      last_play_date: null,
    },
    earnedBadgeIds,
    totalPoints,
    rank,
    distinctSurahs,
  };
}
