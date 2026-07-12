/**
 * Helpers for Juz → Hizb → Surah navigation and play segments.
 * Play unit = ayahs of selected surah that fall inside selected hizb.
 */

/** Get hizb numbers that belong to a juz' */
export function getHizbsForJuz(quran, juzNumber) {
  const juz = quran?.juzs?.[String(juzNumber)];
  return Array.isArray(juz?.hizbs) ? juz.hizbs : [];
}

/** Surahs that appear in a given hizb */
export function getSurahsInHizb(quran, hizbNumber) {
  const hizb = quran?.hizbs?.[String(hizbNumber)];
  if (!hizb?.ranges?.length) return [];
  return hizb.ranges
    .map((r) => {
      const surah = quran.surahs[String(r.surah)];
      return surah
        ? {
            number: r.surah,
            name: surah.name,
            nameSimple: surah.nameSimple,
            from: r.from,
            to: r.to,
          }
        : null;
    })
    .filter(Boolean);
}

/** Primary (default) surah for a hizb — longest range in that hizb */
export function getPrimarySurahForHizb(quran, hizbNumber) {
  const hizb = quran?.hizbs?.[String(hizbNumber)];
  return hizb?.primarySurah || getSurahsInHizb(quran, hizbNumber)[0]?.number || null;
}

/**
 * Ayah slice for surah ∩ hizb.
 * @returns {{ verse: number, text: string }[]}
 */
export function getPlaySegment(quran, surahNumber, hizbNumber) {
  const surah = quran?.surahs?.[String(surahNumber)];
  const hizb = quran?.hizbs?.[String(hizbNumber)];
  if (!surah || !hizb) return [];

  const range = (hizb.ranges || []).find((r) => r.surah === Number(surahNumber));
  if (!range) return [];

  const out = [];
  for (let ayah = range.from; ayah <= range.to; ayah++) {
    const text = surah.ayat[ayah - 1];
    if (text) out.push({ verse: ayah, text });
  }
  return out;
}

/** First hizb of a juz' */
export function getFirstHizbForJuz(quran, juzNumber) {
  const list = getHizbsForJuz(quran, juzNumber);
  return list[0] || juzNumber * 2 - 1;
}

/** Does this surah intersect the hizb? */
export function surahInHizb(quran, surahNumber, hizbNumber) {
  return getSurahsInHizb(quran, hizbNumber).some((s) => s.number === Number(surahNumber));
}

/**
 * When user picks a surah, find a matching juz/hizb if current selection doesn't intersect.
 * Prefers keeping current juz if possible.
 */
export function snapToSurah(quran, surahNumber, preferredJuz = null) {
  const verses = (quran?.verses || []).filter((v) => v.surah === Number(surahNumber));
  if (!verses.length) return null;

  if (preferredJuz != null) {
    const inJuz = verses.find((v) => v.juz === Number(preferredJuz));
    if (inJuz) {
      return { juz: inJuz.juz, hizb: inJuz.hizb, surah: Number(surahNumber) };
    }
  }
  const first = verses[0];
  return { juz: first.juz, hizb: first.hizb, surah: Number(surahNumber) };
}

/** All verses in a juz (for Experienced distractors) */
export function getVersesInJuz(quran, juzNumber, { excludeSurah = null, excludeKeys = new Set() } = {}) {
  return (quran?.verses || []).filter((v) => {
    if (v.juz !== Number(juzNumber)) return false;
    if (excludeSurah != null && v.surah === Number(excludeSurah)) return false;
    const key = `${v.surah}:${v.ayah}`;
    if (excludeKeys.has(key)) return false;
    return true;
  });
}

export function segmentKey(juz, hizb, surah, ayahStart, ayahEnd) {
  return `${juz}:${hizb}:${surah}:${ayahStart}-${ayahEnd}`;
}
