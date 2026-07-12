import React from 'react';
import { Button, useColorMode, useToast } from '@chakra-ui/react';
import { useAuth } from '../../context/AuthContext';

/** Shared Google OAuth button for login and signup screens. */
export default function GoogleSignInButton({ label = 'Continue with Google' }) {
  const { signInWithGoogle, loading: authLoading } = useAuth();
  const { colorMode } = useColorMode();
  const toast = useToast();
  const isDark = colorMode === 'dark';

  const handleClick = async () => {
    const { error } = await signInWithGoogle();
    if (error) {
      toast({
        title: 'Google sign-in failed',
        description:
          error.message ||
          'Google login is not enabled yet. Check Supabase Auth → Providers → Google.',
        status: 'error',
        duration: 6000,
        isClosable: true,
      });
    }
  };

  return (
    <Button
      type="button"
      width="full"
      h="48px"
      onClick={handleClick}
      isLoading={authLoading}
      bg={isDark ? 'whiteAlpha.100' : 'white'}
      color={isDark ? 'mist.50' : 'ink.800'}
      border="1px solid"
      borderColor={isDark ? 'whiteAlpha.300' : 'mist.300'}
      boxShadow="soft"
      fontWeight="600"
      _hover={{
        bg: isDark ? 'whiteAlpha.200' : 'mist.50',
        borderColor: isDark ? 'whiteAlpha.400' : 'ink.300',
        transform: 'translateY(-1px)',
      }}
      _active={{ transform: 'translateY(0)' }}
      transition="all 0.15s ease"
      leftIcon={
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
          <path
            fill="#FFC107"
            d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"
          />
          <path
            fill="#FF3D00"
            d="M6.3 14.7l6.6 4.8C14.7 16.1 19 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
          />
          <path
            fill="#4CAF50"
            d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.2C29.3 35.9 26.8 37 24 37c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
          />
          <path
            fill="#1976D2"
            d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.2-3.5 5.7-6.6 7.1l.1.1 6.3 5.2C37.3 38.3 44 33 44 24c0-1.3-.1-2.7-.4-3.5z"
          />
        </svg>
      }
    >
      {label}
    </Button>
  );
}
