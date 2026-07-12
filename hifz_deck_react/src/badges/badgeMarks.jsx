/**
 * Playful badge marks — chunky silhouettes using currentColor.
 * Designed to read clearly at 32–56px and feel kid-friendly.
 */
import React from 'react';

const MARKS = {
  // Bright star + tiny sparkles — first win energy
  first_surah: (
    <>
      <path d="M24 7l3.4 9.4H37l-7.7 5.6 2.9 9.2L24 26.4l-8.2 4.8 2.9-9.2L11 16.4h9.6z" />
      <circle cx="10" cy="11" r="1.8" opacity="0.9" />
      <circle cx="38" cy="12" r="1.5" opacity="0.75" />
      <circle cx="36" cy="34" r="1.6" opacity="0.8" />
    </>
  ),

  // Friendly open book with bookmark
  first_juz: (
    <>
      <path d="M9 13c4.2-1.8 8.2-2.2 13.5-2.2v24.5c-5.3 0-9.3.5-13.5 2.3V13z" />
      <path d="M39 13c-4.2-1.8-8.2-2.2-13.5-2.2v24.5c5.3 0 9.3.5 13.5 2.3V13z" />
      <path d="M22.2 10.8h3.6v12.5l-1.8-1.4-1.8 1.4V10.8z" opacity="0.95" />
      <circle cx="24" cy="37.5" r="1.6" opacity="0.55" />
    </>
  ),

  // Night moon + three sparkle stars (Juz Amma / short surahs vibe)
  juz_amma: (
    <>
      <path d="M30.5 10.5C18.8 10.5 11 17.2 11 25S18.8 39.5 30.5 39.5c-6.5-2.2-11-7.5-11-14.5s4.5-12.3 11-14.5z" />
      <path d="M33 14l1.1 2.8h3l-2.4 1.8.9 2.9L33 19.8l-2.6 1.7.9-2.9-2.4-1.8h3z" />
      <path d="M38.5 22l.8 2h2.1l-1.7 1.3.7 2-1.9-1.2-1.9 1.2.7-2-1.7-1.3h2.1z" opacity="0.85" />
      <path d="M36 30.5l.7 1.7h1.8l-1.4 1.1.5 1.8-1.6-1-1.6 1 .5-1.8-1.4-1.1h1.8z" opacity="0.7" />
    </>
  ),

  // Layered flame (persistence)
  persistent_pb: (
    <>
      <path d="M24 7c5.5 6.5 12 12 12 20.5a12 12 0 1 1-24 0C12 19 18.5 13.5 24 7z" />
      <path
        d="M24 18c2.8 3.2 6 6 6 10.2a6 6 0 1 1-12 0C18 24 21.2 21.2 24 18z"
        opacity="0.35"
      />
    </>
  ),

  // Shield with big check — “you leveled up”
  experienced_initiate: (
    <>
      <path d="M24 7.5l14 6v10c0 8.2-6.2 14.3-14 16.5C16.2 37.8 10 31.7 10 23.5v-10l14-6z" />
      <path
        d="M17.5 23.2l4.2 4.2 9-9.2 2.4 2.3-11.4 11.6-6.6-6.6z"
        opacity="0.4"
      />
    </>
  ),

  // Fan of rounded cards + ace star
  five_card_ace: (
    <>
      <g transform="translate(7 15) rotate(-24)">
        <rect width="15" height="21" rx="3" opacity="0.45" />
      </g>
      <g transform="translate(16.5 11)">
        <rect width="15" height="21" rx="3" opacity="0.75" />
      </g>
      <g transform="translate(26 15) rotate(24)">
        <rect width="15" height="21" rx="3" />
        <path d="M7.5 6.5l1.1 2.9h3.1l-2.5 1.8.9 3-2.6-1.7-2.6 1.7.9-3-2.5-1.8h3.1z" opacity="0.45" />
      </g>
    </>
  ),

  // Three big linked stars (3-day streak)
  streak_3: (
    <>
      <path d="M13 22l1.6 4.2H19l-3.4 2.5 1.3 4.1L13 30.5l-3.9 2.3 1.3-4.1L7 26.2h4.4z" />
      <path d="M24 12l2.1 5.5H32l-4.4 3.2 1.7 5.3L24 22.8l-5.3 3.2 1.7-5.3L16 17.5h5.9z" />
      <path d="M35 22l1.6 4.2H41l-3.4 2.5 1.3 4.1L35 30.5l-3.9 2.3 1.3-4.1L29 26.2h4.4z" />
    </>
  ),

  // Sunny arc of 7 dots + big center spark (week streak)
  streak_7: (
    <>
      <circle cx="24" cy="14" r="4.2" />
      <circle cx="14" cy="18" r="3.1" />
      <circle cx="34" cy="18" r="3.1" />
      <circle cx="10" cy="27" r="2.8" />
      <circle cx="38" cy="27" r="2.8" />
      <circle cx="15" cy="35.5" r="2.5" />
      <circle cx="33" cy="35.5" r="2.5" />
      <path d="M24 20.5l1.3 3.2h3.4l-2.7 2 1 3.2L24 26.8l-2.9 2.1 1-3.2-2.7-2h3.4z" opacity="0.4" />
    </>
  ),

  // Chunky crown with jewel
  surah_master: (
    <>
      <path d="M8.5 30.5l4.8-15.5 5.7 8.2L24 9.5l4.9 13.7 5.7-8.2 4.9 15.5H8.5z" />
      <rect x="11" y="32.5" width="26" height="5" rx="2.2" />
      <circle cx="24" cy="22" r="2.4" opacity="0.4" />
    </>
  ),

  // Crescent + bold reverse arrow (السابقون)
  sabiqoon: (
    <>
      <path d="M15 10.5C28.5 10.5 38 16.5 38 24.5S28.5 38.5 15 38.5c7-2.5 12-8 12-14S22 13 15 10.5z" />
      <path d="M40 17.5v14L29.5 24.5z" />
      <circle cx="12" cy="14" r="1.6" opacity="0.7" />
    </>
  ),

  // Crescent + star medal (elite)
  elite: (
    <>
      <path d="M15 10.5C28.5 10.5 38 16.5 38 24.5S28.5 38.5 15 38.5c7-2.5 12-8 12-14S22 13 15 10.5z" />
      <path d="M36.5 18.5l1.5 3.8h4l-3.2 2.4 1.2 3.8-3.5-2.3-3.5 2.3 1.2-3.8-3.2-2.4h4z" />
      <circle cx="11" cy="24.5" r="2" opacity="0.45" />
    </>
  ),
};

/** Center mark for a badge id. */
export function BadgeMark({ badgeId }) {
  const mark = MARKS[badgeId];
  if (!mark) return <circle cx="24" cy="24" r="8" />;
  return <g fill="currentColor">{mark}</g>;
}
