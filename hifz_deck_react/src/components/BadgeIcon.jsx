import React from 'react';
import {
  Box,
  Badge,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverArrow,
  PopoverCloseButton,
  PopoverHeader,
  PopoverBody,
  Text,
  useColorMode,
} from '@chakra-ui/react';
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
 * Click (or tap) opens a popover with the badge name and description —
 * better than hover-only tooltips on phones.
 */
const BadgeIcon = ({ badgeId, earned = false, size = 48, animate = false }) => {
  const badge = BADGE_BY_ID[badgeId];
  const { colorMode } = useColorMode();
  if (!badge) return null;

  const isDark = colorMode === 'dark';
  const statusLabel = earned ? 'Earned' : 'Locked';
  const ariaLabel = earned
    ? `${badge.title}. ${badge.description}. Tap for details.`
    : `Locked: ${badge.title}. ${badge.description}. Tap for details.`;

  const markSize = size * 0.62;

  return (
    <Popover
      trigger="click"
      placement="top"
      isLazy
      closeOnBlur
      gutter={10}
    >
      <PopoverTrigger>
        <Box
          as="button"
          type="button"
          aria-label={ariaLabel}
          aria-haspopup="dialog"
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
          _focusVisible={{
            outline: '2px solid',
            outlineColor: isDark ? 'mist.200' : 'ink.500',
            outlineOffset: '2px',
          }}
          cursor="pointer"
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
      </PopoverTrigger>

      <PopoverContent
        bg={isDark ? 'ink.800' : 'mist.50'}
        borderColor={isDark ? 'whiteAlpha.200' : 'mist.200'}
        boxShadow="lg"
        borderRadius="xl"
        maxW="260px"
        _focus={{ outline: 'none' }}
      >
        <PopoverArrow bg={isDark ? 'ink.800' : 'mist.50'} />
        <PopoverCloseButton
          top={2}
          right={2}
          color={isDark ? 'whiteAlpha.700' : 'mist.500'}
          aria-label="Close badge details"
        />
        <PopoverHeader
          border="0"
          pt={3}
          pb={1}
          pr={8}
          fontFamily="heading"
          fontWeight="700"
          fontSize="md"
          color={isDark ? 'mist.50' : 'ink.800'}
        >
          {badge.title}
        </PopoverHeader>
        <PopoverBody pt={0} pb={3}>
          <Badge
            mb={2}
            px={2}
            py={0.5}
            borderRadius="md"
            fontSize="xs"
            fontWeight="600"
            bg={earned ? (isDark ? 'teal.700' : 'teal.100') : (isDark ? 'whiteAlpha.200' : 'mist.200')}
            color={earned ? (isDark ? 'teal.100' : 'teal.800') : (isDark ? 'whiteAlpha.700' : 'mist.600')}
          >
            {statusLabel}
          </Badge>
          <Text
            fontSize="sm"
            lineHeight="short"
            color={isDark ? 'whiteAlpha.800' : 'mist.600'}
          >
            {badge.description}
          </Text>
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
};

export default BadgeIcon;
