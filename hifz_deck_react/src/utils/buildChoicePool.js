/**
 * Build the visible choice pool for tap-to-order.
 * Beginner: distractors from the current surah only.
 * Experienced: leftover slots filled with ayahs from other Juz Amma surahs.
 */

export function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

/**
 * @returns {Array<{ id: string|number, text: string, verse: number|null, isForeign: boolean, sourceCardId?: number }>}
 */
export function buildChoicePool({
  allCards,
  expectedVerse,
  visibleCardCount = 5,
  difficulty = 'beginner',
  sequence = [],
  selectedSurah = null,
}) {
  const unplaced = allCards.filter((c) => c.position === null);
  if (unplaced.length === 0) return [];

  const correct = unplaced.find((c) => c.verse === expectedVerse);
  const slotsForDistractors = Math.max(0, visibleCardCount - (correct ? 1 : 0));
  const choices = [];

  if (correct) {
    choices.push({
      id: `local-${correct.id}`,
      text: correct.text,
      verse: correct.verse,
      isForeign: false,
      sourceCardId: correct.id,
    });
  }

  if (difficulty === 'experienced' && slotsForDistractors > 0) {
    const selectedNum = parseInt(selectedSurah, 10);
    const foreign = [];
    sequence.forEach((surah) => {
      if (surah.number === selectedNum) return;
      (surah.ayat || []).forEach((ayah, idx) => {
        foreign.push({
          id: `foreign-${surah.number}-${idx + 1}`,
          text: ayah,
          verse: null,
          isForeign: true,
          sourceCardId: null,
        });
      });
    });
    const picked = shuffleArray(foreign).slice(0, slotsForDistractors);
    choices.push(...picked);
  } else {
    const distractors = shuffleArray(unplaced.filter((c) => c.verse !== expectedVerse));
    distractors.slice(0, slotsForDistractors).forEach((card) => {
      choices.push({
        id: `local-${card.id}`,
        text: card.text,
        verse: card.verse,
        isForeign: false,
        sourceCardId: card.id,
      });
    });
  }

  return shuffleArray(choices);
}
