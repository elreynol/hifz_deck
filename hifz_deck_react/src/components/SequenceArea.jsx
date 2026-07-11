import React from 'react';
import { Box, Text, useColorMode, SimpleGrid } from '@chakra-ui/react';
import Card from './Card';

/**
 * Read-only strip of correctly selected ayahs in verse order.
 * No drop zones — cards appear here only after a correct tap.
 */
const SequenceArea = ({ cards }) => {
  const { colorMode } = useColorMode();

  // Only show cards that have been correctly placed, sorted by verse order
  const completedCards = cards
    .filter((card) => card.position !== null)
    .sort((a, b) => a.verse - b.verse);

  return (
    <Box
      bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'}
      borderRadius="1rem"
      boxShadow={{ base: 'sm', md: 'md' }}
      padding={{ base: '1rem', md: '1.5rem' }}
      dir="rtl"
      w="100%"
    >
      <Text fontSize={{ base: 'md', md: 'lg' }} mb={3} textAlign="center">
        Completed Sequence
      </Text>

      {completedCards.length === 0 ? (
        <Text
          textAlign="center"
          color={colorMode === 'dark' ? 'gray.400' : 'gray.500'}
          fontSize="sm"
          py={4}
        >
          Tap the first ayah to begin.
        </Text>
      ) : (
        <SimpleGrid
          columns={{ base: 1, sm: 2, md: 3 }}
          spacing={3}
          w="100%"
        >
          {completedCards.map((card) => (
            <Card
              key={card.id}
              ayah={card.text}
              status="completed"
              readOnly
              isFaceDown={false}
            />
          ))}
        </SimpleGrid>
      )}
    </Box>
  );
};

export default SequenceArea;
