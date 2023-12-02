import {
  LoadingOverlay,
  Box,
  Modal,
  Stack,
  Group,
  TextInput,
  Select,
  Button,
  Divider,
  Collapse,
  Switch,
  TagsInput,
  Textarea,
  Text,
  Anchor,
  HoverCard,
  Title,
  Badge,
  ScrollArea,
  Autocomplete,
  CloseButton,
  Tooltip,
  Center,
  Tabs,
  useMantineTheme,
} from '@mantine/core';
import _, { set } from 'lodash';
import { useEffect, useRef, useState } from 'react';
import {
  AbilityBlock,
  AbilityBlockType,
  Ancestry,
  Background,
  Class,
  ContentSource,
  ContentType,
  Creature,
  Item,
  Language,
  Rarity,
  Spell,
  Trait,
} from '@typing/content';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from '@mantine/form';
import TraitsInput from '@common/TraitsInput';
import { useDebouncedState, useDisclosure } from '@mantine/hooks';
import { Operation } from '@typing/operations';
import ActionsInput from '@common/ActionsInput';
import { OperationSection } from '@common/operations/Operations';
import RichTextInput from '@common/rich_text_input/RichTextInput';
import { JSONContent } from '@tiptap/react';
import { getIconFromContentType, toHTML } from '@content/content-utils';
import { isValidImage } from '@utils/images';
import { EDIT_MODAL_HEIGHT } from '@constants/data';
import { pluralize, toLabel } from '@utils/strings';
import { IconEdit, IconPlus, IconSearch } from '@tabler/icons-react';
import * as JsSearch from 'js-search';
import { SelectionOptionsInner } from '@common/select/SelectContent';
import { CreateAbilityBlockModal } from './CreateAbilityBlockModal';
import {
  upsertAbilityBlock,
  upsertAncestry,
  upsertBackground,
  upsertClass,
  upsertContentSource,
  upsertSpell,
} from '@content/content-creation';
import { showNotification } from '@mantine/notifications';
import { CreateSpellModal } from './CreateSpellModal';
import { CreateClassModal } from './CreateClassModal';
import { fetchContentPackage } from '@content/content-store';
import { CreateAncestryModal } from './CreateAncestryModal';
import { CreateBackgroundModal } from './CreateBackgroundModal';

