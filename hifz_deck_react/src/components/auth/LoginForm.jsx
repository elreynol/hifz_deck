import React, { useState } from 'react'
import {
  Button,
  Divider,
  Flex,
  FormControl,
  FormLabel,
  Input,
  Text,
  VStack,
  useColorMode,
  useToast,
} from '@chakra-ui/react'
import { useAuth } from '../../context/AuthContext'
import GoogleSignInButton from './GoogleSignInButton'

export default function LoginForm() {
  const { login, sendPasswordResetEmail, loading: authLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const toast = useToast()
  const { colorMode } = useColorMode()
  const isDark = colorMode === 'dark'
  const muted = isDark ? 'whiteAlpha.600' : 'mist.500'
  const labelColor = isDark ? 'mist.100' : 'ink.700'

  const handleSubmit = async (e) => {
    e.preventDefault()

    const { data, error } = await login(email, password)

    if (error) {
      toast({
        title: 'Login failed',
        description: error.message || 'An unexpected error occurred.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    } else if (data && data.user && data.session) {
      toast({
        title: 'Welcome back',
        description: 'You are now logged in.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })
    } else {
      toast({
        title: 'Login attempted',
        description: 'Please check your credentials or try again.',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      })
    }
  }

  const handleForgotPassword = async () => {
    const resetEmail = window.prompt('Enter your email to reset your password:')
    if (!resetEmail) return
    const { error } = await sendPasswordResetEmail(resetEmail)
    if (error) {
      toast({
        title: 'Could not send reset email',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    } else {
      toast({
        title: 'Check your inbox',
        description: 'We sent a password reset link.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      })
    }
  }

  return (
    <VStack spacing={5} align="stretch" w="100%">
      <GoogleSignInButton />

      <Flex align="center" gap={3}>
        <Divider borderColor={isDark ? 'whiteAlpha.300' : 'mist.200'} />
        <Text fontSize="xs" color={muted} whiteSpace="nowrap" fontWeight="500">
          or email
        </Text>
        <Divider borderColor={isDark ? 'whiteAlpha.300' : 'mist.200'} />
      </Flex>

      <form onSubmit={handleSubmit}>
        <VStack spacing={3.5} align="stretch">
          <FormControl isRequired>
            <FormLabel fontSize="sm" color={labelColor} mb={1}>
              Email
            </FormLabel>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              isDisabled={authLoading}
              bg={isDark ? 'blackAlpha.300' : 'white'}
              borderColor={isDark ? 'whiteAlpha.300' : 'mist.300'}
              _hover={{ borderColor: isDark ? 'whiteAlpha.400' : 'ink.300' }}
              _focusVisible={{ borderColor: 'ink.400', boxShadow: '0 0 0 1px var(--chakra-colors-ink-400)' }}
            />
          </FormControl>
          <FormControl isRequired>
            <FormLabel fontSize="sm" color={labelColor} mb={1}>
              Password
            </FormLabel>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              isDisabled={authLoading}
              bg={isDark ? 'blackAlpha.300' : 'white'}
              borderColor={isDark ? 'whiteAlpha.300' : 'mist.300'}
              _hover={{ borderColor: isDark ? 'whiteAlpha.400' : 'ink.300' }}
              _focusVisible={{ borderColor: 'ink.400', boxShadow: '0 0 0 1px var(--chakra-colors-ink-400)' }}
            />
          </FormControl>
          <Button
            type="submit"
            bg="ink.600"
            color="white"
            width="full"
            h="44px"
            isLoading={authLoading}
            _hover={{ bg: 'ink.700' }}
          >
            Log in
          </Button>
          <Button
            variant="link"
            size="sm"
            color={muted}
            onClick={handleForgotPassword}
            alignSelf="center"
          >
            Forgot password?
          </Button>
        </VStack>
      </form>
    </VStack>
  )
}
