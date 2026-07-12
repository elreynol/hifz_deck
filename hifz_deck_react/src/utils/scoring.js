/** Weighted points for a completed run. Rewards speed relative to length + harder settings. */

export const CARD_MULT = { 3: 1.0, 4: 1.25, 5: 1.5 };
export const LEVEL_MULT = { beginner: 1.0, experienced: 1.75 };
export const DIRECTION_MULT = { forward: 1.0, reverse: 1.5 };

/**
 * @param {{ ayahCount: number, durationSeconds: number, cardCount?: number, difficulty?: string, playDirection?: string, stopwatchEnabled?: boolean }} opts
 * @returns {number}
 */
export function computePoints({
  ayahCount,
  durationSeconds,
  cardCount = 5,
  difficulty = 'beginner',
  playDirection = 'forward',
  stopwatchEnabled = true,
}) {
  const ayahs = Math.max(1, Number(ayahCount) || 1);
  const duration = Math.max(1, Math.round(Number(durationSeconds) || 1));
  const cardMult = CARD_MULT[cardCount] ?? 1.0;
  const levelMult = LEVEL_MULT[difficulty] ?? 1.0;
  const directionMult = DIRECTION_MULT[playDirection] ?? 1.0;

  // No stopwatch: modest flat completion score so casual play still earns points
  if (!stopwatchEnabled) {
    return Math.round(ayahs * 10 * cardMult * levelMult * directionMult);
  }

  return Math.round((ayahs * 100) / duration * cardMult * levelMult * directionMult);
}
