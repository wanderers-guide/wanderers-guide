import { drawerState } from '@atoms/navAtoms';
import { userState } from '@atoms/userAtoms';
import { getCachedPublicUser, getPublicUser } from '@auth/user-manager';
import RichText from '@common/RichText';
import {
  ActionSelectionOption,
  AncestrySelectionOption,
  ArchetypeSelectionOption,
  BackgroundSelectionOption,
  ClassSelectionOption,
  CreatureSelectionOption,
  FeatSelectionOption,
  ItemSelectionOption,
  LanguageSelectionOption,
  ModeSelectionOption,
  PhysicalFeatureSelectionOption,
  SenseSelectionOption,
  SpellSelectionOption,
  TraitSelectionOption,
  VersatileHeritageSelectionOption,
} from '@common/select/SelectContent';
import {
  defineDefaultSources,
  fetchContentPackage,
  fetchContentSources,
  getDefaultSources,
} from '@content/content-store';
import { defineDefaultSourcesForSource, updateSubscriptions } from '@content/homebrew';
import ShowOperationsButton from '@drawers/ShowOperationsButton';
import {
  Title,
  Text,
  Loader,
  Group,
  Divider,
  Box,
  Button,
  Accordion,
  Badge,
  Select,
  Stack,
  ActionIcon,
} from '@mantine/core';
import { openContextModal } from '@mantine/modals';
import UnlockHomebrewModal from '@modals/UnlockHomebrewModal';
import { makeRequest } from '@requests/request-manager';
import { IconExternalLink, IconKey } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { AbilityBlockType, ContentSource, ContentType } from '@typing/content';
import _ from 'lodash-es';
import { useEffect, useRef, useState } from 'react';
import { useRecoilState } from 'recoil';
import { CREATURE_DRAWER_ZINDEX } from './CreatureDrawer';
import { convertToContentType } from '@content/content-utils';
import { DrawerType } from '@typing/index';

export function ContentSourceDrawerTitle(props: { data: { id?: number; source?: ContentSource } }) {
  const id = props.data.id;

  const { data: _source } = useQuery({
    queryKey: [`find-content-source-${id}`, { id }],
    queryFn: async ({ queryKey }) => {
      // @ts-ignore
      // eslint-disable-next-line
      const [_key, { id }] = queryKey;
      const sources = await fetchContentSources({
        ids: [id],
      });
      return sources.length > 0 ? sources[0] : null;
    },
    enabled: !!id,
  });
  const source = props.data.source ?? _source;

  // Get if user is subscribed to this source
  const [user, setUser] = useRecoilState(userState);
  const { refetch } = useQuery({
    queryKey: [`find-account-self`],
    queryFn: async () => {
      const user = await getPublicUser();
      setUser(user);
      return user;
    },
    enabled: !!source?.user_id,
  });
  const subscribed = user?.subscribed_content_sources?.find((src) => src.source_id === source?.id);

  const onSubscribe = async (add: boolean) => {
    if (!user || !source) return;

    const subscriptions = await updateSubscriptions(user, source, add);
    setUser({ ...user, subscribed_content_sources: subscriptions });
    await makeRequest('update-user', {
      subscribed_content_sources: subscriptions ?? [],
    });
  };

  useEffect(() => {
    if (!source) return;
    defineDefaultSourcesForSource(source);
  }, [source]);

  return (
    <>
      <Group justify='space-between' wrap='nowrap'>
        <Box>
          <Title order={3}>{source?.name}</Title>
        </Box>

        <Group gap={5}>
          {source?.user_id ? (
            <>
              <Button
                variant={subscribed ? 'light' : 'filled'}
                size='compact-xs'
                radius='xl'
                onClick={async () => {
                  await onSubscribe(!subscribed);
                  refetch();
                }}
              >
                {subscribed ? 'Subscribed' : 'Subscribe'}
              </Button>
              {source?.url && (
                <ActionIcon component='a' href={source.url} target='_blank' variant='light' size='sm' radius='xl'>
                  <IconExternalLink size={14} />
                </ActionIcon>
              )}
            </>
          ) : (
            <>
              {source?.url && (
                <Button
                  component='a'
                  href={source.url}
                  target='_blank'
                  variant='light'
                  size='compact-xs'
                  radius='xl'
                  rightSection={<IconExternalLink size={14} />}
                >
                  Source
                </Button>
              )}
            </>
          )}
        </Group>
      </Group>
    </>
  );
}

