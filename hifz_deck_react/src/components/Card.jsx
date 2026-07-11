import React from 'react';
import { Box, Text, useColorMode } from '@chakra-ui/react';

/**
 * A tappable ayah card.
 * status: 'idle' | 'correct' | 'incorrect' | 'completed'
 */
const Card = ({ ayah, status = 'idle', onTap, isFaceDown, readOnly = false }) => {
  const { colorMode } = useColorMode();

  // Background color based on feedback status
  const getBg = () => {
    if (status === 'correct' || status === 'completed') {
      return colorMode === 'dark' ? 'green.700' : 'green.100';
    }
    if (status === 'incorrect') {
      return colorMode === 'dark' ? 'red.700' : 'red.100';
    }
    return colorMode === 'dark' ? 'gray.700' : 'white';
  };

  // Border color based on feedback status
  const getBorderColor = () => {
    if (status === 'correct' || status === 'completed') return 'green.400';
    if (status === 'incorrect') return 'red.400';
    return colorMode === 'dark' ? 'gray.600' : 'gray.200';
  };

  const handleClick = (e) => {
    e.stopPropagation();
    if (!readOnly && onTap) {
      onTap();
    }
  };

  return (
    <Box
      p={{ base: 3, md: 4 }}
      bg={getBg()}
      borderRadius="md"
      boxShadow={readOnly ? 'sm' : 'md'}
      border="2px solid"
      borderColor={getBorderColor()}
      cursor={readOnly ? 'default' : 'pointer'}
      width="100%"
      maxW={{ base: '100%', md: '280px' }}
      minH={{ base: '88px', md: '120px' }}
      display="flex"
      alignItems="center"
      justifyContent="center"
      onClick={handleClick}
      transition="all 0.2s"
      _hover={
        readOnly
          ? undefined
          : {
              transform: 'translateY(-2px)',
              boxShadow: 'lg',
            }
      }
      style={{
        fontFamily: 'Noto Naskh Arabic, serif',
        fontSize: '1.5rem',
        textAlign: 'center',
        direction: 'rtl',
        userSelect: 'none',
      }}
    >
      {isFaceDown ? (
        <Text fontSize="4xl" color={colorMode === 'dark' ? 'gray.500' : 'gray.400'}>
          ?
        </Text>
      ) : (
        <Text
          fontSize={{ base: 'lg', md: 'xl' }}
          textAlign="center"
          color={colorMode === 'dark' ? 'white' : 'gray.800'}
          dir="rtl"
        >
          {ayah}
        </Text>
      )}
    </Box>
  );
};

export default Card;
