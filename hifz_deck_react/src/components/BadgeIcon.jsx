import React from 'react';
import { Box, Tooltip } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { BADGE_BY_ID } from '../badges/badgeCatalog';
import { BadgeMark } from '../badges/badgeMarks';

const popIn = keyframes`
  from { opacity: 0; transform: scale(0.85); }
  to { opacity: 1; transform: scale(1); }
`;

/** Soft gold rim + quiet inner mist ring (Ink Path shell). */
const EARNED_RIM = 'rgba(212, 192, 138, 0.55)';
const LOCKED_FILL = '#6a7471';

/**
 * Shared circular badge shell with Ink Path center marks.
 * Locked badges render as muted silhouettes.
 */
const BadgeIcon = ({ badgeId, earned = false, size = 48, animate = false }) => {
  const badge = BADGE_BY_ID[badgeId];
  if (!badge) return null;

  const label = earned
    ? `${badge.title} — ${badge.description}`
    : `Locked: ${badge.title} — ${badge.description}`;

  const markSize = size * 0.58;

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
        color={earned ? 'white' : 'whiteAlpha.700'}
        border="2px solid"
        borderColor={earned ? EARNED_RIM : 'whiteAlpha.300'}
        boxShadow={
          earned
            ? 'inset 0 0 0 1.5px rgba(232, 238, 236, 0.28), 0 4px 14px rgba(26, 61, 56, 0.2)'
            : 'none'
        }
        opacity={earned ? 1 : 0.45}
        filter={earned ? 'none' : 'grayscale(1)'}
        animation={animate ? `${popIn} 0.45s ease-out` : undefined}
        transition="transform 0.2s ease"
        _hover={{ transform: 'scale(1.06)' }}
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
