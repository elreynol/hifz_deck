import React, { useState, useEffect, useRef } from 'react';
import {
  Box, VStack, Heading, Text, Button, HStack, Container, useToast, IconButton, 
  useColorMode, Select, Modal, ModalOverlay, ModalContent, ModalHeader, 
  ModalFooter, ModalBody, ModalCloseButton, FormControl, FormLabel, Input, useDisclosure,
  Table, Thead, Tbody, Tr, Th, Td, TableContainer, Tabs, TabList, Tab, TabPanels, TabPanel
} from '@chakra-ui/react';
import { MoonIcon, SunIcon, ArrowRightIcon, CheckIcon, RepeatIcon, StarIcon } from '@chakra-ui/icons';
import Card from './components/Card';
import SequenceArea from './components/SequenceArea';
import { useSequence } from './context/SequenceContext';

const App = () => {
  const { sequence, isLoading, error } = useSequence();
  const [selectedSurah, setSelectedSurah] = useState(null);
  const [cards, setCards] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  const { colorMode, toggleColorMode } = useColorMode();
  const toast = useToast();

  // Stopwatch state
  const [time, setTime] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const timerRef = useRef(null);

  // Auth state
  const { isOpen: isAuthModalOpen, onOpen: onAuthModalOpen, onClose: onAuthModalClose } = useDisclosure();
  const [currentUser, setCurrentUser] = useState(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState(''); // Not used for validation in mock
  const [isSigningUp, setIsSigningUp] = useState(false);

  // Leaderboard state
  const { isOpen: isLeaderboardModalOpen, onOpen: onLeaderboardModalOpen, onClose: onLeaderboardModalClose } = useDisclosure();
  const [leaderboardData, setLeaderboardData] = useState({ surahTimes: {}, totalCorrectSurahs: [] });
  const [leaderboardSurahSelection, setLeaderboardSurahSelection] = useState(null);

  // Load user and leaderboard data on initial mount
  useEffect(() => {
    const storedUser = localStorage.getItem('hifzDeckCurrentUser');
    if (storedUser) setCurrentUser(storedUser);

    const storedLeaderboards = localStorage.getItem('hifzDeckLeaderboards');
    if (storedLeaderboards) {
      setLeaderboardData(JSON.parse(storedLeaderboards));
    } else { // Initialize if not present
      localStorage.setItem('hifzDeckLeaderboards', JSON.stringify({ surahTimes: {}, totalCorrectSurahs: [] }));
    }
  }, []);

  console.log('App render state:', { sequence, isLoading, error, selectedSurah, cardsLength: cards.length });

  useEffect(() => {
    console.log('Initial surah effect:', { isLoading, sequenceLength: sequence.length, selectedSurah });
    if (!isLoading && sequence.length > 0 && !selectedSurah) {
      console.log('Setting initial surah to:', sequence[0].number);
      setSelectedSurah(sequence[0].number.toString()); // Ensure string for Select value
    }
  }, [isLoading, sequence, selectedSurah]);

  useEffect(() => {
    // This effect now only prepares cards when a surah is selected,
    // but doesn't start the game or timer.
    console.log('Cards effect (surah change):', { isLoading, selectedSurah, sequenceLength: sequence.length });
    if (!isLoading && selectedSurah && sequence.length > 0) {
      const surah = sequence.find(s => s.number.toString() === selectedSurah);
      console.log('Found surah for card prep:', surah);
      if (surah) {
        const newCards = surah.ayat.map((ayah, idx) => ({
          id: idx + 1,
          text: ayah,
          verse: idx + 1,
          position: null
        }));
        // Cards are prepared but not shuffled until game start
        setCards(newCards); 
        setSelectedCard(null);
        // Reset game state when surah changes
        setGameStarted(false);
        setTimerActive(false);
        setTime(0);
        if (timerRef.current) clearInterval(timerRef.current);
      }
    }
  }, [selectedSurah, sequence, isLoading]);

  // Timer effect
  useEffect(() => {
    if (timerActive) {
      timerRef.current = setInterval(() => {
        setTime(prevTime => prevTime + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [timerActive]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const shuffleArray = (array) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  const handleCardDrop = (item, position) => {
    console.log('Dropping card:', item, 'at position:', position);
    setCards(prevCards => {
      const newCards = [...prevCards];
      const cardIndex = newCards.findIndex(c => c.id === item.id);
      
      if (cardIndex !== -1) {
        // If there's a card at the target position, remove it
        if (position) {
          const cardAtPosition = newCards.find(c => c.position === position);
          if (cardAtPosition) {
            cardAtPosition.position = null;
          }
        }

        // Update the dropped card's position
        newCards[cardIndex] = {
          ...newCards[cardIndex],
          position
        };
      }

      return newCards;
    });
    setSelectedCard(null); // Clear selection after drop
  };

  const handleStartGame = () => {
    if (!selectedSurah) {
      toast({
        title: 'Select a Surah',
        description: 'Please select a surah before starting.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
        position: 'top'
      });
      return;
    }
    setCards(prevCards => shuffleArray([...prevCards.filter(c => !c.position)])); // Shuffle only unplaced cards initially
    setGameStarted(true);
    setTime(0);
    setTimerActive(true);
    setSelectedCard(null);
  };

  const handleShuffle = () => {
    if (!gameStarted) {
      toast({ title: "Start the game first!", status: "info", duration: 2000, isClosable: true });
      return;
    }
    setCards(prevCards => {
      const unplacedCards = prevCards.filter(card => !card.position);
      const placedCards = prevCards.filter(card => card.position);
      
      return [
        ...shuffleArray(unplacedCards),
        ...placedCards
      ];
    });
  };

  const handleReset = () => {
    if (selectedSurah) {
      const surah = sequence.find(s => s.number.toString() === selectedSurah);
      if (surah) {
        const newCards = surah.ayat.map((ayah, idx) => ({
          id: idx + 1,
          text: ayah,
          verse: idx + 1,
          position: null
        }));
        setCards(newCards); // Reset to initial, unshuffled state
        setSelectedCard(null);
      }
    }
    setGameStarted(false);
    setTimerActive(false);
    setTime(0);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const updateLeaderboards = (surahNumber, timeTaken) => {
    if (!currentUser) return;

    let personalBestAchieved = false;
    let newTotalCorrectMilestone = null;
    const milestones = [5, 10, 20];

    setLeaderboardData(prevData => {
      const newData = JSON.parse(JSON.stringify(prevData));
      const oldUserTotalCorrectData = prevData.totalCorrectSurahs.find(entry => entry.username === currentUser);
      const oldUserTotalCorrectCount = oldUserTotalCorrectData ? oldUserTotalCorrectData.count : 0;

      // Update Surah Times
      if (!newData.surahTimes[surahNumber]) {
        newData.surahTimes[surahNumber] = [];
      }
      const userTimeEntryIndex = newData.surahTimes[surahNumber].findIndex(entry => entry.username === currentUser);
      const oldUserTimeForThisSurah = userTimeEntryIndex > -1 ? newData.surahTimes[surahNumber][userTimeEntryIndex].time : Infinity;

      if (userTimeEntryIndex > -1) {
        if (timeTaken < oldUserTimeForThisSurah) {
          newData.surahTimes[surahNumber][userTimeEntryIndex].time = timeTaken;
          personalBestAchieved = true; // Personal best for this surah
        }
      } else {
        newData.surahTimes[surahNumber].push({ username: currentUser, time: timeTaken });
        personalBestAchieved = true; // First time, so it's a personal best
      }
      newData.surahTimes[surahNumber].sort((a, b) => a.time - b.time);

      // Update Total Correct Surahs
      const userCorrectIndex = newData.totalCorrectSurahs.findIndex(entry => entry.username === currentUser);
      let userCompletedThisSurahBefore = false;
      if(prevData.surahTimes[surahNumber] && prevData.surahTimes[surahNumber].some(e => e.username === currentUser && e.time !== Infinity)) {
        // Check if there was a *valid* previous time entry, implying they completed it before.
        // The personalBestAchieved flag already covers if their *first ever* completion of this surah happened now.
        // This check is more about whether their *unique surah count* should increment.
        // If they had a previous time (even if it was worse), they'd already had this surah in their count.
        // So, if personalBestAchieved is true AND oldUserTimeForThisSurah was Infinity, it implies first completion of THIS surah.
        if (oldUserTimeForThisSurah === Infinity) { // Stricter check: was it their first valid completion of *this* surah?
          userCompletedThisSurahBefore = false; 
        } else {
          userCompletedThisSurahBefore = true;
        }
      }
      
      let currentTotalCorrectCount = oldUserTotalCorrectCount;
      if (userCorrectIndex > -1) {
        if(!userCompletedThisSurahBefore) {
          newData.totalCorrectSurahs[userCorrectIndex].count += 1;
          currentTotalCorrectCount = newData.totalCorrectSurahs[userCorrectIndex].count;
        } else {
          currentTotalCorrectCount = newData.totalCorrectSurahs[userCorrectIndex].count; // No change to count
        }
      } else {
        newData.totalCorrectSurahs.push({ username: currentUser, count: 1 });
        currentTotalCorrectCount = 1;
      }
      newData.totalCorrectSurahs.sort((a, b) => b.count - a.count);

      // Check for milestones
      for (const ms of milestones) {
        if (oldUserTotalCorrectCount < ms && currentTotalCorrectCount >= ms) {
          newTotalCorrectMilestone = ms;
          break; // Only trigger one milestone at a time
        }
      }
      
      localStorage.setItem('hifzDeckLeaderboards', JSON.stringify(newData));
      return newData;
    });

    // Trigger toasts outside of setLeaderboardData to ensure they have the latest state context
    // Use a slight delay for toasts to allow state update to settle and main result toast to appear first
    setTimeout(() => {
      if (personalBestAchieved) {
        const surahName = sequence.find(s => s.number.toString() === surahNumber)?.name || 'this Surah';
        toast({
          title: 'Personal Best!',
          description: `New speed record for ${surahName}! Time: ${formatTime(timeTaken)}`,
          status: 'info',
          duration: 4000,
          isClosable: true,
          position: 'top-right' 
        });
      }
      if (newTotalCorrectMilestone) {
        toast({
          title: 'Achievement Unlocked!',
          description: `Congratulations! You've correctly completed ${newTotalCorrectMilestone} Surahs!`,
          status: 'success',
          duration: 5000,
          isClosable: true,
          position: 'top-right'
        });
      }
    }, 600); // Delay to separate from main success/fail toast
  };

  const handleCheck = () => {
    if (!gameStarted) {
      toast({ title: "Start the game first!", status: "info", duration: 2000, isClosable: true });
      return;
    }
    setTimerActive(false);
    const allCardsPlaced = cards.every(card => card.position !== null);
    if (!allCardsPlaced) {
      toast({
        title: 'Sequence Incomplete',
        description: 'Please place all cards in the sequence.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
        position: 'top'
      });
      setTimerActive(true); 
      return;
    }

    const isCorrect = cards.every(card => card.position === card.verse);
    const recordedTime = formatTime(time);

    toast({
      title: isCorrect ? 'Correct!' : 'Not quite right',
      description: `${isCorrect ? 'Well done!' : 'Try again!'} Your time: ${recordedTime}`,
      status: isCorrect ? 'success' : 'error',
      duration: 5000,
      isClosable: true,
      position: 'top',
    });

    if (isCorrect && currentUser && selectedSurah) {
      updateLeaderboards(selectedSurah, time);
    }
  };

  const handleCardSelect = (id) => {
    console.log('Selecting card:', id);
    setSelectedCard(id);
  };

  const handleSurahChange = (event) => {
    setSelectedSurah(event.target.value);
  };

  const handleLogin = () => {
    // Mock login: Check if user exists in localStorage
    const storedUsers = JSON.parse(localStorage.getItem('hifzDeckUsers') || '[]');
    if (storedUsers.includes(usernameInput)) {
      setCurrentUser(usernameInput);
      localStorage.setItem('hifzDeckCurrentUser', usernameInput);
      toast({ title: `Welcome back, ${usernameInput}!`, status: 'success', duration: 3000 });
      onAuthModalClose();
    } else {
      toast({ title: 'Login Failed', description: 'User not found. Please sign up.', status: 'error', duration: 3000 });
    }
    setUsernameInput('');
    setPasswordInput('');
  };

  const handleSignup = () => {
    // Mock signup: Add user to localStorage
    let storedUsers = JSON.parse(localStorage.getItem('hifzDeckUsers') || '[]');
    if (usernameInput.trim() === '' ) {
      toast({ title: 'Signup Failed', description: 'Username cannot be empty.', status: 'error', duration: 3000 });
      return;
    }
    if (storedUsers.includes(usernameInput)) {
      toast({ title: 'Signup Failed', description: 'Username already taken.', status: 'error', duration: 3000 });
    } else {
      storedUsers.push(usernameInput);
      localStorage.setItem('hifzDeckUsers', JSON.stringify(storedUsers));
      setCurrentUser(usernameInput);
      localStorage.setItem('hifzDeckCurrentUser', usernameInput);
      toast({ title: `Welcome, ${usernameInput}!`, status: 'success', duration: 3000 });
      onAuthModalClose();
    }
    setUsernameInput('');
    setPasswordInput('');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('hifzDeckCurrentUser');
    toast({ title: 'Logged Out', status: 'info', duration: 3000 });
  };

  if (isLoading) {
    return (
      <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center">
        <Text>Loading...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center">
        <Text color="red.500">Error: {error}</Text>
      </Box>
    );
  }

  const unplacedCards = cards.filter(card => !card.position);
  const placedCards = cards.filter(card => card.position);

  return (
    <Box
      minHeight="100vh"
      bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'}
      color={colorMode === 'dark' ? 'white' : 'gray.800'}
      padding="2rem"
      paddingBottom={gameStarted ? "2rem" : "50vh"} // Adjust padding if game started
    >
      <Container maxW="container.xl">
        <VStack spacing={8} align="stretch">
          <HStack justify="space-between" align="center">
            <Box textAlign="center" flex="1">
              <Heading as="h1" size="2xl" mb={4}>
                Quranic Flashcards
              </Heading>
              <Text fontSize="xl" color={colorMode === 'dark' ? 'gray.300' : 'gray.600'}>
                Memorize the Quran with interactive flashcards
              </Text>
            </Box>
            <HStack>
              {currentUser ? (
                <>
                  <Text>Welcome, {currentUser}!</Text>
                  <Button onClick={handleLogout} size="sm" variant="outline">Logout</Button>
                  <IconButton icon={<StarIcon />} onClick={onLeaderboardModalOpen} size="sm" aria-label="Open Leaderboard" variant="ghost"/>
                </>
              ) : (
                <Button onClick={() => { setIsSigningUp(false); onAuthModalOpen(); }} size="sm">Login / Sign Up</Button>
              )}
              <IconButton
                icon={colorMode === 'dark' ? <SunIcon /> : <MoonIcon />}
                onClick={toggleColorMode}
                variant="ghost"
                aria-label="Toggle color mode"
              />
            </HStack>
          </HStack>

          <Box>
            <Text mb={2}>Select Surah:</Text>
            <Select value={selectedSurah || ''} onChange={handleSurahChange} placeholder="Select a Surah" isDisabled={gameStarted || isLoading}>
              {sequence.map((surah) => (
                <option key={surah.number} value={surah.number.toString()}>
                  {surah.number}. {surah.name}
                </option>
              ))}
            </Select>
          </Box>

          {gameStarted && (
            <Box textAlign="center">
              <Text fontSize="2xl" fontWeight="bold">Time: {formatTime(time)}</Text>
            </Box>
          )}

          <HStack spacing={4} justify="center">
            {!gameStarted ? (
              <Button onClick={handleStartGame} colorScheme="green" leftIcon={<ArrowRightIcon />} isDisabled={!selectedSurah || isLoading}>
                Start Game
              </Button>
            ) : (
              <Button onClick={handleShuffle} colorScheme="blue" isDisabled={!gameStarted}>
                Shuffle Unplaced Cards
              </Button>
            )}
            <Button onClick={handleReset} colorScheme="orange" leftIcon={<RepeatIcon />} isDisabled={isLoading}>
              Reset Game
            </Button>
            <Button onClick={handleCheck} colorScheme="purple" leftIcon={<CheckIcon />} isDisabled={!gameStarted}>
              Check Sequence
            </Button>
          </HStack>

          {gameStarted && (
            <>
              <Box
                bg={colorMode === 'dark' ? 'gray.700' : 'white'}
                borderRadius="1rem"
                boxShadow="md"
                padding="2rem"
              >
                <Text fontSize="lg" mb={4} color={colorMode === 'dark' ? 'gray.300' : 'gray.600'}>
                  Available Cards
                </Text>
                <HStack spacing={4} wrap="wrap" justify="center">
                  {unplacedCards.map((card) => (
                    <Box
                      key={card.id}
                      display="flex"
                      justifyContent="center"
                      alignItems="center"
                    >
                      <Card
                        ayah={card.text}
                        isSelected={selectedCard === card.id}
                        onSelect={() => handleCardSelect(card.id)}
                        id={card.id}
                        index={card.id}
                      />
                    </Box>
                  ))}
                </HStack>
              </Box>

              <SequenceArea
                cards={cards}
                onCardSelect={handleCardSelect}
                selectedCards={selectedCard ? [selectedCard] : []}
                onCardDrop={handleCardDrop}
                totalCards={cards.filter(c => c.position !== null || gameStarted).length} // Show all drop zones if game started
              />
            </>
          )}
        </VStack>
      </Container>

      <Modal isOpen={isAuthModalOpen} onClose={onAuthModalClose} isCentered>
        <ModalOverlay />
        <ModalContent bg={colorMode === 'dark' ? 'gray.700' : 'white'}>
          <ModalHeader>{isSigningUp ? 'Sign Up' : 'Login'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <FormControl>
              <FormLabel>Username</FormLabel>
              <Input 
                placeholder="Enter username" 
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
              />
            </FormControl>

            <FormControl mt={4}>
              <FormLabel>Password</FormLabel>
              <Input 
                placeholder="Enter password" 
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
              />
            </FormControl>
          </ModalBody>

          <ModalFooter>
            {isSigningUp ? (
              <Button colorScheme="blue" mr={3} onClick={handleSignup}>
                Sign Up
              </Button>
            ) : (
              <Button colorScheme="blue" mr={3} onClick={handleLogin}>
                Login
              </Button>
            )}
            <Button onClick={() => setIsSigningUp(!isSigningUp)} variant="ghost">
              {isSigningUp ? 'Already have an account? Login' : 'Need an account? Sign Up'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isLeaderboardModalOpen} onClose={onLeaderboardModalClose} size="xl" isCentered>
        <ModalOverlay />
        <ModalContent bg={colorMode === 'dark' ? 'gray.700' : 'white'}>
          <ModalHeader>Leaderboards</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <Tabs isFitted variant="enclosed">
              <TabList mb="1em">
                <Tab>Best Times per Surah</Tab>
                <Tab>Most Correct Surahs</Tab>
              </TabList>
              <TabPanels>
                <TabPanel>
                  <FormControl mb={4}>
                    <FormLabel>Select Surah to View Times:</FormLabel>
                    <Select 
                      placeholder="Select Surah"
                      value={leaderboardSurahSelection || ''}
                      onChange={(e) => setLeaderboardSurahSelection(e.target.value)}
                    >
                      {sequence.map((surah) => (
                        <option key={surah.number} value={surah.number.toString()}>
                          {surah.number}. {surah.name}
                        </option>
                      ))}
                    </Select>
                  </FormControl>
                  {leaderboardSurahSelection && leaderboardData.surahTimes[leaderboardSurahSelection] && leaderboardData.surahTimes[leaderboardSurahSelection].length > 0 ? (
                    <TableContainer>
                      <Table variant="simple" size="sm">
                        <Thead>
                          <Tr>
                            <Th>Rank</Th>
                            <Th>Username</Th>
                            <Th isNumeric>Time (MM:SS)</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {leaderboardData.surahTimes[leaderboardSurahSelection].slice(0, 10).map((entry, index) => (
                            <Tr key={`${entry.username}-${index}`}>
                              <Td>{index + 1}</Td>
                              <Td>{entry.username}</Td>
                              <Td isNumeric>{formatTime(entry.time)}</Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Text>{leaderboardSurahSelection ? 'No times recorded for this Surah yet.' : 'Select a Surah to see best times.'}</Text>
                  )}
                </TabPanel>
                <TabPanel>
                  {leaderboardData.totalCorrectSurahs && leaderboardData.totalCorrectSurahs.length > 0 ? (
                    <TableContainer>
                      <Table variant="simple" size="sm">
                        <Thead>
                          <Tr>
                            <Th>Rank</Th>
                            <Th>Username</Th>
                            <Th isNumeric>Correct Surahs</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {leaderboardData.totalCorrectSurahs.slice(0, 10).map((entry, index) => (
                            <Tr key={`${entry.username}-${index}`}>
                              <Td>{index + 1}</Td>
                              <Td>{entry.username}</Td>
                              <Td isNumeric>{entry.count}</Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Text>No one has completed any Surahs correctly yet!</Text>
                  )}
                </TabPanel>
              </TabPanels>
            </Tabs>
          </ModalBody>
          <ModalFooter>
            <Button onClick={onLeaderboardModalClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default App; 