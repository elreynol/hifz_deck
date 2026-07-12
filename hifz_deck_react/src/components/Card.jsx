import React from 'react';
import { Box, Text, useColorMode } from '@chakra-ui/react';

/**
 * A tappable ayah card — manuscript-like surface with clear feedback states.
 * status: 'idle' | 'correct' | 'incorrect' | 'completed'
 */
const Card = ({ ayah, status = 'idle', onTap, isFaceDown, readOnly = false, isElite = false }) => {
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';

  const getBg = () => {
    if (status === 'incorrect') return isDark ? 'red.800' : 'red.50';
    if (status === 'correct') return isDark ? 'green.800' : 'green.50';
    if (status === 'completed') {
      if (isElite) return isDark ? 'elite.800' : 'elite.50';
      return isDark ? 'ink.800' : 'ink.50';
    }
    return isDark ? 'rgba(34, 66, 63, 0.72)' : 'rgba(255, 255, 255, 0.82)';
  };

  const getBorderColor = () => {
    if (status === 'correct' || status === 'completed') {
      return isElite ? 'elite.400' : 'ink.300';
    }
    if (status === 'incorrect') return 'red.400';
    if (isElite) return isDark ? 'elite.400' : 'elite.300';
    return isDark ? 'whiteAlpha.200' : 'mist.200';
  };

  const handleClick = (e) => {
    e.stopPropagation();
    if (!readOnly && onTap) {
      onTap();
    }
  };

  return (
    <Box
      p={{ base: 2, md: 3 }}
      bg={getBg()}
      borderRadius="lg"
      boxShadow={readOnly ? 'soft' : 'panel'}
      border="1px solid"
      borderColor={getBorderColor()}
      backdropFilter="blur(10px)"
      cursor={readOnly ? 'default' : 'pointer'}
      width="100%"
      maxW={{ base: '100%', md: '280px' }}
      minH={{ base: '72px', md: '128px' }}
      display="flex"
      alignItems="center"
      justifyContent="center"
      onClick={handleClick}
      transition="transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease, background 0.2s ease"
      _hover={
        readOnly
          ? undefined
          : {
              transform: { base: 'none', md: 'translateY(-3px)' },
              boxShadow: 'panel',
              borderColor: isElite ? 'elite.400' : 'ink.400',
            }
      }
      _active={
        readOnly
          ? undefined
          : {
              transform: 'scale(0.99)',
            }
      }
      style={{
        fontFamily: 'Noto Naskh Arabic, serif',
        textAlign: 'center',
        direction: 'rtl',
        userSelect: 'none',
      }}
    >
      {isFaceDown ? (
        <Text fontSize={{ base: '3xl', md: '4xl' }} color={isDark ? 'whiteAlpha.400' : 'mist.400'}>
          ?
        </Text>
      ) : (
        <Text
          fontSize={{ base: 'lg', md: '2xl' }}
          lineHeight={{ base: '1.45', md: '1.55' }}
          textAlign="center"
          color={isDark ? 'mist.50' : 'ink.900'}
          dir="rtl"
          fontFamily="arabic"
          overflowWrap="break-word"
          wordBreak="break-word"
          maxW="100%"
        >
          {ayah}
        </Text>
      )}
    </Box>
  );
};

export default Card;
