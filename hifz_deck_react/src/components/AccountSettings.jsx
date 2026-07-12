import React, { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Button,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Box,
  Text,
  Heading,
  FormControl,
  FormLabel,
  Input,
  VStack,
  useToast,
  Badge,
  Progress,
  HStack,
  useColorMode,
} from '@chakra-ui/react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import BadgeShelf from './BadgeShelf';
import { Link as RouterLink } from 'react-router-dom';
import { isLinkableUsername } from './LeaderboardUsernameLink';

const REVERSE_UNLOCK_COUNT = 10;
const ELITE_UNLOCK_COUNT = 3;

/**
 * Account modal — profile, security, and progress.
 * Uses the same ink/mist soft-panel language as auth + leaderboard.
 */
const AccountSettings = ({
  isOpen,
  onClose,
  forwardCount = 0,
  reverseCount = 0,
  isElite = false,
  earnedBadgeIds = [],
  currentStreak = 0,
  completedSurahs = 0,
  completedJuzs = 0,
  selectedJuz = 30,
  juzSectionsDone = 0,
  juzSectionsTotal = 0,
}) => {
  const { user, session, updateUsername, updateUserPassword } = useAuth();
  const toast = useToast();
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';

  const muted = isDark ? 'whiteAlpha.600' : 'mist.500';
  const labelColor = isDark ? 'mist.100' : 'ink.700';
  const headingColor = isDark ? 'mist.50' : 'ink.900';
  const borderSoft = isDark ? 'whiteAlpha.200' : 'mist.200';
  const inputBg = isDark ? 'blackAlpha.300' : 'white';
  const inputBorder = isDark ? 'whiteAlpha.300' : 'mist.300';
  const trackBg = isDark ? 'whiteAlpha.200' : 'mist.200';

  const [newUsernameInput, setNewUsernameInput] = useState('');
  const [isUpdatingUsername, setIsUpdatingUsername] = useState(false);
  const [currentProfileUsername, setCurrentProfileUsername] = useState('Loading...');

  const [newPassword, setNewPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const reverseUnlocked = forwardCount >= REVERSE_UNLOCK_COUNT;

  const handleUpdateUsername = async () => {
    if (!session || !session.access_token) {
      toast({
        title: 'Sign in required',
        description: 'You must be logged in to change your username.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    if (newUsernameInput.trim().length < 3) {
      toast({
        title: 'Username too short',
        description: 'New username must be at least 3 characters.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsUpdatingUsername(true);

    try {
      const { error } = await updateUsername(newUsernameInput.trim());

      if (error) {
        throw error;
      }

      toast({
        title: 'Username updated',
        description: `You'll appear as ${newUsernameInput.trim()} on the leaderboard.`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      setCurrentProfileUsername(newUsernameInput.trim());
      setNewUsernameInput('');
    } catch (error) {
      toast({
        title: 'Update failed',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsUpdatingUsername(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (newPassword.length < 6) {
      toast({
        title: 'Password too short',
        description: 'New password must be at least 6 characters.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsUpdatingPassword(true);

    const { error } = await updateUserPassword(newPassword);

    if (error) {
      toast({
        title: 'Update failed',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } else {
      toast({
        title: 'Password updated',
        description: 'Your password has been saved.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      setNewPassword('');
    }

    setIsUpdatingPassword(false);
  };

  // When the modal opens, fetch the current username from the profiles table.
  React.useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;

      setIsUpdatingUsername(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        if (data) {
          setCurrentProfileUsername(data.username);
        } else {
          setCurrentProfileUsername('Not set');
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        setCurrentProfileUsername('Could not load');
        toast({
          title: 'Could not load profile',
          description: 'Try closing and reopening Account Settings.',
          status: 'error',
          duration: 4000,
          isClosable: true,
        });
      } finally {
        setIsUpdatingUsername(false);
      }
    };

    if (isOpen && user) {
      fetchUserProfile();
    }
  }, [isOpen, user, toast]);

  if (!user) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" isCentered>
      <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(6px)" />
      <ModalContent
        bg={isDark ? 'ink.800' : 'mist.50'}
        border="1px solid"
        borderColor={borderSoft}
        mx={3}
      >
        <ModalHeader fontFamily="heading" color={headingColor}>
          Account Settings
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={4}>
          <Tabs isFitted variant="soft-rounded" colorScheme="teal" size="sm">
            <TabList
              mb={3}
              gap={1}
              bg={isDark ? 'blackAlpha.300' : 'mist.100'}
              p={1}
              borderRadius="lg"
            >
              <Tab fontSize={{ base: 'xs', md: 'sm' }} borderRadius="md">
                Profile
              </Tab>
              <Tab fontSize={{ base: 'xs', md: 'sm' }} borderRadius="md">
                Security
              </Tab>
              <Tab fontSize={{ base: 'xs', md: 'sm' }} borderRadius="md">
                Progress
              </Tab>
            </TabList>
            <TabPanels>
              <TabPanel px={0} pt={1}>
                <VStack spacing={4} align="stretch">
                  <Box>
                    <Text fontSize="xs" color={muted} mb={0.5} fontWeight="600">
                      Email
                    </Text>
                    <Text fontSize="sm" color={headingColor} noOfLines={1}>
                      {user.email}
                    </Text>
                  </Box>
                  <Box>
                    <Text fontSize="xs" color={muted} mb={0.5} fontWeight="600">
                      Public username
                    </Text>
                    <Text fontSize="sm" color={headingColor} fontWeight="600">
                      {currentProfileUsername}
                    </Text>
                    {isLinkableUsername(currentProfileUsername) && (
                      <Button
                        as={RouterLink}
                        to={`/profile/${encodeURIComponent(currentProfileUsername)}`}
                        onClick={onClose}
                        size="xs"
                        mt={2}
                        variant="outline"
                        colorScheme="teal"
                      >
                        View public profile
                      </Button>
                    )}
                  </Box>

                  <Box pt={3} borderTopWidth="1px" borderColor={borderSoft}>
                    <Heading
                      as="h3"
                      size="sm"
                      mb={1}
                      fontFamily="heading"
                      color={headingColor}
                    >
                      Change username
                    </Heading>
                    <Text fontSize="xs" color={muted} mb={3}>
                      This name appears on the leaderboard instead of your email.
                    </Text>
                    <VStack spacing={3} align="stretch">
                      <FormControl>
                        <FormLabel htmlFor="acct-new-username" fontSize="sm" color={labelColor} mb={1}>
                          New username
                        </FormLabel>
                        <Input
                          id="acct-new-username"
                          placeholder="At least 3 characters"
                          value={newUsernameInput}
                          onChange={(e) => setNewUsernameInput(e.target.value)}
                          isDisabled={isUpdatingUsername}
                          bg={inputBg}
                          borderColor={inputBorder}
                          _hover={{ borderColor: isDark ? 'whiteAlpha.400' : 'ink.300' }}
                          _focusVisible={{
                            borderColor: 'ink.400',
                            boxShadow: '0 0 0 1px var(--chakra-colors-ink-400)',
                          }}
                        />
                      </FormControl>
                      <Button
                        bg="ink.600"
                        color="white"
                        _hover={{ bg: 'ink.700' }}
                        onClick={handleUpdateUsername}
                        isLoading={isUpdatingUsername}
                        alignSelf="flex-start"
                        size="sm"
                      >
                        Update username
                      </Button>
                    </VStack>
                  </Box>
                </VStack>
              </TabPanel>

              <TabPanel px={0} pt={1}>
                <Heading
                  as="h3"
                  size="sm"
                  mb={1}
                  fontFamily="heading"
                  color={headingColor}
                >
                  Change password
                </Heading>
                <Text fontSize="xs" color={muted} mb={4}>
                  Choose a new password for email sign-in. Google accounts manage password elsewhere.
                </Text>
                <VStack spacing={3.5} align="stretch">
                  <FormControl>
                    <FormLabel fontSize="sm" color={labelColor} mb={1}>
                      New password
                    </FormLabel>
                    <Input
                      type="password"
                      placeholder="At least 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      isDisabled={isUpdatingPassword}
                      bg={inputBg}
                      borderColor={inputBorder}
                      _hover={{ borderColor: isDark ? 'whiteAlpha.400' : 'ink.300' }}
                      _focusVisible={{
                        borderColor: 'ink.400',
                        boxShadow: '0 0 0 1px var(--chakra-colors-ink-400)',
                      }}
                    />
                  </FormControl>
                  <Button
                    bg="ink.600"
                    color="white"
                    _hover={{ bg: 'ink.700' }}
                    onClick={handleUpdatePassword}
                    isLoading={isUpdatingPassword}
                    loadingText="Updating..."
                    size="sm"
                    alignSelf="flex-start"
                  >
                    Update password
                  </Button>
                </VStack>
              </TabPanel>

              <TabPanel px={0} pt={1}>
                <Heading
                  as="h3"
                  size="sm"
                  mb={3}
                  fontFamily="heading"
                  color={headingColor}
                >
                  My Hifz progress
                </Heading>

                <Box mb={5}>
                  <BadgeShelf
                    earnedIds={earnedBadgeIds}
                    currentStreak={currentStreak}
                    completedSurahs={completedSurahs}
                    completedJuzs={completedJuzs}
                    selectedJuz={selectedJuz}
                    juzSectionsDone={juzSectionsDone}
                    juzSectionsTotal={juzSectionsTotal}
                  />
                </Box>

                {isElite && (
                  <Box
                    mb={5}
                    py={3}
                    px={3}
                    borderRadius="lg"
                    borderTopWidth="3px"
                    borderTopColor={isDark ? 'elite.300' : 'elite.500'}
                    borderWidth="1px"
                    borderColor={isDark ? 'elite.700' : 'elite.200'}
                    bg={isDark ? 'blackAlpha.300' : 'elite.50'}
                    textAlign="center"
                  >
                    <Badge
                      fontSize="sm"
                      px={3}
                      py={1}
                      mb={2}
                      bg="elite.500"
                      color="white"
                      fontFamily="arabic"
                      borderRadius="md"
                    >
                      السابقون
                    </Badge>
                    <Text fontSize="sm" color={isDark ? 'elite.200' : 'elite.700'}>
                      Elite status — you have mastered the reverse path.
                    </Text>
                  </Box>
                )}

                <VStack spacing={5} align="stretch">
                  <Box>
                    <HStack justify="space-between" mb={1.5}>
                      <Text fontSize="sm" fontWeight="600" color={headingColor}>
                        Forward completions
                      </Text>
                      <Text fontSize="xs" color={muted} fontWeight="600">
                        {Math.min(forwardCount, REVERSE_UNLOCK_COUNT)} / {REVERSE_UNLOCK_COUNT}
                      </Text>
                    </HStack>
                    <Progress
                      value={(Math.min(forwardCount, REVERSE_UNLOCK_COUNT) / REVERSE_UNLOCK_COUNT) * 100}
                      size="sm"
                      borderRadius="full"
                      colorScheme="teal"
                      bg={trackBg}
                      aria-label={`Forward completions ${Math.min(forwardCount, REVERSE_UNLOCK_COUNT)} of ${REVERSE_UNLOCK_COUNT}`}
                    />
                    <Text fontSize="sm" mt={2} color={isDark ? 'mist.200' : 'mist.600'}>
                      {reverseUnlocked
                        ? 'السابقون reverse path unlocked.'
                        : `Complete ${REVERSE_UNLOCK_COUNT - forwardCount} more surah(s) to unlock السابقون (reverse).`}
                    </Text>
                    <Text fontSize="xs" mt={1} color={muted}>
                      Total forward surahs completed: {forwardCount}
                    </Text>
                  </Box>

                  <Box>
                    <HStack justify="space-between" mb={1.5}>
                      <Text fontSize="sm" fontWeight="600" color={headingColor}>
                        Reverse completions
                      </Text>
                      <Text fontSize="xs" color={muted} fontWeight="600">
                        {Math.min(reverseCount, ELITE_UNLOCK_COUNT)} / {ELITE_UNLOCK_COUNT}
                      </Text>
                    </HStack>
                    <Progress
                      value={(Math.min(reverseCount, ELITE_UNLOCK_COUNT) / ELITE_UNLOCK_COUNT) * 100}
                      size="sm"
                      borderRadius="full"
                      colorScheme={isElite ? 'yellow' : 'teal'}
                      bg={trackBg}
                      aria-label={`Reverse completions ${Math.min(reverseCount, ELITE_UNLOCK_COUNT)} of ${ELITE_UNLOCK_COUNT}`}
                    />
                    <Text fontSize="sm" mt={2} color={isDark ? 'mist.200' : 'mist.600'}>
                      {isElite
                        ? 'السابقون Elite unlocked app-wide.'
                        : reverseUnlocked
                          ? `Complete ${ELITE_UNLOCK_COUNT - reverseCount} more reverse surah(s) for Elite.`
                          : 'Unlock reverse mode first, then complete 3 surahs backwards.'}
                    </Text>
                    <Text fontSize="xs" mt={1} color={muted}>
                      Total reverse surahs completed: {reverseCount}
                    </Text>
                  </Box>
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="ghost"
            onClick={onClose}
            color={isDark ? 'whiteAlpha.700' : 'mist.600'}
            size="sm"
          >
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default AccountSettings;
