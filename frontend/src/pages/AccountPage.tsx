import {
  Title,
  Image,
  Text,
  Button,
  Container,
  Group,
  rem,
  useMantineTheme,
  Box,
  Center,
  Avatar,
  Card,
  Loader,
  Divider,
  Badge,
  MantineColor,
  ColorInput,
  ColorSwatch,
  Popover,
  ColorPicker,
  ActionIcon,
  FileButton,
  LoadingOverlay,
  TextInput,
  FocusTrap,
  Paper,
  CloseButton,
  Anchor,
  CopyButton,
  ScrollArea,
  Stack,
  Switch,
  Slider,
} from '@mantine/core';
import { setPageTitle } from '@utils/document-change';
import { useNavigate } from 'react-router-dom';
import BlurBox from '@common/BlurBox';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getPublicUser } from '@auth/user-manager';
import { getDefaultBackgroundImage } from '@utils/background-images';
import { toLabel } from '@utils/strings';
import { GUIDE_BLUE, PATREON_AUTH_URL } from '@constants/data';
import { IconAdjustments, IconBrandPatreon, IconReload, IconUpload } from '@tabler/icons-react';
import { Campaign, Character, PublicUser } from '@typing/content';
import { useEffect, useState } from 'react';
import { getHotkeyHandler, useDebouncedValue, useDidUpdate, useHover } from '@mantine/hooks';
import { makeRequest } from '@requests/request-manager';
import { JSendResponse } from '@typing/requests';
import { uploadImage } from '@upload/image-upload';
import { displayPatronOnly } from '@utils/notifications';
import { useRecoilState, useRecoilValue } from 'recoil';
import { sessionState } from '@atoms/supabaseAtoms';
import { modals } from '@mantine/modals';
import { hasPatreonAccess } from '@utils/patreon';
import { userState } from '@atoms/userAtoms';
import { findApprovedContentUpdates } from '@content/content-update';
import { resetContentStore, fetchContentSources } from '@content/content-store';

