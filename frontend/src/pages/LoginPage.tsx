import BlurBox from '@common/BlurBox';
import {
  Box,
  Image,
  Button,
  Center,
  Stack,
  Title,
  useMantineTheme,
  Divider,
  TextInput,
  Anchor,
  Text,
  PasswordInput,
} from '@mantine/core';
import GoogleIcon from '../assets/images/google-icon.png';
import DicordIcon from '../assets/images/discord-icon.png';
import GitHubIcon from '../assets/images/github-icon.png';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { sessionState } from '@atoms/supabaseAtoms';
import { useRecoilState, useRecoilValue } from 'recoil';
import { useEffect, useState } from 'react';
import { setPageTitle } from '@utils/document-change';
import { clearUserData } from '@auth/user-manager';
import { IconMail } from '@tabler/icons-react';
import { supabase } from '../main';
import { set } from 'node_modules/cypress/types/lodash';

export function Component() {
  setPageTitle('Login');

  const theme = useMantineTheme();
  const navigate = useNavigate();
  const [session, setSession] = useRecoilState(sessionState);

  const [searchParams] = useSearchParams();
  useEffect(() => {
    if (!session) return;
    const redirect = searchParams.get('redirect');
    if (redirect) {
      navigate(`/${redirect}`);
    } else {
      navigate('/');
    }
  }, [session]);

  useEffect(() => {
    clearUserData();
  }, []);

  const [pageType, _setPageType] = useState<'signin' | 'register' | 'forgot-password'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const changePageType = (type: 'signin' | 'register' | 'forgot-password') => {
    setError(null);
    setMessage(null);
    setEmail('');
    setPassword('');
    setPasswordConfirm('');
    _setPageType(type);
  };

  const signinSection = () => {
    return (
      <Stack>
        <Title order={5} pb={0} ta='center' c='gray'>
          Sign in to continue
        </Title>
        <Stack gap={10}>
          <Button
            color='dark'
            leftSection={<Image radius='md' h={20} src={GoogleIcon} alt='Google Icon' />}
            onClick={() =>
              supabase.auth.signInWithOAuth({
                provider: 'google',
              })
            }
          >
            Sign in with Google
          </Button>
          <Button
            color='dark'
            leftSection={<Image radius='md' h={15} src={DicordIcon} alt='Dicord Icon' />}
            onClick={() =>
              supabase.auth.signInWithOAuth({
                provider: 'discord',
              })
            }
          >
            Sign in with Discord
          </Button>
          <Button
            color='dark'
            leftSection={<Image radius='md' h={20} src={GitHubIcon} alt='GitHub Icon' />}
            onClick={() =>
              supabase.auth.signInWithOAuth({
                provider: 'github',
              })
            }
          >
            Sign in with GitHub
          </Button>
        </Stack>
        <Divider color='gray.7' />
        <Stack gap={10}>
          <Stack gap={0}>
            <TextInput
              label='Email address'
              placeholder='Your email address'
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
            />
            <PasswordInput
              label='Password'
              placeholder='Your password'
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
            />
          </Stack>
          <Button
            color='dark'
            leftSection={<IconMail size={20} color='#6e7173' />}
            onClick={async () => {
              if (!email || !password) {
                setError('Email and password are required.');
                return;
              }
              if (password.length < 8) {
                setError('Password must be at least 8 characters long.');
                return;
              }
              if (!email.includes('@')) {
                setError('Please enter a valid email address.');
                return;
              }

              // Attempt to sign in the user
              const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
              });

              if (error) {
                if (error.code === 'invalid_credentials') {
                  setError('Invalid email or password. Please try again.');
                } else if (error.code === 'user_not_found') {
                  setError('No user found with this email. Please register.');
                } else {
                  setError(error.message);
                }
              } else {
                setError(null);
              }

              if (data.user) {
                // Will automatically update and redirect
                console.log('Sign in data:', data);
                setEmail('');
                setPassword('');
              }
            }}
          >
            Sign in with Email
          </Button>
          {error && (
            <Text c='red' ta='center' size='sm'>
              {error}
            </Text>
          )}
          {message && (
            <Text c='blue' ta='center' size='sm'>
              {message}
            </Text>
          )}
          <Anchor underline='always' onClick={() => changePageType('forgot-password')} c='gray.6' ta='center' size='sm'>
            Forgot your password?
          </Anchor>
          <Anchor underline='always' onClick={() => changePageType('register')} c='gray.6' ta='center' size='sm'>
            Don't have an account? Sign up
          </Anchor>
        </Stack>
      </Stack>
    );
  };

  const registerSection = () => {
    return (
      <Stack>
        <Stack gap={10}>
          <Stack gap={0}>
            <TextInput
              label='Email address'
              placeholder='Your email address'
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
            />
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
              if (!email || !password) {
                setError('Email and password are required.');
                return;
              }
              if (password.length < 6) {
                setError('Password must be at least 6 characters long.');
                return;
              }
              if (!email.includes('@')) {
                setError('Please enter a valid email address.');
                return;
              }
              if (password !== passwordConfirm) {
                setError('Passwords do not match.');
                return;
              }

              // Attempt to register the user
              const { data, error } = await supabase.auth.signUp({
                email,
                password,
              });

              if (error) {
                if (error.code === 'email_exists') {
                  setError('An account with this email already exists. Please sign in.');
                } else {
                  setError(error.message);
                }
              } else {
                setError(null);
              }

              console.log('Register in data:', data);

              if (data.user) {
                if (!data.user.user_metadata.email_verified) {
                  setMessage('A verification email has been sent to your email address. Please check your inbox.');
                  setEmail('');
                  setPassword('');
                  setPasswordConfirm('');
                }
              }
            }}
          >
            Register
          </Button>
          {error && (
            <Text c='red' ta='center' size='sm'>
              {error}
            </Text>
          )}
          {message && (
            <Text c='blue' ta='center' size='sm'>
              {message}
            </Text>
          )}
          <Anchor underline='always' onClick={() => changePageType('signin')} c='gray.6' ta='center' size='sm'>
            Already have an account? Sign in
          </Anchor>
        </Stack>
      </Stack>
    );
  };

  const forgotPasswordSection = () => {
    return (
      <Stack>
        <Stack gap={10}>
          <Stack gap={0}>
            <TextInput
              label='Email address'
              placeholder='Your email address'
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
            />
          </Stack>
          <Button
            color='dark'
            onClick={async () => {
              if (!email) {
                setError('Email is required.');
                return;
              }
              if (!email.includes('@')) {
                setError('Please enter a valid email address.');
                return;
              }

              // Attempt to send a password reset email
              const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/update-password`,
              });

              if (error) {
                setError(error.message);
              } else {
                setError(null);
              }

              setEmail('');
              setMessage('A password reset email has been sent. Please check your inbox.');
            }}
          >
            Send Reset Email
          </Button>
          {error && (
            <Text c='red' ta='center' size='sm'>
              {error}
            </Text>
          )}
          {message && (
            <Text c='blue' ta='center' size='sm'>
              {message}
            </Text>
          )}
          <Anchor underline='always' onClick={() => changePageType('signin')} c='gray.6' ta='center' size='sm'>
            Know your password? Sign in
          </Anchor>
        </Stack>
      </Stack>
    );
  };

  return (
    <>
      <Center>
        <BlurBox w={350} p='lg'>
          <Center>
            <Box w={250}>
              {pageType === 'signin' && signinSection()}
              {pageType === 'register' && registerSection()}
              {pageType === 'forgot-password' && forgotPasswordSection()}
            </Box>
          </Center>
        </BlurBox>
      </Center>
    </>
  );
}
