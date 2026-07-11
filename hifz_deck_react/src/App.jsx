import React, { useState, useEffect, useRef } from 'react';
import {
  Box, VStack, Heading, Text, Button, HStack, Container, useToast, IconButton, 
  useColorMode, Select, Modal, ModalOverlay, ModalContent, ModalHeader, 
  ModalFooter, ModalBody, ModalCloseButton, FormControl, FormLabel, Input, useDisclosure,
  Table, Thead, Tbody, Tr, Th, Td, TableContainer, Tabs, TabList, Tab, TabPanels, TabPanel,
  Checkbox, Radio, RadioGroup, Stack, SimpleGrid, Flex, Badge
} from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { MoonIcon, SunIcon, ArrowRightIcon, RepeatIcon, StarIcon } from '@chakra-ui/icons';
import Card from './components/Card';
import SequenceArea from './components/SequenceArea';
import AppBackground from './components/AppBackground';
import LoginForm from './components/auth/LoginForm';
import { useSequence } from './context/SequenceContext';
import { useAuth } from './context/AuthContext';
import { supabase } from './supabaseClient';
import AccountSettings from './components/AccountSettings';

// Max cards shown in the tap pool at once (keeps long surahs manageable)
const MAX_VISIBLE_CARDS = 5;
// السابقون unlock thresholds
const REVERSE_UNLOCK_COUNT = 10; // forward completions to unlock reverse
const ELITE_UNLOCK_COUNT = 3;    // reverse completions for Elite status

const EMPTY_LEADERBOARDS = {
  surahTimes: {},
  totalCorrectSurahs: [],
  reverseSurahTimes: {},
  reverseCompletedSurahs: [],
};

/** Ensure leaderboard object always has reverse fields */
const normalizeLeaderboards = (data) => ({
  ...EMPTY_LEADERBOARDS,
  ...(data && typeof data === 'object' && !Array.isArray(data) ? data : {}),
  surahTimes: data?.surahTimes || {},
  totalCorrectSurahs: Array.isArray(data?.totalCorrectSurahs) ? data.totalCorrectSurahs : [],
  reverseSurahTimes: data?.reverseSurahTimes || {},
  reverseCompletedSurahs: Array.isArray(data?.reverseCompletedSurahs) ? data.reverseCompletedSurahs : [],
});

const getUserCount = (list, username) => {
  const entry = (list || []).find((e) => e.username === username);
  return entry ? entry.count : 0;
};

