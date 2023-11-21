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
import { useState } from 'react';
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
import { useQuery } from '@tanstack/react-query';
import { getContent, getContentPackage, getTraits } from '@content/content-controller';
import { useForm } from '@mantine/form';
import TraitsInput from '@common/TraitsInput';
import { useDisclosure } from '@mantine/hooks';
import { Operation } from '@typing/operations';
import ActionsInput from '@common/ActionsInput';
import { OperationSection } from '@common/operations/Operations';
import RichTextInput from '@common/rich_text_input/RichTextInput';
import { JSONContent } from '@tiptap/react';
import { getIconFromContentType, toHTML } from '@content/content-utils';
import { isValidImage } from '@utils/images';
import { EDIT_MODAL_HEIGHT } from '@constants/data';
import { toLabel } from '@utils/strings';
import { IconEdit } from '@tabler/icons-react';
import { SelectionOptionsInner } from '@common/select/SelectContent';
import { CreateAbilityBlockModal } from './CreateAbilityBlockModal';
import { upsertAbilityBlock, upsertSpell } from '@content/content-creation';
import { showNotification } from '@mantine/notifications';
import { CreateSpellModal } from './CreateSpellModal';
import { CreateClassModal } from './CreateClassModal';

export function CreateContentSourceModal(props: {
  opened: boolean;
  editId?: number;
  onComplete: (source: ContentSource) => void;
  onCancel: () => void;
}) {
  const theme = useMantineTheme();
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState<JSONContent>();
  const [openedOperations, { toggle: toggleOperations }] = useDisclosure(false);

  const { data, isFetching } = useQuery({
    queryKey: [`find-content-source-details-${props.editId}`],
    queryFn: async () => {
      const content = await getContentPackage([props.editId!]);
      const source = await getContent<ContentSource>('content-source', props.editId!);
      if (!source) return null;

      form.setInitialValues({
        name: source.name,
        foundry_id: source.foundry_id,
        url: source.url,
        description: source.description,
        operations: source.operations,
        contact_info: source.contact_info,
        group: source.group,
        ancestries: content.ancestries,
        backgrounds: content.backgrounds,
        classes: content.classes,
        abilityBlocks: content.abilityBlocks,
        items: content.items,
        languages: content.languages,
        spells: content.spells,
        traits: content.traits,
        creatures: content.creatures,
      });
      form.reset();

      return {
        content,
        source,
      };
    },
    enabled: !!props.editId,
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

      ancestries: [] as Ancestry[],
      backgrounds: [] as Background[],
      classes: [] as Class[],
      abilityBlocks: [] as AbilityBlock[],
      items: [] as Item[],
      languages: [] as Language[],
      spells: [] as Spell[],
      traits: [] as Trait[],
      creatures: [] as Creature[],
    },
  });

  const onSubmit = async (values: typeof form.values) => {
    // props.onComplete({
    //   ...values,
    //   rank: values.rank ? +values.rank : 0,
    //   traits: traits.map((trait) => trait.id),
    //   meta_data: metaData,
    // });
    setTimeout(() => {
      onReset();
    }, 1000);
  };

  const onReset = () => {
    form.reset();
  };

  return (
    <Modal
      opened={props.opened}
      onClose={() => {
        props.onCancel();
        onReset();
      }}
      title={
        <Title order={3}>
          {props.editId === undefined ? 'Create' : 'Edit'}
          {' Content Source'}
        </Title>
      }
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
      <form onSubmit={form.onSubmit(onSubmit)}>
        <Group align='flex-start'>
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
                    props.onCancel();
                    onReset();
                  }}
                >
                  Cancel
                </Button>
                <Button type='submit'>{props.editId === undefined ? 'Create' : 'Update'}</Button>
              </Group>
            </Stack>
          </Center>
          <Center style={{ flex: 1 }}>
            <Tabs w='100%' variant='outline' defaultValue='feats' orientation='vertical'>
              <Tabs.List>
                <Tabs.Tab
                  value='actions'
                  leftSection={getIconFromContentType('ability-block', '1rem')}
                  rightSection={
                    <>
                      {form.values.abilityBlocks &&
                        form.values.abilityBlocks.filter((i) => i.type === 'action').length > 0 && (
                          <Badge variant='light' color={theme.primaryColor} size='xs'>
                            {form.values.abilityBlocks.filter((i) => i.type === 'action').length}
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
                      {form.values.abilityBlocks &&
                        form.values.abilityBlocks.filter((i) => i.type === 'feat').length > 0 && (
                          <Badge variant='light' color={theme.primaryColor} size='xs'>
                            {form.values.abilityBlocks.filter((i) => i.type === 'feat').length}
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
                      {form.values.items && form.values.items.length > 0 && (
                        <Badge variant='light' color={theme.primaryColor} size='xs'>
                          {form.values.items.length}
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
                      {form.values.spells && form.values.spells.length > 0 && (
                        <Badge variant='light' color={theme.primaryColor} size='xs'>
                          {form.values.spells.length}
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
                      {form.values.traits && form.values.traits.length > 0 && (
                        <Badge variant='light' color={theme.primaryColor} size='xs'>
                          {form.values.traits.length}
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
                      {form.values.languages && form.values.languages.length > 0 && (
                        <Badge variant='light' color={theme.primaryColor} size='xs'>
                          {form.values.languages.length}
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
                      {form.values.creatures && form.values.creatures.length > 0 && (
                        <Badge variant='light' color={theme.primaryColor} size='xs'>
                          {form.values.creatures.length}
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
                      {form.values.ancestries && form.values.ancestries.length > 0 && (
                        <Badge variant='light' color={theme.primaryColor} size='xs'>
                          {form.values.ancestries.length}
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
                      {form.values.abilityBlocks &&
                        form.values.abilityBlocks.filter((i) => i.type === 'heritage').length >
                          0 && (
                          <Badge variant='light' color={theme.primaryColor} size='xs'>
                            {form.values.abilityBlocks.filter((i) => i.type === 'heritage').length}
                          </Badge>
                        )}
                    </>
                  }
                >
                  Heritages
                </Tabs.Tab>
                <Tabs.Tab
                  value='backgrounds'
                  leftSection={getIconFromContentType('background', '1rem')}
                  rightSection={
                    <>
                      {form.values.backgrounds && form.values.backgrounds.length > 0 && (
                        <Badge variant='light' color={theme.primaryColor} size='xs'>
                          {form.values.backgrounds.length}
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
                      {form.values.classes && form.values.classes.length > 0 && (
                        <Badge variant='light' color={theme.primaryColor} size='xs'>
                          {form.values.classes.length}
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
                      {form.values.abilityBlocks &&
                        form.values.abilityBlocks.filter((i) => i.type === 'class-feature').length >
                          0 && (
                          <Badge variant='light' color={theme.primaryColor} size='xs'>
                            {
                              form.values.abilityBlocks.filter((i) => i.type === 'class-feature')
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
                  type='ability-block'
                  abilityBlockType='action'
                  content={form.values.abilityBlocks}
                />
              </Tabs.Panel>

              <Tabs.Panel value='feats'>
                <ContentList<AbilityBlock>
                  type='ability-block'
                  abilityBlockType='feat'
                  content={form.values.abilityBlocks}
                />
              </Tabs.Panel>

              <Tabs.Panel value='items'>
                <ContentList<Item> type='item' content={form.values.items} />
              </Tabs.Panel>

              <Tabs.Panel value='spells'>
                <ContentList<Spell> type='spell' content={form.values.spells} />
              </Tabs.Panel>

              <Tabs.Panel value='traits'>
                <ContentList<Trait> type='trait' content={form.values.traits} />
              </Tabs.Panel>

              <Tabs.Panel value='languages'>
                <ContentList<Language> type='language' content={form.values.languages} />
              </Tabs.Panel>

              <Tabs.Panel value='creatures'>
                <ContentList<Creature> type='creature' content={form.values.creatures} />
              </Tabs.Panel>

              <Tabs.Panel value='ancestries'>
                <ContentList<Ancestry> type='ancestry' content={form.values.ancestries} />
              </Tabs.Panel>

              <Tabs.Panel value='heritages'>
                <ContentList<AbilityBlock>
                  type='ability-block'
                  abilityBlockType='heritage'
                  content={form.values.abilityBlocks}
                />
              </Tabs.Panel>

              <Tabs.Panel value='backgrounds'>
                <ContentList<Background> type='background' content={form.values.backgrounds} />
              </Tabs.Panel>

              <Tabs.Panel value='classes'>
                <ContentList<Class> type='class' content={form.values.classes} />
              </Tabs.Panel>

              <Tabs.Panel value='class-features'>
                <ContentList<AbilityBlock>
                  type='ability-block'
                  abilityBlockType='class-feature'
                  content={form.values.abilityBlocks}
                />
              </Tabs.Panel>

              {/* <Tabs.Panel value='archetypes'>
                <ContentList<AbilityBlock>
                  type='ability-block'
                  abilityBlockType='archetype'
                  content={form.values.abilityBlocks}
                />
              </Tabs.Panel> */}
            </Tabs>
          </Center>
        </Group>
      </form>
    </Modal>
  );
}

function ContentList<T extends { name: string, level?: number, rank?: number, type?: AbilityBlockType }>(props: {
  type: ContentType;
  content: T[];
  abilityBlockType?: AbilityBlockType;
}) {

  const [openedId, setOpenedId] = useState<number | undefined>();

  let content = props.content;
  if(props.abilityBlockType){
    content = content.filter((item) => item.type === props.abilityBlockType);
  }

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

  return (
    <>
      <Center mx='md'>
        <Stack w='100%'>
          <SelectionOptionsInner
            options={content}
            type={props.type}
            abilityBlockType={props.abilityBlockType}
            isLoading={false}
            onClick={(item) => setOpenedId(item.id)}
            includeDelete
            onDelete={(itemId) => {
              // TODO: Delete item
            }}
          />
        </Stack>
      </Center>

      {props.type === 'ability-block' && openedId && (
        <CreateAbilityBlockModal
          opened={!!openedId}
          type={props.abilityBlockType!}
          editId={openedId}
          onComplete={async (abilityBlock) => {
            const result = await upsertAbilityBlock(abilityBlock);

            if (result) {
              showNotification({
                title: `Updated ${result.name}`,
                message: `Successfully updated ${result.type}.`,
                autoClose: 3000,
              });
            }

            setOpenedId(undefined);
          }}
          onCancel={() => setOpenedId(undefined)}
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

            setOpenedId(undefined);
          }}
          onCancel={() => setOpenedId(undefined)}
        />
      )}

      {props.type === 'class' && openedId && (
        <CreateClassModal
          opened={!!openedId}
          editId={openedId}
          onComplete={async (class_) => {
            // const result = await upsertClass(class_);

            // if (result) {
            //   showNotification({
            //     title: `Updated ${result.name}`,
            //     message: `Successfully updated class.`,
            //     autoClose: 3000,
            //   });
            // }

            setOpenedId(undefined);
          }}
          onCancel={() => setOpenedId(undefined)}
        />
      )}
    </>
  );
}
