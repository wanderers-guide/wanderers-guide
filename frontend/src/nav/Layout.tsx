import { sessionState } from '@atoms/supabaseAtoms';
import classes from '@css/Layout.module.css';
import {
  AppShell,
  Avatar,
  Box,
  Burger,
  Divider,
  Group,
  Menu,
  ScrollArea,
  Stack,
  Text,
  UnstyledButton,
  rem,
  useMantineTheme,
} from '@mantine/core';
import { useDisclosure, useMediaQuery, useViewportSize } from '@mantine/hooks';
import {
  IconAsset,
  IconChevronDown,
  IconFlag,
  IconLayersIntersect,
  IconLogout,
  IconSettings,
  IconSwords,
  IconUsers,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecoilValue } from 'recoil';
import { supabase } from '../main';
import { LoginButton } from './LoginButton';
import { SearchBar } from './Searchbar';
import WanderersGuideLogo from './WanderersGuideLogo';
import { getCachedPublicUser, getPublicUser } from '@auth/user-manager';
import { PublicUser } from '@typing/content';
import { useQueryClient } from '@tanstack/react-query';
import { phoneQuery } from '@utils/mobile-responsive';
import { DISCORD_URL, LEGACY_URL, PATREON_URL } from '@constants/urls';

export default function Layout(props: { children: React.ReactNode }) {
  const theme = useMantineTheme();
  const isPhone = useMediaQuery(phoneQuery());
  const [opened, { toggle, close }] = useDisclosure();
  const navigate = useNavigate();
  const session = useRecoilValue(sessionState);
  const queryClient = useQueryClient();

  const [user, setUser] = useState<PublicUser | null>(getCachedPublicUser());
  //const [userIcon, setUserIcon] = useRecoilState(userIconState);
  const [userMenuOpened, setUserMenuOpened] = useState(false);

  const { width } = useViewportSize();

  useEffect(() => {
    if (!session) return;
    //if (userIcon) return;
    // getIcon(session.user.id).then((svg) => {
    //   setUserIcon(svg);
    // });
    getPublicUser().then((user) => {
      if (user) {
        setUser(user);
      }
    });
  }, [session]);

  // Scroll to hide header,
  const [pinned, setPinned] = useState(true);
  const SCROLL_PINNED_THRESHOLD = 20;

  return (
    <AppShell
      header={{ height: 50, collapsed: !pinned, offset: opened }}
      navbar={{
        width: 300,
        breakpoint: 'md',
        collapsed: { desktop: true, mobile: !opened },
      }}
      padding='md'
    >
      <AppShell.Header
        h={50}
        zIndex={98}
        style={{
          border: `0px solid`,
          borderRadius: 0,
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          // Add alpha channel to hex color (browser support: https://caniuse.com/css-rrggbbaa)
          backgroundColor: theme.colors.dark[8] + 'CC',
        }}
      >
        <Group h='100%' px='md' wrap='nowrap'>
          <Burger opened={opened} onClick={toggle} hiddenFrom='md' size='sm' />
          <Group style={{ flex: 1 }}>
            <WanderersGuideLogo size={30} />
            <Group gap={0} style={{ flex: 1 }} visibleFrom='md' justify='space-between' wrap='nowrap'>
              {width >= 1050 ? (
                <Group gap={0} wrap='nowrap'>
                  <UnstyledButton
                    component='a'
                    href={DISCORD_URL}
                    className={classes.control}
                    onClick={() => {
                      window.location.href = DISCORD_URL;
                    }}
                  >
                    Community
                  </UnstyledButton>
                  <UnstyledButton
                    component='a'
                    href={PATREON_URL}
                    className={classes.control}
                    onClick={() => {
                      window.location.href = PATREON_URL;
                    }}
                  >
                    Support
                  </UnstyledButton>
                  <UnstyledButton
                    component='a'
                    href={LEGACY_URL}
                    className={classes.control}
                    onClick={() => {
                      window.location.href = LEGACY_URL;
                    }}
                  >
                    Legacy Site
                  </UnstyledButton>
                </Group>
              ) : (
                <Box></Box>
              )}
              <Group>
                <SearchBar />

                {!session ? (
                  <LoginButton
                    onClick={() => {
                      navigate('/characters');
                    }}
                  />
                ) : (
                  <Menu
                    width={160}
                    position='bottom-end'
                    transitionProps={{ transition: 'pop-top-right' }}
                    onClose={() => setUserMenuOpened(false)}
                    onOpen={() => setUserMenuOpened(true)}
                    withinPortal
                  >
                    <Menu.Target>
                      <UnstyledButton
                        py={1}
                        pr='xs'
                        w={160}
                        style={{
                          borderTopLeftRadius: theme.radius.xl,
                          borderBottomLeftRadius: theme.radius.xl,
                          borderTopRightRadius: theme.radius.md,
                          borderBottomRightRadius: theme.radius.md,
                          backgroundColor: userMenuOpened ? '#14151750' : undefined,
                        }}
                      >
                        <Group gap={7} wrap='nowrap' justify='space-between'>
                          <Group gap={7} wrap='nowrap'>
                            <Avatar
                              src={
                                user
                                  ? user?.image_url
                                    ? user.image_url
                                    : // : userIcon
                                      //   ? `data:image/svg+xml;utf8,${encodeURIComponent(userIcon)}`
                                      undefined
                                  : undefined
                              }
                              alt={'Account Dropdown'}
                              radius='xl'
                              size={30}
                            />
                            <Text fw={500} size='sm' c='gray.4' lh={1} mr={3} truncate>
                              {user?.display_name || 'Account'}
                            </Text>
                          </Group>
                          <IconChevronDown style={{ width: rem(12), height: rem(12) }} stroke={1.5} />
                        </Group>
                      </UnstyledButton>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Item
                        leftSection={
                          <IconUsers
                            style={{ width: rem(16), height: rem(16) }}
                            color={theme.colors.blue[5]}
                            stroke={1.5}
                          />
                        }
                        component='a'
                        href='/characters'
                        onClick={(e) => {
                          e.preventDefault();
                          navigate('/characters');
                        }}
                      >
                        Characters
                      </Menu.Item>
                      <Menu.Item
                        leftSection={
                          <IconAsset
                            style={{ width: rem(16), height: rem(16) }}
                            color={theme.colors.yellow[6]}
                            stroke={1.5}
                          />
                        }
                        component='a'
                        href='/homebrew'
                        onClick={(e) => {
                          e.preventDefault();
                          navigate('/homebrew');
                        }}
                      >
                        Homebrew
                      </Menu.Item>
                      <Menu.Item
                        leftSection={
                          <IconFlag
                            style={{ width: rem(16), height: rem(16) }}
                            color={theme.colors.violet[4]}
                            stroke={1.5}
                          />
                        }
                        component='a'
                        href='/campaigns'
                        onClick={(e) => {
                          e.preventDefault();
                          navigate('/campaigns');
                        }}
                      >
                        Campaigns
                      </Menu.Item>
                      <Menu.Item
                        leftSection={
                          <IconSwords
                            style={{ width: rem(16), height: rem(16) }}
                            color={theme.colors.teal[6]}
                            stroke={1.5}
                          />
                        }
                        component='a'
                        href='/encounters'
                        onClick={(e) => {
                          e.preventDefault();
                          navigate('/encounters');
                        }}
                      >
                        Encounters
                      </Menu.Item>

                      {user?.is_admin && (
                        <Menu.Item
                          leftSection={
                            <IconLayersIntersect
                              style={{ width: rem(16), height: rem(16) }}
                              color={theme.colors.pink[6]}
                              stroke={1.5}
                            />
                          }
                          component='a'
                          href='/admin'
                          onClick={(e) => {
                            e.preventDefault();
                            navigate('/admin');
                          }}
                        >
                          Admin Panel
                        </Menu.Item>
                      )}

                      <Menu.Label>Settings</Menu.Label>
                      <Menu.Item
                        leftSection={<IconSettings style={{ width: rem(16), height: rem(16) }} stroke={1.5} />}
                        component='a'
                        href='/account'
                        onClick={(e) => {
                          e.preventDefault();
                          navigate('/account');
                        }}
                      >
                        Account
                      </Menu.Item>
                      <Menu.Item
                        leftSection={<IconLogout style={{ width: rem(16), height: rem(16) }} stroke={1.5} />}
                        onClick={async () => {
                          supabase.auth.signOut();
                          localStorage.clear();
                          queryClient.clear();
                        }}
                      >
                        Logout
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                )}
              </Group>
            </Group>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar
        py='md'
        px={4}
        style={{
          border: `0px solid`,
          borderRadius: 0,
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          // Add alpha channel to hex color (browser support: https://caniuse.com/css-rrggbbaa)
          backgroundColor: theme.colors.dark[8] + 'CC',
        }}
      >
        {session ? (
          <Stack gap={5}>
            <SearchBar />
            <UnstyledButton
              className={classes.control}
              component='a'
              href='/characters'
              onClick={(e) => {
                e.preventDefault();
                navigate('/characters');
                close();
              }}
            >
              Characters
            </UnstyledButton>
            <UnstyledButton
              className={classes.control}
              component='a'
              href='/homebrew'
              onClick={(e) => {
                e.preventDefault();
                navigate('/homebrew');
                close();
              }}
            >
              Homebrew
            </UnstyledButton>
            <UnstyledButton
              className={classes.control}
              component='a'
              href='/campaigns'
              onClick={(e) => {
                e.preventDefault();
                navigate('/campaigns');
                close();
              }}
            >
              Campaigns
            </UnstyledButton>
            <UnstyledButton
              className={classes.control}
              component='a'
              href='/encounters'
              onClick={(e) => {
                e.preventDefault();
                navigate('/encounters');
                close();
              }}
            >
              Encounters
            </UnstyledButton>

            {user?.is_admin && (
              <UnstyledButton
                className={classes.control}
                component='a'
                href='/admin'
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/admin');
                  close();
                }}
              >
                Admin Panel
              </UnstyledButton>
            )}
            <Divider />
            <UnstyledButton
              className={classes.control}
              component='a'
              href={DISCORD_URL}
              onClick={() => {
                window.location.href = DISCORD_URL;
              }}
            >
              Community
            </UnstyledButton>
            <UnstyledButton
              className={classes.control}
              component='a'
              href={PATREON_URL}
              onClick={() => {
                window.location.href = PATREON_URL;
              }}
            >
              Support
            </UnstyledButton>
            <UnstyledButton
              className={classes.control}
              component='a'
              href={LEGACY_URL}
              onClick={() => {
                window.location.href = LEGACY_URL;
              }}
            >
              Legacy Site
            </UnstyledButton>
            <Divider />
            <UnstyledButton
              className={classes.control}
              component='a'
              href='/account'
              onClick={(e) => {
                e.preventDefault();
                navigate('/account');
                close();
              }}
            >
              Account
            </UnstyledButton>
            <UnstyledButton
              className={classes.control}
              onClick={async () => {
                supabase.auth.signOut();
                localStorage.clear();
                queryClient.clear();
                close();
              }}
            >
              Logout
            </UnstyledButton>
          </Stack>
        ) : (
          <Stack gap={5}>
            <SearchBar />
            <UnstyledButton
              className={classes.control}
              onClick={async () => {
                navigate('/login');
                close();
              }}
            >
              Sign in / Register
            </UnstyledButton>
            <Divider />
            <UnstyledButton
              className={classes.control}
              component='a'
              href={DISCORD_URL}
              onClick={() => {
                window.location.href = DISCORD_URL;
              }}
            >
              Community
            </UnstyledButton>
            <UnstyledButton
              className={classes.control}
              component='a'
              href={PATREON_URL}
              onClick={() => {
                window.location.href = PATREON_URL;
              }}
            >
              Support
            </UnstyledButton>
            <UnstyledButton
              className={classes.control}
              component='a'
              href={LEGACY_URL}
              onClick={() => {
                window.location.href = LEGACY_URL;
              }}
            >
              Legacy Site
            </UnstyledButton>
          </Stack>
        )}
      </AppShell.Navbar>

      <ScrollArea
        h={'100dvh'}
        type={isPhone ? 'never' : 'auto'}
        scrollbars='y'
        onScrollPositionChange={(pos) => {
          if (pos.y > SCROLL_PINNED_THRESHOLD) {
            setPinned(false);
          } else {
            setPinned(true);
          }
        }}
      >
        <AppShell.Main pt={`calc(${rem(52)} + var(--mantine-spacing-md))`}>{props.children}</AppShell.Main>
      </ScrollArea>
    </AppShell>
  );
}
