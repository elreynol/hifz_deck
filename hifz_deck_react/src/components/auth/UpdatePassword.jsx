import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  useToast,
  Heading,
  Text
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';

export default function UpdatePassword() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const toast = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      toast({
        title: 'Error updating password',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } else {
      toast({
        title: 'Password updated successfully!',
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
    <Box p={8} maxWidth="500px" borderWidth={1} borderRadius={8} boxShadow="lg" mx="auto" mt={20}>
      <VStack spacing={4}>
        <Heading>Update Your Password</Heading>
        <Text>Enter a new password below.</Text>
        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          <VStack spacing={4}>
            <FormControl isRequired>
              <FormLabel>New Password</FormLabel>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your new password"
                isDisabled={loading}
              />
            </FormControl>
            <Button type="submit" colorScheme="blue" width="full" isLoading={loading}>
              Update Password
            </Button>
            {error && <Text color="red.500">{error}</Text>}
          </VStack>
        </form>
      </VStack>
    </Box>
  );
} 