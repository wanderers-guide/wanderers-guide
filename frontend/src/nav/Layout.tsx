import { useDisclosure, useHeadroom } from "@mantine/hooks";
import {
  AppShell,
  Avatar,
  Box,
  Burger,
  Button,
  Group,
  Menu,
  UnstyledButton,
  Text,
  rem,
  useMantineTheme,
} from "@mantine/core";
import classes from '@css/Layout.module.css';
import WanderersGuideLogo from "./WanderersGuideLogo";
import { SearchBar } from "./Searchbar";
import { useNavigate } from "react-router-dom";
import { sessionState } from "@atoms/supabaseAtoms";
import { useRecoilState, useRecoilValue } from "recoil";
import { IconChevronDown, IconHeart, IconStar, IconMessage, IconSettings, IconSwitchHorizontal, IconLogout, IconPlayerPause, IconTrash, IconCategory } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { getIcon } from "@utils/images";
import { userIconState } from "@atoms/navAtoms";
import { supabase } from "../main";

export default function Layout(props: { children: React.ReactNode }) {
  const theme = useMantineTheme();
  const pinned = useHeadroom({ fixedAt: 120 });
  const [opened, { toggle }] = useDisclosure();
  const navigate = useNavigate();
  const session = useRecoilValue(sessionState);

  const [userIcon, setUserIcon] = useRecoilState(userIconState);
  const [userMenuOpened, setUserMenuOpened] = useState(false);
  
  useEffect(() => {
    if (!session) return;
    if (userIcon) return;
    getIcon(session.user.id).then((svg) => {
      setUserIcon(svg);
    });
  }, [session]);

  return (
    <AppShell
      header={{ height: 50, collapsed: !pinned, offset: opened }}
      navbar={{
        width: 300,
        breakpoint: "md",
        collapsed: { desktop: true, mobile: !opened },
      }}
      padding="md"
    >
      <AppShell.Header
        h={50}
        style={{
          border: `0px solid`,
          borderRadius: 0,
          backdropFilter: "blur(8px)",
          // Add alpha channel to hex color (browser support: https://caniuse.com/css-rrggbbaa)
          backgroundColor: theme.colors.dark[8] + "75",
        }}
      >
        <Group h="100%" px="md">
          <Burger opened={opened} onClick={toggle} hiddenFrom="md" size="sm" />
          <Group style={{ flex: 1 }}>
            <WanderersGuideLogo size={30} />
            <Group
              gap={0}
              style={{ flex: 1 }}
              visibleFrom="md"
              justify="space-between"
              wrap="nowrap"
            >
              <Group gap={0}>
                <UnstyledButton className={classes.control}>
                  About
                </UnstyledButton>
                <UnstyledButton className={classes.control}>
                  Community
                </UnstyledButton>
                <UnstyledButton className={classes.control}>
                  Support
                </UnstyledButton>
                <UnstyledButton
                  className={classes.control}
                  onClick={() => {
                    window.location.href = "https://wanderersguide.app";
                  }}
                >
                  Legacy Site
                </UnstyledButton>
              </Group>
              <Group>
                <SearchBar />

                {!session ? (
                  <Button
                    variant="filled"
                    size="compact-lg"
                    fz="sm"
                    onClick={() => {
                      navigate("/dashboard");
                    }}
                  >
                    Dashboard
                  </Button>
                ) : (
                  <Menu
                    width={260}
                    position="bottom-end"
                    transitionProps={{ transition: "pop-top-right" }}
                    onClose={() => setUserMenuOpened(false)}
                    onOpen={() => setUserMenuOpened(true)}
                    withinPortal
                  >
                    <Menu.Target>
                      <UnstyledButton
                        py={1}
                        pr="xs"
                        style={{
                          borderTopLeftRadius: theme.radius.xl,
                          borderBottomLeftRadius: theme.radius.xl,
                          borderTopRightRadius: theme.radius.md,
                          borderBottomRightRadius: theme.radius.md,
                          backgroundColor: userMenuOpened
                            ? "#14151750"
                            : undefined,
                        }}
                      >
                        <Group gap={7}>
                          <Avatar
                            src={
                              userIcon
                                ? `data:image/svg+xml;utf8,${encodeURIComponent(
                                    userIcon
                                  )}`
                                : undefined
                            }
                            alt={"Account Dropdown"}
                            radius="xl"
                            size={30}
                          />
                          <Text fw={500} size="sm" c='gray.4' lh={1} mr={3}>
                            {"Account"}
                          </Text>
                          <IconChevronDown
                            style={{ width: rem(12), height: rem(12) }}
                            stroke={1.5}
                          />
                        </Group>
                      </UnstyledButton>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Item
                        leftSection={
                          <IconCategory
                            style={{ width: rem(16), height: rem(16) }}
                            color={theme.colors[theme.primaryColor][6]}
                            stroke={1.5}
                          />
                        }
                        onClick={() => {
                          navigate("/dashboard");
                        }}
                      >
                        Dashboard
                      </Menu.Item>
                      <Menu.Item
                        leftSection={
                          <IconStar
                            style={{ width: rem(16), height: rem(16) }}
                            color={theme.colors.yellow[6]}
                            stroke={1.5}
                          />
                        }
                        onClick={() => {
                          navigate("/admin");
                        }}
                      >
                        Admin Panel
                      </Menu.Item>
                      <Menu.Item
                        leftSection={
                          <IconMessage
                            style={{ width: rem(16), height: rem(16) }}
                            color={theme.colors.blue[6]}
                            stroke={1.5}
                          />
                        }
                      >
                        Your comments
                      </Menu.Item>

                      <Menu.Label>Settings</Menu.Label>
                      <Menu.Item
                        leftSection={
                          <IconSettings
                            style={{ width: rem(16), height: rem(16) }}
                            stroke={1.5}
                          />
                        }
                      >
                        Account settings
                      </Menu.Item>
                      <Menu.Item
                        leftSection={
                          <IconSwitchHorizontal
                            style={{ width: rem(16), height: rem(16) }}
                            stroke={1.5}
                          />
                        }
                      >
                        Change account
                      </Menu.Item>
                      <Menu.Item
                        leftSection={
                          <IconLogout
                            style={{ width: rem(16), height: rem(16) }}
                            stroke={1.5}
                          />
                        }
                        onClick={async () => {
                          supabase.auth.signOut();
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
        py="md"
        px={4}
        style={{
          border: `0px solid`,
          borderRadius: 0,
          backdropFilter: "blur(8px)",
          // Add alpha channel to hex color (browser support: https://caniuse.com/css-rrggbbaa)
          backgroundColor: theme.colors.dark[8] + "75",
        }}
      >
        <UnstyledButton className={classes.control}>Home</UnstyledButton>
        <UnstyledButton className={classes.control}>Blog</UnstyledButton>
        <UnstyledButton className={classes.control}>Contacts</UnstyledButton>
        <UnstyledButton className={classes.control}>Support</UnstyledButton>
      </AppShell.Navbar>

      <AppShell.Main pt={`calc(${rem(60)} + var(--mantine-spacing-md))`}>
        {props.children}
      </AppShell.Main>
    </AppShell>
  );
}
