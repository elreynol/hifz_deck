import React from 'react';
import { Box, Flex, HStack, Text, Progress, useColorMode } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import BadgeIcon from './BadgeIcon';
import { BADGE_CATALOG } from '../badges/badgeCatalog';
import { TOTAL_SURAHS, TOTAL_JUZS } from '../quran/quranHelpers';

const shelfIn = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
`;

/**
 * Badge shelf: surah completion is the pride metric; juz' progress is a quiet pacing meter.
 */
const BadgeShelf = ({
  earnedIds = [],
  newlyEarnedIds = [],
  currentStreak = 0,
  completedSurahs = 0,
  completedJuzs = 0,
  selectedJuz = 30,
  juzSectionsDone = 0,
  juzSectionsTotal = 0,
}) => {
  const { colorMode } = useColorMode();
  const earnedSet = new Set(earnedIds);
  const newSet = new Set(newlyEarnedIds);
  const surahProgress = Math.min(100, (completedSurahs / TOTAL_SURAHS) * 100);
  const juzPercent =
    juzSectionsTotal > 0
      ? Math.min(100, (juzSectionsDone / juzSectionsTotal) * 100)
      : 0;
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
          <Text fontSize="xs" color={isDark ? 'whiteAlpha.700' : 'mist.600'} fontWeight="600">
            Surahs {completedSurahs}/{TOTAL_SURAHS}
          </Text>
          <Text fontSize="xs" color={isDark ? 'whiteAlpha.500' : 'mist.500'}>
            Juz&apos; {completedJuzs}/{TOTAL_JUZS}
          </Text>
        </HStack>
      </Flex>

      {/* Primary: full named surahs */}
      <Progress
        value={surahProgress}
        size="xs"
        borderRadius="full"
        colorScheme="teal"
        mb={2}
        bg={isDark ? 'whiteAlpha.200' : 'mist.200'}
        aria-label={`Surahs completed ${completedSurahs} of ${TOTAL_SURAHS}`}
      />

      {/* Secondary: sections inside the juz' you're browsing */}
      <Flex justify="space-between" align="center" mb={1}>
        <Text fontSize="xs" color={isDark ? 'whiteAlpha.500' : 'mist.500'}>
          Juz&apos; {selectedJuz} sections
        </Text>
        <Text fontSize="xs" color={isDark ? 'whiteAlpha.500' : 'mist.500'}>
          {juzSectionsDone}/{juzSectionsTotal || '—'}
        </Text>
      </Flex>
      <Progress
        value={juzPercent}
        size="xs"
        borderRadius="full"
        colorScheme="gray"
        mb={3}
        bg={isDark ? 'whiteAlpha.100' : 'mist.100'}
        opacity={0.85}
        aria-label={`Juz ${selectedJuz} sections ${juzSectionsDone} of ${juzSectionsTotal}`}
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
          Finish a full surah to earn your first badge
        </Text>
      )}
    </Box>
  );
};

export default BadgeShelf;
