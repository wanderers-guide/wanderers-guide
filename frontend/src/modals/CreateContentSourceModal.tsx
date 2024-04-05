import { OperationSection } from '@common/operations/Operations';
import RichTextInput from '@common/rich_text_input/RichTextInput';
import { SelectionOptionsInner, selectContent } from '@common/select/SelectContent';
import {
  deleteContentSource,
  upsertAbilityBlock,
  upsertAncestry,
  upsertBackground,
  upsertClass,
  upsertContentSource,
  upsertItem,
  upsertSpell,
  upsertTrait,
  upsertLanguage,
  upsertCreature,
  upsertArchetype,
} from '@content/content-creation';
import { defineDefaultSources, fetchContentPackage, resetContentStore } from '@content/content-store';
import { getIconFromContentType, toHTML } from '@content/content-utils';
import {
  Anchor,
  Autocomplete,
  Badge,
  Button,
  Center,
  Collapse,
  Divider,
  Group,
  HoverCard,
  LoadingOverlay,
  Menu,
  Modal,
  Stack,
  Tabs,
  Text,
  TextInput,
  Title,
  rem,
  useMantineTheme,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDebouncedState, useDisclosure } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import {
  IconArrowsLeftRight,
  IconChevronDown,
  IconDatabaseImport,
  IconMessageCircle,
  IconPhoto,
  IconPlus,
  IconSearch,
  IconSettings,
  IconTrash,
} from '@tabler/icons-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { JSONContent } from '@tiptap/react';
import {
  AbilityBlock,
  AbilityBlockType,
  Ancestry,
  Archetype,
  Background,
  Class,
  ContentType,
  Creature,
  Item,
  Language,
  Spell,
  Trait,
} from '@typing/content';
import { Operation } from '@typing/operations';
import { pluralize, toLabel } from '@utils/strings';
import * as JsSearch from 'js-search';
import * as _ from 'lodash-es';
import { useEffect, useRef, useState } from 'react';
import { CreateAbilityBlockModal } from './CreateAbilityBlockModal';
import { CreateAncestryModal } from './CreateAncestryModal';
import { CreateBackgroundModal } from './CreateBackgroundModal';
import { CreateClassModal } from './CreateClassModal';
import { CreateItemModal } from './CreateItemModal';
import { CreateSpellModal } from './CreateSpellModal';
import { CreateTraitModal } from './CreateTraitModal';
import { CreateLanguageModal } from './CreateLanguageModal';
import { DISCORD_URL } from '@constants/data';
import { CreateCreatureModal } from './CreateCreatureModal';
import { CreateArchetypeModal } from './CreateArchetypeModal';

