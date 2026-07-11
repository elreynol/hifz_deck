import React from 'react';
import { Box, Text, useColorMode, SimpleGrid } from '@chakra-ui/react';
import Card from './Card';

/**
 * Read-only strip of correctly selected ayahs.
 * Forward: ascending verse order. Reverse (السابقون): descending.
 */
const SequenceArea = ({ cards, playDirection = 'forward', isElite = false }) => {
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';
  const isReverse = playDirection === 'reverse';

  const completedCards = cards
    .filter((card) => card.position !== null)
    .sort((a, b) => (isReverse ? b.verse - a.verse : a.verse - b.verse));

  return (
    <Box
      bg={isDark ? 'rgba(34, 66, 63, 0.55)' : 'rgba(255, 255, 255, 0.55)'}
      backdropFilter="blur(14px)"
      borderRadius={{ base: 'lg', md: 'xl' }}
      boxShadow="soft"
      padding={{ base: '0.75rem', md: '1.5rem' }}
      dir="rtl"
      w="100%"
      border="1px solid"
      borderColor={
        isElite
          ? isDark
            ? 'elite.400'
            : 'elite.300'
          : isDark
            ? 'whiteAlpha.200'
            : 'mist.200'
      }
    >
      <Text
        fontFamily="heading"
        fontSize={{ base: 'sm', md: 'lg' }}
        mb={{ base: 2, md: 3 }}
        textAlign="center"
        color={isDark ? 'mist.100' : 'ink.800'}
      >
        {isReverse ? 'Completed Sequence · السابقون' : 'Completed Sequence'}
      </Text>

      {completedCards.length === 0 ? (
        <Text
          textAlign="center"
          color={isDark ? 'whiteAlpha.600' : 'mist.500'}
          fontSize="xs"
          py={{ base: 2, md: 5 }}
        >
          {isReverse ? 'Tap the last ayah to begin.' : 'Tap the first ayah to begin.'}
        </Text>
      ) : (
        <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} spacing={{ base: 2, md: 3 }} w="100%">
          {completedCards.map((card) => (
            <Card
              key={card.id}
              ayah={card.text}
              status="completed"
              readOnly
              isFaceDown={false}
              isElite={isElite}
            />
          ))}
        </SimpleGrid>
      )}
    </Box>
  );
};

export default SequenceArea;
