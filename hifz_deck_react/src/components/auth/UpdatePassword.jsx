import React, { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  useToast,
  Heading,
  Text,
  useColorMode,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import AppBackground from '../AppBackground';

/**
 * Standalone page for password-reset links.
 * Matches the ink/mist soft-panel look used in account modals.
 */
export default function UpdatePassword() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const toast = useToast();
  const navigate = useNavigate();
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      toast({
        title: 'Could not update password',
        description: updateError.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } else {
      toast({
        title: 'Password updated',
        description: 'You can now log in with your new password.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      navigate('/');
    }
    setLoading(false);
  };

  return (
    <Box minHeight="100vh" position="relative" display="flex" alignItems="center" justifyContent="center" px={4}>
      <AppBackground />
      <Box
        position="relative"
        zIndex={1}
        w="100%"
        maxW="420px"
        p={{ base: 5, md: 8 }}
        borderRadius="xl"
        border="1px solid"
        borderColor={isDark ? 'whiteAlpha.200' : 'mist.200'}
        bg={isDark ? 'ink.800' : 'mist.50'}
        boxShadow="panel"
      >
        <VStack spacing={4} align="stretch">
          <Heading
            as="h1"
            size="lg"
            fontFamily="heading"
            color={isDark ? 'mist.50' : 'ink.900'}
          >
            Update your password
          </Heading>
          <Text fontSize="sm" color={isDark ? 'whiteAlpha.600' : 'mist.500'}>
            Enter a new password below, then return to Hifzer to sign in.
          </Text>
          <form onSubmit={handleSubmit}>
            <VStack spacing={4} align="stretch">
              <FormControl isRequired>
                <FormLabel fontSize="sm" color={isDark ? 'mist.100' : 'ink.700'} mb={1}>
                  New password
                </FormLabel>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  isDisabled={loading}
                  bg={isDark ? 'blackAlpha.300' : 'white'}
                  borderColor={isDark ? 'whiteAlpha.300' : 'mist.300'}
                  _hover={{ borderColor: isDark ? 'whiteAlpha.400' : 'ink.300' }}
                  _focusVisible={{
                    borderColor: 'ink.400',
                    boxShadow: '0 0 0 1px var(--chakra-colors-ink-400)',
                  }}
                />
              </FormControl>
              <Button
                type="submit"
                bg="ink.600"
                color="white"
                _hover={{ bg: 'ink.700' }}
                width="full"
                isLoading={loading}
              >
                Save password
              </Button>
              {error && (
                <Text color="red.400" fontSize="sm">
                  {error}
                </Text>
              )}
            </VStack>
          </form>
        </VStack>
      </Box>
    </Box>
  );
}
