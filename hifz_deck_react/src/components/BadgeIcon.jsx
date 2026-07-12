import React from 'react';
import { Box, Tooltip } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { BADGE_BY_ID } from '../badges/badgeCatalog';
import { BadgeMark } from '../badges/badgeMarks';

const popIn = keyframes`
  from { opacity: 0; transform: scale(0.85); }
  to { opacity: 1; transform: scale(1); }
`;

/** Bright white rim for a sticker-like seal (kid-friendly). */
const EARNED_RIM = 'rgba(255, 255, 255, 0.85)';
const LOCKED_FILL = '#A0AEC0';

/**
 * Shared circular badge shell with playful center marks.
 * Locked badges render as muted silhouettes.
 */
const BadgeIcon = ({ badgeId, earned = false, size = 48, animate = false }) => {
  const badge = BADGE_BY_ID[badgeId];
  if (!badge) return null;

  const label = earned
    ? `${badge.title} — ${badge.description}`
    : `Locked: ${badge.title} — ${badge.description}`;

  const markSize = size * 0.62;

  return (
    <Tooltip label={label} hasArrow placement="top" openDelay={200}>
      <Box
        as="button"
        type="button"
        aria-label={label}
        w={`${size}px`}
        h={`${size}px`}
        flexShrink={0}
        borderRadius="full"
        display="flex"
        alignItems="center"
        justifyContent="center"
        bg={earned ? badge.color : LOCKED_FILL}
        color={earned ? 'white' : 'whiteAlpha.800'}
        border="3px solid"
        borderColor={earned ? EARNED_RIM : 'whiteAlpha.400'}
        boxShadow={
          earned
            ? `inset 0 0 0 2px rgba(255,255,255,0.22), 0 6px 16px ${badge.color}55`
            : 'none'
        }
        opacity={earned ? 1 : 0.4}
        filter={earned ? 'none' : 'grayscale(1)'}
        animation={animate ? `${popIn} 0.45s ease-out` : undefined}
        transition="transform 0.2s ease"
        _hover={{ transform: 'scale(1.08)' }}
        cursor="default"
      >
        <svg
          width={markSize}
          height={markSize}
          viewBox="0 0 48 48"
          aria-hidden
        >
          <BadgeMark badgeId={badgeId} />
        </svg>
      </Box>
    </Tooltip>
  );
};

export default BadgeIcon;
