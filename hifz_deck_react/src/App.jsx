import React, { useState, useEffect, useRef } from 'react';
import {
  Box, VStack, Heading, Text, Button, HStack, Container, useToast, IconButton, 
  useColorMode, Select, Modal, ModalOverlay, ModalContent, ModalHeader, 
  ModalFooter, ModalBody, ModalCloseButton, FormControl, FormLabel, Input, useDisclosure,
  Table, Thead, Tbody, Tr, Th, Td, TableContainer, Tabs, TabList, Tab, TabPanels, TabPanel,
  Checkbox, Radio, RadioGroup, Stack, SimpleGrid, Flex
} from '@chakra-ui/react';
import { MoonIcon, SunIcon, ArrowRightIcon, RepeatIcon, StarIcon } from '@chakra-ui/icons';
import Card from './components/Card';
import SequenceArea from './components/SequenceArea';
import LoginForm from './components/auth/LoginForm';
import { useSequence } from './context/SequenceContext';
import { useAuth } from './context/AuthContext';
import { supabase } from './supabaseClient';
import AccountSettings from './components/AccountSettings';

const App = () => {
  const { sequence, isLoading, error } = useSequence();
  const { 
    user, 
    session, 
    logout, 
    signUp,
    initialLoading: authInitialLoading, 
    loading: authLoading 
  } = useAuth();
  const [selectedSurah, setSelectedSurah] = useState(null);
  const [cards, setCards] = useState([]);
  const { colorMode, toggleColorMode } = useColorMode();
  const toast = useToast();

  // Stopwatch state
  const [time, setTime] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const timerRef = useRef(null);
  const [stopwatchEnabled, setStopwatchEnabled] = useState(true);

  // Tap-to-order game state
  // attemptMode: 'three' = reset after 3 wrong taps; 'unlimited' = keep trying
  const [attemptMode, setAttemptMode] = useState('three');
  const [nextExpectedVerse, setNextExpectedVerse] = useState(1);
  const [failCount, setFailCount] = useState(0);
  // Brief visual feedback on the tapped card
  const [feedbackCardId, setFeedbackCardId] = useState(null);
  const [feedbackStatus, setFeedbackStatus] = useState('idle'); // 'idle' | 'correct' | 'incorrect'
  const feedbackTimeoutRef = useRef(null);

  // Auth state
  const { isOpen: isAuthModalOpen, onOpen: onAuthModalOpen, onClose: onAuthModalClose } = useDisclosure();
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');

  // Leaderboard state
  const { isOpen: isLeaderboardModalOpen, onOpen: onLeaderboardModalOpen, onClose: onLeaderboardModalClose } = useDisclosure();
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState(false);
  const [leaderboardSurahSelection, setLeaderboardSurahSelection] = useState(null);

  // Temporary state for testing progress recording
  const [testSurahId, setTestSurahId] = useState('1');
  const [testDuration, setTestDuration] = useState('300');

  // Account Settings state
  const { 
    isOpen: isAccountSettingsOpen, 
    onOpen: onAccountSettingsOpen, 
    onClose: onAccountSettingsClose 
  } = useDisclosure();

  // Load user and leaderboard data on initial mount
  useEffect(() => {
    const storedLeaderboards = localStorage.getItem('hifzDeckLeaderboards');
    if (storedLeaderboards) {
      setLeaderboardData(JSON.parse(storedLeaderboards));
    } else { 
      localStorage.setItem('hifzDeckLeaderboards', JSON.stringify({ surahTimes: {}, totalCorrectSurahs: [] }));
    }
  }, []);

  // Effect to close auth modal if user becomes authenticated while it's open
  useEffect(() => {
    if (user && isAuthModalOpen) {
      onAuthModalClose();
      setEmailInput('');
      setPasswordInput('');
      setUsernameInput('');
    }
  }, [user, isAuthModalOpen, onAuthModalClose]);

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
          position: null,
          isFaceDown: true
        }));
        // Cards are prepared but not shuffled until game start
        setCards(newCards);
        // Reset game state when surah changes
        setGameStarted(false);
        setTimerActive(false);
        setTime(0);
        setNextExpectedVerse(1);
        setFailCount(0);
        setFeedbackCardId(null);
        setFeedbackStatus('idle');
        if (timerRef.current) clearInterval(timerRef.current);
        if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
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

  // Clear feedback flash timeout on unmount
  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    };
  }, []);

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

  // Flash correct/incorrect feedback on a card, then clear it
  const flashFeedback = (cardId, status, durationMs = 500) => {
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    setFeedbackCardId(cardId);
    setFeedbackStatus(status);
    feedbackTimeoutRef.current = setTimeout(() => {
      setFeedbackCardId(null);
      setFeedbackStatus('idle');
    }, durationMs);
  };

  // Full sequence restart after 3 strikes: reshuffle, clear progress, restart from ayah 1
  const handleStrikeReset = () => {
    setCards((prevCards) =>
      shuffleArray(
        prevCards.map((card) => ({
          ...card,
          position: null,
          isFaceDown: false,
        }))
      )
    );
    setNextExpectedVerse(1);
    setFailCount(0);
    setFeedbackCardId(null);
    setFeedbackStatus('idle');
    setTime(0);
    if (stopwatchEnabled) {
      setTimerActive(true);
    }
    toast({
      title: '3 wrong attempts — sequence reset',
      description: 'Starting over from the first ayah. Keep practicing!',
      status: 'warning',
      duration: 4000,
      isClosable: true,
      position: 'top',
    });
  };

  // User taps a card in the pool — check if it is the next expected ayah
  const handleCardTap = (cardId) => {
    if (!gameStarted) return;

    const card = cards.find((c) => c.id === cardId);
    // Ignore taps on already-completed cards or missing cards
    if (!card || card.position !== null) return;

    if (card.verse === nextExpectedVerse) {
      // Correct tap: lock card into completed sequence
      const updatedCards = cards.map((c) =>
        c.id === cardId ? { ...c, position: c.verse } : c
      );
      setCards(updatedCards);
      setFailCount(0);
      flashFeedback(cardId, 'correct', 400);

      const allDone = updatedCards.every((c) => c.position !== null);
      if (allDone) {
        setTimerActive(false);
        const recordedTime = formatTime(time);
        toast({
          title: 'Correct!',
          description: `Well done! Your time: ${recordedTime}`,
          status: 'success',
          duration: 5000,
          isClosable: true,
          position: 'top',
        });
        if (user && selectedSurah) {
          updateLeaderboards(selectedSurah, time);
        }
      } else {
        setNextExpectedVerse((prev) => prev + 1);
      }
    } else {
      // Incorrect tap
      const newFailCount = failCount + 1;
      flashFeedback(cardId, 'incorrect', 500);

      if (attemptMode === 'three' && newFailCount >= 3) {
        handleStrikeReset();
      } else {
        setFailCount(newFailCount);
      }
    }
  };

  const handleStartGame = () => {
    if (!selectedSurah) {
      toast({
        title: 'Select a Surah',
        description: 'Please select a surah before starting.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
        position: 'top',
      });
      return;
    }
    setCards((prevCards) =>
      shuffleArray(prevCards.map((card) => ({ ...card, position: null, isFaceDown: false })))
    );
    setGameStarted(true);
    setNextExpectedVerse(1);
    setFailCount(0);
    setFeedbackCardId(null);
    setFeedbackStatus('idle');
    setTime(0);
    if (stopwatchEnabled) {
      setTimerActive(true);
    }
  };

  const handleShuffle = () => {
    if (!gameStarted) {
      toast({ title: 'Start the game first!', status: 'info', duration: 2000, isClosable: true });
      return;
    }
    setCards((prevCards) => {
      const unplacedCards = prevCards.filter((card) => !card.position);
      const placedCards = prevCards.filter((card) => card.position);
      return [...shuffleArray(unplacedCards), ...placedCards];
    });
  };

  const handleReset = () => {
    if (selectedSurah) {
      const surah = sequence.find((s) => s.number.toString() === selectedSurah);
      if (surah) {
        const newCards = surah.ayat.map((ayah, idx) => ({
          id: idx + 1,
          text: ayah,
          verse: idx + 1,
          position: null,
          isFaceDown: true,
        }));
        setCards(newCards);
      }
    }
    setGameStarted(false);
    setTimerActive(false);
    setTime(0);
    setNextExpectedVerse(1);
    setFailCount(0);
    setFeedbackCardId(null);
    setFeedbackStatus('idle');
    if (timerRef.current) clearInterval(timerRef.current);
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
  };

  const updateLeaderboards = (surahNumber, timeTaken) => {
    if (!user) return;
    const usernameToRecord = user.email;

    let personalBestAchieved = false;
    let newTotalCorrectMilestone = null;
    const milestones = [5, 10, 20];

    setLeaderboardData(prevData => {
      const newData = JSON.parse(JSON.stringify(prevData));
      const oldUserTotalCorrectData = prevData.totalCorrectSurahs.find(entry => entry.username === usernameToRecord);
      const oldUserTotalCorrectCount = oldUserTotalCorrectData ? oldUserTotalCorrectData.count : 0;

      // Update Surah Times
      if (!newData.surahTimes[surahNumber]) {
        newData.surahTimes[surahNumber] = [];
      }
      const userTimeEntryIndex = newData.surahTimes[surahNumber].findIndex(entry => entry.username === usernameToRecord);
      const oldUserTimeForThisSurah = userTimeEntryIndex > -1 ? newData.surahTimes[surahNumber][userTimeEntryIndex].time : Infinity;

      if (userTimeEntryIndex > -1) {
        if (timeTaken < oldUserTimeForThisSurah) {
          newData.surahTimes[surahNumber][userTimeEntryIndex].time = timeTaken;
          personalBestAchieved = true; // Personal best for this surah
        }
      } else {
        newData.surahTimes[surahNumber].push({ username: usernameToRecord, time: timeTaken });
        personalBestAchieved = true; // First time, so it's a personal best
      }
      newData.surahTimes[surahNumber].sort((a, b) => a.time - b.time);

      // Update Total Correct Surahs
      const userCorrectIndex = newData.totalCorrectSurahs.findIndex(entry => entry.username === usernameToRecord);
      let userCompletedThisSurahBefore = false;
      if(prevData.surahTimes[surahNumber] && prevData.surahTimes[surahNumber].some(e => e.username === usernameToRecord && e.time !== Infinity)) {
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
        newData.totalCorrectSurahs.push({ username: usernameToRecord, count: 1 });
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

  const handleSurahChange = (event) => {
    setSelectedSurah(event.target.value);
  };

  const handleModalSignup = async () => {
    // Allow empty usernameInput, backend will default it.
    // Only check email and password for emptiness on the frontend.
    if (emailInput.trim() === '' || passwordInput.trim() === '') { 
      toast({ title: 'Signup Failed', description: 'Email and password are required.', status: 'error', duration: 3000, isClosable: true });
      return;
    }
    // Keep the client-side check for username length IF a username IS provided.
    // If usernameInput is empty, this check will be skipped, and backend will default.
    if (usernameInput.trim().length > 0 && usernameInput.trim().length < 3) {
        toast({ title: 'Signup Failed', description: 'Username must be at least 3 characters if provided.', status: 'error', duration: 3000, isClosable: true });
        return;
    }
    
    const { data, error } = await signUp(emailInput, passwordInput, usernameInput.trim()); // Pass trimmed username

    if (error) {
      toast({ title: 'Signup Error', description: error.message, status: 'error', duration: 5000, isClosable: true });
    } else if (data && data.user && !data.session && data.user.email_confirmed_at === null) { 
        toast({
            title: 'Signup Successful',
            description: 'Please check your email to confirm your account.',
            status: 'success',
            duration: 5000,
            isClosable: true,
        });
    } else {
      toast({ title: 'Signup Initiated', description: 'Processing signup...', status: 'success', duration: 3000, isClosable: true });
    }
  };

  const handleSyncLeaderboard = async () => {
    toast({
      title: 'Syncing Leaderboard',
      description: 'Fetching latest scores from the server...',
      status: 'info',
      duration: 2000,
      isClosable: true,
    });
    try {
      const { data, error } = await supabase.functions.invoke('leaderboard');
      if (error) throw error;
      
      // Assuming the function returns an object with leaderboard data
      if (data) {
        setLeaderboardData(data);
        localStorage.setItem('hifzDeckLeaderboards', JSON.stringify(data));
        toast({
          title: 'Leaderboard Synced!',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: 'Sync Failed',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleModalLogin = async () => {
    if (emailInput.trim() === '' || passwordInput.trim() === '') {
      toast({ title: 'Login Failed', description: 'Email and password are required.', status: 'error', duration: 3000, isClosable: true });
      return;
    }
  };

  const handleRecordProgressTest = async () => {
    if (!session || !session.access_token) {
      toast({
        title: 'Authentication Error',
        description: 'You must be logged in to record progress.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    const surahIdNum = parseInt(testSurahId, 10);
    const durationNum = parseInt(testDuration, 10);

    if (isNaN(surahIdNum) || surahIdNum <= 0 || isNaN(durationNum) || durationNum <= 0) {
      toast({
        title: 'Invalid Input',
        description: 'Please enter valid positive numbers for Surah ID and Duration.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('progress', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: {
          surah_id: surahIdNum,
          duration_seconds: durationNum
        }
      });

      if (error) {
        console.error('Error invoking progress function:', error);
        toast({
          title: 'Error Recording Progress',
          description: error.message || 'Unknown error from function.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } else {
        console.log('Progress function success:', data);
        toast({
          title: 'Success!',
          description: (data && data.message) ? data.message : 'Progress recorded successfully!',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (invokeError) {
      console.error('Failed to send request to progress function:', invokeError);
      toast({
        title: 'Request Failed',
        description: invokeError.message || 'Could not send request to record progress.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const fetchLeaderboard = async () => {
    console.log("[App.jsx] fetchLeaderboard called");
    setIsLeaderboardLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('leaderboard', {
        method: 'GET' // Specify the GET method
      });

      if (error) {
        throw error;
      }
      console.log("[App.jsx] Leaderboard data received:", data);
      setLeaderboardData(data || []); // Ensure it's an array
      // toast({ title: 'Leaderboard Loaded', status: 'success', duration: 2000, isClosable: true });
    } catch (err) {
      console.error("Error fetching leaderboard:", err);
      toast({ title: 'Error Fetching Leaderboard', description: err.message, status: 'error', duration: 3000, isClosable: true });
      setLeaderboardData([]); 
    } finally {
      setIsLeaderboardLoading(false);
    }
  };

  // Fetch leaderboard when the modal is opened
  useEffect(() => {
    if (isLeaderboardModalOpen) {
      fetchLeaderboard();
    }
  }, [isLeaderboardModalOpen]);

  if (authInitialLoading || isLoading) {
    return (
      <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center">
        <Text>Loading Hifz Deck...</Text>
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

  return (
    <Box>
      <Container maxW="container.xl" py={{ base: 3, md: 5 }} px={{ base: 3, md: 4 }}>
        <VStack spacing={{ base: 5, md: 8 }}>
          <Flex
            justifyContent="space-between"
            w="100%"
            alignItems={{ base: 'flex-start', md: 'center' }}
            direction={{ base: 'column', md: 'row' }}
            gap={3}
          >
            <Heading as="h1" size={{ base: 'lg', md: '2xl' }}>
              Quranic Flashcards
            </Heading>
            <HStack spacing={2} flexWrap="wrap">
              {user ? (
                <>
                  <Text fontSize="sm" noOfLines={1} maxW="160px">Welcome, {user.email}!</Text>
                  <Button onClick={onAccountSettingsOpen} size="sm" variant="ghost">Account</Button>
                  <Button onClick={logout} size="sm" variant="outline" isLoading={authLoading}>Logout</Button>
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
          </Flex>

          <VStack spacing={4} w="100%" align="stretch">
            <Flex
              direction={{ base: 'column', md: 'row' }}
              alignItems={{ base: 'stretch', md: 'center' }}
              justify="center"
              gap={4}
              flexWrap="wrap"
            >
              <HStack alignItems="center" spacing={3} flex={{ base: '1', md: 'initial' }}>
                <Text whiteSpace="nowrap" fontSize="sm">Select Surah:</Text>
                <Select
                  maxWidth={{ base: '100%', md: '350px' }}
                  value={selectedSurah || ''}
                  onChange={handleSurahChange}
                  placeholder="Select a Surah"
                  isDisabled={gameStarted || isLoading}
                >
                  {sequence.map((surah) => (
                    <option key={surah.number} value={surah.number.toString()}>
                      {surah.number}. {surah.name}
                    </option>
                  ))}
                </Select>
              </HStack>

              <Checkbox
                isChecked={stopwatchEnabled}
                onChange={(e) => setStopwatchEnabled(e.target.checked)}
                isDisabled={gameStarted}
                whiteSpace="nowrap"
              >
                Enable Stopwatch
              </Checkbox>
            </Flex>

            {/* Attempt mode: 3 strikes or unlimited */}
            <FormControl isDisabled={gameStarted}>
              <FormLabel fontSize="sm" mb={2} textAlign="center">
                Attempt limit
              </FormLabel>
              <RadioGroup
                value={attemptMode}
                onChange={setAttemptMode}
                isDisabled={gameStarted}
              >
                <Stack
                  direction={{ base: 'column', sm: 'row' }}
                  spacing={4}
                  justify="center"
                  align="center"
                >
                  <Radio value="three">3 attempts then reset</Radio>
                  <Radio value="unlimited">Unlimited tries</Radio>
                </Stack>
              </RadioGroup>
            </FormControl>
          </VStack>

          <HStack spacing={3} justify="center" alignItems="center" flexWrap="wrap">
            {!gameStarted ? (
              <Button onClick={handleStartGame} colorScheme="green" leftIcon={<ArrowRightIcon />} isDisabled={!selectedSurah || isLoading}>
                Start Game
              </Button>
            ) : (
              <Button onClick={handleShuffle} colorScheme="blue" isDisabled={!gameStarted}>
                Shuffle Remaining
              </Button>
            )}
            <Button onClick={handleReset} colorScheme="orange" leftIcon={<RepeatIcon />} isDisabled={isLoading}>
              Reset Game
            </Button>
          </HStack>

          {gameStarted && (
            <VStack spacing={2} textAlign="center">
              {stopwatchEnabled && (
                <Text fontSize="2xl" fontWeight="bold">Time: {formatTime(time)}</Text>
              )}
              <Text fontSize="md" color={colorMode === 'dark' ? 'gray.300' : 'gray.600'}>
                Next: ayah {nextExpectedVerse} of {cards.length}
              </Text>
              {attemptMode === 'three' && (
                <Text fontSize="sm" color={failCount > 0 ? 'orange.400' : (colorMode === 'dark' ? 'gray.400' : 'gray.500')}>
                  Attempts left: {Math.max(0, 3 - failCount)}
                </Text>
              )}
            </VStack>
          )}

          {gameStarted && (
            <VStack spacing={5} w="100%" align="stretch">
              {/* Completed sequence first so progress is visible above the pool */}
              <SequenceArea cards={cards} />

              <Box
                bg={colorMode === 'dark' ? 'gray.800' : 'transparent'}
                borderRadius="1rem"
                boxShadow={{ base: 'none', md: 'sm' }}
                padding={{ base: 2, md: 4 }}
                w="100%"
              >
                <Text
                  fontSize={{ base: 'md', md: 'lg' }}
                  mb={3}
                  color={colorMode === 'dark' ? 'gray.300' : 'gray.600'}
                  textAlign="center"
                >
                  Tap the next ayah
                </Text>
                <SimpleGrid
                  columns={{ base: 1, sm: 2, md: 3 }}
                  spacing={3}
                  w="100%"
                >
                  {unplacedCards.map((card) => {
                    // Show flash feedback on the card that was just tapped
                    const status =
                      feedbackCardId === card.id ? feedbackStatus : 'idle';
                    return (
                      <Card
                        key={card.id}
                        ayah={card.text}
                        status={status}
                        onTap={() => handleCardTap(card.id)}
                        isFaceDown={card.isFaceDown}
                      />
                    );
                  })}
                </SimpleGrid>
                {unplacedCards.length === 0 && (
                  <Text textAlign="center" color="green.500" fontWeight="medium" py={4}>
                    All ayahs completed!
                  </Text>
                )}
              </Box>
            </VStack>
          )}
        </VStack>
      </Container>

      <AccountSettings isOpen={isAccountSettingsOpen} onClose={onAccountSettingsClose} />

      <Modal isOpen={isAuthModalOpen} onClose={() => { onAuthModalClose(); setEmailInput(''); setPasswordInput(''); setUsernameInput(''); }} isCentered>
        <ModalOverlay />
        <ModalContent bg={colorMode === 'dark' ? 'gray.700' : 'white'}>
          <ModalHeader>{isSigningUp ? 'Sign Up' : 'Login'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {isSigningUp ? (
              <>
                <FormControl isRequired>
                  <FormLabel>Email</FormLabel>
                  <Input
                    placeholder="Enter your email"
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    isDisabled={authLoading}
                  />
                </FormControl>
                <FormControl mt={4} isRequired>
                  <FormLabel>Password</FormLabel>
                  <Input
                    placeholder="Create a password"
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    isDisabled={authLoading}
                  />
                </FormControl>
                <FormControl isRequired mb={3}>
                  <FormLabel>Username</FormLabel>
                  <Input
                    placeholder="Choose a username (min 3 chars)"
                    type="text"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    isDisabled={authLoading}
                  />
                </FormControl>
              </>
            ) : (
              <LoginForm />
            )}
          </ModalBody>

          <ModalFooter>
            {isSigningUp ? (
              <Button colorScheme="blue" mr={3} onClick={handleModalSignup} isLoading={authLoading}>
                Sign Up
              </Button>
            ) : (
              null 
            )}
            <Button onClick={() => {
              setIsSigningUp(!isSigningUp);
              setEmailInput(''); 
              setPasswordInput('');
              setUsernameInput('');
            }} variant="ghost" isLoading={authLoading}>
              {isSigningUp ? 'Already have an account? Login' : 'Need an account? Sign Up'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isLeaderboardModalOpen} onClose={onLeaderboardModalClose} size="xl" isCentered>
        <ModalOverlay />
        <ModalContent bg={colorMode === 'dark' ? 'gray.700' : 'white'}>
          <ModalHeader>Leaderboard</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Tabs isFitted variant="enclosed">
              <TabList>
                <Tab>Total Correct Surahs</Tab>
                <Tab>Fastest Times</Tab>
              </TabList>
              <TabPanels>
                <TabPanel>
                  <TableContainer>
                    <Table variant="simple">
                      <Thead>
                        <Tr>
                          <Th>Rank</Th>
                          <Th>Username</Th>
                          <Th>Correct Surahs</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {Array.isArray(leaderboardData.totalCorrectSurahs) && leaderboardData.totalCorrectSurahs.length > 0 ? (
                          leaderboardData.totalCorrectSurahs.map((entry, index) => (
                            <Tr key={index}>
                              <Td>{index + 1}</Td>
                              <Td>{entry.username || 'Anonymous'}</Td>
                              <Td>{entry.count}</Td>
                            </Tr>
                          ))
                        ) : (
                          <Tr><Td colSpan="3">No data available.</Td></Tr>
                        )}
                      </Tbody>
                    </Table>
                  </TableContainer>
                </TabPanel>
                <TabPanel>
                <TableContainer>
                  <Table variant="simple">
                    <Thead>
                      <Tr>
                        <Th>Surah</Th>
                        <Th>Username</Th>
                        <Th>Time (seconds)</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {Object.entries(leaderboardData.surahTimes).length > 0 ? (
                        Object.entries(leaderboardData.surahTimes)
                          .sort(([, a], [, b]) => a.time - b.time) 
                          .map(([surah, data], index) => (
                            <Tr key={index}>
                              <Td>{surah}</Td>
                              <Td>{data.username || 'Anonymous'}</Td>
                              <Td>{data.time}</Td>
                            </Tr>
                          ))
                      ) : (
                        <Tr><Td colSpan="3">No data available.</Td></Tr>
                      )}
                    </Tbody>
                  </Table>
                </TableContainer>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={handleSyncLeaderboard}>
              Sync with Server
            </Button>
            <Button variant="ghost" onClick={onLeaderboardModalClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default App; 