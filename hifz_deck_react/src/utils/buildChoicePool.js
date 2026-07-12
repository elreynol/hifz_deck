/**
 * Build the visible choice pool for tap-to-order.
 * Beginner: distractors from the current play segment only.
 * Experienced: mix of same-segment distractors + other ayahs from the selected juz'.
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
  juzVerses = [],
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

  const sameSegment = shuffleArray(
    unplaced.filter((c) => c.verse !== expectedVerse)
  );

  if (difficulty === 'experienced' && slotsForDistractors > 0) {
    // Roughly half same-segment, half other ayahs in this juz'
    const sameSlots = Math.ceil(slotsForDistractors / 2);
    const foreignSlots = slotsForDistractors - sameSlots;

    const samePicked = sameSegment.slice(0, sameSlots).map((card) => ({
      id: `local-${card.id}`,
      text: card.text,
      verse: card.verse,
      isForeign: false,
      sourceCardId: card.id,
    }));

    const usedTexts = new Set([
      ...(correct ? [correct.text] : []),
      ...samePicked.map((c) => c.text),
    ]);

    const foreignPool = shuffleArray(
      (juzVerses || []).filter((v) => v.text && !usedTexts.has(v.text))
    );

    const foreignPicked = foreignPool.slice(0, foreignSlots).map((v, i) => ({
      id: `foreign-${v.surah}-${v.ayah}-${i}`,
      text: v.text,
      verse: null,
      isForeign: true,
      sourceCardId: null,
    }));

    // If one side runs short, fill from the other
    let picked = [...samePicked, ...foreignPicked];
    if (picked.length < slotsForDistractors) {
      const need = slotsForDistractors - picked.length;
      const usedIds = new Set(picked.map((p) => p.id));
      const extraSame = sameSegment
        .filter((c) => !usedIds.has(`local-${c.id}`))
        .slice(0, need)
        .map((card) => ({
          id: `local-${card.id}`,
          text: card.text,
          verse: card.verse,
          isForeign: false,
          sourceCardId: card.id,
        }));
      picked = [...picked, ...extraSame];
    }
    if (picked.length < slotsForDistractors) {
      const need = slotsForDistractors - picked.length;
      const usedTexts2 = new Set(picked.map((p) => p.text));
      const extraForeign = shuffleArray(
        (juzVerses || []).filter((v) => v.text && !usedTexts2.has(v.text))
      )
        .slice(0, need)
        .map((v, i) => ({
          id: `foreign-extra-${v.surah}-${v.ayah}-${i}`,
          text: v.text,
          verse: null,
          isForeign: true,
          sourceCardId: null,
        }));
      picked = [...picked, ...extraForeign];
    }

    choices.push(...picked);
  } else {
    sameSegment.slice(0, slotsForDistractors).forEach((card) => {
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
