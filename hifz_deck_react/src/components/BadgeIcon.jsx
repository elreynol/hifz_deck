import React from 'react';
import { Box, Tooltip } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { BADGE_BY_ID } from '../badges/badgeCatalog';

const popIn = keyframes`
  from { opacity: 0; transform: scale(0.85); }
  to { opacity: 1; transform: scale(1); }
`;

function SymbolPath({ symbol }) {
  switch (symbol) {
    case 'star':
      return (
        <path
          d="M24 8l2.8 8.6H36l-7 5.1 2.7 8.3L24 25.2l-7.7 4.8 2.7-8.3-7-5.1h9.2z"
          fill="currentColor"
        />
      );
    case 'scroll':
      return (
        <path
          d="M14 12h18a3 3 0 013 3v18a3 3 0 01-3 3H16a4 4 0 01-4-4V15a3 3 0 013-3zm2 4v16h16V16H16z"
          fill="currentColor"
        />
      );
    case 'flame':
      return (
        <path
          d="M24 8c2 6-4 8-2 14 4-2 8-6 8-12 6 4 8 10 8 14a14 14 0 11-28 0c0-6 6-12 14-16z"
          fill="currentColor"
        />
      );
    case 'shield':
      return (
        <path
          d="M24 8l14 6v10c0 8-6 14-14 16C16 38 10 32 10 24V14l14-6z"
          fill="currentColor"
        />
      );
    case 'cards':
      return (
        <>
          <rect x="12" y="14" width="14" height="20" rx="2" fill="currentColor" opacity="0.55" />
          <rect x="18" y="12" width="14" height="20" rx="2" fill="currentColor" opacity="0.75" />
          <rect x="24" y="10" width="14" height="20" rx="2" fill="currentColor" />
        </>
      );
    case 'streak':
      return (
        <path
          d="M16 30c4-8 6-12 8-18 2 6 4 10 8 18-5 4-11 4-16 0z"
          fill="currentColor"
        />
      );
    case 'crown':
      return (
        <path
          d="M10 30l4-14 6 8 4-12 4 12 6-8 4 14H10z"
          fill="currentColor"
        />
      );
    case 'moon':
      return (
        <path
          d="M28 10a12 12 0 1010 18A14 14 0 0128 10z"
          fill="currentColor"
        />
      );
    case 'elite':
      return (
        <path
          d="M24 9l3 7h8l-6.5 5 2.5 8L24 24l-7 5 2.5-8L13 16h8z"
          fill="currentColor"
        />
      );
    default:
      return <circle cx="24" cy="24" r="8" fill="currentColor" />;
  }
}

/**
 * Shared circular badge shell. Locked badges render as muted silhouettes.
 */
const BadgeIcon = ({ badgeId, earned = false, size = 48, animate = false }) => {
  const badge = BADGE_BY_ID[badgeId];
  if (!badge) return null;

  const label = earned
    ? `${badge.title} — ${badge.description}`
    : `Locked: ${badge.title} — ${badge.description}`;

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
        bg={earned ? badge.color : 'blackAlpha.300'}
        color={earned ? 'white' : 'whiteAlpha.500'}
        border="2px solid"
        borderColor={earned ? 'whiteAlpha.400' : 'whiteAlpha.200'}
        boxShadow={earned ? 'soft' : 'none'}
        opacity={earned ? 1 : 0.45}
        filter={earned ? 'none' : 'grayscale(1)'}
        animation={animate ? `${popIn} 0.45s ease-out` : undefined}
        transition="transform 0.2s ease"
        _hover={{ transform: 'scale(1.06)' }}
        cursor="default"
      >
        <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 48 48" aria-hidden>
          <SymbolPath symbol={badge.symbol} />
        </svg>
      </Box>
    </Tooltip>
  );
};

export default BadgeIcon;