export function Component() {
  setPageTitle(`Account`);

  const [user, setUser] = useRecoilState(userState);

  const { data } = useQuery({
    queryKey: [`find-account-self`],
    queryFn: async () => {
      const user = await getPublicUser();
      setUser(user);
      return user;
    },
  });

  if (!data)
    return (
      <Loader
        size='lg'
        type='bars'
        style={{
          position: 'absolute',
          top: '30%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />
    );

  return <ProfileSection />;
}

function ProfileSection() {
  const theme = useMantineTheme();
  const [loading, setLoading] = useState(false);
  const [_user, setUser] = useRecoilState(userState);

  // User should always be defined here
  const user = _user!;
  if (!user) {
    throw new Error('User is not defined');
  }

  const { hovered: hoveredPfp, ref: refPfp } = useHover();
  const { hovered: hoveredBck, ref: refBck } = useHover();

  const [editingName, setEditingName] = useState(false);

  // Get character count
  const session = useRecoilValue(sessionState);
  const { data: characters } = useQuery({
    queryKey: [`find-character`],
    queryFn: async () => {
      return await makeRequest<Character[]>('find-character', {
        user_id: session?.user.id,
      });
    },
    enabled: !!session,
  });

  const { data: campaigns } = useQuery({
    queryKey: [`find-campaigns`],
    queryFn: async () => {
      return await makeRequest<Campaign[]>('find-campaign', {
        user_id: session?.user.id,
      });
    },
    enabled: !!session,
  });

  const { data: bundles } = useQuery({
    queryKey: [`get-homebrew-content-sources-creations`],
    queryFn: async () => {
      resetContentStore(true);
      return (await fetchContentSources({ ids: 'all', homebrew: true })).filter(
        (c) => c.user_id && c.user_id === session?.user.id
      );
    },
    enabled: !!session,
  });

  // Get user's on GM tier
  const { data: benefitingUsers, refetch: refetchBenefitingUsers } = useQuery({
    queryKey: [`find-benefiting-users`],
    queryFn: async () => {
      return await makeRequest<PublicUser[]>('gm-users-in-group', {});
    },
    enabled: user.patreon?.tier === 'GAME-MASTER',
  });
  const gmShareURL = `${window.location.origin}/gm-share/${user.user_id}?code=${user.patreon?.game_master?.access_code}`;

  const regenerateCode = async () => {
    setLoading(true);
    await makeRequest('gm-regenerate-code', {});
    const newUser = await getPublicUser();
    if (newUser) setUser(newUser);
    setLoading(false);
  };

  const removeFromGroup = async (userId: string) => {
    setLoading(true);
    await makeRequest('gm-remove-from-group', {
      user_id: userId,
    });
    refetchBenefitingUsers();
    setLoading(false);
  };

  // Get their content updates
  const { data: approvedContentUpdates } = useQuery({
    queryKey: [`find-approved-content-updates`],
    queryFn: async () => {
      return await findApprovedContentUpdates(user.user_id);
    },
  });

  // Determine content tiers
  let contentTier = '';
  let contentColor: MantineColor = 'gray';
  if (approvedContentUpdates) {
    if (approvedContentUpdates.length >= 100 || user.is_community_paragon) {
      contentTier = 'Content Connoisseur';
      contentColor = 'violet';
    } else if (approvedContentUpdates.length >= 50) {
      contentTier = 'Content Conservator';
      contentColor = 'indigo';
    } else if (approvedContentUpdates.length > 0) {
      contentTier = 'Content Contributor';
      contentColor = 'blue';
    }
  }

  // Determine patron tier
  let patronTier = toLabel(user.patreon?.tier) || 'Non-Patron';
  let patronColor: MantineColor = 'gray';
  if (patronTier === 'Non-Patron') patronColor = 'gray';
  if (patronTier === 'Advocate') patronColor = 'teal';
  if (patronTier === 'Wanderer') patronColor = 'blue';
  if (patronTier === 'Legend') patronColor = 'grape';
  if (patronTier === 'Game Master') patronColor = 'orange';

  if (
    (patronTier === 'Non-Patron' || patronTier === 'Advocate') &&
    user.patreon?.game_master?.virtual_tier?.game_master_user_id
  ) {
    patronTier = 'Wanderer (Virtual)';
    patronColor = 'blue.3';
  }

  const { mutate: mutateUser } = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const response = await makeRequest('update-user', {
        ...data,
      });
      return response;
    },
    onSuccess: () => {
      //queryClient.invalidateQueries([`find-account-self`]);
    },
  });

  // Update user in db when state changed
  const [debouncedUser] = useDebouncedValue(user, 500);
  useDidUpdate(() => {
    if (!debouncedUser) return;
    mutateUser({
      display_name: debouncedUser.display_name,
      summary: debouncedUser.summary,
      image_url: debouncedUser.image_url,
      background_image_url: debouncedUser.background_image_url,
      site_theme: debouncedUser.site_theme,
    });
  }, [debouncedUser]);

  return (
    <Center>
      <Box maw={400} w='100%'>
        <BlurBox w={'100%'}>
          <LoadingOverlay visible={loading} />
          <Card pt={0} pb={'md'} radius='md' style={{ backgroundColor: 'transparent' }}>
            <FileButton
              onChange={async (file) => {
                if (!hasPatreonAccess(user, 2)) {
                  displayPatronOnly();
                  return;
                }

                // Upload file to server
                let path = '';
                if (file) {
                  setLoading(true);
                  path = await uploadImage(file, 'backgrounds');
                }
                setUser((prev) => {
                  if (!prev) return prev;
                  return { ...prev, background_image_url: path };
                });

                setLoading(false);
              }}
              accept='image/png,image/jpeg,image/jpg,image/webp'
            >
              {(subProps) => (
                <Box {...subProps}>
                  <Card.Section
                    h={140}
                    ref={refBck}
                    style={{
                      backgroundImage: `url(${user.background_image_url ?? getDefaultBackgroundImage().url})`,
                      backgroundSize: 'cover',
                      cursor: 'pointer',
                    }}
                  />
                  <ActionIcon
                    variant='transparent'
                    color='gray.1'
                    aria-label='Upload Background Image'
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,

                      visibility: hoveredBck ? 'visible' : 'hidden',
                    }}
                    size={40}
                  >
                    <IconUpload size='1.2rem' stroke={1.5} />
                  </ActionIcon>
                </Box>
              )}
            </FileButton>

            {/* <Box
              style={{
                position: 'absolute',
                top: 142,
                left: 2,
              }}
            >
              <ActionIcon
                size='xs'
                color='gray.5'
                variant='transparent'
                aria-label='Reload Webpage'
                onClick={() => {
                  window.location.reload();
                }}
              >
                <IconReload size='1rem' stroke={1.5} />
              </ActionIcon>
            </Box> */}

            <Box
              style={{
                position: 'absolute',
                top: 135,
                right: 5,
              }}
            >
              <Stack gap={3}>
                <Center>
                  <Popover position='bottom' withArrow shadow='md'>
                    <Popover.Target>
                      <ColorSwatch
                        style={{ cursor: 'pointer' }}
                        color={user.site_theme?.color || GUIDE_BLUE}
                        size={15}
                      />
                    </Popover.Target>
                    <Popover.Dropdown p={5}>
                      <ColorPicker
                        format='hex'
                        value={user.site_theme?.color || GUIDE_BLUE}
                        onChange={(value) => {
                          if (!hasPatreonAccess(user, 2)) {
                            displayPatronOnly();
                            return;
                          }

                          setUser((prev) => {
                            if (!prev) return prev;
                            return { ...prev, site_theme: { ...prev.site_theme, color: value } };
                          });
                        }}
                        swatches={[
                          '#25262b',
                          '#868e96',
                          '#fa5252',
                          '#e64980',
                          '#be4bdb',
                          '#8d69f5',
                          '#577deb',
                          GUIDE_BLUE,
                          '#15aabf',
                          '#12b886',
                          '#40c057',
                          '#82c91e',
                          '#fab005',
                          '#fd7e14',
                        ]}
                        swatchesPerRow={7}
                      />
                    </Popover.Dropdown>
                  </Popover>
                </Center>

                <Center>
                  <Popover position='bottom' withArrow shadow='md'>
                    <Popover.Target>
                      <ActionIcon variant='subtle' radius='xl' aria-label='Settings' color='default'>
                        <IconAdjustments style={{ width: '70%', height: '70%' }} stroke={1.5} />
                      </ActionIcon>
                    </Popover.Target>

                    <Popover.Dropdown>
                      <Stack>
                        <Switch
                          size='sm'
                          onLabel='On'
                          offLabel='Off'
                          label='See Operations'
                          checked={user.site_theme?.view_operations ?? false}
                          onChange={(e) => {
                            setUser((prev) => {
                              if (!prev) return prev;
                              return {
                                ...prev,
                                site_theme: { ...prev.site_theme, view_operations: e.currentTarget.checked },
                              };
                            });
                          }}
                        />
                        <Switch
                          size='sm'
                          onLabel='On'
                          offLabel='Off'
                          label='Dyslexia Font'
                          checked={user.site_theme?.dyslexia_font ?? false}
                          onChange={(e) => {
                            setUser((prev) => {
                              if (!prev) return prev;
                              return {
                                ...prev,
                                site_theme: { ...prev.site_theme, dyslexia_font: e.currentTarget.checked },
                              };
                            });
                          }}
                        />

                        <Stack gap={5}>
                          <Text fz='sm'>UI Size</Text>
                          <Slider
                            min={0.75}
                            max={1.5}
                            step={0.01}
                            value={user.site_theme?.zoom ?? 1}
                            onChange={(value) => {
                              setUser((prev) => {
                                if (!prev) return prev;
                                return { ...prev, site_theme: { ...prev.site_theme, zoom: value } };
                              });
                            }}
                          />
                        </Stack>
                      </Stack>
                    </Popover.Dropdown>
                  </Popover>
                </Center>
              </Stack>
            </Box>

            <Center>
              <FileButton
                onChange={async (file) => {
                  if (!hasPatreonAccess(user, 2)) {
                    displayPatronOnly();
                    return;
                  }

                  // Upload file to server
                  let path = '';
                  if (file) {
                    setLoading(true);
                    path = await uploadImage(file, 'portraits');
                  }
                  setUser((prev) => {
                    if (!prev) return prev;
                    return { ...prev, image_url: path };
                  });

                  setLoading(false);
                }}
                accept='image/png,image/jpeg,image/jpg,image/webp'
              >
                {(subProps) => (
                  <Box {...subProps} style={{ position: 'relative' }}>
                    <Avatar
                      ref={refPfp}
                      src={user.image_url}
                      size={80}
                      radius={80}
                      mt={-30}
                      style={{
                        backgroundColor: theme.colors.dark[7],
                        border: `2px solid ${theme.colors.dark[7] + 'D3'}`,
                        cursor: 'pointer',
                      }}
                    />

                    <ActionIcon
                      variant='transparent'
                      color='gray.1'
                      aria-label='Upload Profile Picture'
                      style={{
                        position: 'absolute',
                        top: '25%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',

                        visibility: hoveredPfp ? 'visible' : 'hidden',
                      }}
                      size={40}
                    >
                      <IconUpload size='2.2rem' stroke={1.5} />
                    </ActionIcon>
                  </Box>
                )}
              </FileButton>
            </Center>

            <Box mt={5}>
              {editingName ? (
                <Center>
                  <FocusTrap active={true}>
                    <TextInput
                      size='sm'
                      w={160}
                      styles={{
                        input: {
                          textAlign: 'center',
                        },
                      }}
                      spellCheck={false}
                      placeholder='Display Name'
                      value={user.display_name}
                      onChange={(e) => {
                        setUser((prev) => {
                          if (!prev) return prev;
                          return { ...prev, display_name: e.target.value };
                        });
                      }}
                      onKeyDown={getHotkeyHandler([
                        ['mod+Enter', () => setEditingName(false)],
                        ['Enter', () => setEditingName(false)],
                      ])}
                      onBlur={() => {
                        setEditingName(false);
                      }}
                    />
                  </FocusTrap>
                </Center>
              ) : (
                <Text
                  ta='center'
                  fz='lg'
                  fw={500}
                  onClick={() => {
                    setEditingName(true);
                  }}
                  style={{
                    cursor: 'pointer',
                  }}
                >
                  {user.display_name ?? 'Unknown User'}
                </Text>
              )}
            </Box>

            <Text ta='center' fz='xs' c='dimmed' fs='italic'>
              {user.summary}
            </Text>
            <Group mt='md' justify='center' gap={30}>
              <Box>
                <Text ta='center' fz='lg' fw={500}>
                  {characters ? characters.length : '...'}
                </Text>
                <Text ta='center' fz='sm' c='dimmed' lh={1}>
                  Characters
                </Text>
              </Box>
              <Box>
                <Text ta='center' fz='lg' fw={500}>
                  {bundles ? bundles.length : '...'}
                </Text>
                <Text ta='center' fz='sm' c='dimmed' lh={1}>
                  Bundles
                </Text>
              </Box>
              <Box>
                <Text ta='center' fz='lg' fw={500}>
                  {campaigns ? campaigns.length : '...'}
                </Text>
                <Text ta='center' fz='sm' c='dimmed' lh={1}>
                  Campaigns
                </Text>
              </Box>
            </Group>
            <Divider mt='md' />
            <Group align='center' justify='center' p='xs'>
              {user.deactivated && (
                <Badge
                  variant='light'
                  size='md'
                  color='red'
                  styles={{
                    root: {
                      textTransform: 'initial',
                    },
                  }}
                >
                  Deactivated
                </Badge>
              )}
              {user.is_admin && (
                <Badge
                  variant='light'
                  size='md'
                  color='cyan'
                  styles={{
                    root: {
                      textTransform: 'initial',
                    },
                  }}
                >
                  Admin
                </Badge>
              )}
              {user.is_mod && (
                <Badge
                  variant='light'
                  size='md'
                  color='green'
                  styles={{
                    root: {
                      textTransform: 'initial',
                    },
                  }}
                >
                  Mod
                </Badge>
              )}
              {user.is_developer && (
                <Badge
                  variant='light'
                  size='md'
                  color='grape'
                  styles={{
                    root: {
                      textTransform: 'initial',
                    },
                  }}
                >
                  Developer
                </Badge>
              )}

              <Badge
                variant='light'
                size='md'
                color={patronColor}
                styles={{
                  root: {
                    textTransform: 'initial',
                  },
                }}
              >
                {patronTier}
              </Badge>

              {contentTier ? (
                <Badge
                  variant='light'
                  size='md'
                  color={contentColor}
                  styles={{
                    root: {
                      textTransform: 'initial',
                    },
                  }}
                >
                  {contentTier} {approvedContentUpdates ? `(${approvedContentUpdates.length})` : ''}
                </Badge>
              ) : (
                <Badge
                  variant='light'
                  size='md'
                  color='yellow'
                  styles={{
                    root: {
                      textTransform: 'initial',
                    },
                  }}
                >
                  New User
                </Badge>
              )}
            </Group>

            <Divider />

            <Group align='center' justify='center' pt={10}>
              <Button
                size='sm'
                variant={user.patreon?.tier ? 'outline' : 'light'}
                leftSection={<IconBrandPatreon size={18} />}
                fullWidth
                component='a'
                href={PATREON_AUTH_URL}
              >
                {user.patreon?.tier ? `Patreon Connected` : 'Connect to Patreon'}
              </Button>
            </Group>

            {user.patreon?.tier === 'GAME-MASTER' && (
              <Box pt={15}>
                <Text ta='center' fw={500}>
                  <Text fs='italic' pr={8} span>
                    Users in your Group
                  </Text>
                  <Text fz='sm' span>
                    ({benefitingUsers?.length ?? '...'} / 99)
                  </Text>
                </Text>
                <Paper style={{ backgroundColor: 'transparent' }} withBorder>
                  <ScrollArea.Autosize mah={200} py={5}>
                    {benefitingUsers?.map((benefitingUser, index) => (
                      <Group key={index} wrap='nowrap' justify='space-between' px={20}>
                        <Text ta='center' fz='lg' fw={500}>
                          {benefitingUser.display_name}
                        </Text>
                        <CloseButton
                          onClick={() => {
                            modals.openConfirmModal({
                              id: 'remove-benefiting-user',
                              title: <Title order={4}>Remove User</Title>,
                              children: (
                                <Text size='sm'>
                                  Are you sure you want to remove this user from benefiting from your tier? They will
                                  lose their virtual Wanderer tier.
                                </Text>
                              ),
                              labels: { confirm: 'Remove', cancel: 'Cancel' },
                              onCancel: () => {},
                              onConfirm: async () => {
                                await removeFromGroup(benefitingUser.user_id);
                              },
                            });
                          }}
                        />
                      </Group>
                    ))}
                    {benefitingUsers?.length === 0 && (
                      <Text ta='center' fz='sm' c='dimmed'>
                        No one yet, share your link!
                      </Text>
                    )}
                    {(benefitingUsers === undefined || benefitingUsers === null) && (
                      <Center>
                        <Loader size='lg' type='dots' />
                      </Center>
                    )}
                  </ScrollArea.Autosize>
                </Paper>
                <Paper style={{ backgroundColor: 'transparent' }} withBorder mt={10} p={20}>
                  <Group wrap='nowrap' justify='space-between'>
                    <Text fz='sm'>Send them this link:</Text>
                    <Group wrap='nowrap'>
                      <CopyButton value={gmShareURL}>
                        {({ copied, copy }) => (
                          <Button color={copied ? 'teal' : 'blue'} size='compact-xs' onClick={copy}>
                            {copied ? 'Copied' : 'Copy'}
                          </Button>
                        )}
                      </CopyButton>
                      <Button color='teal' size='compact-xs' onClick={regenerateCode}>
                        Regenerate
                      </Button>
                    </Group>
                  </Group>
                  <Anchor
                    fz='xs'
                    fs='italic'
                    style={{
                      wordBreak: 'break-all',
                      overflowWrap: 'break-word',
                      textAlign: 'center',
                    }}
                  >
                    {gmShareURL}
                  </Anchor>
                </Paper>
              </Box>
            )}
          </Card>
        </BlurBox>
      </Box>
    </Center>
  );
}
