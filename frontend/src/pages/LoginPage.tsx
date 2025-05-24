import BlurBox from '@common/BlurBox';
import { Box, Center, Text, Title, useMantineTheme } from '@mantine/core';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../main';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { sessionState } from '@atoms/supabaseAtoms';
import { useRecoilValue } from 'recoil';
import { useEffect } from 'react';
import { setPageTitle } from '@utils/document-change';
import { clearUserData } from '@auth/user-manager';

export function Component() {
  setPageTitle('Login');

  const theme = useMantineTheme();
  const navigate = useNavigate();
  const session = useRecoilValue(sessionState);

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

  return (
    <>
      <Center>
        <BlurBox w={350} p='lg'>
          <Center>
            <Box w={250}>
              <Title order={5} pb={0} ta='center'>
                Sign in to continue
              </Title>
              <Auth
                supabaseClient={supabase}
                providers={['google', 'discord', 'github']}
                redirectTo={window.location.href}
                appearance={{
                  theme: ThemeSupa,
                  variables: {
                    default: {
                      colors: {
                        brand: theme.colors[theme.primaryColor][8],
                        brandAccent: theme.colors[theme.primaryColor][9],
                        messageTextDanger: theme.colors.red[6],
                      },
                      radii: {
                        borderRadiusButton: theme.radius.md,
                        buttonBorderRadius: theme.radius.md,
                        inputBorderRadius: theme.radius.md,
                      },
                      fonts: {
                        bodyFontFamily: theme.fontFamily,
                        buttonFontFamily: theme.fontFamily,
                        inputFontFamily: theme.fontFamily,
                        labelFontFamily: theme.fontFamily,
                      },
                      fontSizes: {
                        baseBodySize: theme.fontSizes.sm,
                        baseInputSize: theme.fontSizes.sm,
                        baseLabelSize: theme.fontSizes.sm,
                        baseButtonSize: theme.fontSizes.sm,
                      },
                    },
                  },
                }}
                theme='dark'
                socialLayout={'vertical'}
              />
            </Box>
          </Center>
        </BlurBox>
      </Center>
    </>
  );
}
