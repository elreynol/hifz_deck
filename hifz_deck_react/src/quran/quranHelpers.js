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

/** Leaderboard / local-storage key for a play segment (surah ∩ hizb). */
export function makeBoardKey(surahNumber, hizbNumber) {
  return `${Number(surahNumber)}@h${Number(hizbNumber)}`;
}

export const TOTAL_SURAHS = 114;
export const TOTAL_JUZS = 30;

/**
 * Every playable section in the mushaf: one row per surah∩hizb range.
 * @returns {{ juz: number, hizb: number, surah: number, from: number, to: number, boardKey: string }[]}
 */
export function listPlaySegments(quran) {
  const out = [];
  for (const h of Object.values(quran?.hizbs || {})) {
    const hizbNumber = Number(h.number);
    const juzNumber = Number(h.juz);
    for (const r of h.ranges || []) {
      out.push({
        juz: juzNumber,
        hizb: hizbNumber,
        surah: Number(r.surah),
        from: r.from,
        to: r.to,
        boardKey: makeBoardKey(r.surah, hizbNumber),
      });
    }
  }
  return out;
}

/** Board keys where this user already has a recorded time. */
export function getCompletedBoardKeys(surahTimes, usernameCandidates = []) {
  const names = new Set(usernameCandidates.filter(Boolean).map(String));
  const keys = new Set();
  if (!names.size) return keys;

  for (const [key, entry] of Object.entries(surahTimes || {})) {
    const rows = Array.isArray(entry) ? entry : entry ? [entry] : [];
    const owned = rows.some(
      (e) => names.has(String(e?.username)) && typeof e?.time === 'number' && e.time !== Infinity
    );
    if (owned) keys.add(String(key));
  }
  return keys;
}

function groupSegmentKeys(segments, groupBy) {
  const map = new Map();
  for (const seg of segments) {
    const id = groupBy(seg);
    if (!map.has(id)) map.set(id, []);
    map.get(id).push(seg.boardKey);
  }
  return map;
}

/** True when every section of a surah has been cleared. */
export function isSurahFullyComplete(quran, surahNumber, completedKeys) {
  const needed = listPlaySegments(quran)
    .filter((s) => s.surah === Number(surahNumber))
    .map((s) => s.boardKey);
  if (!needed.length) return false;
  return needed.every((k) => completedKeys.has(k));
}

/** True when every section inside a juz' has been cleared. */
export function isJuzFullyComplete(quran, juzNumber, completedKeys) {
  const needed = listPlaySegments(quran)
    .filter((s) => s.juz === Number(juzNumber))
    .map((s) => s.boardKey);
  if (!needed.length) return false;
  return needed.every((k) => completedKeys.has(k));
}

/** How many named surahs the user has fully finished (pride metric). */
export function countFullyCompletedSurahs(quran, completedKeys) {
  const bySurah = groupSegmentKeys(listPlaySegments(quran), (s) => s.surah);
  let n = 0;
  for (const keys of bySurah.values()) {
    if (keys.every((k) => completedKeys.has(k))) n += 1;
  }
  return n;
}

/** How many juz' the user has fully finished (pacing metric). */
export function countFullyCompletedJuzs(quran, completedKeys) {
  const byJuz = groupSegmentKeys(listPlaySegments(quran), (s) => s.juz);
  let n = 0;
  for (const keys of byJuz.values()) {
    if (keys.every((k) => completedKeys.has(k))) n += 1;
  }
  return n;
}

/** Section progress inside one juz' — for the quiet meter. */
export function getJuzSegmentProgress(quran, juzNumber, completedKeys) {
  const needed = listPlaySegments(quran)
    .filter((s) => s.juz === Number(juzNumber))
    .map((s) => s.boardKey);
  const total = needed.length;
  const completed = needed.filter((k) => completedKeys.has(k)).length;
  return { completed, total, percent: total ? Math.min(100, (completed / total) * 100) : 0 };
}