// Soft entrance for the main composition
const fadeRise = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

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
  // playDirection: 'forward' (1→n) or 'reverse' السابقون (n→1)
  const [playDirection, setPlayDirection] = useState('forward');
  const [nextExpectedVerse, setNextExpectedVerse] = useState(1);
  const [failCount, setFailCount] = useState(0);
  // Brief visual feedback on the tapped card
  const [feedbackCardId, setFeedbackCardId] = useState(null);
  const [feedbackStatus, setFeedbackStatus] = useState('idle'); // 'idle' | 'correct' | 'incorrect'
  const feedbackTimeoutRef = useRef(null);
  // IDs of cards currently shown in the pool (max MAX_VISIBLE_CARDS)
  const [visiblePoolIds, setVisiblePoolIds] = useState([]);

  // Auth state
  const { isOpen: isAuthModalOpen, onOpen: onAuthModalOpen, onClose: onAuthModalClose } = useDisclosure();
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');

  // Leaderboard state (includes reverse / السابقون progress)
  const { isOpen: isLeaderboardModalOpen, onOpen: onLeaderboardModalOpen, onClose: onLeaderboardModalClose } = useDisclosure();
  const [leaderboardData, setLeaderboardData] = useState(EMPTY_LEADERBOARDS);
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
      try {
        setLeaderboardData(normalizeLeaderboards(JSON.parse(storedLeaderboards)));
      } catch {
        setLeaderboardData(EMPTY_LEADERBOARDS);
        localStorage.setItem('hifzDeckLeaderboards', JSON.stringify(EMPTY_LEADERBOARDS));
      }
    } else {
      localStorage.setItem('hifzDeckLeaderboards', JSON.stringify(EMPTY_LEADERBOARDS));
    }
  }, []);

  // If reverse becomes locked (e.g. logout), force forward direction
  useEffect(() => {
    if (!user && playDirection === 'reverse') {
      setPlayDirection('forward');
    }
  }, [user, playDirection]);

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
        setVisiblePoolIds([]);
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

  // Derived السابقون unlock / Elite flags from local leaderboard progress
  const forwardCount = user
    ? getUserCount(leaderboardData.totalCorrectSurahs, user.email)
    : 0;
  const reverseCount = user
    ? getUserCount(leaderboardData.reverseCompletedSurahs, user.email)
    : 0;
  const reverseUnlocked = !!user && forwardCount >= REVERSE_UNLOCK_COUNT;
  const isElite = !!user && reverseCount >= ELITE_UNLOCK_COUNT;

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

  /**
   * Build a visible pool of up to MAX_VISIBLE_CARDS.
   * Always includes the next expected ayah so the game stays solvable,
   * then fills with random distractors from remaining unplaced cards.
   */
  const buildVisiblePoolIds = (allCards, expectedVerse) => {
    const unplaced = allCards.filter((c) => c.position === null);
    if (unplaced.length === 0) return [];

    const correct = unplaced.find((c) => c.verse === expectedVerse);
    const distractors = shuffleArray(unplaced.filter((c) => c.verse !== expectedVerse));
    const slotsForDistractors = Math.max(0, MAX_VISIBLE_CARDS - (correct ? 1 : 0));
    const selected = correct
      ? [correct, ...distractors.slice(0, slotsForDistractors)]
      : distractors.slice(0, MAX_VISIBLE_CARDS);

    // Shuffle so the correct ayah is not always in the same spot
    return shuffleArray(selected).map((c) => c.id);
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

  // Starting verse for the current play direction
  const getStartVerse = (cardCount) =>
    playDirection === 'reverse' ? cardCount : 1;

  // Next verse after a correct tap
  const getAdvancedVerse = (current) =>
    playDirection === 'reverse' ? current - 1 : current + 1;

  // Full sequence restart after 3 strikes
  const handleStrikeReset = () => {
    const resetCards = shuffleArray(
      cards.map((card) => ({
        ...card,
        position: null,
        isFaceDown: false,
      }))
    );
    const startVerse = getStartVerse(resetCards.length);
    setCards(resetCards);
    setVisiblePoolIds(buildVisiblePoolIds(resetCards, startVerse));
    setNextExpectedVerse(startVerse);
    setFailCount(0);
    setFeedbackCardId(null);
    setFeedbackStatus('idle');
    setTime(0);
    if (stopwatchEnabled) {
      setTimerActive(true);
    }
    toast({
      title: '3 wrong attempts — sequence reset',
      description:
        playDirection === 'reverse'
          ? 'Starting over from the last ayah. Keep practicing!'
          : 'Starting over from the first ayah. Keep practicing!',
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
        setVisiblePoolIds([]);
        setTimerActive(false);
        const recordedTime = formatTime(time);
        toast({
          title: playDirection === 'reverse' ? 'السابقون — Correct!' : 'Correct!',
          description: `Well done! Your time: ${recordedTime}`,
          status: 'success',
          duration: 5000,
          isClosable: true,
          position: 'top',
        });
        if (user && selectedSurah) {
          if (playDirection === 'reverse') {
            updateReverseLeaderboards(selectedSurah, time);
          } else {
            updateLeaderboards(selectedSurah, time);
          }
        }
      } else {
        // Advance and refill the pool with the new expected ayah + fresh distractors
        const newExpected = getAdvancedVerse(nextExpectedVerse);
        setNextExpectedVerse(newExpected);
        setVisiblePoolIds(buildVisiblePoolIds(updatedCards, newExpected));
      }
    } else {
      // Incorrect tap — pool stays the same
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
    // Guests / locked users cannot start reverse
    const direction =
      playDirection === 'reverse' && user && reverseUnlocked ? 'reverse' : 'forward';
    if (direction !== playDirection) {
      setPlayDirection('forward');
    }

    const startedCards = shuffleArray(
      cards.map((card) => ({ ...card, position: null, isFaceDown: false }))
    );
    const startVerse = direction === 'reverse' ? startedCards.length : 1;
    setCards(startedCards);
    setVisiblePoolIds(buildVisiblePoolIds(startedCards, startVerse));
    setGameStarted(true);
    setNextExpectedVerse(startVerse);
    setFailCount(0);
    setFeedbackCardId(null);
    setFeedbackStatus('idle');
    setTime(0);
    if (stopwatchEnabled) {
      setTimerActive(true);
    }
  };

  // Reshuffle which distractors appear in the visible pool (correct ayah stays included)
  const handleShuffle = () => {
    if (!gameStarted) {
      toast({ title: 'Start the game first!', status: 'info', duration: 2000, isClosable: true });
      return;
    }
    setVisiblePoolIds(buildVisiblePoolIds(cards, nextExpectedVerse));
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
    setVisiblePoolIds([]);
    if (timerRef.current) clearInterval(timerRef.current);
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
  };

  const updateLeaderboards = (surahNumber, timeTaken) => {
    if (!user) return;
    const usernameToRecord = user.email;

    let personalBestAchieved = false;
    let newTotalCorrectMilestone = null;
    let justUnlockedReverse = false;
    const milestones = [5, 10, 20];

    setLeaderboardData(prevData => {
      const newData = normalizeLeaderboards(JSON.parse(JSON.stringify(prevData)));
      const oldUserTotalCorrectData = newData.totalCorrectSurahs.find(entry => entry.username === usernameToRecord);
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
          personalBestAchieved = true;
        }
      } else {
        newData.surahTimes[surahNumber].push({ username: usernameToRecord, time: timeTaken });
        personalBestAchieved = true;
      }
      newData.surahTimes[surahNumber].sort((a, b) => a.time - b.time);

      // Update Total Correct Surahs
      const userCorrectIndex = newData.totalCorrectSurahs.findIndex(entry => entry.username === usernameToRecord);
      let userCompletedThisSurahBefore = false;
      if (prevData.surahTimes?.[surahNumber]?.some(e => e.username === usernameToRecord && e.time !== Infinity)) {
        userCompletedThisSurahBefore = oldUserTimeForThisSurah !== Infinity;
      }
      
      let currentTotalCorrectCount = oldUserTotalCorrectCount;
      if (userCorrectIndex > -1) {
        if (!userCompletedThisSurahBefore) {
          newData.totalCorrectSurahs[userCorrectIndex].count += 1;
          currentTotalCorrectCount = newData.totalCorrectSurahs[userCorrectIndex].count;
        } else {
          currentTotalCorrectCount = newData.totalCorrectSurahs[userCorrectIndex].count;
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
          break;
        }
      }

      // Unlock السابقون reverse path at 10 forward completions
      if (oldUserTotalCorrectCount < REVERSE_UNLOCK_COUNT && currentTotalCorrectCount >= REVERSE_UNLOCK_COUNT) {
        justUnlockedReverse = true;
      }
      
      localStorage.setItem('hifzDeckLeaderboards', JSON.stringify(newData));
      return newData;
    });

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
      if (newTotalCorrectMilestone && newTotalCorrectMilestone !== REVERSE_UNLOCK_COUNT) {
        toast({
          title: 'Achievement Unlocked!',
          description: `Congratulations! You've correctly completed ${newTotalCorrectMilestone} Surahs!`,
          status: 'success',
          duration: 5000,
          isClosable: true,
          position: 'top-right'
        });
      }
      if (justUnlockedReverse) {
        toast({
          title: 'السابقون path unlocked!',
          description: 'You can now play any surah backwards — from the last ayah to the first.',
          status: 'success',
          duration: 6000,
          isClosable: true,
          position: 'top-right',
        });
      }
    }, 600);
  };

  /** Record a reverse (السابقون) surah completion; Elite unlocks at 3 unique reverse wins */
  const updateReverseLeaderboards = (surahNumber, timeTaken) => {
    if (!user) return;
    const usernameToRecord = user.email;

    let personalBestAchieved = false;
    let justUnlockedElite = false;

    setLeaderboardData((prevData) => {
      const newData = normalizeLeaderboards(JSON.parse(JSON.stringify(prevData)));
      const oldReverseEntry = newData.reverseCompletedSurahs.find((e) => e.username === usernameToRecord);
      const oldReverseCount = oldReverseEntry ? oldReverseEntry.count : 0;

      if (!newData.reverseSurahTimes[surahNumber]) {
        newData.reverseSurahTimes[surahNumber] = [];
      }
      const timeIdx = newData.reverseSurahTimes[surahNumber].findIndex(
        (e) => e.username === usernameToRecord
      );
      const oldTime =
        timeIdx > -1 ? newData.reverseSurahTimes[surahNumber][timeIdx].time : Infinity;

      if (timeIdx > -1) {
        if (timeTaken < oldTime) {
          newData.reverseSurahTimes[surahNumber][timeIdx].time = timeTaken;
          personalBestAchieved = true;
        }
      } else {
        newData.reverseSurahTimes[surahNumber].push({
          username: usernameToRecord,
          time: timeTaken,
        });
        personalBestAchieved = true;
      }
      newData.reverseSurahTimes[surahNumber].sort((a, b) => a.time - b.time);

      const completedBefore = oldTime !== Infinity;
      let currentReverseCount = oldReverseCount;
      const reverseIdx = newData.reverseCompletedSurahs.findIndex(
        (e) => e.username === usernameToRecord
      );
      if (reverseIdx > -1) {
        if (!completedBefore) {
          newData.reverseCompletedSurahs[reverseIdx].count += 1;
          currentReverseCount = newData.reverseCompletedSurahs[reverseIdx].count;
        }
      } else {
        newData.reverseCompletedSurahs.push({ username: usernameToRecord, count: 1 });
        currentReverseCount = 1;
      }
      newData.reverseCompletedSurahs.sort((a, b) => b.count - a.count);

      if (oldReverseCount < ELITE_UNLOCK_COUNT && currentReverseCount >= ELITE_UNLOCK_COUNT) {
        justUnlockedElite = true;
      }

      localStorage.setItem('hifzDeckLeaderboards', JSON.stringify(newData));
      return newData;
    });

    setTimeout(() => {
      if (personalBestAchieved) {
        const surahName =
          sequence.find((s) => s.number.toString() === surahNumber)?.name || 'this Surah';
        toast({
          title: 'السابقون Personal Best!',
          description: `New reverse speed record for ${surahName}! Time: ${formatTime(timeTaken)}`,
          status: 'info',
          duration: 4000,
          isClosable: true,
          position: 'top-right',
        });
      }
      if (justUnlockedElite) {
        toast({
          title: 'السابقون Elite unlocked!',
          description: 'You have mastered the reverse path. Elite status is now active app-wide.',
          status: 'success',
          duration: 7000,
          isClosable: true,
          position: 'top-right',
        });
      }
    }, 600);
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
        const normalized = normalizeLeaderboards(data);
        setLeaderboardData(normalized);
        localStorage.setItem('hifzDeckLeaderboards', JSON.stringify(normalized));
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
      setLeaderboardData(normalizeLeaderboards(data));
      // toast({ title: 'Leaderboard Loaded', status: 'success', duration: 2000, isClosable: true });
    } catch (err) {
      console.error("Error fetching leaderboard:", err);
      toast({ title: 'Error Fetching Leaderboard', description: err.message, status: 'error', duration: 3000, isClosable: true });
      setLeaderboardData(EMPTY_LEADERBOARDS); 
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
      <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center" position="relative">
        <AppBackground />
        <Text position="relative" zIndex={1} fontFamily="heading" color="ink.700">
          Loading Hifz Deck...
        </Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center" position="relative">
        <AppBackground />
        <Text position="relative" zIndex={1} color="red.500">Error: {error}</Text>
      </Box>
    );
  }

  const unplacedCards = cards.filter(card => !card.position);
  // Only show up to 5 cards from the visible pool (in pool order)
  const visibleCards = visiblePoolIds
    .map((id) => cards.find((c) => c.id === id && c.position === null))
    .filter(Boolean);

  return (
    <Box data-elite={isElite ? 'true' : undefined} minHeight="100vh" position="relative">
      <AppBackground />
      <Container
        maxW="container.lg"
        py={{ base: 3, md: 8 }}
        px={{ base: 3, md: 4 }}
        position="relative"
        zIndex={1}
        animation={`${fadeRise} 0.55s ease-out`}
      >
        <VStack spacing={{ base: 3, md: 7 }}>
          <Flex
            justifyContent="space-between"
            w="100%"
            alignItems={{ base: 'flex-start', md: 'center' }}
            direction={{ base: 'column', md: 'row' }}
            gap={{ base: 2, md: 3 }}
          >
            <VStack align="flex-start" spacing={{ base: 0.5, md: 1 }} w={{ base: '100%', md: 'auto' }}>
              <Flex
                w="100%"
                justify="space-between"
                align="center"
                gap={2}
              >
                <HStack spacing={2} align="center" flexWrap="wrap">
                  <Heading
                    as="h1"
                    size={{ base: 'md', md: '2xl' }}
                    color={colorMode === 'dark' ? 'mist.50' : 'ink.900'}
                    lineHeight="1.15"
                  >
                    Hifz Deck
                  </Heading>
                  {isElite && (
                    <Badge
                      bg="elite.500"
                      color="white"
                      fontSize={{ base: 'xs', md: 'md' }}
                      px={{ base: 2, md: 3 }}
                      py={{ base: 0.5, md: 1 }}
                      borderRadius="md"
                      fontFamily="arabic"
                    >
                      السابقون
                    </Badge>
                  )}
                </HStack>
                {/* Mobile: keep theme + auth actions beside the brand */}
                <HStack spacing={1} display={{ base: 'flex', md: 'none' }}>
                  {!user && (
                    <Button
                      onClick={() => { setIsSigningUp(false); onAuthModalOpen(); }}
                      size="xs"
                      bg="ink.600"
                      color="white"
                      _hover={{ bg: 'ink.700' }}
                    >
                      Login
                    </Button>
                  )}
                  <IconButton
                    icon={colorMode === 'dark' ? <SunIcon /> : <MoonIcon />}
                    onClick={toggleColorMode}
                    variant="ghost"
                    colorScheme="teal"
                    aria-label="Toggle color mode"
                    size="sm"
                  />
                </HStack>
              </Flex>
              <Text
                fontSize={{ base: 'xs', md: 'md' }}
                color={colorMode === 'dark' ? 'whiteAlpha.700' : 'mist.600'}
                maxW="28rem"
                display={{ base: gameStarted ? 'none' : 'block', md: 'block' }}
              >
                Memorize Juz Amma by tapping ayahs in order.
              </Text>
              {user && (
                <HStack spacing={1} display={{ base: 'flex', md: 'none' }} flexWrap="wrap" pt={1}>
                  <Button onClick={onAccountSettingsOpen} size="xs" variant="ghost" colorScheme="teal">
                    Account
                  </Button>
                  <Button onClick={logout} size="xs" variant="outline" colorScheme="teal" isLoading={authLoading}>
                    Logout
                  </Button>
                  <IconButton
                    icon={<StarIcon />}
                    onClick={onLeaderboardModalOpen}
                    size="xs"
                    aria-label="Open Leaderboard"
                    variant="ghost"
                    colorScheme="teal"
                  />
                </HStack>
              )}
            </VStack>
            <HStack spacing={2} flexWrap="wrap" display={{ base: 'none', md: 'flex' }}>
              {user ? (
                <>
                  <Text fontSize="sm" noOfLines={1} maxW="160px" color={colorMode === 'dark' ? 'mist.200' : 'ink.700'}>
                    {user.email}
                  </Text>
                  <Button onClick={onAccountSettingsOpen} size="sm" variant="ghost" colorScheme="teal">
                    Account
                  </Button>
                  <Button onClick={logout} size="sm" variant="outline" colorScheme="teal" isLoading={authLoading}>
                    Logout
                  </Button>
                  <IconButton
                    icon={<StarIcon />}
                    onClick={onLeaderboardModalOpen}
                    size="sm"
                    aria-label="Open Leaderboard"
                    variant="ghost"
                    colorScheme="teal"
                  />
                </>
              ) : (
                <Button
                  onClick={() => { setIsSigningUp(false); onAuthModalOpen(); }}
                  size="sm"
                  bg="ink.600"
                  color="white"
                  _hover={{ bg: 'ink.700' }}
                >
                  Login / Sign Up
                </Button>
              )}
              <IconButton
                icon={colorMode === 'dark' ? <SunIcon /> : <MoonIcon />}
                onClick={toggleColorMode}
                variant="ghost"
                colorScheme="teal"
                aria-label="Toggle color mode"
              />
            </HStack>
          </Flex>

          {/* Controls panel — denser on mobile so the game starts higher on screen */}
          <Box
            w="100%"
            bg={colorMode === 'dark' ? 'rgba(34, 66, 63, 0.55)' : 'rgba(255, 255, 255, 0.62)'}
            backdropFilter="blur(16px)"
            border="1px solid"
            borderColor={
              isElite
                ? colorMode === 'dark'
                  ? 'elite.400'
                  : 'elite.300'
                : colorMode === 'dark'
                  ? 'whiteAlpha.200'
                  : 'mist.200'
            }
            borderRadius={{ base: 'lg', md: 'xl' }}
            boxShadow="soft"
            px={{ base: 3, md: 6 }}
            py={{ base: 3.5, md: 6 }}
          >
            <VStack spacing={{ base: 3, md: 5 }} w="100%" align="stretch">
              <Flex
                direction={{ base: 'column', md: 'row' }}
                alignItems={{ base: 'stretch', md: 'center' }}
                justify="center"
                gap={{ base: 2.5, md: 4 }}
                flexWrap="wrap"
              >
                <HStack alignItems="center" spacing={2} flex={{ base: '1', md: 'initial' }} w="100%">
                  <Text whiteSpace="nowrap" fontSize="sm" fontWeight="600" color={colorMode === 'dark' ? 'mist.200' : 'ink.700'}>
                    Surah
                  </Text>
                  <Select
                    size={{ base: 'sm', md: 'md' }}
                    maxWidth={{ base: '100%', md: '350px' }}
                    value={selectedSurah || ''}
                    onChange={handleSurahChange}
                    placeholder="Select a Surah"
                    isDisabled={gameStarted || isLoading}
                    bg={colorMode === 'dark' ? 'blackAlpha.300' : 'whiteAlpha.800'}
                    borderColor={isElite ? 'elite.300' : colorMode === 'dark' ? 'whiteAlpha.300' : 'mist.300'}
                    _hover={{ borderColor: 'ink.400' }}
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
                  colorScheme="teal"
                  size="sm"
                >
                  Enable Stopwatch
                </Checkbox>
              </Flex>

              {/* Hide attempt/direction while playing — they are locked anyway */}
              {!gameStarted && (
                <>
                  <FormControl>
                    <FormLabel fontSize="xs" mb={1.5} textAlign={{ base: 'left', sm: 'center' }} fontWeight="600">
                      Attempt limit
                    </FormLabel>
                    <RadioGroup
                      value={attemptMode}
                      onChange={setAttemptMode}
                      colorScheme="teal"
                      size="sm"
                    >
                      <Stack
                        direction={{ base: 'column', sm: 'row' }}
                        spacing={{ base: 2, sm: 4 }}
                        justify="center"
                        align={{ base: 'flex-start', sm: 'center' }}
                      >
                        <Radio value="three">3 attempts then reset</Radio>
                        <Radio value="unlimited">Unlimited tries</Radio>
                      </Stack>
                    </RadioGroup>
                  </FormControl>

                  {reverseUnlocked && (
                    <FormControl>
                      <FormLabel fontSize="xs" mb={1.5} textAlign={{ base: 'left', sm: 'center' }} fontWeight="600">
                        Play direction
                      </FormLabel>
                      <RadioGroup
                        value={playDirection}
                        onChange={setPlayDirection}
                        colorScheme="teal"
                        size="sm"
                      >
                        <Stack
                          direction={{ base: 'column', sm: 'row' }}
                          spacing={{ base: 2, sm: 4 }}
                          justify="center"
                          align={{ base: 'flex-start', sm: 'center' }}
                        >
                          <Radio value="forward">Forward (1 → end)</Radio>
                          <Radio value="reverse">السابقون (reverse)</Radio>
                        </Stack>
                      </RadioGroup>
                    </FormControl>
                  )}
                </>
              )}

              <Stack
                direction={{ base: 'column', sm: 'row' }}
                spacing={{ base: 2, sm: 3 }}
                justify="center"
                align="stretch"
                pt={{ base: 0.5, md: 1 }}
              >
                {!gameStarted ? (
                  <Button
                    onClick={handleStartGame}
                    bg={playDirection === 'reverse' ? 'elite.500' : 'ink.600'}
                    color="white"
                    _hover={{ bg: playDirection === 'reverse' ? 'elite.600' : 'ink.700' }}
                    leftIcon={<ArrowRightIcon />}
                    isDisabled={!selectedSurah || isLoading}
                    size={{ base: 'md', md: 'md' }}
                    w={{ base: '100%', sm: 'auto' }}
                    px={6}
                  >
                    {playDirection === 'reverse' ? 'Start السابقون' : 'Start Game'}
                  </Button>
                ) : (
                  <Button
                    onClick={handleShuffle}
                    colorScheme="teal"
                    variant="outline"
                    isDisabled={!gameStarted}
                    size="sm"
                    w={{ base: '100%', sm: 'auto' }}
                  >
                    Shuffle Choices
                  </Button>
                )}
                <Button
                  onClick={handleReset}
                  variant="ghost"
                  colorScheme="orange"
                  leftIcon={<RepeatIcon />}
                  isDisabled={isLoading}
                  size="sm"
                  w={{ base: '100%', sm: 'auto' }}
                >
                  Reset Game
                </Button>
              </Stack>
            </VStack>
          </Box>

          {gameStarted && (
            <VStack spacing={{ base: 1, md: 2 }} textAlign="center" py={{ base: 0, md: 0 }}>
              {stopwatchEnabled && (
                <Text fontFamily="heading" fontSize={{ base: 'xl', md: '2xl' }} fontWeight="600" color={colorMode === 'dark' ? 'mist.50' : 'ink.900'} lineHeight="1.2">
                  {formatTime(time)}
                </Text>
              )}
              <Text fontSize={{ base: 'sm', md: 'md' }} color={colorMode === 'dark' ? 'mist.200' : 'mist.600'}>
                {playDirection === 'reverse'
                  ? `Next: ayah ${nextExpectedVerse} → 1`
                  : `Next: ayah ${nextExpectedVerse} of ${cards.length}`}
              </Text>
              {playDirection === 'reverse' && (
                <Text fontSize="sm" color="elite.500" fontFamily="arabic">
                  السابقون
                </Text>
              )}
              {attemptMode === 'three' && (
                <Text fontSize="xs" color={failCount > 0 ? 'orange.400' : (colorMode === 'dark' ? 'whiteAlpha.600' : 'mist.500')}>
                  Attempts left: {Math.max(0, 3 - failCount)}
                </Text>
              )}
            </VStack>
          )}

          {gameStarted && (
            <VStack spacing={{ base: 3, md: 5 }} w="100%" align="stretch">
              <SequenceArea cards={cards} playDirection={playDirection} isElite={isElite} />

              <Box
                bg={colorMode === 'dark' ? 'rgba(34, 66, 63, 0.45)' : 'rgba(255, 255, 255, 0.45)'}
                backdropFilter="blur(12px)"
                borderRadius={{ base: 'lg', md: 'xl' }}
                boxShadow="soft"
                padding={{ base: 2.5, md: 5 }}
                w="100%"
                border="1px solid"
                borderColor={
                  isElite
                    ? colorMode === 'dark'
                      ? 'elite.400'
                      : 'elite.300'
                    : colorMode === 'dark'
                      ? 'whiteAlpha.200'
                      : 'mist.200'
                }
              >
                <Text
                  fontFamily="heading"
                  fontSize={{ base: 'sm', md: 'lg' }}
                  mb={{ base: 0.5, md: 1 }}
                  color={colorMode === 'dark' ? 'mist.100' : 'ink.800'}
                  textAlign="center"
                >
                  Tap the next ayah
                </Text>
                {unplacedCards.length > MAX_VISIBLE_CARDS && (
                  <Text
                    fontSize="xs"
                    mb={{ base: 2, md: 3 }}
                    color={colorMode === 'dark' ? 'whiteAlpha.600' : 'mist.500'}
                    textAlign="center"
                  >
                    Showing {visibleCards.length} of {unplacedCards.length} remaining
                  </Text>
                )}
                <SimpleGrid
                  columns={{ base: 1, sm: 2, md: Math.min(3, visibleCards.length || 1) }}
                  spacing={{ base: 2, md: 3 }}
                  w="100%"
                  mt={unplacedCards.length > MAX_VISIBLE_CARDS ? 0 : { base: 2, md: 3 }}
                >
                  {visibleCards.map((card) => {
                    const status =
                      feedbackCardId === card.id ? feedbackStatus : 'idle';
                    return (
                      <Card
                        key={card.id}
                        ayah={card.text}
                        status={status}
                        onTap={() => handleCardTap(card.id)}
                        isFaceDown={card.isFaceDown}
                        isElite={isElite}
                      />
                    );
                  })}
                </SimpleGrid>
                {unplacedCards.length === 0 && (
                  <Text textAlign="center" color="ink.500" fontWeight="medium" py={{ base: 3, md: 4 }}>
                    All ayahs completed!
                  </Text>
                )}
              </Box>
            </VStack>
          )}
        </VStack>
      </Container>

      <AccountSettings
        isOpen={isAccountSettingsOpen}
        onClose={onAccountSettingsClose}
        forwardCount={forwardCount}
        reverseCount={reverseCount}
        isElite={isElite}
      />

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