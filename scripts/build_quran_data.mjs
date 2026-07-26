/**
 * Build offline Quran JSON for Hifz Deck.
 * Source: api.quran.com (Imlaei text + juz/hizb metadata; compatible with QUL Imlaei shape).
 * Attribution: Quran.com API / Tarteel QUL ecosystem open Quran resources.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '../hifz_deck_react/public/quran_data.json');
const BASE = 'https://api.quran.com/api/v4';

async function getJson(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function fetchAllChapterMeta(chapterId) {
  const verses = [];
  let page = 1;
  let totalPages = 1;
  do {
    const data = await getJson(
      `${BASE}/verses/by_chapter/${chapterId}?language=en&words=false&per_page=50&page=${page}`
    );
    for (const v of data.verses || []) {
      verses.push({
        ayah: v.verse_number,
        juz: v.juz_number,
        hizb: v.hizb_number,
      });
    }
    totalPages = data.pagination?.total_pages || 1;
    page += 1;
  } while (page <= totalPages);
  return verses;
}

async function main() {
  console.log('Fetching chapters + imlaei text...');
  const [chaptersData, imlaeiData] = await Promise.all([
    getJson(`${BASE}/chapters?language=ar`),
    getJson(`${BASE}/quran/verses/imlaei`),
  ]);

  const textByKey = new Map();
  for (const v of imlaeiData.verses || []) {
    textByKey.set(v.verse_key, v.text_imlaei);
  }

  const surahs = {};
  const verseIndex = []; // flat list for distractors / lookups
  const hizbMap = {}; // hizb -> [{ surah, from, to }]
  const juzHizbs = {}; // juz -> Set of hizb numbers

  console.log('Fetching juz/hizb metadata per chapter (114)...');
  for (const ch of chaptersData.chapters || []) {
    const id = ch.id;
    const meta = await fetchAllChapterMeta(id);
    const ayat = [];
    for (const m of meta) {
      const key = `${id}:${m.ayah}`;
      const text = textByKey.get(key);
      if (!text) throw new Error(`Missing imlaei text for ${key}`);
      ayat.push(text);
      verseIndex.push({
        surah: id,
        ayah: m.ayah,
        text,
        juz: m.juz,
        hizb: m.hizb,
      });
      if (!hizbMap[m.hizb]) hizbMap[m.hizb] = {};
      if (!hizbMap[m.hizb][id]) hizbMap[m.hizb][id] = { from: m.ayah, to: m.ayah };
      else {
        hizbMap[m.hizb][id].from = Math.min(hizbMap[m.hizb][id].from, m.ayah);
        hizbMap[m.hizb][id].to = Math.max(hizbMap[m.hizb][id].to, m.ayah);
      }
      if (!juzHizbs[m.juz]) juzHizbs[m.juz] = new Set();
      juzHizbs[m.juz].add(m.hizb);
    }
    surahs[String(id)] = {
      number: id,
      name: ch.name_arabic,
      nameSimple: ch.name_simple,
      versesCount: ch.verses_count,
      ayat,
    };
    if (id % 10 === 0) console.log(`  chapter ${id}/114`);
  }

  const hizbs = {};
  for (const [hizbStr, surahRanges] of Object.entries(hizbMap)) {
    const hizb = Number(hizbStr);
    const ranges = Object.entries(surahRanges)
      .map(([surah, range]) => ({
        surah: Number(surah),
        from: range.from,
        to: range.to,
      }))
      .sort((a, b) => a.surah - b.surah || a.from - b.from);
    // Primary surah = the one with the most ayahs in this hizb
    let primary = ranges[0]?.surah || 1;
    let best = 0;
    for (const r of ranges) {
      const len = r.to - r.from + 1;
      if (len > best) {
        best = len;
        primary = r.surah;
      }
    }
    // Special case: For hizb 60 (Juz Amma), default to Surah 114 (An-Nas)
    // This is the most common starting point for beginners learning Juz Amma
    if (hizb === 60) {
      primary = 114;
    }
    const juz = verseIndex.find((v) => v.hizb === hizb)?.juz || Math.ceil(hizb / 2);
    hizbs[hizbStr] = { number: hizb, juz, primarySurah: primary, ranges };
  }

  const juzs = {};
  for (let j = 1; j <= 30; j++) {
    const hz = [...(juzHizbs[j] || [])].sort((a, b) => a - b);
    juzs[String(j)] = {
      number: j,
      hizbs: hz.length ? hz : [j * 2 - 1, j * 2],
    };
  }

  const payload = {
    source: 'api.quran.com v4 (Imlaei text + verse metadata)',
    attribution: 'Open Quran data compatible with Tarteel QUL Imlaei resources',
    surahs,
    hizbs,
    juzs,
    verses: verseIndex,
  };

  fs.writeFileSync(OUT, JSON.stringify(payload));
  const mb = (fs.statSync(OUT).size / (1024 * 1024)).toFixed(2);
  console.log(`Wrote ${OUT} (${mb} MB)`);
  console.log(`Surahs: ${Object.keys(surahs).length}, Verses: ${verseIndex.length}, Hizbs: ${Object.keys(hizbs).length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
