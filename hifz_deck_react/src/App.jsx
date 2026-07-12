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
import BadgeShelf from './components/BadgeShelf';
import AccountSettings from './components/AccountSettings';
import PointsWeightingExplainer from './components/PointsWeightingExplainer';
import { useSequence } from './context/SequenceContext';
import { useAuth } from './context/AuthContext';
import { supabase } from './supabaseClient';
import { computePoints } from './utils/scoring';
import { buildChoicePool, shuffleArray } from './utils/buildChoicePool';
import { BADGE_BY_ID } from './badges/badgeCatalog';
import { evaluateNewBadges, advanceStreak } from './badges/evaluateBadges';
import {
  getHizbsForJuz,
  getSurahsInHizb,
  getPrimarySurahForHizb,
  getPlaySegment,
  getFirstHizbForJuz,
  surahInHizb,
  snapToSurah,
  getVersesInJuz,
  getCompletedBoardKeys,
  countFullyCompletedSurahs,
  countFullyCompletedJuzs,
  getJuzSegmentProgress,
  isJuzFullyComplete,
} from './quran/quranHelpers';

// السابقون unlock thresholds
const REVERSE_UNLOCK_COUNT = 10; // forward completions to unlock reverse
const ELITE_UNLOCK_COUNT = 3;    // reverse completions for Elite status

const BADGES_STORAGE_KEY = 'hifzDeckBadges';
const STREAK_STORAGE_KEY = 'hifzDeckStreak';
const PB_BEATS_STORAGE_KEY = 'hifzDeckPbBeats';

const EMPTY_LEADERBOARDS = {
  surahTimes: {},
  totalCorrectSurahs: [],
  reverseSurahTimes: {},
  reverseCompletedSurahs: [],
  overallPoints: [],
};

/** Ensure leaderboard object always has reverse + points fields */
const normalizeLeaderboards = (data) => ({
  ...EMPTY_LEADERBOARDS,
  ...(data && typeof data === 'object' && !Array.isArray(data) ? data : {}),
  surahTimes: data?.surahTimes || {},
  totalCorrectSurahs: Array.isArray(data?.totalCorrectSurahs) ? data.totalCorrectSurahs : [],
  reverseSurahTimes: data?.reverseSurahTimes || {},
  reverseCompletedSurahs: Array.isArray(data?.reverseCompletedSurahs) ? data.reverseCompletedSurahs : [],
  overallPoints: Array.isArray(data?.overallPoints) ? data.overallPoints : [],
});

const getUserCount = (list, ...aliases) => {
  const keys = aliases.filter(Boolean);
  if (keys.length === 0) return 0;
  return (list || []).reduce((max, entry) => {
    if (entry?.username && keys.includes(entry.username)) {
      return Math.max(max, Number(entry.count) || 0);
    }
    return max;
  }, 0);
};

const looksLikeEmail = (value) =>
  typeof value === 'string' && value.includes('@');

/** Prefer a public username; never expose raw email on the board */
const displayNameForUser = (profileUsername, user) => {
  if (profileUsername && !looksLikeEmail(profileUsername)) return profileUsername;
  const metaName = user?.user_metadata?.username;
  if (metaName && !looksLikeEmail(metaName)) return metaName;
  return 'Anonymous';
};

/**
 * Collapse duplicate rows that used email as the key into the public username.
 * Keeps the higher count / faster time.
 */
const consolidateLeaderboardIdentity = (data, emailAliases, publicUsername) => {
  const normalized = normalizeLeaderboards(data);
  if (!publicUsername || looksLikeEmail(publicUsername)) return normalized;

  const aliases = new Set(
    [...(emailAliases || []), publicUsername].filter(Boolean)
  );

  const mergeCountList = (list) => {
    let best = 0;
    const others = [];
    (list || []).forEach((entry) => {
      if (entry?.username && aliases.has(entry.username)) {
        best = Math.max(best, Number(entry.count) || 0);
      } else if (entry?.username && !looksLikeEmail(entry.username)) {
        others.push(entry);
      }
      // Drop any leftover bare-email rows that aren't this user
      else if (entry?.username && looksLikeEmail(entry.username)) {
        // skip — never show emails
      } else if (entry) {
        others.push(entry);
      }
    });
    if (best > 0 || (list || []).some((e) => e?.username && aliases.has(e.username))) {
      others.push({ username: publicUsername, count: best });
    }
    return others.sort((a, b) => b.count - a.count);
  };

  const mergeTimeBucket = (bucket) => {
    if (!bucket) return bucket;
    if (Array.isArray(bucket)) {
      let bestForUser = null;
      const others = [];
      bucket.forEach((entry) => {
        if (entry?.username && aliases.has(entry.username)) {
          if (!bestForUser || entry.time < bestForUser.time) {
            bestForUser = { username: publicUsername, time: entry.time };
          }
        } else if (entry?.username && !looksLikeEmail(entry.username)) {
          others.push(entry);
        }
      });
      if (bestForUser) others.push(bestForUser);
      return others.sort((a, b) => a.time - b.time);
    }
    if (looksLikeEmail(bucket.username) || aliases.has(bucket.username)) {
      return { username: publicUsername, time: bucket.time };
    }
    if (looksLikeEmail(bucket.username)) return null;
    return bucket;
  };

  const remapTimes = (times) => {
    const out = {};
    Object.entries(times || {}).forEach(([surah, bucket]) => {
      const next = mergeTimeBucket(bucket);
      if (next && !(Array.isArray(next) && next.length === 0)) {
        out[surah] = next;
      }
    });
    return out;
  };

  const mergePointsList = (list) => {
    let best = 0;
    const others = [];
    (list || []).forEach((entry) => {
      if (entry?.username && aliases.has(entry.username)) {
        best = Math.max(best, Number(entry.points) || 0);
      } else if (entry?.username && !looksLikeEmail(entry.username)) {
        others.push(entry);
      }
    });
    if (best > 0 || (list || []).some((e) => e?.username && aliases.has(e.username))) {
      others.push({ username: publicUsername, points: best });
    }
    return others.sort((a, b) => b.points - a.points);
  };

  return {
    ...normalized,
    totalCorrectSurahs: mergeCountList(normalized.totalCorrectSurahs),
    reverseCompletedSurahs: mergeCountList(normalized.reverseCompletedSurahs),
    overallPoints: mergePointsList(normalized.overallPoints),
    surahTimes: remapTimes(normalized.surahTimes),
    reverseSurahTimes: remapTimes(normalized.reverseSurahTimes),
  };
};