export function CreateContentSourceModal(props: {
  opened: boolean;
  sourceId: number;
  onClose: () => void;
}) {
  const theme = useMantineTheme();
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState<JSONContent>();
  const [openedOperations, { toggle: toggleOperations }] = useDisclosure(false);

  const { data, isFetching } = useQuery({
    queryKey: [`find-content-source-details-${props.sourceId}`],
    queryFn: async () => {
      const content = await fetchContentPackage([props.sourceId], true);
      const source = content.sources![0];
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
      user_id: data?.source.user_id ?? -1,
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
      <LoadingOverlay visible={loading || isFetching} />
      <Group align='flex-start'>
        <form onSubmit={form.onSubmit(onSave)}>
          <Center maw={500}>
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
                    <Button
                      variant={openedOperations ? 'light' : 'subtle'}
                      size='compact-sm'
                      color='gray.6'
                    >
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
                            Operations are used to make changes to a character. They can give feats,
                            spells, and more, as well as change stats, skills, and other values.
                          </Text>
                          <Text size='sm'>
                            Use conditionals to apply operations only when certain conditions are
                            met and selections whenever a choice needs to be made.
                          </Text>
                          <Text size='xs' fs='italic'>
                            For more help, see{' '}
                            <Anchor
                              href='https://discord.gg/kxCpa6G'
                              target='_blank'
                              underline='hover'
                            >
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
                  onClick={() => {
                    onReset();
                  }}
                >
                  Cancel
                </Button>
                <Button type='submit'>{'Save'}</Button>
              </Group>
            </Stack>
          </Center>
        </form>
        <Center style={{ flex: 1 }}>
          <Tabs w='100%' variant='outline' defaultValue='feats' orientation='vertical'>
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
                      data?.content.abilityBlocks.filter((i) => i.type === 'heritage').length >
                        0 && (
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
                      data?.content.abilityBlocks.filter((i) => i.type === 'physical-feature')
                        .length > 0 && (
                        <Badge variant='light' color={theme.primaryColor} size='xs'>
                          {
                            data?.content.abilityBlocks.filter((i) => i.type === 'physical-feature')
                              .length
                          }
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
                      data?.content.abilityBlocks.filter((i) => i.type === 'class-feature').length >
                        0 && (
                        <Badge variant='light' color={theme.primaryColor} size='xs'>
                          {
                            data?.content.abilityBlocks.filter((i) => i.type === 'class-feature')
                              .length
                          }
                        </Badge>
                      )}
                  </>
                }
              >
                Class Features
              </Tabs.Tab>
              <Tabs.Tab
                value='archetypes'
                leftSection={getIconFromContentType('ability-block', '1rem')}
                // TODO: Add archetypes
              >
                Archetypes
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value='actions'>
              <ContentList<AbilityBlock>
                sourceId={props.sourceId}
                type='ability-block'
                abilityBlockType='action'
                content={data?.content.abilityBlocks ?? []}
              />
            </Tabs.Panel>

            <Tabs.Panel value='feats'>
              <ContentList<AbilityBlock>
                sourceId={props.sourceId}
                type='ability-block'
                abilityBlockType='feat'
                content={data?.content.abilityBlocks ?? []}
              />
            </Tabs.Panel>

            <Tabs.Panel value='items'>
              <ContentList<Item>
                sourceId={props.sourceId}
                type='item'
                content={data?.content.items ?? []}
              />
            </Tabs.Panel>

            <Tabs.Panel value='spells'>
              <ContentList<Spell>
                sourceId={props.sourceId}
                type='spell'
                content={data?.content.spells ?? []}
              />
            </Tabs.Panel>

            <Tabs.Panel value='traits'>
              <ContentList<Trait>
                sourceId={props.sourceId}
                type='trait'
                content={data?.content.traits ?? []}
              />
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
                content={data?.content.abilityBlocks ?? []}
              />
            </Tabs.Panel>

            <Tabs.Panel value='senses'>
              <ContentList<AbilityBlock>
                sourceId={props.sourceId}
                type='ability-block'
                abilityBlockType='sense'
                content={data?.content.abilityBlocks ?? []}
              />
            </Tabs.Panel>

            <Tabs.Panel value='physical-features'>
              <ContentList<AbilityBlock>
                sourceId={props.sourceId}
                type='ability-block'
                abilityBlockType='physical-feature'
                content={data?.content.abilityBlocks ?? []}
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
              <ContentList<Class>
                sourceId={props.sourceId}
                type='class'
                content={data?.content.classes ?? []}
              />
            </Tabs.Panel>

            <Tabs.Panel value='class-features'>
              <ContentList<AbilityBlock>
                sourceId={props.sourceId}
                type='ability-block'
                abilityBlockType='class-feature'
                content={data?.content.abilityBlocks ?? []}
              />
            </Tabs.Panel>

            {/* <Tabs.Panel value='archetypes'>
                <ContentList<AbilityBlock>
                  type='ability-block'
                  abilityBlockType='archetype'
                  content={data?.content.abilityBlocks}
                />
              </Tabs.Panel> */}
          </Tabs>
        </Center>
      </Group>
    </Modal>
  );
}

function ContentList<
  T extends { name: string; level?: number; rank?: number; type?: AbilityBlockType }
>(props: {
  sourceId: number;
  type: ContentType;
  content: T[];
  abilityBlockType?: AbilityBlockType;
}) {
  const queryClient = useQueryClient();
  const [openedId, setOpenedId] = useState<number | undefined>();

  let content = props.content;
  if (props.abilityBlockType) {
    content = content.filter((item) => item.type === props.abilityBlockType);
  }

  const [searchQuery, setSearchQuery] = useDebouncedState('', 200);
  const search = useRef(new JsSearch.Search('id'));
  useEffect(() => {
    if (!props.content) return;
    search.current.addIndex('name');
    search.current.addIndex('description');
    search.current.addDocuments(content);
  }, [props.content]);
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

  const handleReset = () => {
    setOpenedId(undefined);
    queryClient.refetchQueries([`find-content-source-details-${props.sourceId}`]);
  };

  return (
    <>
      <Stack mx='md' gap={10}>
        <Group wrap='nowrap'>
          <TextInput
            style={{ flex: 1 }}
            leftSection={<IconSearch size='0.9rem' />}
            placeholder={`Search ${pluralize(
              (props.abilityBlockType ?? props.type).toLowerCase()
            )}`}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
          <Button
            size='compact-lg'
            fz='xs'
            variant='light'
            onClick={() => {
              setOpenedId(-1);
            }}
            rightSection={<IconPlus size='1.0rem' />}
            styles={{
              section: {
                marginLeft: 3,
              },
            }}
          >
            Create {toLabel(props.abilityBlockType ?? props.type)}
          </Button>
        </Group>
        <Center>
          <Stack w='100%'>
            <SelectionOptionsInner
              options={content}
              type={props.type}
              abilityBlockType={props.abilityBlockType}
              isLoading={false}
              onClick={(item) => setOpenedId(item.id)}
              h={500}
              includeDelete
              onDelete={(itemId) => {
                // TODO: Delete item

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

            //clearContent('ability-block', abilityBlock.id);
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
            const result = await upsertSpell(spell);

            if (result) {
              showNotification({
                title: `Updated ${result.name}`,
                message: `Successfully updated spell.`,
                autoClose: 3000,
              });
            }

            //clearContent('spell', spell.id);
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
            const result = await upsertClass(class_);

            if (result) {
              showNotification({
                title: `Updated ${result.name}`,
                message: `Successfully updated class.`,
                autoClose: 3000,
              });
            }

            //clearContent('class', class_.id);
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
            const result = await upsertAncestry(ancestry);

            if (result) {
              showNotification({
                title: `Updated ${result.name}`,
                message: `Successfully updated ancestry.`,
                autoClose: 3000,
              });
            }

            //clearContent('ancestry', ancestry.id);
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
            const result = await upsertBackground(background);

            if (result) {
              showNotification({
                title: `Updated ${result.name}`,
                message: `Successfully updated background.`,
                autoClose: 3000,
              });
            }

            //clearContent('background', background.id);
            handleReset();
          }}
          onCancel={() => handleReset()}
        />
      )}
    </>
  );
}
