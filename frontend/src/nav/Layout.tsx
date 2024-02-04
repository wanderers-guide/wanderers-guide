import { userIconState } from "@atoms/navAtoms";
import { sessionState } from "@atoms/supabaseAtoms";
import classes from "@css/Layout.module.css";
import {
  AppShell,
  Avatar,
  Box,
  Burger,
  Divider,
  Group,
  Menu,
  ScrollArea,
  Text,
  UnstyledButton,
  rem,
  useMantineTheme,
} from "@mantine/core";
import { useDisclosure, useViewportSize } from "@mantine/hooks";
import {
  IconChevronDown,
  IconLayersIntersect,
  IconLogout,
  IconSettings,
  IconSpeakerphone,
  IconSwords,
  IconUsers,
} from "@tabler/icons-react";
import { getIcon } from "@utils/images";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRecoilState, useRecoilValue } from "recoil";
import { supabase } from "../main";
import { LoginButton } from "./LoginButton";
import { SearchBar } from "./Searchbar";
import WanderersGuideLogo from "./WanderersGuideLogo";

export default function Layout(props: { children: React.ReactNode }) {
  const theme = useMantineTheme();
  const [opened, { toggle, close }] = useDisclosure();
  const navigate = useNavigate();
  const session = useRecoilValue(sessionState);

  const [userIcon, setUserIcon] = useRecoilState(userIconState);
  const [userMenuOpened, setUserMenuOpened] = useState(false);

  const { width } = useViewportSize();

  useEffect(() => {
    if (!session) return;
    if (userIcon) return;
    getIcon(session.user.id).then((svg) => {
      setUserIcon(svg);
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
          backgroundColor: theme.colors.dark[8] + "CC",
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
              {width >= 1050 ? (
                <Group gap={0}>
                  <UnstyledButton className={classes.control}>
                    About
                  </UnstyledButton>
                  <UnstyledButton className={classes.control}>
                    Community
                  </UnstyledButton>
                  <UnstyledButton
                    className={classes.control}
                    onClick={() => {
                      window.location.href =
                        "https://www.patreon.com/wanderersguide";
                    }}
                  >
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
              ) : (
                <Box></Box>
              )}
              <Group>
                <SearchBar />

                {!session ? (
                  <LoginButton
                    onClick={() => {
                      navigate("/characters");
                    }}
                  />
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
                          <Text fw={500} size="sm" c="gray.4" lh={1} mr={3}>
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
                          <IconUsers
                            style={{ width: rem(16), height: rem(16) }}
                            color={theme.colors.blue[5]}
                            stroke={1.5}
                          />
                        }
                        onClick={() => {
                          navigate("/characters");
                        }}
                      >
                        Characters
                      </Menu.Item>
                      <Menu.Item
                        leftSection={
                          <IconSpeakerphone
                            style={{ width: rem(16), height: rem(16) }}
                            color={theme.colors.violet[4]}
                            stroke={1.5}
                          />
                        }
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
                      >
                        Encounters
                      </Menu.Item>
                      <Menu.Item
                        leftSection={
                          <IconLayersIntersect
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

                      <Menu.Label>Settings</Menu.Label>
                      <Menu.Item
                        leftSection={
                          <IconSettings
                            style={{ width: rem(16), height: rem(16) }}
                            stroke={1.5}
                          />
                        }
                      >
                        Account
                      </Menu.Item>
                      {/* <Menu.Item
                        leftSection={
                          <IconSwitchHorizontal
                            style={{ width: rem(16), height: rem(16) }}
                            stroke={1.5}
                          />
                        }
                      >
                        Change account
                      </Menu.Item> */}
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
        <UnstyledButton
          className={classes.control}
          onClick={() => {
            navigate("/characters");
            close();
          }}
        >
          Characters
        </UnstyledButton>
        <UnstyledButton className={classes.control}>Campaigns</UnstyledButton>
        <UnstyledButton className={classes.control}>Encounters</UnstyledButton>
        <UnstyledButton
          className={classes.control}
          onClick={() => {
            navigate("/admin");
            close();
          }}
        >
          Admin Panel
        </UnstyledButton>
        <Divider />
        <UnstyledButton className={classes.control}>Account</UnstyledButton>
        <UnstyledButton
          className={classes.control}
          onClick={async () => {
            supabase.auth.signOut();
            close();
          }}
        >
          Logout
        </UnstyledButton>
      </AppShell.Navbar>

      <ScrollArea
        h={"100vh"}
        type="auto"
        onScrollPositionChange={(pos) => {
          if (pos.y > SCROLL_PINNED_THRESHOLD) {
            setPinned(false);
          } else {
            setPinned(true);
          }
        }}
      >
        <AppShell.Main pt={`calc(${rem(60)} + var(--mantine-spacing-md))`}>
          {props.children}
        </AppShell.Main>
      </ScrollArea>
    </AppShell>
  );
}
