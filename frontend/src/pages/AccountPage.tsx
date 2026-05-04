import {
  Title,
  Text,
  Button,
  Group,
  useMantineTheme,
  Box,
  Center,
  Avatar,
  Loader,
  Divider,
  Badge,
  MantineColor,
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
  PasswordInput,
  Accordion,
} from '@mantine/core';
import { setPageTitle } from '@utils/document-change';
import BlurBox from '@common/BlurBox';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getPublicUser } from '@auth/user-manager';
import { getDefaultBackgroundImage } from '@utils/background-images';
import { toLabel } from '@utils/strings';
import { GUIDE_BLUE } from '@constants/data';
import {
  IconBrandPatreon,
  IconCirclePlus,
  IconUpload,
  IconPalette,
  IconCode,
  IconShield,
  IconTrash,
} from '@tabler/icons-react';
import { Campaign, Character, PublicUser } from '@schemas/content';
import { useState } from 'react';
import { getHotkeyHandler, useDebouncedValue, useDidUpdate, useHover } from '@mantine/hooks';
import { makeRequest } from '@requests/request-manager';
import { uploadImage } from '@upload/image-upload';
import { displayPatronOnly } from '@utils/notifications';
import { useAtom, useAtomValue } from 'jotai';
import { sessionState } from '@atoms/supabaseAtoms';
import { modals, openContextModal } from '@mantine/modals';
import { hasPatreonAccess } from '@utils/patreon';
import { userState } from '@atoms/userAtoms';
import { findApprovedContentUpdates } from '@content/content-update';
import { resetContentStore, fetchContentSources } from '@content/content-store';
import { supabase } from '../main';
import { showNotification } from '@mantine/notifications';
import { DisplayIcon } from '@common/IconDisplay';
import { PATREON_AUTH_URL } from '@constants/urls';

