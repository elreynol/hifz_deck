import React from 'react';
import { Box, Flex, HStack, Text, Progress, useColorMode } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import BadgeIcon from './BadgeIcon';
import { BADGE_CATALOG, JUZ_AMMA_SURAH_COUNT } from '../badges/badgeCatalog';

const shelfIn = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
`;

/**
 * Horizontal badge shelf + streak + Juz Amma progress meter.
 */
const BadgeShelf = ({
  earnedIds = [],
  newlyEarnedIds = [],
  currentStreak = 0,
  uniqueForwardSurahs = 0,
}) => {
  const { colorMode } = useColorMode();
  const earnedSet = new Set(earnedIds);
  const newSet = new Set(newlyEarnedIds);
  const juzProgress = Math.min(100, (uniqueForwardSurahs / JUZ_AMMA_SURAH_COUNT) * 100);
  const isDark = colorMode === 'dark';

  return (
    <Box
      w="100%"
      animation={`${shelfIn} 0.5s ease-out`}
      px={{ base: 0.5, md: 1 }}
    >
      <Flex
        direction={{ base: 'column', md: 'row' }}
        align={{ base: 'stretch', md: 'center' }}
        justify="space-between"
        gap={{ base: 2, md: 4 }}
        mb={2}
      >
        <Text
          fontFamily="heading"
          fontSize={{ base: 'sm', md: 'md' }}
          fontWeight="600"
          color={isDark ? 'mist.100' : 'ink.800'}
        >
          Your badges
        </Text>
        <HStack spacing={3} flexWrap="wrap">
          {currentStreak > 0 && (
            <Text fontSize="xs" color={isDark ? 'elite.200' : 'elite.600'} fontWeight="600">
              {currentStreak}-day streak
            </Text>
          )}
          <Text fontSize="xs" color={isDark ? 'whiteAlpha.600' : 'mist.500'}>
            Juz Amma {uniqueForwardSurahs}/{JUZ_AMMA_SURAH_COUNT}
          </Text>
        </HStack>
      </Flex>

      <Progress
        value={juzProgress}
        size="xs"
        borderRadius="full"
        colorScheme="teal"
        mb={3}
        bg={isDark ? 'whiteAlpha.200' : 'mist.200'}
      />

      <HStack
        spacing={3}
        overflowX="auto"
        py={1}
        px={0.5}
        css={{
          scrollbarWidth: 'thin',
          '&::-webkit-scrollbar': { height: '4px' },
        }}
      >
        {BADGE_CATALOG.map((badge) => (
          <BadgeIcon
            key={badge.id}
            badgeId={badge.id}
            earned={earnedSet.has(badge.id)}
            animate={newSet.has(badge.id)}
            size={44}
          />
        ))}
      </HStack>

      {earnedIds.length === 0 && (
        <Text mt={2} fontSize="xs" color={isDark ? 'whiteAlpha.500' : 'mist.500'}>
          Play to earn your first badge
        </Text>
      )}
    </Box>
  );
};

export default BadgeShelf;
