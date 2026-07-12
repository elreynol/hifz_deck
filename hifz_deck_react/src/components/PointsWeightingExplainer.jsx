import React, { useState } from 'react';
import {
  Box,
  Button,
  Collapse,
  Flex,
  HStack,
  SimpleGrid,
  Text,
  VStack,
  useColorMode,
} from '@chakra-ui/react';
import { ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons';
import {
  CARD_MULT,
  LEVEL_MULT,
  DIRECTION_MULT,
  computePoints,
} from '../utils/scoring';

const EXAMPLE_AYAHS = 10;
const EXAMPLE_SECONDS = 40;

/**
 * Expandable guide under the leaderboard — explains weighted points + live preview.
 */
const PointsWeightingExplainer = ({
  difficulty = 'beginner',
  cardCount = 5,
  playDirection = 'forward',
  stopwatchEnabled = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';

  const cardMult = CARD_MULT[cardCount] ?? 1;
  const levelMult = LEVEL_MULT[difficulty] ?? 1;
  const directionMult = DIRECTION_MULT[playDirection] ?? 1;
  const examplePoints = computePoints({
    ayahCount: EXAMPLE_AYAHS,
    durationSeconds: EXAMPLE_SECONDS,
    cardCount,
    difficulty,
    playDirection,
    stopwatchEnabled,
  });

  const muted = isDark ? 'whiteAlpha.600' : 'mist.500';
  const ink = isDark ? 'mist.50' : 'ink.800';
  const softBg = isDark ? 'blackAlpha.300' : 'mist.100';
  const border = isDark ? 'whiteAlpha.200' : 'mist.200';


  const MultRow = ({ label, value, active }) => (
    <Flex justify="space-between" gap={3} fontSize="sm">
      <Text color={muted}>{label}</Text>
      <Text fontWeight={active ? '700' : '500'} color={active ? (isDark ? 'elite.200' : 'ink.600') : ink}>
        ×{value}
      </Text>
    </Flex>
  );

  return (
    <Box mt={4} borderTop="1px solid" borderColor={border} pt={3}>
      <Button
        variant="ghost"
        size="sm"
        w="100%"
        justifyContent="space-between"
        onClick={() => setIsOpen((v) => !v)}
        rightIcon={isOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
        color={ink}
        fontWeight="600"
        aria-expanded={isOpen}
      >
        How Overall Points are weighted
      </Button>

      <Collapse in={isOpen} animateOpacity>
        <VStack align="stretch" spacing={4} mt={3} px={1}>
          <Text fontSize="sm" color={muted} lineHeight="1.55">
            Fastest Times stay raw (seconds only). Overall Points reward harder settings and
            speed relative to how many ayahs you cleared:
          </Text>

          <Box
            bg={softBg}
            borderRadius="md"
            px={3}
            py={2.5}
            fontFamily="mono"
            fontSize={{ base: 'xs', md: 'sm' }}
            color={ink}
            textAlign="center"
          >
            {stopwatchEnabled ? (
              <>
                points = round( (ayahs × 100 ÷ seconds) × cards × level × direction )
              </>
            ) : (
              <>
                points = round( ayahs × 10 × cards × level × direction )
                <Text as="span" display="block" mt={1} fontFamily="body" color={muted} fontSize="xs">
                  (stopwatch off — flat completion score)
                </Text>
              </>
            )}
          </Box>

          <SimpleGrid columns={{ base: 1, sm: 3 }} spacing={3}>
            <Box>
              <Text fontSize="xs" fontWeight="700" mb={1.5} color={ink}>
                Choices shown
              </Text>
              <VStack align="stretch" spacing={1}>
                <MultRow label="3 cards" value={CARD_MULT[3]} active={cardCount === 3} />
                <MultRow label="4 cards" value={CARD_MULT[4]} active={cardCount === 4} />
                <MultRow label="5 cards" value={CARD_MULT[5]} active={cardCount === 5} />
              </VStack>
            </Box>
            <Box>
              <Text fontSize="xs" fontWeight="700" mb={1.5} color={ink}>
                Level
              </Text>
              <VStack align="stretch" spacing={1}>
                <MultRow label="Beginner" value={LEVEL_MULT.beginner} active={difficulty === 'beginner'} />
                <MultRow
                  label="Experienced"
                  value={LEVEL_MULT.experienced}
                  active={difficulty === 'experienced'}
                />
              </VStack>
            </Box>
            <Box>
              <Text fontSize="xs" fontWeight="700" mb={1.5} color={ink}>
                Direction
              </Text>
              <VStack align="stretch" spacing={1}>
                <MultRow label="Forward" value={DIRECTION_MULT.forward} active={playDirection === 'forward'} />
                <MultRow label="Reverse" value={DIRECTION_MULT.reverse} active={playDirection === 'reverse'} />
              </VStack>
            </Box>
          </SimpleGrid>

          <Box borderTop="1px dashed" borderColor={border} pt={3}>
            <Text fontSize="xs" fontWeight="700" mb={1} color={ink}>
              With your current settings
            </Text>
            <Text fontSize="sm" color={muted} mb={2}>
              Example: {EXAMPLE_AYAHS} ayahs in {EXAMPLE_SECONDS}s
              {!stopwatchEnabled ? ' (stopwatch off)' : ''}
            </Text>
            <HStack spacing={2} flexWrap="wrap" fontSize="sm" color={ink}>
              <Text>
                ×{cardMult} cards · ×{levelMult} {difficulty} · ×{directionMult}{' '}
                {playDirection}
              </Text>
            </HStack>
            <Text mt={2} fontSize="md" fontWeight="700" color={isDark ? 'elite.200' : 'ink.600'}>
              ≈ {examplePoints} points
            </Text>
          </Box>
        </VStack>
      </Collapse>
    </Box>
  );
};

export default PointsWeightingExplainer;
