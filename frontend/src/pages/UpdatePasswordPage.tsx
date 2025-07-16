import BlurBox from '@common/BlurBox';
import { Box, Text, Button, Center, PasswordInput, Stack } from '@mantine/core';
import { useState } from 'react';
import { setPageTitle } from '@utils/document-change';
import { supabase } from '../main';
import { useNavigate } from 'react-router-dom';

export function Component() {
  setPageTitle('Update Password');

  const navigate = useNavigate();

  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');

  const resetPasswordSection = () => {
    return (
      <Stack>
        <Stack gap={10}>
          <Stack gap={0}>
            <PasswordInput
              label='Password'
              placeholder='Your password'
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
            />
            <PasswordInput
              label='Confirm Password'
              placeholder='Confirm your password'
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.currentTarget.value)}
            />
          </Stack>
          <Button
            color='dark'
            onClick={async () => {
              if (password !== passwordConfirm) {
                setError('Passwords do not match.');
                return;
              }
              if (password.length < 8) {
                setError('Password must be at least 8 characters long.');
                return;
              }
              setError(null);
              // Update the user's password
              await supabase.auth.updateUser({ password });
              navigate('/');
            }}
          >
            Update Password
          </Button>
          {error && (
            <Text c='red' ta='center' size='sm'>
              {error}
            </Text>
          )}
        </Stack>
      </Stack>
    );
  };

  return (
    <>
      <Center>
        <BlurBox w={350} p='lg'>
          <Center>
            <Box w={250}>{resetPasswordSection()}</Box>
          </Center>
        </BlurBox>
      </Center>
    </>
  );
}
