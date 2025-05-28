import React, { useRef, useEffect } from 'react';
import { Box, Text, Icon, useColorMode } from '@chakra-ui/react';
import { useDrop } from 'react-dnd';
import { CheckIcon, CloseIcon } from '@chakra-ui/icons';
import Card from './Card';

const DropZone = ({ position, onCardDrop, card, onCardSelect, isSelected, onDoubleClick, selectedCardId }) => {
  const { colorMode } = useColorMode();
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'CARD',
    drop: (item) => onCardDrop(item, position),
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  const isCorrect = card && card.verse === position;

  const handleClick = (e) => {
    e.stopPropagation();
    if (selectedCardId) {
      onCardDrop({ id: selectedCardId }, position);
    } else if (card) {
      onCardSelect(card.id);
    }
  };

  return (
    <Box
      ref={drop}
      p={2}
      bg={isOver ? (colorMode === 'dark' ? 'gray.600' : 'gray.100') : (colorMode === 'dark' ? 'gray.800' : 'gray.50')}
      borderRadius="md"
      minHeight="160px"
      display="flex"
      alignItems="center"
      justifyContent="center"
      border="2px dashed"
      borderColor={isOver ? 'blue.500' : (colorMode === 'dark' ? 'gray.700' : 'gray.300')}
      transition="all 0.2s"
      position="relative"
      width="270px"
      height="160px"
      cursor="pointer"
      onClick={handleClick}
      _hover={{
        borderColor: 'blue.500',
        bg: colorMode === 'dark' ? 'gray.700' : 'gray.100',
      }}
    >
      {card ? (
        <Box position="relative" width="100%" height="100%" onClick={(e) => e.stopPropagation()}>
          <Card
            ayah={card.text}
            isSelected={isSelected}
            onSelect={() => onCardSelect(card.id)}
            id={card.id}
            index={card.id}
            onDoubleClick={() => onDoubleClick(card)}
          />
          {card.verse !== undefined && (
            <Icon
              as={isCorrect ? CheckIcon : CloseIcon}
              position="absolute"
              top="0.5rem"
              right="0.5rem"
              color={isCorrect ? 'green.500' : 'red.500'}
              boxSize={5}
              zIndex={10}
            />
          )}
        </Box>
      ) : (
        <Text
          color={colorMode === 'dark' ? 'gray.400' : 'gray.500'}
          fontSize="lg"
          fontWeight="medium"
          textAlign="center"
        >
          {position}
        </Text>
      )}
    </Box>
  );
};

// Define card height and scroll sensitivity outside the component or pass as props if dynamic
const CARD_ACTUAL_HEIGHT = 150; // Based on Card.jsx style
const SCROLL_ACTIVATION_MARGIN = 20; // Start scrolling when card edge is this close to viewport edge
const SCROLL_TRIGGER_ZONE_HEIGHT = CARD_ACTUAL_HEIGHT + SCROLL_ACTIVATION_MARGIN;

const SequenceArea = ({ cards, onCardSelect, selectedCards, onCardDrop, totalCards }) => {
  const { colorMode } = useColorMode();
  const containerRef = useRef(null);
  const scrollIntervalRef = useRef(null);

  useEffect(() => {
    const scrollSpeed = 10;

    const handleDragOver = (e) => {
      // We are scrolling the window, so no specific check for containerRef.current here is needed for scrolling
      
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
        scrollIntervalRef.current = null; // Clear the ref after clearing interval
      }

      const viewportHeight = window.innerHeight;

      // Scroll down if mouse pointer is in the bottom trigger zone
      if (e.clientY > viewportHeight - SCROLL_TRIGGER_ZONE_HEIGHT) {
        scrollIntervalRef.current = setInterval(() => {
          window.scrollBy(0, scrollSpeed); // Scroll the main window
        }, 16); // approx 60fps
      }
      // Scroll up if mouse pointer is in the top trigger zone
      else if (e.clientY < SCROLL_TRIGGER_ZONE_HEIGHT) {
        scrollIntervalRef.current = setInterval(() => {
          window.scrollBy(0, -scrollSpeed); // Scroll the main window
        }, 16);
      }
    };

    const handleDragEndOrDrop = () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
      }
    };

    // Add event listeners to the window for global drag monitoring
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragend', handleDragEndOrDrop); // Use same handler for dragend and drop
    window.addEventListener('drop', handleDragEndOrDrop);

    // Cleanup function to remove event listeners
    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragend', handleDragEndOrDrop);
      window.removeEventListener('drop', handleDragEndOrDrop);
      if (scrollIntervalRef.current) { // Ensure cleanup if component unmounts during scroll
        clearInterval(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
      }
    };
  }, []); // Empty dependency array ensures this effect runs only once on mount and cleans up on unmount

  const handleDoubleClick = (card) => {
    onCardDrop({ id: card.id }, null);
  };

  return (
    <Box
      ref={containerRef}
      bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'}
      borderRadius="1rem"
      boxShadow="lg"
      padding="2rem"
      dir="rtl"
      maxHeight="80vh"
      overflowY="auto"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => e.preventDefault()}
      sx={{
        '&::-webkit-scrollbar': {
          width: '8px',
        },
        '&::-webkit-scrollbar-track': {
          bg: colorMode === 'dark' ? 'gray.700' : 'gray.100',
          borderRadius: '4px',
        },
        '&::-webkit-scrollbar-thumb': {
          bg: colorMode === 'dark' ? 'gray.600' : 'gray.300',
          borderRadius: '4px',
          '&:hover': {
            bg: colorMode === 'dark' ? 'gray.500' : 'gray.400',
          },
        },
      }}
    >
      <Text fontSize="xl" mb={4} textAlign="center">
        Drag and drop cards here in the correct sequence
      </Text>
      <Box
        display="flex"
        flexDirection="row-reverse"
        flexWrap="nowrap"
        gap="1rem"
        justifyContent="center"
        overflowX="auto"
        paddingY={4}
      >
        {Array.from({ length: totalCards }, (_, i) => i + 1).reverse().map((position) => {
          const card = cards.find(c => c.position === position);
          return (
            <Box key={position} flexShrink={0}>
              <DropZone
                position={position}
                onCardDrop={onCardDrop}
                card={card}
                onCardSelect={onCardSelect}
                isSelected={selectedCards.includes(card?.id)}
                onDoubleClick={handleDoubleClick}
                selectedCardId={selectedCards[0]}
              />
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default SequenceArea; 