import { progress as apiProgress, leaderboard as apiLeaderboard } from '../apiClient';

/**
 * Load everything a public profile page needs from the API.
 *
 * @param {string} usernameParam - from the URL (may be URL-encoded)
 * @returns {Promise<{ ok: true, profile, earnedBadgeIds, totalPoints, rank, distinctSurahs } | { ok: false, reason: string }>}
 */
export async function loadPublicProfile(usernameParam) {
  const username = decodeURIComponent(String(usernameParam || '')).trim();
  if (!username) {
    return { ok: false, reason: 'missing' };
  }

  try {
    // Get user progress data from API
    const { data, error } = await apiProgress.getByUsername(username);
    
    if (error) {
      console.error('Profile lookup failed:', error);
      if (error.message && error.message.includes('not found')) {
        return { ok: false, reason: 'not_found' };
      }
      return { ok: false, reason: 'error' };
    }
    
    if (!data || !data.profile) {
      return { ok: false, reason: 'not_found' };
    }
    
    const profile = data.profile;
    const badges = data.badges || [];
    const completions = data.completions || [];
    
    // Calculate stats
    const earnedBadgeIds = badges.map((row) => row.badge_id);
    const totalPoints = completions.reduce((sum, row) => sum + (Number(row.points) || 0), 0);
    const distinctSurahs = new Set(completions.map((row) => row.surah_id).filter(Boolean)).size;
    
    // Get user's leaderboard position
    let rank = null;
    if (totalPoints > 0) {
      const { data: positionData } = await apiLeaderboard.getUserPosition(username);
      if (positionData && positionData.position) {
        rank = positionData.position;
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
  } catch (err) {
    console.error('Error loading public profile:', err);
    return { ok: false, reason: 'error' };
  }
}