export function Component() {
  setPageTitle(`Account`);

  const [user, setUser] = useAtom(userState);

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

function SettingRow({
  label,
  description,
  children,
  last,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <>
      <Group justify='space-between' align='center' wrap='nowrap' py={6}>
        <Box style={{ flex: 1 }}>
          <Text size='sm'>{label}</Text>
          {description && (
            <Text size='xs' c='dimmed' lh={1.3}>
              {description}
            </Text>
          )}
        </Box>
        <Box>{children}</Box>
      </Group>
      {!last && <Divider />}
    </>
  );
}

function ProfileSection() {
  const theme = useMantineTheme();
  const [loading, setLoading] = useState(false);
  const [_user, setUser] = useAtom(userState);
  const queryClient = useQueryClient();

  // User should always be defined here
  const user = _user!;
  if (!user) {
    throw new Error('User is not defined');
  }

  const { hovered: hoveredPfp, ref: refPfp } = useHover();
  const { hovered: hoveredBck, ref: refBck } = useHover();

  const [editingName, setEditingName] = useState(false);

  // Get character count
  const session = useAtomValue(sessionState);
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
      resetContentStore();
      return (await fetchContentSources('ALL-HOMEBREW-PUBLIC')).filter(
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
      api: debouncedUser.api,
    });
  }, [debouncedUser]);

  return (
    <Box p='md' pos='relative'>
      <LoadingOverlay visible={loading} />
      <BlurBox maw={450} mx='auto' style={{ overflow: 'hidden' }}>
        {/* ── Full-width background banner ── */}
        <FileButton
          onChange={async (file) => {
            if (!hasPatreonAccess(user, 1)) {
              displayPatronOnly();
              return;
            }
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
            <Box
              {...subProps}
              h={140}
              ref={refBck}
              style={{
                backgroundImage: `url(${user.background_image_url ?? getDefaultBackgroundImage().url})`,
                backgroundSize: 'cover',
                cursor: 'pointer',
                position: 'relative',
              }}
            >
              <ActionIcon
                variant='transparent'
                color='gray.1'
                aria-label='Upload Background Image'
                style={{
                  position: 'absolute',
                  top: 8,
                  left: 8,
                  visibility: hoveredBck ? 'visible' : 'hidden',
                }}
                size={36}
              >
                <IconUpload size='1.1rem' stroke={1.5} />
              </ActionIcon>
            </Box>
          )}
        </FileButton>

        <Stack px='md' pb='md' gap='sm'>
          {/* Avatar */}
          <Center>
            <FileButton
              onChange={async (file) => {
                if (!hasPatreonAccess(user, 1)) {
                  displayPatronOnly();
                  return;
                }
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

          {/* Display name */}
          <Box>
            {editingName ? (
              <Center>
                <FocusTrap active={true}>
                  <TextInput
                    size='sm'
                    w={180}
                    styles={{ input: { textAlign: 'center' } }}
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
                    onBlur={() => setEditingName(false)}
                  />
                </FocusTrap>
              </Center>
            ) : (
              <Text ta='center' fz='lg' fw={500} onClick={() => setEditingName(true)} style={{ cursor: 'pointer' }}>
                {user.display_name ?? 'Unknown User'}
              </Text>
            )}
          </Box>

          {user.summary && (
            <Text ta='center' fz='xs' c='dimmed' fs='italic' mb='md'>
              {user.summary}
            </Text>
          )}

          {/* Stats */}
          <Group justify='center' gap={40} mb='md' wrap='nowrap'>
            <Box>
              <Text ta='center' fz='xl' fw={600}>
                {characters ? characters.length : '...'}
              </Text>
              <Text ta='center' fz='xs' c='dimmed' lh={1}>
                Characters
              </Text>
            </Box>
            <Box>
              <Text ta='center' fz='xl' fw={600}>
                {bundles ? bundles.length : '...'}
              </Text>
              <Text ta='center' fz='xs' c='dimmed' lh={1}>
                Bundles
              </Text>
            </Box>
            <Box>
              <Text ta='center' fz='xl' fw={600}>
                {campaigns ? campaigns.length : '...'}
              </Text>
              <Text ta='center' fz='xs' c='dimmed' lh={1}>
                Campaigns
              </Text>
            </Box>
          </Group>

          <Divider />

          {/* Badges */}
          <Group align='center' justify='center' py='sm' gap={6} px='xs'>
            {user.deactivated && (
              <Badge variant='light' size='sm' color='red' styles={{ root: { textTransform: 'initial' } }}>
                Deactivated
              </Badge>
            )}
            {user.is_admin && (
              <Badge variant='light' size='sm' color='cyan' styles={{ root: { textTransform: 'initial' } }}>
                Admin
              </Badge>
            )}
            {user.is_mod && (
              <Badge variant='light' size='sm' color='green' styles={{ root: { textTransform: 'initial' } }}>
                Mod
              </Badge>
            )}
            {user.is_developer && (
              <Badge variant='light' size='sm' color='grape' styles={{ root: { textTransform: 'initial' } }}>
                Developer
              </Badge>
            )}
            <Badge variant='light' size='sm' color={patronColor} styles={{ root: { textTransform: 'initial' } }}>
              {patronTier}
            </Badge>
            {contentTier ? (
              <Badge variant='light' size='sm' color={contentColor} styles={{ root: { textTransform: 'initial' } }}>
                {contentTier} {approvedContentUpdates ? `(${approvedContentUpdates.length})` : ''}
              </Badge>
            ) : (
              <Badge variant='light' size='sm' color='yellow' styles={{ root: { textTransform: 'initial' } }}>
                New User
              </Badge>
            )}
          </Group>

          <Divider />

          {/* Patreon */}
          <Box pt='sm'>
            <Button
              size='sm'
              variant={user.patreon?.tier ? 'outline' : 'gradient'}
              leftSection={<IconBrandPatreon size={18} />}
              fullWidth
              component='a'
              href={PATREON_AUTH_URL}
            >
              {user.patreon?.tier ? `Patreon Connected` : 'Connect to Patreon'}
            </Button>
          </Box>

          {/* GM section */}
          {user.patreon?.tier === 'GAME-MASTER' && (
            <Box pt='md'>
              <Text ta='center' fw={500} mb='xs'>
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
                      <Text fz='sm' fw={500}>
                        {benefitingUser.display_name}
                      </Text>
                      <CloseButton
                        onClick={() => {
                          modals.openConfirmModal({
                            id: 'remove-benefiting-user',
                            title: <Title order={4}>Remove User</Title>,
                            children: (
                              <Text size='sm'>
                                Are you sure you want to remove this user from benefiting from your tier? They will lose
                                their virtual Wanderer tier.
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
                    <Text ta='center' fz='sm' c='dimmed' py='xs'>
                      No one yet, share your link!
                    </Text>
                  )}
                  {(benefitingUsers === undefined || benefitingUsers === null) && (
                    <Center py='xs'>
                      <Loader size='sm' type='dots' />
                    </Center>
                  )}
                </ScrollArea.Autosize>
              </Paper>
              <Paper style={{ backgroundColor: 'transparent' }} withBorder mt={10} p='md'>
                <Group wrap='nowrap' justify='space-between' mb={6}>
                  <Text fz='sm'>Send them this link:</Text>
                  <Group wrap='nowrap' gap='xs'>
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
                <Anchor fz='xs' fs='italic' style={{ wordBreak: 'break-all', overflowWrap: 'break-word' }}>
                  {gmShareURL}
                </Anchor>
              </Paper>
            </Box>
          )}
          <Accordion
            defaultValue=''
            variant='contained'
            styles={{
              control: {
                backgroundColor: 'var(--mantine-color-default-hover)',
                '&:hover': { backgroundColor: 'var(--mantine-color-default-hover)' },
              },
              // Match the panel bg to the control so the whole accordion item reads
              // as one dark surface instead of a dark header on top of a transparent body.
              panel: { backgroundColor: 'var(--mantine-color-default-hover)' },
            }}
          >
            {/* Appearance */}
            <Accordion.Item value='appearance'>
              <Accordion.Control icon={<IconPalette size='0.9rem' />}>Appearance</Accordion.Control>
              <Accordion.Panel>
                <Stack gap={0}>
                  <SettingRow label='Theme Color' description='Primary accent color for the site'>
                    <Popover position='bottom-end' withArrow shadow='md'>
                      <Popover.Target>
                        <ColorSwatch
                          style={{ cursor: 'pointer' }}
                          color={user.site_theme?.color || GUIDE_BLUE}
                          size={22}
                        />
                      </Popover.Target>
                      <Popover.Dropdown p={5}>
                        <ColorPicker
                          format='hex'
                          value={user.site_theme?.color || GUIDE_BLUE}
                          onChange={(value) => {
                            if (!hasPatreonAccess(user, 1)) {
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
                  </SettingRow>

                  <SettingRow label='Dyslexia Font' description='Use OpenDyslexic for improved readability'>
                    <Switch
                      size='sm'
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
                  </SettingRow>

                  <Box pt={6} pb={8}>
                    <Text size='sm' mb={12}>
                      UI Size
                    </Text>
                    <Slider
                      min={0.75}
                      max={1.5}
                      step={0.01}
                      value={user.site_theme?.zoom ?? 1}
                      marks={[
                        { value: 0.75, label: 'Small' },
                        { value: 1, label: 'Default' },
                        { value: 1.5, label: 'Large' },
                      ]}
                      mb='xl'
                      onChange={(value) => {
                        setUser((prev) => {
                          if (!prev) return prev;
                          return { ...prev, site_theme: { ...prev.site_theme, zoom: value } };
                        });
                      }}
                    />
                  </Box>
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>

            {/* Developer */}
            <Accordion.Item value='developer'>
              <Accordion.Control icon={<IconCode size='0.9rem' />}>Developer</Accordion.Control>
              <Accordion.Panel>
                <Stack gap={0}>
                  <SettingRow label='View Operations' description='Show operation data on content entries'>
                    <Switch
                      size='sm'
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
                  </SettingRow>

                  <Box pt={6}>
                    <Group justify='space-between' align='center' mb='xs'>
                      <Text size='sm'>API Clients</Text>
                      <ActionIcon
                        size='sm'
                        radius='xl'
                        variant='subtle'
                        color='gray'
                        onClick={() => {
                          setUser((prev) => {
                            if (!prev) return prev;
                            return {
                              ...prev,
                              api: {
                                ...prev.api,
                                clients: [
                                  ...(prev.api?.clients || []),
                                  {
                                    name: 'New Client',
                                    id: crypto.randomUUID().split('-')[0],
                                    api_key: crypto.randomUUID(),
                                    image_url: 'icon|||abstract064|||#359fdf',
                                  },
                                ],
                              },
                            };
                          });
                        }}
                      >
                        <IconCirclePlus size='0.9rem' />
                      </ActionIcon>
                    </Group>
                    <Stack gap='sm'>
                      {user.api?.clients?.map((client, index) => (
                        <BlurBox key={index} p='sm'>
                          <Stack gap={5}>
                            <Group justify='space-between' align='center'>
                              <Group gap='xs'>
                                <DisplayIcon width={25} strValue={client.image_url} />
                                <Text size='sm' fw={500}>
                                  {client.name}
                                </Text>
                              </Group>
                              <Button
                                variant='light'
                                size='xs'
                                onClick={() => {
                                  openContextModal({
                                    modal: 'updateApiClient',
                                    title: <Title order={3}>API Client</Title>,
                                    innerProps: {
                                      client: client,
                                      onUpdate: (
                                        id: string,
                                        name: string,
                                        description: string,
                                        image_url: string,
                                        api_key: string
                                      ) => {
                                        setUser((prev) => {
                                          if (!prev) return prev;
                                          const newClients = prev.api?.clients?.map((c) => {
                                            if (c.id === id) {
                                              return { ...c, name, description, image_url, api_key };
                                            }
                                            return c;
                                          });
                                          return { ...prev, api: { ...prev.api, clients: newClients } };
                                        });
                                      },
                                      onDelete: () => {
                                        setUser((prev) => {
                                          if (!prev) return prev;
                                          const newClients = prev.api?.clients?.filter((c) => c.id !== client.id);
                                          return { ...prev, api: { ...prev.api, clients: newClients } };
                                        });
                                      },
                                    },
                                  });
                                }}
                              >
                                Edit
                              </Button>
                            </Group>
                            <PasswordInput
                              size='sm'
                              label='API Key'
                              description='Your private key to access the API.'
                              value={client.api_key}
                              readOnly
                            />
                            <TextInput
                              size='sm'
                              label='Character Authorization URL'
                              description='Set <ID> to the character ID you want access to.'
                              value={`${window.location.origin}/oauth/access?user_id=${user.id}&client_id=${client.id}&character_id=<ID>`}
                              readOnly
                            />
                          </Stack>
                        </BlurBox>
                      ))}
                      {(!user.api?.clients || user.api.clients.length === 0) && (
                        <Text size='sm' c='dimmed' ta='center' py='xs'>
                          No API clients yet. Click + to add one.
                        </Text>
                      )}
                    </Stack>
                  </Box>
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>

            {/* Account */}
            <Accordion.Item value='account'>
              <Accordion.Control icon={<IconShield size='0.9rem' />}>Account</Accordion.Control>
              <Accordion.Panel>
                <Stack gap={0}>
                  <SettingRow
                    label='Delete Account'
                    description='Permanently delete your account and all associated data. This cannot be undone.'
                    last
                  >
                    <Button
                      variant='light'
                      color='red'
                      size='xs'
                      leftSection={<IconTrash size={14} />}
                      onClick={() => {
                        modals.openConfirmModal({
                          id: 'delete-account',
                          title: <Title order={4}>{`Delete Account`}</Title>,
                          children: (
                            <Stack>
                              <Text>Are you absolutely, positively sure you want to delete your account?</Text>
                              <Text>
                                All your characters, homebrew, campaigns, and encounters will be deleted forever! 😱
                              </Text>
                            </Stack>
                          ),
                          labels: { confirm: 'Delete It.', cancel: 'Cancel' },
                          confirmProps: { color: 'red' },
                          onCancel: () => {},
                          onConfirm: async () => {
                            const result = await makeRequest('delete-user', {});
                            if (result) {
                              supabase.auth.signOut();
                              localStorage.clear();
                              queryClient.clear();
                            } else {
                              showNotification({
                                title: `Failed to Delete Account`,
                                message: `There was an error deleting your account. Please get support on our Discord.`,
                                color: 'red',
                              });
                            }
                          },
                        });
                      }}
                    >
                      Delete Account
                    </Button>
                  </SettingRow>
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        </Stack>
      </BlurBox>
    </Box>
  );
}