export function CreateContentSourceModal(props: { opened: boolean; sourceId: number; onClose: () => void }) {
  const theme = useMantineTheme();
  const [description, setDescription] = useState<JSONContent>();
  const [openedOperations, { toggle: toggleOperations }] = useDisclosure(false);

  const { data, isFetching } = useQuery({
    queryKey: [`find-content-source-details-${props.sourceId}`],
    queryFn: async () => {
      const content = await fetchContentPackage([props.sourceId], true);
      const source = content.sources?.find((i) => i.id === props.sourceId);
      if (!source) return null;

      form.setInitialValues({
        name: source.name,
        foundry_id: source.foundry_id,
        url: source.url,
        description: source.description,
        operations: source.operations ?? [],
        contact_info: source.contact_info,
        group: source.group,
      });
      form.reset();

      return {
        content,
        source,
      };
    },
    refetchOnWindowFocus: false,
  });

  const form = useForm({
    initialValues: {
      name: '',
      foundry_id: '',
      url: '',
      description: '',
      operations: [] as Operation[],
      contact_info: '',
      group: '',
    },
  });

  const onSave = async (values: typeof form.values) => {
    await upsertContentSource({
      id: props.sourceId,
      created_at: data?.source.created_at ?? '',
      user_id: data?.source.user_id ?? '',
      name: values.name,
      foundry_id: values.foundry_id,
      url: values.url,
      description: values.description,
      operations: values.operations,
      contact_info: values.contact_info,
      group: values.group,
      require_key: data?.source.require_key ?? false,
      is_published: data?.source.is_published ?? false,
      required_content_sources: data?.source.required_content_sources ?? [],
      meta_data: data?.source.meta_data ?? {},
    });
    showNotification({
      title: `Updated ${values.name}`,
      message: `Successfully updated content source.`,
      autoClose: 3000,
    });
  };

  const onReset = () => {
    form.reset();
  };

  return (
    <Modal
      opened={props.opened}
      onClose={() => {
        props.onClose();
        onReset();
      }}
      title={<Title order={3}>{'Update Content Source'}</Title>}
      styles={{
        body: {
          paddingRight: 2,
        },
      }}
      fullScreen
      closeOnClickOutside={false}
      closeOnEscape={false}
      keepMounted={false}
    >
      <LoadingOverlay visible={isFetching} />
      <Group align='flex-start'>
        <form onSubmit={form.onSubmit(onSave)}>
          <Center maw={350}>
            <Stack gap={10}>
              <Group wrap='nowrap' justify='space-between'>
                <TextInput label='Name' required {...form.getInputProps('name')} />

                <TextInput label='Foundry ID' required {...form.getInputProps('foundry_id')} />
              </Group>

              <TextInput label='URL' {...form.getInputProps('url')} />

              <Group wrap='nowrap' justify='space-between'>
                <TextInput label='Contact Info' {...form.getInputProps('contact_info')} />

                <Autocomplete
                  label='Group'
                  data={['core', 'lost-omens', 'adventure-path', 'standalone-adventure', 'misc']}
                  {...form.getInputProps('group')}
                />
              </Group>

              {(description || form.values.description) && (
                <RichTextInput
                  label='Description'
                  required
                  value={description ?? toHTML(form.values.description)}
                  onChange={(text, json) => {
                    setDescription(json);
                    form.setFieldValue('description', text);
                  }}
                />
              )}

              <Divider
                my='xs'
                label={
                  <Group gap={3} wrap='nowrap'>
                    <Button variant={openedOperations ? 'light' : 'subtle'} size='compact-sm' color='gray.6'>
                      Operations
                    </Button>
                    {form.values.operations && form.values.operations.length > 0 && (
                      <Badge variant='light' color={theme.primaryColor} size='xs'>
                        {form.values.operations.length}
                      </Badge>
                    )}
                  </Group>
                }
                labelPosition='left'
                onClick={toggleOperations}
              />
              <Collapse in={openedOperations}>
                <Stack gap={10}>
                  <OperationSection
                    title={
                      <HoverCard openDelay={250} width={260} shadow='md' withinPortal>
                        <HoverCard.Target>
                          <Anchor target='_blank' underline='hover' fz='sm' fs='italic'>
                            How to Use Operations
                          </Anchor>
                        </HoverCard.Target>
                        <HoverCard.Dropdown>
                          <Text size='sm'>
                            Operations are used to make changes to a character. They can give feats, spells, and more,
                            as well as change stats, skills, and other values.
                          </Text>
                          <Text size='sm'>
                            Use conditionals to apply operations only when certain conditions are met and selections
                            whenever a choice needs to be made.
                          </Text>
                          <Text size='xs' fs='italic'>
                            For more help, see{' '}
                            <Anchor href={DISCORD_URL} target='_blank' underline='hover'>
                              our Discord server
                            </Anchor>
                            .
                          </Text>
                        </HoverCard.Dropdown>
                      </HoverCard>
                    }
                    value={form.values.operations}
                    onChange={(operations) => form.setValues({ ...form.values, operations })}
                  />
                  <Divider />
                </Stack>
              </Collapse>

              <Group justify='flex-end'>
                <Button
                  variant='default'
                  size='compact-sm'
                  onClick={() => {
                    onReset();
                  }}
                >
                  Cancel
                </Button>
                <Button size='compact-sm' type='submit'>
                  Save
                </Button>
              </Group>
            </Stack>
          </Center>
        </form>
        <Center style={{ flex: 1 }}>
          <Tabs w='100%' variant='outline' defaultValue='feats' orientation='vertical' keepMounted={false}>
            <Tabs.List>
              <Tabs.Tab
                value='actions'
                leftSection={getIconFromContentType('ability-block', '1rem')}
                rightSection={
                  <>
                    {data?.content.abilityBlocks &&
                      data?.content.abilityBlocks.filter((i) => i.type === 'action').length > 0 && (
                        <Badge variant='light' color={theme.primaryColor} size='xs'>
                          {data?.content.abilityBlocks.filter((i) => i.type === 'action').length}
                        </Badge>
                      )}
                  </>
                }
              >
                Actions
              </Tabs.Tab>
              <Tabs.Tab
                value='feats'
                leftSection={getIconFromContentType('ability-block', '1rem')}
                rightSection={
                  <>
                    {data?.content.abilityBlocks &&
                      data?.content.abilityBlocks.filter((i) => i.type === 'feat').length > 0 && (
                        <Badge variant='light' color={theme.primaryColor} size='xs'>
                          {data?.content.abilityBlocks.filter((i) => i.type === 'feat').length}
                        </Badge>
                      )}
                  </>
                }
              >
                Feats
              </Tabs.Tab>
              <Tabs.Tab
                value='items'
                leftSection={getIconFromContentType('item', '1rem')}
                rightSection={
                  <>
                    {data?.content.items && data?.content.items.length > 0 && (
                      <Badge variant='light' color={theme.primaryColor} size='xs'>
                        {data?.content.items.length}
                      </Badge>
                    )}
                  </>
                }
              >
                Items
              </Tabs.Tab>
              <Tabs.Tab
                value='spells'
                leftSection={getIconFromContentType('spell', '1rem')}
                rightSection={
                  <>
                    {data?.content.spells && data?.content.spells.length > 0 && (
                      <Badge variant='light' color={theme.primaryColor} size='xs'>
                        {data?.content.spells.length}
                      </Badge>
                    )}
                  </>
                }
              >
                Spells
              </Tabs.Tab>
              <Tabs.Tab
                value='traits'
                leftSection={getIconFromContentType('trait', '1rem')}
                rightSection={
                  <>
                    {data?.content.traits && data?.content.traits.length > 0 && (
                      <Badge variant='light' color={theme.primaryColor} size='xs'>
                        {data?.content.traits.length}
                      </Badge>
                    )}
                  </>
                }
              >
                Traits
              </Tabs.Tab>
              <Tabs.Tab
                value='languages'
                leftSection={getIconFromContentType('language', '1rem')}
                rightSection={
                  <>
                    {data?.content.languages && data?.content.languages.length > 0 && (
                      <Badge variant='light' color={theme.primaryColor} size='xs'>
                        {data?.content.languages.length}
                      </Badge>
                    )}
                  </>
                }
              >
                Languages
              </Tabs.Tab>
              <Tabs.Tab
                value='creatures'
                leftSection={getIconFromContentType('creature', '1rem')}
                rightSection={
                  <>
                    {data?.content.creatures && data?.content.creatures.length > 0 && (
                      <Badge variant='light' color={theme.primaryColor} size='xs'>
                        {data?.content.creatures.length}
                      </Badge>
                    )}
                  </>
                }
              >
                Creatures
              </Tabs.Tab>
              <Tabs.Tab
                value='ancestries'
                leftSection={getIconFromContentType('ancestry', '1rem')}
                rightSection={
                  <>
                    {data?.content.ancestries && data?.content.ancestries.length > 0 && (
                      <Badge variant='light' color={theme.primaryColor} size='xs'>
                        {data?.content.ancestries.length}
                      </Badge>
                    )}
                  </>
                }
              >
                Ancestries
              </Tabs.Tab>
              <Tabs.Tab
                value='heritages'
                leftSection={getIconFromContentType('ability-block', '1rem')}
                rightSection={
                  <>
                    {data?.content.abilityBlocks &&
                      data?.content.abilityBlocks.filter((i) => i.type === 'heritage').length > 0 && (
                        <Badge variant='light' color={theme.primaryColor} size='xs'>
                          {data?.content.abilityBlocks.filter((i) => i.type === 'heritage').length}
                        </Badge>
                      )}
                  </>
                }
              >
                Heritages
              </Tabs.Tab>
              <Tabs.Tab
                value='senses'
                leftSection={getIconFromContentType('ability-block', '1rem')}
                rightSection={
                  <>
                    {data?.content.abilityBlocks &&
                      data?.content.abilityBlocks.filter((i) => i.type === 'sense').length > 0 && (
                        <Badge variant='light' color={theme.primaryColor} size='xs'>
                          {data?.content.abilityBlocks.filter((i) => i.type === 'sense').length}
                        </Badge>
                      )}
                  </>
                }
              >
                Senses
              </Tabs.Tab>
              <Tabs.Tab
                value='physical-features'
                leftSection={getIconFromContentType('ability-block', '1rem')}
                rightSection={
                  <>
                    {data?.content.abilityBlocks &&
                      data?.content.abilityBlocks.filter((i) => i.type === 'physical-feature').length > 0 && (
                        <Badge variant='light' color={theme.primaryColor} size='xs'>
                          {data?.content.abilityBlocks.filter((i) => i.type === 'physical-feature').length}
                        </Badge>
                      )}
                  </>
                }
              >
                Physical Features
              </Tabs.Tab>
              <Tabs.Tab
                value='backgrounds'
                leftSection={getIconFromContentType('background', '1rem')}
                rightSection={
                  <>
                    {data?.content.backgrounds && data?.content.backgrounds.length > 0 && (
                      <Badge variant='light' color={theme.primaryColor} size='xs'>
                        {data?.content.backgrounds.length}
                      </Badge>
                    )}
                  </>
                }
              >
                Backgrounds
              </Tabs.Tab>
              <Tabs.Tab
                value='classes'
                leftSection={getIconFromContentType('class', '1rem')}
                rightSection={
                  <>
                    {data?.content.classes && data?.content.classes.length > 0 && (
                      <Badge variant='light' color={theme.primaryColor} size='xs'>
                        {data?.content.classes.length}
                      </Badge>
                    )}
                  </>
                }
              >
                Classes
              </Tabs.Tab>
              <Tabs.Tab
                value='class-features'
                leftSection={getIconFromContentType('ability-block', '1rem')}
                rightSection={
                  <>
                    {data?.content.abilityBlocks &&
                      data?.content.abilityBlocks.filter((i) => i.type === 'class-feature').length > 0 && (
                        <Badge variant='light' color={theme.primaryColor} size='xs'>
                          {data?.content.abilityBlocks.filter((i) => i.type === 'class-feature').length}
                        </Badge>
                      )}
                  </>
                }
              >
                Class Features
              </Tabs.Tab>
              <Tabs.Tab
                value='archetypes'
                leftSection={getIconFromContentType('archetype', '1rem')}
                rightSection={
                  <>
                    {data?.content.archetypes && data?.content.archetypes.length > 0 && (
                      <Badge variant='light' color={theme.primaryColor} size='xs'>
                        {data?.content.archetypes.length}
                      </Badge>
                    )}
                  </>
                }
              >
                Archetypes
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value='actions'>
              <ContentList<AbilityBlock>
                sourceId={props.sourceId}
                type='ability-block'
                abilityBlockType='action'
                content={(data?.content.abilityBlocks ?? []).filter((item) => item.type === 'action')}
              />
            </Tabs.Panel>

            <Tabs.Panel value='feats'>
              <ContentList<AbilityBlock>
                sourceId={props.sourceId}
                type='ability-block'
                abilityBlockType='feat'
                content={(data?.content.abilityBlocks ?? []).filter((item) => item.type === 'feat')}
              />
            </Tabs.Panel>

            <Tabs.Panel value='items'>
              <ContentList<Item> sourceId={props.sourceId} type='item' content={data?.content.items ?? []} />
            </Tabs.Panel>

            <Tabs.Panel value='spells'>
              <ContentList<Spell> sourceId={props.sourceId} type='spell' content={data?.content.spells ?? []} />
            </Tabs.Panel>

            <Tabs.Panel value='traits'>
              <ContentList<Trait> sourceId={props.sourceId} type='trait' content={data?.content.traits ?? []} />
            </Tabs.Panel>

            <Tabs.Panel value='languages'>
              <ContentList<Language>
                sourceId={props.sourceId}
                type='language'
                content={data?.content.languages ?? []}
              />
            </Tabs.Panel>

            <Tabs.Panel value='creatures'>
              <ContentList<Creature>
                sourceId={props.sourceId}
                type='creature'
                content={data?.content.creatures ?? []}
              />
            </Tabs.Panel>

            <Tabs.Panel value='ancestries'>
              <ContentList<Ancestry>
                sourceId={props.sourceId}
                type='ancestry'
                content={data?.content.ancestries ?? []}
              />
            </Tabs.Panel>

            <Tabs.Panel value='heritages'>
              <ContentList<AbilityBlock>
                sourceId={props.sourceId}
                type='ability-block'
                abilityBlockType='heritage'
                content={(data?.content.abilityBlocks ?? []).filter((item) => item.type === 'heritage')}
              />
            </Tabs.Panel>

            <Tabs.Panel value='senses'>
              <ContentList<AbilityBlock>
                sourceId={props.sourceId}
                type='ability-block'
                abilityBlockType='sense'
                content={(data?.content.abilityBlocks ?? []).filter((item) => item.type === 'sense')}
              />
            </Tabs.Panel>

            <Tabs.Panel value='physical-features'>
              <ContentList<AbilityBlock>
                sourceId={props.sourceId}
                type='ability-block'
                abilityBlockType='physical-feature'
                content={(data?.content.abilityBlocks ?? []).filter((item) => item.type === 'physical-feature')}
              />
            </Tabs.Panel>

            <Tabs.Panel value='backgrounds'>
              <ContentList<Background>
                sourceId={props.sourceId}
                type='background'
                content={data?.content.backgrounds ?? []}
              />
            </Tabs.Panel>

            <Tabs.Panel value='classes'>
              <ContentList<Class> sourceId={props.sourceId} type='class' content={data?.content.classes ?? []} />
            </Tabs.Panel>

            <Tabs.Panel value='class-features'>
              <ContentList<AbilityBlock>
                sourceId={props.sourceId}
                type='ability-block'
                abilityBlockType='class-feature'
                content={(data?.content.abilityBlocks ?? []).filter((item) => item.type === 'class-feature')}
              />
            </Tabs.Panel>

            <Tabs.Panel value='archetypes'>
              <ContentList<Archetype>
                sourceId={props.sourceId}
                type='archetype'
                content={data?.content.archetypes ?? []}
              />
            </Tabs.Panel>
          </Tabs>
        </Center>
      </Group>
    </Modal>
  );
}

