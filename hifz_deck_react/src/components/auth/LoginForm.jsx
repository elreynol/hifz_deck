import React, { useState } from 'react'
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  useToast,
} from '@chakra-ui/react'
import { useAuth } from '../../context/AuthContext'

export default function LoginForm() {
  const { login, sendPasswordResetEmail, loading: authLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const toast = useToast()

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const { data, error } = await login(email, password)

    if (error) {
      toast({
        title: 'Login Failed',
        description: error.message || 'An unexpected error occurred.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    } else if (data && data.user && data.session) {
      toast({
        title: 'Login Successful!',
        description: 'You are now logged in.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })
    } else {
      toast({
        title: 'Login Attempted',
        description: 'Please check your credentials or try again.',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      })
    }
  }

  const handleForgotPassword = async () => {
    const email = prompt("Please enter your email address to reset your password:");
    if (email) {
      const { data, error } = await sendPasswordResetEmail(email);
      if (error) {
        toast({
          title: 'Error sending reset email',
          description: error.message,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'Password reset email sent',
          description: 'Please check your inbox for a password reset link.',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      }
    }
  };

  return (
    <Box p={8} maxWidth="500px" borderWidth={1} borderRadius={8} boxShadow="lg">
      <form onSubmit={handleSubmit}>
        <VStack spacing={4}>
          <FormControl isRequired>
            <FormLabel>Email</FormLabel>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              isDisabled={authLoading}
            />
          </FormControl>
          <FormControl isRequired>
            <FormLabel>Password</FormLabel>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              isDisabled={authLoading}
            />
          </FormControl>
          <Button type="submit" colorScheme="blue" width="full" isLoading={authLoading}>
            Login
          </Button>
          <Button variant="link" size="sm" onClick={handleForgotPassword}>
            Forgot your password?
          </Button>
        </VStack>
      </form>
    </Box>
  )
} 