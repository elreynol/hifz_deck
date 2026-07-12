import { supabase } from '../supabaseClient';

/**
 * Load everything a public profile page needs from existing tables.
 * Uses public RLS (profiles, user_badges, completed_surahs are readable by everyone).
 *
 * @param {string} usernameParam - from the URL (may be URL-encoded)
 * @returns {Promise<{ ok: true, profile, earnedBadgeIds, totalPoints, rank, distinctSurahs } | { ok: false, reason: string }>}
 */
export async function loadPublicProfile(usernameParam) {
  const username = decodeURIComponent(String(usernameParam || '')).trim();
  if (!username) {
    return { ok: false, reason: 'missing' };
  }

  // 1) Find the profile by public username
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, current_streak, last_play_date')
    .eq('username', username)
    .maybeSingle();

  if (profileError) {
    console.error('Profile lookup failed:', profileError);
    return { ok: false, reason: 'error' };
  }
  if (!profile) {
    return { ok: false, reason: 'not_found' };
  }

  // 2) Badges + completion runs in parallel
  const [badgesResult, runsResult] = await Promise.all([
    supabase.from('user_badges').select('badge_id').eq('user_id', profile.id),
    supabase.from('completed_surahs').select('user_id, surah_id, points').eq('user_id', profile.id),
  ]);

  const earnedBadgeIds = (badgesResult.data || []).map((row) => row.badge_id);
  const runs = runsResult.data || [];
  const totalPoints = runs.reduce((sum, row) => sum + (Number(row.points) || 0), 0);
  const distinctSurahs = new Set(runs.map((row) => row.surah_id).filter(Boolean)).size;

  // 3) Rank among everyone with points (accurate even past the leaderboard UI limit)
  let rank = null;
  if (totalPoints > 0) {
    const { data: allRuns, error: rankError } = await supabase
      .from('completed_surahs')
      .select('user_id, points');

    if (!rankError && Array.isArray(allRuns)) {
      const totals = new Map();
      for (const row of allRuns) {
        if (!row?.user_id) continue;
        totals.set(row.user_id, (totals.get(row.user_id) || 0) + (Number(row.points) || 0));
      }
      const myPoints = totals.get(profile.id) || 0;
      // Rank = 1 + how many people scored strictly higher
      rank = [...totals.values()].filter((p) => p > myPoints).length + 1;
    }
  }

  return {
    ok: true,
    profile,
    earnedBadgeIds,
    totalPoints,
    rank,
    distinctSurahs,
  };
}
