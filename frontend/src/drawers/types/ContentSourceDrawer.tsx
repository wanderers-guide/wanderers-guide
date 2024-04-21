import { drawerState } from '@atoms/navAtoms';
import RichText from '@common/RichText';
import {
  ActionSelectionOption,
  AncestrySelectionOption,
  BackgroundSelectionOption,
  ClassSelectionOption,
  CreatureSelectionOption,
  FeatSelectionOption,
  ItemSelectionOption,
  LanguageSelectionOption,
  SpellSelectionOption,
  TraitSelectionOption,
} from '@common/select/SelectContent';
import { fetchContentPackage, fetchContentSources } from '@content/content-store';
import ShowOperationsButton from '@drawers/ShowOperationsButton';
import { Title, Text, Loader, Group, Divider, Box, Button, Accordion, Badge, Select } from '@mantine/core';
import { IconExternalLink } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { AbilityBlockType, ContentSource, ContentType } from '@typing/content';
import { useRecoilState } from 'recoil';

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

  return (
    <>
      <Group justify='space-between' wrap='nowrap'>
        <Box>
          <Title order={3}>{source?.name}</Title>
        </Box>

        <Box>
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
        </Box>
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

  const [_drawer, openDrawer] = useRecoilState(drawerState);

  const { data: content } = useQuery({
    queryKey: [`find-content-source-package-${id}`, { id, source: props.data.source }],
    queryFn: async ({ queryKey }) => {
      // @ts-ignore
      // eslint-disable-next-line
      const [_key, { id, source }] = queryKey;
      const _id = id ?? source?.id;
      return await fetchContentPackage([_id], true);
    },
  });
  const source = content && content.sources && content.sources.length > 0 ? content.sources[0] : null;

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

  return (
    <Box>
      <RichText ta='justify'>{description}</RichText>

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
                        data: { id: a.id },
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
        </Accordion>
      </Box>

      {props.data.showOperations && <ShowOperationsButton name={source.name} operations={source.operations} />}

      <Box>
        <Divider my='sm' />
        <Select
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
          onChange={(value) => {
            if (!value) return;
            props.data.onFeedback?.(value as ContentType | AbilityBlockType, -1, source.id);
          }}
        />
      </Box>
    </Box>
  );
}