/** Local stores per-surah time lists; server stores a single best {username,time}. Normalize for UI. */
const getBestSurahTimeEntry = (entry) => {
  if (!entry) return null;
  if (Array.isArray(entry)) {
    if (entry.length === 0) return null;
    return [...entry].sort((a, b) => a.time - b.time)[0];
  }
  if (typeof entry === 'object' && typeof entry.time === 'number') return entry;
  return null;
};

/** Board keys look like "2" or "2@h1" — use the surah id only for display. */
const parseSurahIdFromBoardKey = (boardKey) => String(boardKey || '').split('@')[0];

const getSurahDisplayName = (boardKey, sequence = [], quran = null) => {
  const surahId = parseSurahIdFromBoardKey(boardKey);
  const fromSequence = sequence.find((s) => String(s.number) === surahId);
  if (fromSequence?.name) return fromSequence.name;
  const fromQuran = quran?.surahs?.[surahId];
  return fromQuran?.name || fromQuran?.nameSimple || surahId;
};

/**
 * Fastest Times rows: one best time per surah (hizb segments ignored for now).
 * @returns {{ surahId: string, name: string, username: string, time: number }[]}
 */
const buildFastestTimesRows = (surahTimes, sequence = [], quran = null) => {
  const bestBySurah = new Map();

  for (const [boardKey, entry] of Object.entries(surahTimes || {})) {
    const best = getBestSurahTimeEntry(entry);
    if (
      !best ||
      typeof best.time !== 'number' ||
      !best.username ||
      looksLikeEmail(best.username)
    ) {
      continue;
    }
    const surahId = parseSurahIdFromBoardKey(boardKey);
    const existing = bestBySurah.get(surahId);
    if (!existing || best.time < existing.time) {
      bestBySurah.set(surahId, {
        surahId,
        name: getSurahDisplayName(surahId, sequence, quran),
        username: best.username,
        time: best.time,
      });
    }
  }

  return Array.from(bestBySurah.values()).sort((a, b) => a.time - b.time);
};

/** Prefer higher counts and faster times when combining local + server boards */
const mergeLeaderboards = (localData, serverData, emailAliases = [], publicUsername = null) => {
  const local = consolidateLeaderboardIdentity(
    localData,
    emailAliases,
    publicUsername || 'Anonymous'
  );
  const server = consolidateLeaderboardIdentity(
    serverData,
    emailAliases,
    publicUsername || 'Anonymous'
  );
  const merged = normalizeLeaderboards(local);

  const mergeCountLists = (a, b) => {
    const map = new Map();
    [...(a || []), ...(b || [])].forEach((entry) => {
      if (!entry?.username || looksLikeEmail(entry.username)) return;
      const prev = map.get(entry.username);
      const count = Number(entry.count) || 0;
      if (!prev || count > prev.count) {
        map.set(entry.username, { username: entry.username, count });
      }
    });
    return Array.from(map.values()).sort((x, y) => y.count - x.count);
  };

  const mergeSurahTimes = (a, b) => {
    const out = {};
    const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
    keys.forEach((surah) => {
      const localBest = getBestSurahTimeEntry(a?.[surah]);
      const serverBest = getBestSurahTimeEntry(b?.[surah]);
      if (Array.isArray(a?.[surah]) && a[surah].length > 0) {
        const list = a[surah]
          .filter((e) => e?.username && !looksLikeEmail(e.username))
          .map((e) => ({ ...e }));
        if (serverBest && !looksLikeEmail(serverBest.username)) {
          const idx = list.findIndex((e) => e.username === serverBest.username);
          if (idx === -1) list.push(serverBest);
          else if (serverBest.time < list[idx].time) list[idx] = serverBest;
        }
        out[surah] = list.sort((x, y) => x.time - y.time);
      } else if (localBest && serverBest) {
        const left = looksLikeEmail(localBest.username) ? null : localBest;
        const right = looksLikeEmail(serverBest.username) ? null : serverBest;
        if (left && right) {
          out[surah] = left.time <= right.time ? left : right;
        } else {
          out[surah] = left || right;
        }
      } else {
        const only = localBest || serverBest;
        if (only && !looksLikeEmail(only.username)) out[surah] = only;
      }
    });
    return out;
  };

  const mergePointsLists = (a, b) => {
    const map = new Map();
    [...(a || []), ...(b || [])].forEach((entry) => {
      if (!entry?.username || looksLikeEmail(entry.username)) return;
      const prev = map.get(entry.username);
      const points = Number(entry.points) || 0;
      if (!prev || points > prev.points) {
        map.set(entry.username, { username: entry.username, points });
      }
    });
    return Array.from(map.values()).sort((x, y) => y.points - x.points);
  };

  merged.totalCorrectSurahs = mergeCountLists(
    local.totalCorrectSurahs,
    server.totalCorrectSurahs
  );
  merged.reverseCompletedSurahs = mergeCountLists(
    local.reverseCompletedSurahs,
    server.reverseCompletedSurahs
  );
  merged.overallPoints = mergePointsLists(local.overallPoints, server.overallPoints);
  merged.surahTimes = mergeSurahTimes(local.surahTimes, server.surahTimes);
  merged.reverseSurahTimes = mergeSurahTimes(
    local.reverseSurahTimes,
    server.reverseSurahTimes
  );
  return publicUsername
    ? consolidateLeaderboardIdentity(merged, emailAliases, publicUsername)
    : merged;
};

