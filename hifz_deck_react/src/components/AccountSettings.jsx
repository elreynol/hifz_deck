import React, { useState } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter,
  Button, Tabs, TabList, Tab, TabPanels, TabPanel, Box, Text, Heading,
  FormControl, FormLabel, Input, VStack, useToast, Badge, Progress, HStack
} from '@chakra-ui/react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import BadgeShelf from './BadgeShelf';

const REVERSE_UNLOCK_COUNT = 10;
const ELITE_UNLOCK_COUNT = 3;

const AccountSettings = ({
  isOpen,
  onClose,
  forwardCount = 0,
  reverseCount = 0,
  isElite = false,
  earnedBadgeIds = [],
  currentStreak = 0,
  uniqueForwardSurahs = 0,
}) => {
  const { user, session, updateUsername, updateUserPassword } = useAuth();
  const toast = useToast();

  const [newUsernameInput, setNewUsernameInput] = useState('');
  const [isUpdatingUsername, setIsUpdatingUsername] = useState(false);
  const [currentProfileUsername, setCurrentProfileUsername] = useState('Loading...');

  const [newPassword, setNewPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const reverseUnlocked = forwardCount >= REVERSE_UNLOCK_COUNT;

  const handleUpdateUsername = async () => {
    if (!session || !session.access_token) {
      toast({ title: 'Error', description: 'You must be logged in.', status: 'error', duration: 3000, isClosable: true });
      return;
    }
    if (newUsernameInput.trim().length < 3) {
      toast({ title: 'Validation Error', description: 'New username must be at least 3 characters.', status: 'warning', duration: 3000, isClosable: true });
      return;
    }

    setIsUpdatingUsername(true);

    try {
      const { data, error } = await updateUsername(newUsernameInput.trim());

      if (error) {
          throw error;
      }
      
      toast({
        title: 'Success',
        description: `Username updated to ${newUsernameInput.trim()}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      setCurrentProfileUsername(newUsernameInput.trim());
      setNewUsernameInput('');
    } catch (error) {
      toast({
        title: 'Update Failed',
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
        title: 'Validation Error',
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
        title: 'Update Failed',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } else {
      toast({
        title: 'Success!',
        description: 'Your password has been updated.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      setNewPassword('');
    }
    
    setIsUpdatingPassword(false);
  };

  // When the modal opens, fetch the current username from the 'profiles' table.
  React.useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;

      setIsUpdatingUsername(true); // Use same loading state for initial fetch
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
        console.error("Error fetching profile:", error);
        setCurrentProfileUsername('Could not load');
        toast({
          title: 'Error',
          description: 'Could not fetch your profile data.',
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
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Account Settings</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <Tabs variant="enclosed-colored">
            <TabList>
              <Tab>Profile</Tab>
              <Tab>Security</Tab>
              <Tab>My Progress</Tab>
            </TabList>
            <TabPanels>
              <TabPanel>
                <Heading size="md" mb={4}>Profile Information</Heading>
                <Text mb={2}><strong>Email:</strong> {user.email}</Text>
                <Text mb={4}><strong>Current Username:</strong> {currentProfileUsername}</Text>
                
                <Box mt={6} pt={4} borderTopWidth={1} borderColor="gray.200">
                  <Heading size="sm" mb={3}>Change Username</Heading>
                  <VStack spacing={3} align="stretch">
                    <FormControl>
                      <FormLabel htmlFor="acct-new-username">New Username</FormLabel>
                      <Input
                        id="acct-new-username"
                        placeholder="Enter new username (min 3 chars)"
                        value={newUsernameInput}
                        onChange={(e) => setNewUsernameInput(e.target.value)}
                        isDisabled={isUpdatingUsername}
                      />
                    </FormControl>
                    <Button 
                      colorScheme="purple" 
                      onClick={handleUpdateUsername} 
                      isLoading={isUpdatingUsername}
                      alignSelf="flex-start"
                    >
                      Update Username
                    </Button>
                  </VStack>
                </Box>
                
                <Text mt={4} mb={4}><strong>Avatar:</strong> {/* Placeholder */}</Text>
              </TabPanel>
              <TabPanel>
                <Heading size="md" mb={4}>Security Settings</Heading>
                <VStack spacing={4}>
                  <FormControl>
                    <FormLabel>New Password</FormLabel>
                    <Input
                      type="password"
                      placeholder="Enter a new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      isDisabled={isUpdatingPassword}
                    />
                  </FormControl>
                  <Button
                    colorScheme="blue"
                    onClick={handleUpdatePassword}
                    isLoading={isUpdatingPassword}
                    loadingText="Updating..."
                    w="100%"
                  >
                    Update Password
                  </Button>
                </VStack>
              </TabPanel>
              <TabPanel>
                <Heading size="md" mb={4}>My Hifz Progress</Heading>

                <Box mb={6}>
                  <BadgeShelf
                    earnedIds={earnedBadgeIds}
                    currentStreak={currentStreak}
                    uniqueForwardSurahs={uniqueForwardSurahs}
                  />
                </Box>

                {isElite && (
                  <Box
                    mb={6}
                    p={4}
                    borderRadius="md"
                    bg="elite.50"
                    borderWidth="1px"
                    borderColor="elite.300"
                    textAlign="center"
                  >
                    <Badge
                      colorScheme="yellow"
                      fontSize="md"
                      px={3}
                      py={1}
                      mb={2}
                      bg="elite.500"
                      color="white"
                    >
                      السابقون
                    </Badge>
                    <Text fontSize="sm" color="elite.700">
                      Elite status — you have mastered the reverse path.
                    </Text>
                  </Box>
                )}

                <VStack spacing={5} align="stretch">
                  <Box>
                    <HStack justify="space-between" mb={1}>
                      <Text fontWeight="medium">Forward completions</Text>
                      <Text fontSize="sm" color="gray.500">
                        {Math.min(forwardCount, REVERSE_UNLOCK_COUNT)} / {REVERSE_UNLOCK_COUNT}
                      </Text>
                    </HStack>
                    <Progress
                      value={(Math.min(forwardCount, REVERSE_UNLOCK_COUNT) / REVERSE_UNLOCK_COUNT) * 100}
                      size="sm"
                      colorScheme={reverseUnlocked ? 'green' : 'blue'}
                      borderRadius="full"
                    />
                    <Text fontSize="sm" mt={2} color="gray.600">
                      {reverseUnlocked
                        ? 'السابقون reverse path unlocked.'
                        : `Complete ${REVERSE_UNLOCK_COUNT - forwardCount} more surah(s) to unlock السابقون (reverse).`}
                    </Text>
                    <Text fontSize="xs" mt={1} color="gray.500">
                      Total forward surahs completed: {forwardCount}
                    </Text>
                  </Box>

                  <Box>
                    <HStack justify="space-between" mb={1}>
                      <Text fontWeight="medium">Reverse completions</Text>
                      <Text fontSize="sm" color="gray.500">
                        {Math.min(reverseCount, ELITE_UNLOCK_COUNT)} / {ELITE_UNLOCK_COUNT}
                      </Text>
                    </HStack>
                    <Progress
                      value={(Math.min(reverseCount, ELITE_UNLOCK_COUNT) / ELITE_UNLOCK_COUNT) * 100}
                      size="sm"
                      colorScheme={isElite ? 'yellow' : 'orange'}
                      borderRadius="full"
                    />
                    <Text fontSize="sm" mt={2} color="gray.600">
                      {isElite
                        ? 'السابقون Elite unlocked app-wide.'
                        : reverseUnlocked
                          ? `Complete ${ELITE_UNLOCK_COUNT - reverseCount} more reverse surah(s) for Elite.`
                          : 'Unlock reverse mode first, then complete 3 surahs backwards.'}
                    </Text>
                    <Text fontSize="xs" mt={1} color="gray.500">
                      Total reverse surahs completed: {reverseCount}
                    </Text>
                  </Box>
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose}>Close</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default AccountSettings;
