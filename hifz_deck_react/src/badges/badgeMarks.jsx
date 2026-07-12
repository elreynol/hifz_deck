/**
 * Ink Path badge marks — filled silhouettes using currentColor.
 * Source art: public/brand/badges/marks/{id}.svg
 */
import React from 'react';

const MARKS = {
  first_surah: (
    <path d="M24 9l2.6 7.6H34.5l-6.4 4.6 2.4 7.5L24 24.2l-6.5 4.5 2.4-7.5-6.4-4.6h7.9z" />
  ),
  first_juz: (
    <>
      <path d="M22.5 11C18.2 12.8 14 13.2 11.5 13.2v22c2.5 0 6.7-.4 11-2.2V11z" />
      <path d="M25.5 11c4.3 1.8 8.5 2.2 11 2.2v22c-2.5 0-6.7-.4-11-2.2V11z" />
      <rect x="22.5" y="11" width="3" height="24.2" rx="0.8" opacity="0.3" />
    </>
  ),
  juz_amma: (
    <>
      <path d="M34 11.5C20.5 11.5 11 17 11 24.5S20.5 37.5 34 37.5c-7.2-2.4-12.2-7.8-12.2-13S26.8 13.9 34 11.5z" />
      <rect x="13" y="34" width="22" height="3.4" rx="1.7" />
    </>
  ),
  persistent_pb: (
    <path d="M24 8c4.8 5.8 10.5 10.8 10.5 18.5a10.5 10.5 0 1 1-21 0C13.5 18.8 19.2 13.8 24 8z" />
  ),
  experienced_initiate: (
    <>
      <path d="M24 8.5l13.5 5.8v9.5c0 7.6-5.6 13.2-13.5 15.3C13.1 37 7.5 31.4 7.5 23.8v-9.5L24 8.5z" />
      <rect x="22.6" y="17" width="2.8" height="15.5" rx="1.4" opacity="0.35" />
    </>
  ),
  five_card_ace: (
    <>
      <g transform="translate(8 16) rotate(-22)">
        <rect width="14" height="20" rx="2.2" opacity="0.4" />
      </g>
      <g transform="translate(17 12)">
        <rect width="14" height="20" rx="2.2" opacity="0.7" />
      </g>
      <g transform="translate(26 16) rotate(22)">
        <rect width="14" height="20" rx="2.2" />
      </g>
    </>
  ),
  streak_3: (
    <>
      <path d="M13.8 30.8 L20.8 19.2 L22.2 20 L15.2 31.6z" opacity="0.85" />
      <path d="M29.2 30.8 L22.2 19.2 L20.8 20 L27.8 31.6z" opacity="0.85" />
      <circle cx="13" cy="31.5" r="3.2" />
      <circle cx="21.5" cy="18.5" r="3.2" />
      <circle cx="30" cy="31.5" r="3.2" />
    </>
  ),
  streak_7: (
    <>
      <path
        d="M11 28.5c3-8.5 7.5-13.5 13-16.2 5.5 2.7 10 7.7 13 16.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="11.5" cy="27.8" r="2.3" />
      <circle cx="14.8" cy="20.6" r="2.3" />
      <circle cx="19.6" cy="15.2" r="2.3" />
      <circle cx="24" cy="12.8" r="2.3" />
      <circle cx="28.4" cy="15.2" r="2.3" />
      <circle cx="33.2" cy="20.6" r="2.3" />
      <circle cx="36.5" cy="27.8" r="2.3" />
      <rect x="16.5" y="33.8" width="15" height="2.8" rx="1.4" opacity="0.5" />
    </>
  ),
  surah_master: (
    <>
      <path d="M9.5 31l4.4-13.8 5.9 7.4L24 10.5l4.2 14.1 5.9-7.4L38.5 31H9.5z" />
      <rect x="12" y="33.2" width="24" height="3.4" rx="1.7" />
    </>
  ),
  sabiqoon: (
    <>
      <path d="M14 11.5C27.5 11.5 37 17 37 24.5S27.5 37.5 14 37.5c7.2-2.4 12.2-7.8 12.2-13S21.2 13.9 14 11.5z" />
      <path d="M40 18.5 L31.5 24.5 40 30.5 37.2 24.5z" />
    </>
  ),
  elite: (
    <>
      <path d="M14 11.5C27.5 11.5 37 17 37 24.5S27.5 37.5 14 37.5c7.2-2.4 12.2-7.8 12.2-13S21.2 13.9 14 11.5z" />
      <path d="M34 24.5l5-5 5 5-5 5z" />
    </>
  ),
};

/** Center mark for a badge id (Ink Path family). */
export function BadgeMark({ badgeId }) {
  const mark = MARKS[badgeId];
  if (!mark) return <circle cx="24" cy="24" r="8" />;
  return <g fill="currentColor">{mark}</g>;
}
