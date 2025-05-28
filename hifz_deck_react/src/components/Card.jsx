import React from 'react';
import { Box, Text, useColorMode } from '@chakra-ui/react';
import { useDrag } from 'react-dnd';

const Card = ({ ayah, isSelected, onSelect, id, index, onDoubleClick }) => {
  const { colorMode } = useColorMode();
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'CARD',
    item: { id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  const handleClick = (e) => {
    e.stopPropagation();
    onSelect();
  };

  return (
    <Box
      ref={drag}
      className={isDragging ? 'dragging' : ''}
      p={4}
      bg={isSelected ? (colorMode === 'dark' ? 'blue.600' : 'blue.100') : (colorMode === 'dark' ? 'gray.700' : 'white')}
      borderRadius="md"
      boxShadow="md"
      cursor="move"
      opacity={isDragging ? 0.5 : 1}
      width="250px"
      height="150px"
      display="flex"
      alignItems="center"
      justifyContent="center"
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick();
      }}
      onClick={handleClick}
      transition="all 0.2s"
      _hover={{
        transform: 'translateY(-2px)',
        boxShadow: 'lg',
      }}
      style={{
        fontFamily: 'Noto Naskh Arabic, serif',
        fontSize: '1.5rem',
        textAlign: 'center',
        direction: 'rtl',
        userSelect: 'none',
        touchAction: 'none',
      }}
    >
      <Text
        fontSize="xl"
        textAlign="center"
        color={colorMode === 'dark' ? 'white' : 'gray.800'}
        dir="rtl"
      >
        {ayah}
      </Text>
    </Box>
  );
};

export default Card; 