import React, { useEffect, useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  Text,
  useToast,
} from '@chakra-ui/react';
import { useAuth } from '../../context/AuthContext';

/**
 * First-time prompt when a signed-in user has no public leaderboard username.
 * Common after Google OAuth (signup Edge Function never ran).
 */
export default function UsernameSetupModal({
  isOpen,
  onClose,
  onSaved,
  initialUsername = '',
}) {
  const { updateUsername, loading: authLoading } = useAuth();
  const [username, setUsername] = useState(initialUsername);
  const toast = useToast();

  useEffect(() => {
    if (isOpen) setUsername(initialUsername || '');
  }, [isOpen, initialUsername]);

  const handleSave = async () => {
    const trimmed = username.trim();
    if (trimmed.length < 3) {
      toast({
        title: 'Username too short',
        description: 'Please choose at least 3 characters.',
        status: 'warning',
        duration: 4000,
        isClosable: true,
      });
      return;
    }
    if (trimmed.includes('@')) {
      toast({
        title: 'Choose a public name',
        description: 'Usernames cannot look like an email address.',
        status: 'warning',
        duration: 4000,
        isClosable: true,
      });
      return;
    }

    const { error } = await updateUsername(trimmed);
    if (error) {
      toast({
        title: 'Could not save username',
        description: error.message || 'Please try a different name.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    toast({
      title: 'Username saved',
      description: `You'll appear on the leaderboard as ${trimmed}.`,
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
    onSaved?.(trimmed);
    onClose?.();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      isCentered
      closeOnOverlayClick={false}
      closeOnEsc={false}
    >
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Choose a username</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Text fontSize="sm" color="gray.500" mb={4}>
            Pick a public name for the leaderboard. This is shown instead of your email.
          </Text>
          <FormControl isRequired>
            <FormLabel>Username</FormLabel>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="At least 3 characters"
              autoFocus
              isDisabled={authLoading}
            />
          </FormControl>
        </ModalBody>
        <ModalFooter>
          <Button colorScheme="teal" onClick={handleSave} isLoading={authLoading}>
            Save username
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

/** True when the profile name is missing or not safe to show publicly. */
export function needsPublicUsername(username) {
  if (!username || typeof username !== 'string') return true;
  const trimmed = username.trim();
  if (trimmed.length < 3) return true;
  if (trimmed.includes('@')) return true;
  return false;
}