// Soft entrance for the main composition
const fadeRise = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const App = () => {
  const { quran, sequence, isLoading, error } = useSequence();
  const { 
    user, 
    session, 
    logout, 
    signUp,
    initialLoading: authInitialLoading, 
    loading: authLoading 
  } = useAuth();
  // Navigation: Juz' → Hizb → Surah (play unit = surah ∩ hizb)
  const [selectedJuz, setSelectedJuz] = useState(30); // default Juz Amma
  const [selectedHizb, setSelectedHizb] = useState(null);
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
  // Difficulty + how many choice cards to show
  const [difficulty, setDifficulty] = useState('beginner');
  const [visibleCardCount, setVisibleCardCount] = useState(5);
  const [nextExpectedVerse, setNextExpectedVerse] = useState(1);
  const [failCount, setFailCount] = useState(0);
  // Brief visual feedback on the tapped card
  const [feedbackCardId, setFeedbackCardId] = useState(null);
  const [feedbackStatus, setFeedbackStatus] = useState('idle'); // 'idle' | 'correct' | 'incorrect'
  const feedbackTimeoutRef = useRef(null);
  // Visible choice pool (may include foreign distractors on Experienced)
  const [choiceCards, setChoiceCards] = useState([]);

  // Badges / streak / personal-best beat counts
  const [earnedBadgeIds, setEarnedBadgeIds] = useState([]);
  const [newlyEarnedBadgeIds, setNewlyEarnedBadgeIds] = useState([]);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [lastPlayDate, setLastPlayDate] = useState(null);
  const [pbBeatCounts, setPbBeatCounts] = useState({});

  // Auth state
  const { isOpen: isAuthModalOpen, onOpen: onAuthModalOpen, onClose: onAuthModalClose } = useDisclosure();
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  // Public name for leaderboards — never the email address
  const [profileUsername, setProfileUsername] = useState(null);

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

    try {
      const badges = JSON.parse(localStorage.getItem(BADGES_STORAGE_KEY) || '[]');
      if (Array.isArray(badges)) setEarnedBadgeIds(badges);
    } catch {
      setEarnedBadgeIds([]);
    }
    try {
      const streak = JSON.parse(localStorage.getItem(STREAK_STORAGE_KEY) || '{}');
      setCurrentStreak(Number(streak.currentStreak) || 0);
      setLastPlayDate(streak.lastPlayDate || null);
    } catch {
      /* ignore */
    }
    try {
      const beats = JSON.parse(localStorage.getItem(PB_BEATS_STORAGE_KEY) || '{}');
      if (beats && typeof beats === 'object') setPbBeatCounts(beats);
    } catch {
      setPbBeatCounts({});
    }
  }, []);

  // Load profile username and rewrite any email-keyed local scores
  useEffect(() => {
    if (!user) {
      setProfileUsername(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('username, last_play_date, current_streak')
          .eq('id', user.id)
          .maybeSingle();
        if (cancelled) return;
        const name = displayNameForUser(data?.username, user);
        setProfileUsername(name);

        if (data?.current_streak != null) {
          setCurrentStreak(Number(data.current_streak) || 0);
        }
        if (data?.last_play_date) {
          setLastPlayDate(data.last_play_date);
        }

        const { data: badgeRows } = await supabase
          .from('user_badges')
          .select('badge_id')
          .eq('user_id', user.id);
        if (!cancelled && Array.isArray(badgeRows)) {
          const ids = badgeRows.map((r) => r.badge_id).filter(Boolean);
          setEarnedBadgeIds((prev) => {
            const merged = Array.from(new Set([...prev, ...ids]));
            localStorage.setItem(BADGES_STORAGE_KEY, JSON.stringify(merged));
            return merged;
          });
        }

        setLeaderboardData((prev) => {
          const cleaned = consolidateLeaderboardIdentity(
            prev,
            [user.email],
            name
          );
          localStorage.setItem('hifzDeckLeaderboards', JSON.stringify(cleaned));
          return cleaned;
        });
      } catch (err) {
        console.error('Failed to load profile username:', err);
        if (!cancelled) {
          setProfileUsername(displayNameForUser(null, user));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

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

  console.log('App render state:', {
    isLoading,
    selectedJuz,
    selectedHizb,
    selectedSurah,
    cardsLength: cards.length,
  });

  // Initialize Juz → Hizb → Surah cascade once Quran data is ready
  useEffect(() => {
    if (isLoading || !quran) return;
    if (selectedHizb != null && selectedSurah != null) return;

    const juz = selectedJuz || 30;
    const hizb = getFirstHizbForJuz(quran, juz);
    const surah = getPrimarySurahForHizb(quran, hizb);
    setSelectedJuz(juz);
    setSelectedHizb(hizb);
    if (surah) setSelectedSurah(String(surah));
  }, [isLoading, quran, selectedJuz, selectedHizb, selectedSurah]);

  // Prepare cards from surah ∩ hizb segment
  useEffect(() => {
    if (isLoading || !quran || !selectedSurah || !selectedHizb) return;

    const segment = getPlaySegment(quran, Number(selectedSurah), Number(selectedHizb));
    if (!segment.length) {
      setCards([]);
      return;
    }

    const newCards = segment.map((ayah, idx) => ({
      id: idx + 1,
      text: ayah.text,
      verse: ayah.verse,
      position: null,
      isFaceDown: true,
    }));
    setCards(newCards);
    setGameStarted(false);
    setTimerActive(false);
    setTime(0);
    setNextExpectedVerse(newCards[0]?.verse || 1);
    setFailCount(0);
    setFeedbackCardId(null);
    setFeedbackStatus('idle');
    setChoiceCards([]);
    if (timerRef.current) clearInterval(timerRef.current);
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
  }, [selectedSurah, selectedHizb, quran, isLoading]);

  const handleJuzChange = (event) => {
    const juz = Number(event.target.value);
    if (!quran || Number.isNaN(juz)) return;
    const hizb = getFirstHizbForJuz(quran, juz);
    const surah = getPrimarySurahForHizb(quran, hizb);
    setSelectedJuz(juz);
    setSelectedHizb(hizb);
    if (surah) setSelectedSurah(String(surah));
  };

  const handleHizbChange = (event) => {
    const hizb = Number(event.target.value);
    if (!quran || Number.isNaN(hizb)) return;
    const surah = getPrimarySurahForHizb(quran, hizb);
    setSelectedHizb(hizb);
    // Keep juz in sync with this hizb
    const juz = quran.hizbs?.[String(hizb)]?.juz;
    if (juz) setSelectedJuz(juz);
    if (surah) setSelectedSurah(String(surah));
  };

  const handleSurahChange = (event) => {
    const surah = event.target.value;
    setSelectedSurah(surah);
    if (!quran || !surah) return;
    if (selectedHizb && surahInHizb(quran, surah, selectedHizb)) return;
    const snapped = snapToSurah(quran, surah, selectedJuz);
    if (snapped) {
      setSelectedJuz(snapped.juz);
      setSelectedHizb(snapped.hizb);
    }
  };

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
  const boardName = displayNameForUser(profileUsername, user);
  const forwardCount = user
    ? getUserCount(
        leaderboardData.totalCorrectSurahs,
        boardName,
        user.email,
        profileUsername
      )
    : 0;
  const reverseCount = user
    ? getUserCount(
        leaderboardData.reverseCompletedSurahs,
        boardName,
        user.email,
        profileUsername
      )
    : 0;
  const reverseUnlocked = !!user && forwardCount >= REVERSE_UNLOCK_COUNT;
  const isElite = !!user && reverseCount >= ELITE_UNLOCK_COUNT;

  // Pride = fully finished surahs (every section); juz' = pacing
  const completedBoardKeys = user
    ? getCompletedBoardKeys(leaderboardData.surahTimes, [
        boardName,
        profileUsername,
        user.email,
      ])
    : new Set();
  const uniqueForwardSurahs = user
    ? countFullyCompletedSurahs(quran, completedBoardKeys)
    : 0;
  const completedJuzCount = user
    ? countFullyCompletedJuzs(quran, completedBoardKeys)
    : 0;
  const selectedJuzProgress = getJuzSegmentProgress(
    quran,
    selectedJuz,
    completedBoardKeys
  );
  const juzAmmaComplete = user
    ? isJuzFullyComplete(quran, 30, completedBoardKeys)
    : false;

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const refillChoices = (allCards, expectedVerse) => {
    const segmentVerses = new Set(allCards.map((c) => c.verse));
    const juzVerses = getVersesInJuz(quran, selectedJuz, {
      excludeKeys: new Set(
        allCards.map((c) => `${Number(selectedSurah)}:${c.verse}`)
      ),
    }).filter((v) => {
      // Prefer other surahs in the juz; still allow other ayahs outside this segment
      if (v.surah === Number(selectedSurah) && segmentVerses.has(v.ayah)) return false;
      return true;
    });

    return buildChoicePool({
      allCards,
      expectedVerse,
      visibleCardCount,
      difficulty,
      juzVerses,
    });
  };

  // Starting verse for the current play direction within the segment
  const getStartVerse = (cardList) => {
    if (!cardList?.length) return 1;
    const verses = cardList.map((c) => c.verse).sort((a, b) => a - b);
    return playDirection === 'reverse' ? verses[verses.length - 1] : verses[0];
  };

  // Next verse after a correct tap (along the segment order)
  const getAdvancedVerse = (current, cardList = cards) => {
    const verses = cardList.map((c) => c.verse).sort((a, b) => a - b);
    const idx = verses.indexOf(current);
    if (idx === -1) return current;
    return playDirection === 'reverse' ? verses[idx - 1] : verses[idx + 1];
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

  // Full sequence restart after 3 strikes
  const handleStrikeReset = () => {
    const resetCards = shuffleArray(
      cards.map((card) => ({
        ...card,
        position: null,
        isFaceDown: false,
      }))
    );
    const startVerse = getStartVerse(resetCards);
    setCards(resetCards);
    setChoiceCards(refillChoices(resetCards, startVerse));
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

  // User taps a choice in the pool — check if it is the next expected ayah
  const handleCardTap = (choiceId) => {
    if (!gameStarted) return;

    const choice = choiceCards.find((c) => c.id === choiceId);
    if (!choice) return;

    const isCorrect =
      !choice.isForeign &&
      choice.verse === nextExpectedVerse &&
      choice.sourceCardId != null;

    if (isCorrect) {
      const cardId = choice.sourceCardId;
      const updatedCards = cards.map((c) =>
        c.id === cardId ? { ...c, position: c.verse } : c
      );
      setCards(updatedCards);
      setFailCount(0);
      flashFeedback(choiceId, 'correct', 400);

      const allDone = updatedCards.every((c) => c.position !== null);
      if (allDone) {
        setChoiceCards([]);
        setTimerActive(false);
        const elapsedSeconds = Math.max(1, time);
        const recordedTime = formatTime(elapsedSeconds);
        const pointsEarned = computePoints({
          ayahCount: updatedCards.length,
          durationSeconds: elapsedSeconds,
          cardCount: visibleCardCount,
          difficulty,
          playDirection,
          stopwatchEnabled,
        });
        toast({
          title: playDirection === 'reverse' ? 'السابقون — Correct!' : 'Correct!',
          description: `Well done! Your time: ${recordedTime} · +${pointsEarned} pts`,
          status: 'success',
          duration: 5000,
          isClosable: true,
          position: 'top',
        });
        if (user && selectedSurah) {
          const boardKey = `${selectedSurah}@h${selectedHizb}`;
          if (playDirection === 'reverse') {
            updateReverseLeaderboards(boardKey, elapsedSeconds, pointsEarned);
          } else {
            updateLeaderboards(boardKey, elapsedSeconds, pointsEarned);
          }
        }
      } else {
        const newExpected = getAdvancedVerse(nextExpectedVerse, updatedCards);
        setNextExpectedVerse(newExpected);
        setChoiceCards(refillChoices(updatedCards, newExpected));
      }
    } else {
      const newFailCount = failCount + 1;
      flashFeedback(choiceId, 'incorrect', 500);

      if (attemptMode === 'three' && newFailCount >= 3) {
        handleStrikeReset();
      } else {
        setFailCount(newFailCount);
      }
    }
  };

  const handleStartGame = () => {
    if (!selectedSurah || !selectedHizb) {
      toast({
        title: 'Select a section',
        description: 'Please select a juz\', hizb, and surah before starting.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
        position: 'top',
      });
      return;
    }
    if (!cards.length) {
      toast({
        title: 'Empty section',
        description: 'No ayahs found for this surah in the selected hizb.',
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
    const startVerse = (() => {
      const verses = startedCards.map((c) => c.verse).sort((a, b) => a - b);
      return direction === 'reverse' ? verses[verses.length - 1] : verses[0];
    })();
    setCards(startedCards);
    setChoiceCards(refillChoices(startedCards, startVerse));
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
    setChoiceCards(refillChoices(cards, nextExpectedVerse));
  };

  const handleReset = () => {
    if (quran && selectedSurah && selectedHizb) {
      const segment = getPlaySegment(quran, Number(selectedSurah), Number(selectedHizb));
      const newCards = segment.map((ayah, idx) => ({
        id: idx + 1,
        text: ayah.text,
        verse: ayah.verse,
        position: null,
        isFaceDown: true,
      }));
      setCards(newCards);
      setNextExpectedVerse(newCards[0]?.verse || 1);
    } else {
      setNextExpectedVerse(1);
    }
    setGameStarted(false);
    setTimerActive(false);
    setTime(0);
    setFailCount(0);
    setFeedbackCardId(null);
    setFeedbackStatus('idle');
    setChoiceCards([]);
    if (timerRef.current) clearInterval(timerRef.current);
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
  };

  const applyGamificationRewards = ({
    surahNumber,
    timeTaken,
    pointsEarned,
    personalBestAchieved,
    forwardCountAfter,
    reverseCountAfter,
    justUnlockedReverse,
    justUnlockedElite,
    uniqueForwardAfter,
    completedJuzAfter,
    juzAmmaCompleteAfter,
  }) => {
    const streakNext = advanceStreak(lastPlayDate, currentStreak);
    setCurrentStreak(streakNext.currentStreak);
    setLastPlayDate(streakNext.lastPlayDate);
    localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(streakNext));

    let nextPbBeats = pbBeatCounts;
    if (personalBestAchieved) {
      const key = String(surahNumber);
      const beats = (pbBeatCounts[key] || 0) + 1;
      nextPbBeats = { ...pbBeatCounts, [key]: beats };
      setPbBeatCounts(nextPbBeats);
      localStorage.setItem(PB_BEATS_STORAGE_KEY, JSON.stringify(nextPbBeats));
    }

    const newBadges = evaluateNewBadges({
      earnedIds: earnedBadgeIds,
      forwardCount: forwardCountAfter ?? forwardCount,
      reverseCount: reverseCountAfter ?? reverseCount,
      uniqueForwardSurahs: uniqueForwardAfter ?? uniqueForwardSurahs,
      completedJuzCount: completedJuzAfter ?? completedJuzCount,
      juzAmmaComplete: juzAmmaCompleteAfter ?? juzAmmaComplete,
      difficulty,
      cardCount: visibleCardCount,
      durationSeconds: timeTaken,
      ayahCount: cards.length,
      pbBeatCountForSurah: nextPbBeats[String(surahNumber)] || 0,
      currentStreak: streakNext.currentStreak,
      justUnlockedReverse,
      justUnlockedElite,
    });

    if (newBadges.length > 0) {
      const merged = Array.from(new Set([...earnedBadgeIds, ...newBadges]));
      setEarnedBadgeIds(merged);
      setNewlyEarnedBadgeIds(newBadges);
      localStorage.setItem(BADGES_STORAGE_KEY, JSON.stringify(merged));
      newBadges.forEach((id) => {
        const badge = BADGE_BY_ID[id];
        if (!badge) return;
        toast({
          title: 'Badge unlocked!',
          description: badge.title,
          status: 'success',
          duration: 4000,
          isClosable: true,
          position: 'top-right',
        });
      });
      setTimeout(() => setNewlyEarnedBadgeIds([]), 2500);
    }

    recordProgressOnServer(surahNumber, timeTaken, pointsEarned, {
      badgeIds: newBadges,
      streak: streakNext,
    });
  };

  const addOverallPoints = (data, usernameToRecord, pointsEarned) => {
    const idx = data.overallPoints.findIndex((e) => e.username === usernameToRecord);
    if (idx > -1) {
      data.overallPoints[idx].points =
        (Number(data.overallPoints[idx].points) || 0) + pointsEarned;
    } else {
      data.overallPoints.push({ username: usernameToRecord, points: pointsEarned });
    }
    data.overallPoints.sort((a, b) => b.points - a.points);
  };

  const updateLeaderboards = (surahNumber, timeTaken, pointsEarned = 0) => {
    if (!user) return;
    const usernameToRecord = displayNameForUser(profileUsername, user);

    let personalBestAchieved = false;
    let newTotalCorrectMilestone = null;
    let justUnlockedReverse = false;
    let forwardCountAfter = forwardCount;
    let uniqueForwardAfter = uniqueForwardSurahs;
    let completedJuzAfter = completedJuzCount;
    let juzAmmaCompleteAfter = juzAmmaComplete;
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
      forwardCountAfter = currentTotalCorrectCount;

      const keysAfter = getCompletedBoardKeys(newData.surahTimes, [usernameToRecord]);
      uniqueForwardAfter = countFullyCompletedSurahs(quran, keysAfter);
      completedJuzAfter = countFullyCompletedJuzs(quran, keysAfter);
      juzAmmaCompleteAfter = isJuzFullyComplete(quran, 30, keysAfter);

      addOverallPoints(newData, usernameToRecord, pointsEarned);

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

    applyGamificationRewards({
      surahNumber,
      timeTaken,
      pointsEarned,
      personalBestAchieved,
      forwardCountAfter,
      uniqueForwardAfter,
      completedJuzAfter,
      juzAmmaCompleteAfter,
      justUnlockedReverse,
      justUnlockedElite: false,
    });

    setTimeout(() => {
      if (personalBestAchieved) {
        const surahIdOnly = String(surahNumber).split('@')[0];
        const surahName = sequence.find(s => s.number.toString() === surahIdOnly)?.name || 'this Surah';
        toast({
          title: 'Personal Best!',
          description: `New speed record for ${surahName}! Time: ${formatTime(timeTaken)}`,
          status: 'info',
          duration: 4000,
          isClosable: true,
          position: 'top-right' 
        });
      }
      if (uniqueForwardAfter > uniqueForwardSurahs) {
        const surahIdOnly = String(surahNumber).split('@')[0];
        const surahName =
          sequence.find((s) => s.number.toString() === surahIdOnly)?.name || 'this surah';
        toast({
          title: 'Surah complete!',
          description: `You finished every section of ${surahName}.`,
          status: 'success',
          duration: 4500,
          isClosable: true,
          position: 'top-right',
        });
      }
      if (completedJuzAfter > completedJuzCount) {
        toast({
          title: "Juz' complete!",
          description: `You cleared every section in a juz'. (${completedJuzAfter}/${30})`,
          status: 'success',
          duration: 4500,
          isClosable: true,
          position: 'top-right',
        });
      }
      if (newTotalCorrectMilestone && newTotalCorrectMilestone !== REVERSE_UNLOCK_COUNT) {
        toast({
          title: 'Achievement Unlocked!',
          description: `Congratulations! You've correctly completed ${newTotalCorrectMilestone} sections!`,
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
  const updateReverseLeaderboards = (surahNumber, timeTaken, pointsEarned = 0) => {
    if (!user) return;
    const usernameToRecord = displayNameForUser(profileUsername, user);

    let personalBestAchieved = false;
    let justUnlockedElite = false;
    let reverseCountAfter = reverseCount;

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
      reverseCountAfter = currentReverseCount;

      addOverallPoints(newData, usernameToRecord, pointsEarned);

      if (oldReverseCount < ELITE_UNLOCK_COUNT && currentReverseCount >= ELITE_UNLOCK_COUNT) {
        justUnlockedElite = true;
      }

      localStorage.setItem('hifzDeckLeaderboards', JSON.stringify(newData));
      return newData;
    });

    applyGamificationRewards({
      surahNumber,
      timeTaken,
      pointsEarned,
      personalBestAchieved,
      reverseCountAfter,
      justUnlockedReverse: false,
      justUnlockedElite,
    });

    setTimeout(() => {
      if (personalBestAchieved) {
        const surahIdOnly = String(surahNumber).split('@')[0];
        const surahName =
          sequence.find((s) => s.number.toString() === surahIdOnly)?.name || 'this Surah';
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
      // Must be GET — the edge function rejects POST with 405
      const { data, error } = await supabase.functions.invoke('leaderboard', {
        method: 'GET',
      });
      if (error) throw error;

      if (data) {
        const merged = mergeLeaderboards(
          leaderboardData,
          data,
          user?.email ? [user.email] : [],
          boardName
        );
        setLeaderboardData(merged);
        localStorage.setItem('hifzDeckLeaderboards', JSON.stringify(merged));
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
        description: error.message || String(error),
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  /** Send a completion to the server so shared leaderboards can fill in */
  const recordProgressOnServer = async (surahNumber, timeTaken, _pointsEarned = 0, extras = {}) => {
    const surahIdNum = parseInt(surahNumber, 10);
    const durationNum = Math.max(1, Math.round(Number(timeTaken) || 0));
    if (isNaN(surahIdNum) || surahIdNum <= 0) return;

    const ayahNums = cards.map((c) => c.verse).sort((a, b) => a - b);
    const ayahStart = ayahNums[0] || 1;
    const ayahEnd = ayahNums[ayahNums.length - 1] || ayahStart;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        console.warn('[progress] No access token; skipping server record');
        return;
      }

      const { data, error } = await supabase.functions.invoke('progress', {
        headers: { Authorization: `Bearer ${token}` },
        body: {
          surah_id: surahIdNum,
          duration_seconds: durationNum,
          ayah_count: cards.length || 1,
          card_count: visibleCardCount,
          difficulty,
          play_direction: playDirection,
          stopwatch_enabled: stopwatchEnabled,
          juz: selectedJuz,
          hizb: selectedHizb,
          ayah_start: ayahStart,
          ayah_end: ayahEnd,
          badge_ids: extras.badgeIds || [],
          current_streak: extras.streak?.currentStreak ?? currentStreak,
          last_play_date: extras.streak?.lastPlayDate ?? lastPlayDate,
        },
      });
      if (error) {
        console.error('Failed to record progress on server:', error);
        toast({
          title: 'Score saved locally only',
          description: error.message || 'Could not sync this run to the server leaderboard.',
          status: 'warning',
          duration: 4000,
          isClosable: true,
        });
        return;
      }
      console.log('[progress] Recorded on server:', data);
    } catch (err) {
      console.error('Failed to send progress request:', err);
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
        method: 'GET',
      });

      if (error) {
        throw error;
      }
      console.log("[App.jsx] Leaderboard data received:", data);
      // Merge with local progress so an empty server board does not wipe scores
      setLeaderboardData((prev) => {
        const merged = mergeLeaderboards(
          prev,
          data,
          user?.email ? [user.email] : [],
          displayNameForUser(profileUsername, user)
        );
        localStorage.setItem('hifzDeckLeaderboards', JSON.stringify(merged));
        return merged;
      });
    } catch (err) {
      console.error("Error fetching leaderboard:", err);
      toast({
        title: 'Error Fetching Leaderboard',
        description: err.message || String(err),
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      // Keep whatever local scores we already have
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
  const visibleCards = choiceCards;

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
                Memorize by juz' and hizb — tap ayahs in order.
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

          {/* Badge shelf — logged-in reward gallery */}
          {user && !gameStarted && (
            <Box
              w="100%"
              bg={colorMode === 'dark' ? 'rgba(34, 66, 63, 0.4)' : 'rgba(255, 255, 255, 0.5)'}
              backdropFilter="blur(12px)"
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
              px={{ base: 3, md: 5 }}
              py={{ base: 3, md: 4 }}
            >
              <BadgeShelf
                earnedIds={earnedBadgeIds}
                newlyEarnedIds={newlyEarnedBadgeIds}
                currentStreak={currentStreak}
                completedSurahs={uniqueForwardSurahs}
                completedJuzs={completedJuzCount}
                selectedJuz={selectedJuz}
                juzSectionsDone={selectedJuzProgress.completed}
                juzSectionsTotal={selectedJuzProgress.total}
              />
            </Box>
          )}

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
                gap={{ base: 2.5, md: 3 }}
                flexWrap="wrap"
              >
                <HStack alignItems="center" spacing={2} flex={{ base: '1', md: 'initial' }}>
                  <Text whiteSpace="nowrap" fontSize="sm" fontWeight="600" color={colorMode === 'dark' ? 'mist.200' : 'ink.700'}>
                    Juz'
                  </Text>
                  <Select
                    size={{ base: 'sm', md: 'md' }}
                    maxWidth={{ base: '100%', md: '110px' }}
                    value={selectedJuz ?? ''}
                    onChange={handleJuzChange}
                    isDisabled={gameStarted || isLoading || !quran}
                    bg={colorMode === 'dark' ? 'blackAlpha.300' : 'whiteAlpha.800'}
                    borderColor={isElite ? 'elite.300' : colorMode === 'dark' ? 'whiteAlpha.300' : 'mist.300'}
                  >
                    {Array.from({ length: 30 }, (_, i) => i + 1).map((j) => (
                      <option key={j} value={j}>
                        {j}
                      </option>
                    ))}
                  </Select>
                </HStack>

                <HStack alignItems="center" spacing={2} flex={{ base: '1', md: 'initial' }}>
                  <Text whiteSpace="nowrap" fontSize="sm" fontWeight="600" color={colorMode === 'dark' ? 'mist.200' : 'ink.700'}>
                    Hizb
                  </Text>
                  <Select
                    size={{ base: 'sm', md: 'md' }}
                    maxWidth={{ base: '100%', md: '110px' }}
                    value={selectedHizb ?? ''}
                    onChange={handleHizbChange}
                    isDisabled={gameStarted || isLoading || !quran}
                    bg={colorMode === 'dark' ? 'blackAlpha.300' : 'whiteAlpha.800'}
                    borderColor={isElite ? 'elite.300' : colorMode === 'dark' ? 'whiteAlpha.300' : 'mist.300'}
                  >
                    {(quran ? getHizbsForJuz(quran, selectedJuz) : []).map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </Select>
                </HStack>

                <HStack alignItems="center" spacing={2} flex={{ base: '1', md: 'initial' }} w={{ base: '100%', md: 'auto' }}>
                  <Text whiteSpace="nowrap" fontSize="sm" fontWeight="600" color={colorMode === 'dark' ? 'mist.200' : 'ink.700'}>
                    Surah
                  </Text>
                  <Select
                    size={{ base: 'sm', md: 'md' }}
                    maxWidth={{ base: '100%', md: '280px' }}
                    value={selectedSurah || ''}
                    onChange={handleSurahChange}
                    placeholder="Select a Surah"
                    isDisabled={gameStarted || isLoading || !selectedHizb}
                    bg={colorMode === 'dark' ? 'blackAlpha.300' : 'whiteAlpha.800'}
                    borderColor={isElite ? 'elite.300' : colorMode === 'dark' ? 'whiteAlpha.300' : 'mist.300'}
                    _hover={{ borderColor: 'ink.400' }}
                  >
                    {(quran && selectedHizb
                      ? getSurahsInHizb(quran, selectedHizb)
                      : []
                    ).map((surah) => (
                      <option key={surah.number} value={surah.number.toString()}>
                        {surah.number}. {surah.name}
                        {surah.from !== surah.to ? ` (${surah.from}–${surah.to})` : ''}
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
                      Level
                    </FormLabel>
                    <HStack justify="center" spacing={2} flexWrap="wrap">
                      {[
                        { value: 'beginner', label: 'Beginner' },
                        { value: 'experienced', label: 'Experienced' },
                      ].map((opt) => (
                        <Button
                          key={opt.value}
                          size="sm"
                          variant={difficulty === opt.value ? 'solid' : 'outline'}
                          colorScheme="teal"
                          onClick={() => setDifficulty(opt.value)}
                          isDisabled={gameStarted}
                        >
                          {opt.label}
                        </Button>
                      ))}
                    </HStack>
                    <Text fontSize="xs" mt={1.5} textAlign="center" color={colorMode === 'dark' ? 'whiteAlpha.600' : 'mist.500'}>
                      {difficulty === 'beginner'
                        ? 'Choices from this section only'
                        : 'Wrong choices mix this section and other ayahs in this juz\''}
                    </Text>
                  </FormControl>

                  <FormControl>
                    <FormLabel fontSize="xs" mb={1.5} textAlign={{ base: 'left', sm: 'center' }} fontWeight="600">
                      Choices shown
                    </FormLabel>
                    <HStack justify="center" spacing={2}>
                      {[3, 4, 5].map((n) => (
                        <Button
                          key={n}
                          size="sm"
                          variant={visibleCardCount === n ? 'solid' : 'outline'}
                          colorScheme="teal"
                          onClick={() => setVisibleCardCount(n)}
                          isDisabled={gameStarted}
                          minW="44px"
                        >
                          {n}
                        </Button>
                      ))}
                    </HStack>
                    <Text fontSize="xs" mt={1.5} textAlign="center" color={colorMode === 'dark' ? 'whiteAlpha.600' : 'mist.500'}>
                      More choices = harder (and more points)
                    </Text>
                  </FormControl>

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
                  ? `Next: ayah ${nextExpectedVerse} → start`
                  : `Next: ayah ${nextExpectedVerse} (${cards.filter((c) => c.position !== null).length + 1}/${cards.length})`}
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
                {unplacedCards.length > visibleCardCount && (
                  <Text
                    fontSize="xs"
                    mb={{ base: 2, md: 3 }}
                    color={colorMode === 'dark' ? 'whiteAlpha.600' : 'mist.500'}
                    textAlign="center"
                  >
                    Showing {visibleCards.length} of {unplacedCards.length} remaining
                    {difficulty === 'experienced' ? ' (+ other ayahs in this juz\')' : ''}
                  </Text>
                )}
                <SimpleGrid
                  columns={{ base: 1, sm: 2, md: Math.min(3, visibleCards.length || 1) }}
                  spacing={{ base: 2, md: 3 }}
                  w="100%"
                  mt={unplacedCards.length > visibleCardCount ? 0 : { base: 2, md: 3 }}
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
                        isFaceDown={false}
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
        earnedBadgeIds={earnedBadgeIds}
        currentStreak={currentStreak}
        completedSurahs={uniqueForwardSurahs}
        completedJuzs={completedJuzCount}
        selectedJuz={selectedJuz}
        juzSectionsDone={selectedJuzProgress.completed}
        juzSectionsTotal={selectedJuzProgress.total}
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
                <Tab fontSize={{ base: 'xs', md: 'sm' }}>Correct Surahs</Tab>
                <Tab fontSize={{ base: 'xs', md: 'sm' }}>Fastest Times</Tab>
                <Tab fontSize={{ base: 'xs', md: 'sm' }}>Overall Points</Tab>
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
                        {Array.isArray(leaderboardData.totalCorrectSurahs) &&
                        leaderboardData.totalCorrectSurahs.filter(
                          (e) => e?.username && !looksLikeEmail(e.username)
                        ).length > 0 ? (
                          leaderboardData.totalCorrectSurahs
                            .filter((e) => e?.username && !looksLikeEmail(e.username))
                            .map((entry, index) => (
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
                <Text fontSize="xs" mb={3} color="gray.500">
                  Times are not weighted by difficulty.
                </Text>
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
                      {(() => {
                        const rows = buildFastestTimesRows(
                          leaderboardData.surahTimes,
                          sequence,
                          quran
                        );
                        if (rows.length === 0) {
                          return (
                            <Tr>
                              <Td colSpan="3">No data available.</Td>
                            </Tr>
                          );
                        }
                        return rows.map((row) => (
                          <Tr key={row.surahId}>
                            <Td>{row.name}</Td>
                            <Td>{row.username || 'Anonymous'}</Td>
                            <Td>{row.time}</Td>
                          </Tr>
                        ));
                      })()}
                    </Tbody>
                  </Table>
                </TableContainer>
                </TabPanel>
                <TabPanel>
                  <Text fontSize="xs" mb={3} color="gray.500">
                    Weighted by level, choices shown, and direction.
                  </Text>
                  <TableContainer>
                    <Table variant="simple">
                      <Thead>
                        <Tr>
                          <Th>Rank</Th>
                          <Th>Username</Th>
                          <Th>Points</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {Array.isArray(leaderboardData.overallPoints) &&
                        leaderboardData.overallPoints.filter(
                          (e) => e?.username && !looksLikeEmail(e.username)
                        ).length > 0 ? (
                          leaderboardData.overallPoints
                            .filter((e) => e?.username && !looksLikeEmail(e.username))
                            .map((entry, index) => (
                              <Tr key={index}>
                                <Td>{index + 1}</Td>
                                <Td>{entry.username || 'Anonymous'}</Td>
                                <Td>{entry.points}</Td>
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
            <PointsWeightingExplainer
              difficulty={difficulty}
              cardCount={visibleCardCount}
              playDirection={playDirection}
              stopwatchEnabled={stopwatchEnabled}
            />
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