export function ContentSourceDrawerContent(props: {
  data: {
    id?: number;
    source?: ContentSource;
    showOperations?: boolean;
    onFeedback?: (type: ContentType | AbilityBlockType, id: number, contentSourceId: number) => void;
  };
}) {
  const id = props.data.id;

  const missingSelectRef = useRef<HTMLInputElement>(null);
  const [searchValue, setSearchValue] = useState('');

  const [_drawer, openDrawer] = useRecoilState(drawerState);

  const { data: content } = useQuery({
    queryKey: [`find-content-source-package-${id}`, { id, source: props.data.source }],
    queryFn: async ({ queryKey }) => {
      // @ts-ignore
      // eslint-disable-next-line
      const [_key, { id, source }] = queryKey;
      const _id = id ?? source?.id;
      return await fetchContentPackage([_id], { fetchSources: true, fetchCreatures: true });
    },
  });
  const source =
    props.data.source ?? (content && content.sources && content.sources.length > 0 ? content.sources[0] : null);

  const [openedUnlockModal, setOpenedUnlockModal] = useState(false);
  useEffect(() => {
    // TODO, this should be done on the backend. And we shouldn't be leaking keys to the client
    if (
      source?.require_key &&
      getCachedPublicUser()?.subscribed_content_sources?.find((src) => src.source_id === source.id) === undefined
    ) {
      setOpenedUnlockModal(true);
    }
  }, [source]);

  if (!content || !source) {
    return (
      <Loader
        type='bars'
        style={{
          position: 'absolute',
          top: '35%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />
    );
  }

  const description =
    source.description.trim() && !source.description.trim().startsWith('> ')
      ? `> ${source.description}`
      : source.description;

  const actions = content.abilityBlocks.filter((block) => block.type === 'action');
  const feats = content.abilityBlocks.filter((block) => block.type === 'feat');
  const physicalFeatures = content.abilityBlocks.filter((block) => block.type === 'physical-feature');
  const senses = content.abilityBlocks.filter((block) => block.type === 'sense');
  const modes = content.abilityBlocks.filter((block) => block.type === 'mode');

  // Find uncategorized ability blocks
  const classTraits = content.traits.filter((trait) => trait.meta_data?.class_trait);
  const ancestryTraits = content.traits.filter((trait) => trait.meta_data?.ancestry_trait);
  const uncategorizedAbilities = content.abilityBlocks.filter((ab) => {
    if (ab.type === 'class-feature' && !classTraits.find((trait) => ab.traits?.includes(trait.id))) {
      return true;
    }
    if (
      ab.type === 'heritage' &&
      !ancestryTraits.find((trait) => ab.traits?.includes(trait.id)) &&
      !content.versatileHeritages.find((vh) => vh.heritage_id === ab.id)
    ) {
      return true;
    }
    return false;
  });

  return (
    <Box>
      <RichText ta='justify' fs='italic'>
        {description}
      </RichText>

      {source.contact_info?.trim() && <Text>{source.contact_info}</Text>}
      {/* TODO: Required sources */}

      <Box>
        <Accordion
          variant='separated'
          styles={{
            label: {
              paddingTop: 5,
              paddingBottom: 5,
            },
            control: {
              paddingLeft: 13,
              paddingRight: 13,
            },
            item: {
              marginTop: 0,
              marginBottom: 5,
            },
          }}
        >
          {actions.length > 0 && (
            <Accordion.Item value={'actions'} w='100%'>
              <Accordion.Control>
                <Group wrap='nowrap' justify='space-between' gap={0}>
                  <Text c='white' fz='sm'>
                    Actions
                  </Text>
                  <Badge mr='sm' variant='outline' color='gray.5' size='xs'>
                    <Text fz='sm' c='gray.5' span>
                      {actions.length}
                    </Text>
                  </Badge>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <Divider color='dark.6' />
                {actions.map((record, index) => (
                  <ActionSelectionOption
                    key={index}
                    action={record}
                    showButton={false}
                    onClick={(a) => {
                      openDrawer({
                        type: 'action',
                        data: { id: a.id },
                        extra: { addToHistory: true },
                      });
                    }}
                  />
                ))}
              </Accordion.Panel>
            </Accordion.Item>
          )}
          {content.ancestries.length > 0 && (
            <Accordion.Item value={'ancestries'} w='100%'>
              <Accordion.Control>
                <Group wrap='nowrap' justify='space-between' gap={0}>
                  <Text c='white' fz='sm'>
                    Ancestries
                  </Text>
                  <Badge mr='sm' variant='outline' color='gray.5' size='xs'>
                    <Text fz='sm' c='gray.5' span>
                      {content.ancestries.length}
                    </Text>
                  </Badge>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <Divider color='dark.6' />
                {content.ancestries.map((record, index) => (
                  <AncestrySelectionOption
                    key={index}
                    ancestry={record}
                    showButton={false}
                    onClick={(a) => {
                      openDrawer({
                        type: 'ancestry',
                        data: { id: a.id },
                        extra: { addToHistory: true },
                      });
                    }}
                  />
                ))}
              </Accordion.Panel>
            </Accordion.Item>
          )}
          {content.backgrounds.length > 0 && (
            <Accordion.Item value={'backgrounds'} w='100%'>
              <Accordion.Control>
                <Group wrap='nowrap' justify='space-between' gap={0}>
                  <Text c='white' fz='sm'>
                    Backgrounds
                  </Text>
                  <Badge mr='sm' variant='outline' color='gray.5' size='xs'>
                    <Text fz='sm' c='gray.5' span>
                      {content.backgrounds.length}
                    </Text>
                  </Badge>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <Divider color='dark.6' />
                {content.backgrounds.map((record, index) => (
                  <BackgroundSelectionOption
                    key={index}
                    background={record}
                    showButton={false}
                    onClick={(a) => {
                      openDrawer({
                        type: 'background',
                        data: { id: a.id },
                        extra: { addToHistory: true },
                      });
                    }}
                  />
                ))}
              </Accordion.Panel>
            </Accordion.Item>
          )}
          {content.classes.length > 0 && (
            <Accordion.Item value={'classes'} w='100%'>
              <Accordion.Control>
                <Group wrap='nowrap' justify='space-between' gap={0}>
                  <Text c='white' fz='sm'>
                    Classes
                  </Text>
                  <Badge mr='sm' variant='outline' color='gray.5' size='xs'>
                    <Text fz='sm' c='gray.5' span>
                      {content.classes.length}
                    </Text>
                  </Badge>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <Divider color='dark.6' />
                {content.classes.map((record, index) => (
                  <ClassSelectionOption
                    key={index}
                    class_={record}
                    showButton={false}
                    onClick={(a) => {
                      openDrawer({
                        type: 'class',
                        data: { id: a.id },
                        extra: { addToHistory: true },
                      });
                    }}
                  />
                ))}
              </Accordion.Panel>
            </Accordion.Item>
          )}
          {content.archetypes.length > 0 && (
            <Accordion.Item value={'archetypes'} w='100%'>
              <Accordion.Control>
                <Group wrap='nowrap' justify='space-between' gap={0}>
                  <Text c='white' fz='sm'>
                    Archetypes
                  </Text>
                  <Badge mr='sm' variant='outline' color='gray.5' size='xs'>
                    <Text fz='sm' c='gray.5' span>
                      {content.archetypes.length}
                    </Text>
                  </Badge>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <Divider color='dark.6' />
                {content.archetypes.map((record, index) => (
                  <ArchetypeSelectionOption
                    key={index}
                    archetype={record}
                    showButton={false}
                    onClick={(a) => {
                      openDrawer({
                        type: 'archetype',
                        data: { id: a.id },
                        extra: { addToHistory: true },
                      });
                    }}
                  />
                ))}
              </Accordion.Panel>
            </Accordion.Item>
          )}
          {content.versatileHeritages.length > 0 && (
            <Accordion.Item value={'versatile-heritages'} w='100%'>
              <Accordion.Control>
                <Group wrap='nowrap' justify='space-between' gap={0}>
                  <Text c='white' fz='sm'>
                    Versatile Heritages
                  </Text>
                  <Badge mr='sm' variant='outline' color='gray.5' size='xs'>
                    <Text fz='sm' c='gray.5' span>
                      {content.versatileHeritages.length}
                    </Text>
                  </Badge>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <Divider color='dark.6' />
                {content.versatileHeritages.map((record, index) => (
                  <VersatileHeritageSelectionOption
                    key={index}
                    versatileHeritage={record}
                    showButton={false}
                    onClick={(a) => {
                      openDrawer({
                        type: 'versatile-heritage',
                        data: { id: a.id },
                        extra: { addToHistory: true },
                      });
                    }}
                  />
                ))}
              </Accordion.Panel>
            </Accordion.Item>
          )}
          {content.creatures.length > 0 && (
            <Accordion.Item value={'creatures'} w='100%'>
              <Accordion.Control>
                <Group wrap='nowrap' justify='space-between' gap={0}>
                  <Text c='white' fz='sm'>
                    Creatures
                  </Text>
                  <Badge mr='sm' variant='outline' color='gray.5' size='xs'>
                    <Text fz='sm' c='gray.5' span>
                      {content.creatures.length}
                    </Text>
                  </Badge>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <Divider color='dark.6' />
                {content.creatures.map((record, index) => (
                  <CreatureSelectionOption
                    key={index}
                    creature={record}
                    showButton={false}
                    onClick={(a) => {
                      openDrawer({
                        type: 'creature',
                        data: { id: a.id, zIndex: CREATURE_DRAWER_ZINDEX },
                        extra: { addToHistory: true },
                      });
                    }}
                  />
                ))}
              </Accordion.Panel>
            </Accordion.Item>
          )}
          {feats.length > 0 && (
            <Accordion.Item value={'feats'} w='100%'>
              <Accordion.Control>
                <Group wrap='nowrap' justify='space-between' gap={0}>
                  <Text c='white' fz='sm'>
                    Feats
                  </Text>
                  <Badge mr='sm' variant='outline' color='gray.5' size='xs'>
                    <Text fz='sm' c='gray.5' span>
                      {feats.length}
                    </Text>
                  </Badge>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <Divider color='dark.6' />
                {feats.map((record, index) => (
                  <FeatSelectionOption
                    key={index}
                    feat={record}
                    showButton={false}
                    onClick={(a) => {
                      openDrawer({
                        type: 'feat',
                        data: { id: a.id },
                        extra: { addToHistory: true },
                      });
                    }}
                  />
                ))}
              </Accordion.Panel>
            </Accordion.Item>
          )}
          {content.items.length > 0 && (
            <Accordion.Item value={'items'} w='100%'>
              <Accordion.Control>
                <Group wrap='nowrap' justify='space-between' gap={0}>
                  <Text c='white' fz='sm'>
                    Items
                  </Text>
                  <Badge mr='sm' variant='outline' color='gray.5' size='xs'>
                    <Text fz='sm' c='gray.5' span>
                      {content.items.length}
                    </Text>
                  </Badge>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <Divider color='dark.6' />
                {content.items.map((record, index) => (
                  <ItemSelectionOption
                    key={index}
                    item={record}
                    showButton={false}
                    onClick={(a) => {
                      openDrawer({
                        type: 'item',
                        data: { id: a.id },
                        extra: { addToHistory: true },
                      });
                    }}
                  />
                ))}
              </Accordion.Panel>
            </Accordion.Item>
          )}
          {content.languages.length > 0 && (
            <Accordion.Item value={'languages'} w='100%'>
              <Accordion.Control>
                <Group wrap='nowrap' justify='space-between' gap={0}>
                  <Text c='white' fz='sm'>
                    Languages
                  </Text>
                  <Badge mr='sm' variant='outline' color='gray.5' size='xs'>
                    <Text fz='sm' c='gray.5' span>
                      {content.languages.length}
                    </Text>
                  </Badge>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <Divider color='dark.6' />
                {content.languages.map((record, index) => (
                  <LanguageSelectionOption
                    key={index}
                    language={record}
                    showButton={false}
                    onClick={(a) => {
                      openDrawer({
                        type: 'language',
                        data: { id: a.id },
                        extra: { addToHistory: true },
                      });
                    }}
                  />
                ))}
              </Accordion.Panel>
            </Accordion.Item>
          )}
          {modes.length > 0 && (
            <Accordion.Item value={'modes'} w='100%'>
              <Accordion.Control>
                <Group wrap='nowrap' justify='space-between' gap={0}>
                  <Text c='white' fz='sm'>
                    Modes
                  </Text>
                  <Badge mr='sm' variant='outline' color='gray.5' size='xs'>
                    <Text fz='sm' c='gray.5' span>
                      {modes.length}
                    </Text>
                  </Badge>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <Divider color='dark.6' />
                {modes.map((record, index) => (
                  <ModeSelectionOption
                    key={index}
                    mode={record}
                    showButton={false}
                    onClick={(a) => {
                      openDrawer({
                        type: 'mode',
                        data: { id: a.id },
                        extra: { addToHistory: true },
                      });
                    }}
                  />
                ))}
              </Accordion.Panel>
            </Accordion.Item>
          )}
          {physicalFeatures.length > 0 && (
            <Accordion.Item value={'physical-features'} w='100%'>
              <Accordion.Control>
                <Group wrap='nowrap' justify='space-between' gap={0}>
                  <Text c='white' fz='sm'>
                    Physical Features
                  </Text>
                  <Badge mr='sm' variant='outline' color='gray.5' size='xs'>
                    <Text fz='sm' c='gray.5' span>
                      {physicalFeatures.length}
                    </Text>
                  </Badge>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <Divider color='dark.6' />
                {physicalFeatures.map((record, index) => (
                  <PhysicalFeatureSelectionOption
                    key={index}
                    physicalFeature={record}
                    showButton={false}
                    onClick={(a) => {
                      openDrawer({
                        type: 'physical-feature',
                        data: { id: a.id },
                        extra: { addToHistory: true },
                      });
                    }}
                  />
                ))}
              </Accordion.Panel>
            </Accordion.Item>
          )}
          {senses.length > 0 && (
            <Accordion.Item value={'senses'} w='100%'>
              <Accordion.Control>
                <Group wrap='nowrap' justify='space-between' gap={0}>
                  <Text c='white' fz='sm'>
                    Senses
                  </Text>
                  <Badge mr='sm' variant='outline' color='gray.5' size='xs'>
                    <Text fz='sm' c='gray.5' span>
                      {senses.length}
                    </Text>
                  </Badge>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <Divider color='dark.6' />
                {senses.map((record, index) => (
                  <SenseSelectionOption
                    key={index}
                    sense={record}
                    showButton={false}
                    onClick={(a) => {
                      openDrawer({
                        type: 'sense',
                        data: { id: a.id },
                        extra: { addToHistory: true },
                      });
                    }}
                  />
                ))}
              </Accordion.Panel>
            </Accordion.Item>
          )}
          {content.spells.length > 0 && (
            <Accordion.Item value={'spells'} w='100%'>
              <Accordion.Control>
                <Group wrap='nowrap' justify='space-between' gap={0}>
                  <Text c='white' fz='sm'>
                    Spells
                  </Text>
                  <Badge mr='sm' variant='outline' color='gray.5' size='xs'>
                    <Text fz='sm' c='gray.5' span>
                      {content.spells.length}
                    </Text>
                  </Badge>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <Divider color='dark.6' />
                {content.spells.map((record, index) => (
                  <SpellSelectionOption
                    key={index}
                    spell={record}
                    showButton={false}
                    onClick={(a) => {
                      openDrawer({
                        type: 'spell',
                        data: { id: a.id },
                        extra: { addToHistory: true },
                      });
                    }}
                  />
                ))}
              </Accordion.Panel>
            </Accordion.Item>
          )}
          {content.traits.length > 0 && (
            <Accordion.Item value={'traits'} w='100%'>
              <Accordion.Control>
                <Group wrap='nowrap' justify='space-between' gap={0}>
                  <Text c='white' fz='sm'>
                    Traits
                  </Text>
                  <Badge mr='sm' variant='outline' color='gray.5' size='xs'>
                    <Text fz='sm' c='gray.5' span>
                      {content.traits.length}
                    </Text>
                  </Badge>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <Divider color='dark.6' />
                {content.traits.map((record, index) => (
                  <TraitSelectionOption
                    key={index}
                    trait={record}
                    showButton={false}
                    onClick={(a) => {
                      openDrawer({
                        type: 'trait',
                        data: { id: a.id },
                        extra: { addToHistory: true },
                      });
                    }}
                  />
                ))}
              </Accordion.Panel>
            </Accordion.Item>
          )}
          {uncategorizedAbilities.length > 0 && (
            <Accordion.Item value={'uncategorized'} w='100%'>
              <Accordion.Control>
                <Group wrap='nowrap' justify='space-between' gap={0}>
                  <Text c='white' fz='sm' fw={600}>
                    Uncategorized
                  </Text>
                  <Badge mr='sm' variant='outline' color='gray.5' size='xs'>
                    <Text fz='sm' c='gray.5' span>
                      {uncategorizedAbilities.length}
                    </Text>
                  </Badge>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <Divider color='dark.6' />
                {uncategorizedAbilities.map((record, index) => (
                  <ActionSelectionOption
                    key={index}
                    action={record}
                    showButton={false}
                    onClick={(a) => {
                      openDrawer({
                        type: (record.type ?? 'action') as DrawerType,
                        data: { id: a.id },
                        extra: { addToHistory: true },
                      });
                    }}
                  />
                ))}
              </Accordion.Panel>
            </Accordion.Item>
          )}
        </Accordion>
      </Box>

      {props.data.showOperations && <ShowOperationsButton name={source.name} operations={source.operations} />}

      {!source.user_id && (
        <Box>
          <Divider my='sm' />
          <Select
            ref={missingSelectRef}
            searchable
            placeholder='Missing something?'
            data={
              [
                { label: 'Action', value: 'action' },
                { label: 'Ancestry', value: 'ancestry' },
                { label: 'Archetype', value: 'archetype' },
                { label: 'Background', value: 'background' },
                { label: 'Class', value: 'class' },
                { label: 'Class Feature', value: 'class-feature' },
                { label: 'Creature', value: 'creature' },
                { label: 'Feat', value: 'feat' },
                { label: 'Heritage', value: 'heritage' },
                { label: 'Item', value: 'item' },
                { label: 'Language', value: 'language' },
                { label: 'Mode', value: 'mode' },
                { label: 'Physical Feature', value: 'physical-feature' },
                { label: 'Sense', value: 'sense' },
                { label: 'Spell', value: 'spell' },
                { label: 'Trait', value: 'trait' },
                { label: 'Versatile Heritage', value: 'versatile-heritage' },
              ] satisfies { label: string; value: ContentType | AbilityBlockType }[]
            }
            styles={{
              dropdown: {
                zIndex: 10000,
              },
            }}
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            onChange={(value) => {
              if (!value) return;
              missingSelectRef.current?.blur();
              setSearchValue('');
              props.data.onFeedback?.(value as ContentType | AbilityBlockType, -1, source.id);
            }}
          />
        </Box>
      )}

      <UnlockHomebrewModal
        opened={openedUnlockModal}
        source={source}
        onSuccess={() => {
          setOpenedUnlockModal(false);
        }}
        onClose={() => {
          openDrawer(null);
        }}
      />
    </Box>
  );
}
