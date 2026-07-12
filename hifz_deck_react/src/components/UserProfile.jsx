import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Flex,
  Heading,
  Text,
  Button,
  Avatar,
  HStack,
  VStack,
  Spinner,
  useColorMode,
  SimpleGrid,
} from '@chakra-ui/react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { keyframes } from '@emotion/react';
import AppBackground from './AppBackground';
import BadgeShelf from './BadgeShelf';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import { loadPublicProfile } from '../utils/loadPublicProfile';
import { isLinkableUsername } from './LeaderboardUsernameLink';

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

/** Initials for the avatar fallback (works for Latin + Arabic names). */
function initialsFromUsername(username) {
  const name = String(username || '').trim();
  if (!name) return '?';
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/**
 * Public (and own) profile showcase: avatar, badges, rank, total points.
 * Route: /profile/:username  — also /profile redirects to the signed-in user's page.
 */
const UserProfile = () => {
  const { username: usernameParam } = useParams();
  const { user, initialLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';

  const [status, setStatus] = useState('loading'); // loading | ready | not_found | error | need_login | need_username
  const [payload, setPayload] = useState(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  const muted = isDark ? 'whiteAlpha.600' : 'mist.500';
  const headingColor = isDark ? 'mist.50' : 'ink.900';
  const borderSoft = isDark ? 'whiteAlpha.200' : 'mist.200';
  const panelBg = isDark ? 'rgba(34, 66, 63, 0.55)' : 'rgba(255, 255, 255, 0.72)';

  // /profile with no username → resolve to the logged-in user's public name
  useEffect(() => {
    if (usernameParam) return;

    const resolveOwn = async () => {
      if (authLoading) return;
      if (!user) {
        setStatus('need_login');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error(error);
        setStatus('error');
        return;
      }

      const name = data?.username?.trim();
      if (!isLinkableUsername(name)) {
        setStatus('need_username');
        return;
      }

      navigate(`/profile/${encodeURIComponent(name)}`, { replace: true });
    };

    resolveOwn();
  }, [usernameParam, user, authLoading, navigate]);

  // Load the public profile when we have a username in the URL
  useEffect(() => {
    if (!usernameParam) return;

    let cancelled = false;

    const run = async () => {
      setStatus('loading');
      const result = await loadPublicProfile(usernameParam);
      if (cancelled) return;

      if (!result.ok) {
        setPayload(null);
        setStatus(result.reason === 'not_found' || result.reason === 'missing' ? 'not_found' : 'error');
        return;
      }

      setPayload(result);
      setIsOwnProfile(Boolean(user && user.id === result.profile.id));
      setStatus('ready');
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [usernameParam, user]);

  const softPanel = {
    bg: panelBg,
    backdropFilter: 'blur(14px)',
    border: '1px solid',
    borderColor: borderSoft,
    borderRadius: '2xl',
    boxShadow: 'soft',
  };

  return (
    <Box minH="100vh" position="relative" overflow="hidden">
      <AppBackground />
      <Container maxW="lg" py={{ base: 8, md: 12 }} position="relative" zIndex={1}>
        <Flex justify="space-between" align="center" mb={6}>
          <Button as={RouterLink} to="/" size="sm" variant="ghost" colorScheme="teal">
            ← Back to Hifzer
          </Button>
          {user && (
            <Button as={RouterLink} to="/profile" size="sm" variant="outline" colorScheme="teal">
              My profile
            </Button>
          )}
        </Flex>

        {(status === 'loading' || (!usernameParam && status !== 'need_login' && status !== 'need_username' && status !== 'error')) && (
          <Flex justify="center" py={20}>
            <Spinner size="lg" color="ink.400" thickness="3px" />
          </Flex>
        )}

        {status === 'need_login' && (
          <Box {...softPanel} p={{ base: 6, md: 8 }} textAlign="center" animation={`${fadeUp} 0.45s ease-out`}>
            <Heading as="h1" size="lg" fontFamily="heading" color={headingColor} mb={2}>
              Sign in to view your profile
            </Heading>
            <Text color={muted} mb={5}>
              Your public profile shows badges, ranking, and points once you have a username.
            </Text>
            <Button as={RouterLink} to="/" bg="ink.600" color="white" _hover={{ bg: 'ink.700' }}>
              Go to Hifzer
            </Button>
          </Box>
        )}

        {status === 'need_username' && (
          <Box {...softPanel} p={{ base: 6, md: 8 }} textAlign="center" animation={`${fadeUp} 0.45s ease-out`}>
            <Heading as="h1" size="lg" fontFamily="heading" color={headingColor} mb={2}>
              Choose a public username
            </Heading>
            <Text color={muted} mb={5}>
              Open Account Settings on the home page to set a username, then your profile will appear here.
            </Text>
            <Button as={RouterLink} to="/" bg="ink.600" color="white" _hover={{ bg: 'ink.700' }}>
              Back to home
            </Button>
          </Box>
        )}

        {status === 'not_found' && (
          <Box {...softPanel} p={{ base: 6, md: 8 }} textAlign="center" animation={`${fadeUp} 0.45s ease-out`}>
            <Heading as="h1" size="lg" fontFamily="heading" color={headingColor} mb={2}>
              Player not found
            </Heading>
            <Text color={muted} mb={5}>
              No profile matches “{decodeURIComponent(usernameParam || '')}”.
            </Text>
            <Button as={RouterLink} to="/" variant="outline" colorScheme="teal">
              Back to Hifzer
            </Button>
          </Box>
        )}

        {status === 'error' && (
          <Box {...softPanel} p={{ base: 6, md: 8 }} textAlign="center" animation={`${fadeUp} 0.45s ease-out`}>
            <Heading as="h1" size="lg" fontFamily="heading" color={headingColor} mb={2}>
              Could not load profile
            </Heading>
            <Text color={muted} mb={5}>
              Something went wrong fetching this player. Try again in a moment.
            </Text>
            <Button as={RouterLink} to="/" variant="outline" colorScheme="teal">
              Back to Hifzer
            </Button>
          </Box>
        )}

        {status === 'ready' && payload && (
          <VStack
            spacing={6}
            align="stretch"
            animation={`${fadeUp} 0.5s ease-out`}
          >
            {/* Hero identity — one clear composition */}
            <Box {...softPanel} p={{ base: 6, md: 8 }} textAlign="center">
              <Avatar
                size="xl"
                name={payload.profile.username}
                src={payload.profile.avatar_url || undefined}
                bg="ink.500"
                color="white"
                mb={4}
                getInitials={() => initialsFromUsername(payload.profile.username)}
                border="3px solid"
                borderColor={isDark ? 'elite.400' : 'ink.300'}
              />
              <Heading
                as="h1"
                fontFamily="heading"
                fontSize={{ base: '2xl', md: '3xl' }}
                color={headingColor}
                mb={1}
              >
                {payload.profile.username}
              </Heading>
              <Text fontSize="sm" color={muted}>
                {isOwnProfile ? 'Your public Hifzer profile' : 'Hifzer player'}
                {payload.profile.current_streak > 0
                  ? ` · ${payload.profile.current_streak}-day streak`
                  : ''}
              </Text>
            </Box>

            {/* Rank + points */}
            <SimpleGrid columns={2} spacing={4}>
              <Box {...softPanel} p={5} textAlign="center">
                <Text fontSize="xs" fontWeight="600" color={muted} textTransform="uppercase" letterSpacing="wider" mb={1}>
                  Rank
                </Text>
                <Text fontFamily="heading" fontSize={{ base: '2xl', md: '3xl' }} color={headingColor} fontWeight="700">
                  {payload.rank != null ? `#${payload.rank}` : '—'}
                </Text>
                <Text fontSize="xs" color={muted} mt={1}>
                  by total points
                </Text>
              </Box>
              <Box {...softPanel} p={5} textAlign="center">
                <Text fontSize="xs" fontWeight="600" color={muted} textTransform="uppercase" letterSpacing="wider" mb={1}>
                  Points
                </Text>
                <Text fontFamily="heading" fontSize={{ base: '2xl', md: '3xl' }} color={headingColor} fontWeight="700">
                  {payload.totalPoints.toLocaleString()}
                </Text>
                <Text fontSize="xs" color={muted} mt={1}>
                  all-time
                </Text>
              </Box>
            </SimpleGrid>

            {/* Badges */}
            <Box {...softPanel} p={{ base: 4, md: 5 }}>
              <BadgeShelf
                title="Badges"
                earnedIds={payload.earnedBadgeIds}
                currentStreak={payload.profile.current_streak || 0}
                completedSurahs={payload.distinctSurahs}
                showJuzMeter={false}
              />
            </Box>

            {isOwnProfile && (
              <HStack justify="center" pt={1}>
                <Text fontSize="xs" color={muted}>
                  Tip: friends can open this page from your name on the leaderboard.
                </Text>
              </HStack>
            )}
          </VStack>
        )}
      </Container>
    </Box>
  );
};

export default UserProfile;