function ContentList<
  T extends {
    name: string;
    level?: number;
    rank?: number;
    type?: AbilityBlockType;
  },
>(props: { sourceId: number; type: ContentType; content: T[]; abilityBlockType?: AbilityBlockType }) {
  const queryClient = useQueryClient();
  const theme = useMantineTheme();
  const [openedId, setOpenedId] = useState<number | undefined>();
  const [loading, setLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useDebouncedState('', 200);
  const search = useRef(new JsSearch.Search('id'));
  useEffect(() => {
    if (!props.content) return;
    initJsSearch();
  }, [props.content]);

  const initJsSearch = () => {
    search.current = new JsSearch.Search('id');
    search.current.addIndex('name');
    //search.current.addIndex('description');
    search.current.addDocuments(_.cloneDeep(props.content));
  };

  const getContent = () => {
    let content = _.cloneDeep(props.content);
    content = searchQuery ? (search.current.search(searchQuery) as T[]) : content;

    // Sort by level/rank then name
    content = content.sort((a, b) => {
      if (a.level !== undefined && b.level !== undefined) {
        if (a.level !== b.level) {
          return a.level - b.level;
        }
      } else if (a.rank !== undefined && b.rank !== undefined) {
        if (a.rank !== b.rank) {
          return a.rank - b.rank;
        }
      }
      return a.name.localeCompare(b.name);
    });

    return content;
  };

  const handleReset = () => {
    const query = searchQuery;
    setSearchQuery('');
    setTimeout(() => {
      setOpenedId(undefined);
      initJsSearch();
      resetContentStore(false);
      queryClient.refetchQueries([`find-content-source-details-${props.sourceId}`]);

      setSearchQuery(query);
      setLoading(false);
    }, 500);
  };

  async function copyData(itemId?: number, data?: Record<string, any>) {
    if (props.type === 'ability-block') {
      const item = (data ??
        (props.content as unknown as AbilityBlock[]).find((i) => i.id === itemId)) as AbilityBlock | null;
      if (item) {
        const newItem = _.cloneDeep(item);
        newItem.id = -1;
        newItem.name = `(Copy) ${item.name}`;
        newItem.content_source_id = props.sourceId;
        await upsertAbilityBlock(newItem);
      }
    } else if (props.type === 'spell') {
      const item = (data ?? (props.content as unknown as Spell[]).find((i) => i.id === itemId)) as Spell | null;
      if (item) {
        const newItem = _.cloneDeep(item);
        newItem.id = -1;
        newItem.name = `(Copy) ${item.name}`;
        newItem.content_source_id = props.sourceId;
        await upsertSpell(newItem);
      }
    } else if (props.type === 'class') {
      const item = (data ?? (props.content as unknown as Class[]).find((i) => i.id === itemId)) as Class | null;
      if (item) {
        const newItem = _.cloneDeep(item);
        newItem.id = -1;
        newItem.name = `(Copy) ${item.name}`;
        newItem.content_source_id = props.sourceId;
        await upsertClass(newItem);
      }
    } else if (props.type === 'ancestry') {
      const item = (data ?? (props.content as unknown as Ancestry[]).find((i) => i.id === itemId)) as Ancestry | null;
      if (item) {
        const newItem = _.cloneDeep(item);
        newItem.id = -1;
        newItem.name = `(Copy) ${item.name}`;
        newItem.content_source_id = props.sourceId;
        await upsertAncestry(newItem);
      }
    } else if (props.type === 'background') {
      const item = (data ??
        (props.content as unknown as Background[]).find((i) => i.id === itemId)) as Background | null;
      if (item) {
        const newItem = _.cloneDeep(item);
        newItem.id = -1;
        newItem.name = `(Copy) ${item.name}`;
        newItem.content_source_id = props.sourceId;
        await upsertBackground(newItem);
      }
    } else if (props.type === 'item') {
      const item = (data ?? (props.content as unknown as Item[]).find((i) => i.id === itemId)) as Item | null;
      if (item) {
        const newItem = _.cloneDeep(item);
        newItem.id = -1;
        newItem.name = `(Copy) ${item.name}`;
        newItem.content_source_id = props.sourceId;
        await upsertItem(newItem);
      }
    } else if (props.type === 'trait') {
      const item = (data ?? (props.content as unknown as Trait[]).find((i) => i.id === itemId)) as Trait | null;
      if (item) {
        const newItem = _.cloneDeep(item);
        newItem.id = -1;
        newItem.name = `(Copy) ${item.name}`;
        newItem.content_source_id = props.sourceId;
        await upsertTrait(newItem);
      }
    } else if (props.type === 'creature') {
      const item = (data ?? (props.content as unknown as Creature[]).find((i) => i.id === itemId)) as Creature | null;
      if (item) {
        const newItem = _.cloneDeep(item);
        newItem.id = -1;
        newItem.name = `(Copy) ${item.name}`;
        newItem.content_source_id = props.sourceId;
        await upsertCreature(newItem);
      }
    }
  }

  return (
    <>
      <LoadingOverlay visible={loading} />
      <Stack mx='md' gap={10}>
        <Group wrap='nowrap'>
          <TextInput
            style={{ flex: 1 }}
            leftSection={<IconSearch size='0.9rem' />}
            placeholder={`Search ${pluralize((props.abilityBlockType ?? props.type).replace('-', ' ').toLowerCase())}`}
            onChange={(event) => setSearchQuery(event.target.value)}
            styles={{
              input: {
                borderColor: searchQuery.trim().length > 0 ? theme.colors['guide'][8] : undefined,
              },
            }}
          />

          <Button.Group>
            <Button
              size='compact-lg'
              fz='xs'
              variant='light'
              onClick={() => {
                setOpenedId(-1);
              }}
              styles={{
                section: {
                  marginLeft: 3,
                },
              }}
            >
              Create {toLabel(props.abilityBlockType ?? props.type)}
            </Button>
            <Menu shadow='md'>
              <Menu.Target>
                <Button
                  size='compact-lg'
                  fz='xs'
                  variant='light'
                  style={{
                    borderLeft: '1px solid',
                  }}
                >
                  <IconChevronDown size='1.2rem' />
                </Button>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Item
                  leftSection={<IconDatabaseImport style={{ width: rem(14), height: rem(14) }} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    selectContent(
                      props.type,
                      async (option) => {
                        setLoading(true);
                        await copyData(undefined, option);
                        handleReset();
                      },
                      {
                        abilityBlockType: props.abilityBlockType,
                        groupBySource: true,
                      }
                    );
                  }}
                >
                  Import {toLabel(props.abilityBlockType ?? props.type)}
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Button.Group>
        </Group>
        <Center>
          <Stack w='100%'>
            <SelectionOptionsInner
              options={getContent()}
              type={props.type}
              abilityBlockType={props.abilityBlockType}
              isLoading={false}
              onClick={(item) => setOpenedId(item.id)}
              h={500}
              includeDetails
              includeOptions
              onCopy={async (itemId) => {
                setLoading(true);
                await copyData(itemId, undefined);
                handleReset();
              }}
              onDelete={async (itemId) => {
                setLoading(true);
                const response = await deleteContentSource(props.type, itemId);
                handleReset();
              }}
            />
          </Stack>
        </Center>
      </Stack>

      {props.type === 'ability-block' && openedId && (
        <CreateAbilityBlockModal
          opened={!!openedId}
          type={props.abilityBlockType!}
          editId={openedId}
          onComplete={async (abilityBlock) => {
            abilityBlock.content_source_id = props.sourceId;
            const result = await upsertAbilityBlock(abilityBlock);

            if (result) {
              showNotification({
                title: `Updated ${result.name}`,
                message: `Successfully updated ${result.type}.`,
                autoClose: 3000,
              });
            }

            handleReset();
          }}
          onCancel={() => handleReset()}
        />
      )}

      {props.type === 'spell' && openedId && (
        <CreateSpellModal
          opened={!!openedId}
          editId={openedId}
          onComplete={async (spell) => {
            spell.content_source_id = props.sourceId;
            const result = await upsertSpell(spell);

            if (result) {
              showNotification({
                title: `Updated ${result.name}`,
                message: `Successfully updated spell.`,
                autoClose: 3000,
              });
            }

            handleReset();
          }}
          onCancel={() => handleReset()}
        />
      )}

      {props.type === 'class' && openedId && (
        <CreateClassModal
          opened={!!openedId}
          editId={openedId}
          onComplete={async (class_) => {
            class_.content_source_id = props.sourceId;
            const result = await upsertClass(class_);

            if (result) {
              showNotification({
                title: `Updated ${result.name}`,
                message: `Successfully updated class.`,
                autoClose: 3000,
              });
            }

            handleReset();
          }}
          onCancel={() => handleReset()}
        />
      )}

      {props.type === 'archetype' && openedId && (
        <CreateArchetypeModal
          opened={!!openedId}
          editId={openedId}
          onComplete={async (archetype) => {
            archetype.content_source_id = props.sourceId;
            const result = await upsertArchetype(archetype);

            if (result) {
              showNotification({
                title: `Updated ${result.name}`,
                message: `Successfully updated archetype.`,
                autoClose: 3000,
              });
            }

            handleReset();
          }}
          onCancel={() => handleReset()}
        />
      )}

      {props.type === 'ancestry' && openedId && (
        <CreateAncestryModal
          opened={!!openedId}
          editId={openedId}
          onComplete={async (ancestry) => {
            ancestry.content_source_id = props.sourceId;
            const result = await upsertAncestry(ancestry);

            if (result) {
              showNotification({
                title: `Updated ${result.name}`,
                message: `Successfully updated ancestry.`,
                autoClose: 3000,
              });
            }

            handleReset();
          }}
          onCancel={() => handleReset()}
        />
      )}

      {props.type === 'background' && openedId && (
        <CreateBackgroundModal
          opened={!!openedId}
          editId={openedId}
          onComplete={async (background) => {
            background.content_source_id = props.sourceId;
            const result = await upsertBackground(background);

            if (result) {
              showNotification({
                title: `Updated ${result.name}`,
                message: `Successfully updated background.`,
                autoClose: 3000,
              });
            }

            handleReset();
          }}
          onCancel={() => handleReset()}
        />
      )}

      {props.type === 'trait' && openedId && (
        <CreateTraitModal
          opened={!!openedId}
          editId={openedId}
          onComplete={async (trait) => {
            trait.content_source_id = props.sourceId;
            const result = await upsertTrait(trait);

            if (result) {
              showNotification({
                title: `Updated ${result.name}`,
                message: `Successfully updated trait.`,
                autoClose: 3000,
              });
            }

            handleReset();
          }}
          onCancel={() => handleReset()}
        />
      )}

      {props.type === 'language' && openedId && (
        <CreateLanguageModal
          opened={!!openedId}
          editId={openedId}
          onComplete={async (language) => {
            language.content_source_id = props.sourceId;
            const result = await upsertLanguage(language);

            if (result) {
              showNotification({
                title: `Updated ${result.name}`,
                message: `Successfully updated language.`,
                autoClose: 3000,
              });
            }

            handleReset();
          }}
          onCancel={() => handleReset()}
        />
      )}

      {props.type === 'item' && openedId && (
        <CreateItemModal
          opened={!!openedId}
          editId={openedId}
          onComplete={async (item) => {
            item.content_source_id = props.sourceId;

            console.log(item);
            const result = await upsertItem(item);

            if (result) {
              showNotification({
                title: `Updated ${result.name}`,
                message: `Successfully updated item.`,
                autoClose: 3000,
              });
            }

            handleReset();
          }}
          onCancel={() => handleReset()}
        />
      )}

      {props.type === 'creature' && openedId && (
        <CreateCreatureModal
          opened={!!openedId}
          editId={openedId}
          onComplete={async (creature) => {
            creature.content_source_id = props.sourceId;

            console.log(creature);
            const result = await upsertCreature(creature);

            if (result) {
              showNotification({
                title: `Updated ${result.name}`,
                message: `Successfully updated creature.`,
                autoClose: 3000,
              });
            }

            handleReset();
          }}
          onCancel={() => handleReset()}
        />
      )}
    </>
  );
}
