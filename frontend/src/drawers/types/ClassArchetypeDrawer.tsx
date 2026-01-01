import { drawerState } from '@atoms/navAtoms';
import RichText from '@common/RichText';
import TraitsDisplay from '@common/TraitsDisplay';
import { ClassFeatureSelectionOption, FeatSelectionOption } from '@common/select/SelectContent';
import { isAbilityBlockVisible } from '@content/content-hidden';
import { fetchContentAll, fetchContentById, getDefaultSources } from '@content/content-store';
import ShowOperationsButton from '@drawers/ShowOperationsButton';
import { getMetadataOpenedDict } from '@drawers/drawer-utils';
import {
  Accordion,
  Anchor,
  Badge,
  Box,
  Button,
  Divider,
  Group,
  Image,
  Loader,
  Stack,
  Switch,
  Text,
  Title,
} from '@mantine/core';
import { IconArrowRight, IconCheck } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { AbilityBlock, ClassArchetype } from '@typing/content';
import { toLabel } from '@utils/strings';
import { groupBy } from 'lodash-es';
import { useState } from 'react';
import { useRecoilState } from 'recoil';

export function ClassArchetypeDrawerTitle(props: {
  data: { id?: number; classArchetype?: ClassArchetype; onSelect?: () => void };
}) {
  const id = props.data.id;

  const [_drawer, openDrawer] = useRecoilState(drawerState);

  const { data: _archetype } = useQuery({
    queryKey: [`find-class-archetype-${id}`, { id }],
    queryFn: async ({ queryKey }) => {
      // @ts-ignore
      // eslint-disable-next-line
      const [_key, { id }] = queryKey;
      return await fetchContentById<ClassArchetype>('class-archetype', id);
    },
    enabled: !!id,
  });
  const archetype = props.data.classArchetype ?? _archetype;

  return (
    <>
      {archetype && (
        <Group justify='space-between' wrap='nowrap'>
          <Group wrap='nowrap' gap={10}>
            <Box>
              <Title order={3}>{archetype.name}</Title>
            </Box>
          </Group>
          <TraitsDisplay traitIds={[]} rarity={archetype.rarity} />
          {props.data.onSelect && (
            <Button
              variant='filled'
              radius='xl'
              mb={5}
              size='compact-sm'
              onClick={() => {
                props.data.onSelect?.();
                openDrawer(null);
              }}
            >
              Select Class Archetype
            </Button>
          )}
        </Group>
      )}
    </>
  );
}

export function ClassArchetypeDrawerContent(props: {
  data: { id?: number; classArchetype?: ClassArchetype; showOperations?: boolean };
  onMetadataChange?: (openedDict?: Record<string, string>) => void;
}) {
  const id = props.data.id;

  const { data } = useQuery({
    queryKey: [`find-class-archetype-details-${id}`, { id }],
    queryFn: async ({ queryKey }) => {
      // @ts-ignore
      // eslint-disable-next-line
      const [_key, { id }] = queryKey;
      const archetype = await fetchContentById<ClassArchetype>('class-archetype', id);
      const abilityBlocks = await fetchContentAll<AbilityBlock>('ability-block', getDefaultSources('INFO'));
      return {
        archetype: props.data.classArchetype ?? archetype,
        abilityBlocks,
      };
    },
  });

  const [descHidden, setDescHidden] = useState(true);
  const [_drawer, openDrawer] = useRecoilState(drawerState);

  const adjustments = groupBy(
    data?.archetype?.feature_adjustments?.map((fa) => {
      const prevData = data?.abilityBlocks.find((ab) => ab.id === fa.prev_id);

      let level = 1;
      if (fa.type === 'ADD' && fa.data) {
        level = fa.data.level ?? 1;
      } else if (fa.type === 'REMOVE' && fa.prev_id) {
        level = prevData?.level ?? 1;
      } else if (fa.type === 'REPLACE' && fa.prev_id && fa.data) {
        level = fa.data.level ?? 1;
      }

      return {
        ...fa,
        prev_data: prevData,
        level: level,
      };
    }) ?? [],
    'level'
  );

  const adjSections = Object.keys(adjustments).map((level) => (
    <Accordion.Item key={level} value={level}>
      <Accordion.Control>
        <Group wrap='nowrap' justify='space-between' gap={0}>
          <Text c='gray.5' fw={700} fz='md'>
            Level {level}
          </Text>
          <Badge mr='sm' variant='outline' color='gray.5' size='xs'>
            <Text fz='sm' c='gray.5' span>
              {adjustments[level].length}
            </Text>
          </Badge>
        </Group>
      </Accordion.Control>
      <Accordion.Panel
        styles={{
          content: {
            padding: 0,
          },
        }}
      >
        <Stack gap={0}>
          <Divider color='dark.6' />
          {adjustments[level]
            .sort((a, b) => a.type.localeCompare(b.type))
            .map((fa, index) => (
              <Box key={index}>
                <Group justify='flex-start' wrap='nowrap' gap={5} p='sm'>
                  <Text fz='xs' ta='right' fs='italic' miw={60}>
                    {toLabel(fa.type)} —{' '}
                  </Text>
                  {fa.type === 'ADD' && fa.data && (
                    <Button
                      variant='light'
                      size='compact-sm'
                      radius='xl'
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openDrawer({
                          type: 'class-feature',
                          data: { classFeature: fa.data, showOperations: props.data.showOperations },
                          extra: { addToHistory: true },
                        });
                      }}
                    >
                      {fa.data?.name ?? 'Unknown Feature'}
                    </Button>
                  )}
                  {fa.type === 'REMOVE' && fa.prev_data && (
                    <Button
                      variant='light'
                      size='compact-sm'
                      radius='xl'
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openDrawer({
                          type: 'class-feature',
                          data: { id: fa.prev_data?.id, showOperations: props.data.showOperations },
                          extra: { addToHistory: true },
                        });
                      }}
                    >
                      {fa.prev_data?.name ?? 'Unknown Feature'}
                    </Button>
                  )}
                  {fa.type === 'REPLACE' && fa.data && fa.prev_data && (
                    <Group gap={5} wrap='nowrap'>
                      <Button
                        variant='light'
                        size='compact-xs'
                        radius='xl'
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openDrawer({
                            type: 'class-feature',
                            data: { id: fa.prev_data?.id, showOperations: props.data.showOperations },
                            extra: { addToHistory: true },
                          });
                        }}
                      >
                        {fa.prev_data?.name ?? 'Unknown Feature'}
                      </Button>
                      <IconArrowRight size={14} />
                      <Button
                        variant='light'
                        size='compact-xs'
                        radius='xl'
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openDrawer({
                            type: 'class-feature',
                            data: { classFeature: fa.data, showOperations: props.data.showOperations },
                            extra: { addToHistory: true },
                          });
                        }}
                      >
                        {fa.data?.name ?? 'Unknown Feature'}
                      </Button>
                    </Group>
                  )}
                </Group>
                <Divider color='dark.6' />
              </Box>
            ))}
        </Stack>
      </Accordion.Panel>
    </Accordion.Item>
  ));

  if (!data || !data.archetype || !data.abilityBlocks) {
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

  return (
    <Stack>
      <Box
        style={{
          position: 'relative',
        }}
      >
        <Box
          mah={descHidden ? 400 : undefined}
          style={{
            WebkitMaskImage: descHidden ? 'linear-gradient(to bottom, black 60%, transparent 100%)' : undefined,
            maskImage: descHidden ? 'linear-gradient(to bottom, black 60%, transparent 100%)' : undefined,
            overflowY: descHidden ? 'hidden' : undefined,
          }}
        >
          {data.archetype.artwork_url && (
            <Image
              style={{
                float: 'right',
                maxWidth: 150,
                height: 'auto',
              }}
              ml='sm'
              radius='md'
              fit='contain'
              src={data.archetype.artwork_url}
            />
          )}
          <RichText ta='justify'>{data.archetype.description}</RichText>
        </Box>
        <Anchor
          size='sm'
          style={{
            position: 'absolute',
            bottom: 5,
            right: 20,
          }}
          onClick={() => setDescHidden(!descHidden)}
        >
          {descHidden ? 'Show more' : 'Show less'}
        </Anchor>
      </Box>
      <Group wrap='nowrap' grow>
        <Button
          disabled={!data.archetype?.class_id}
          onClick={() => {
            if (!data.archetype?.class_id) return;
            openDrawer({
              type: 'class',
              data: { id: data.archetype?.class_id },
              extra: { addToHistory: true },
            });
          }}
        >
          Open Class
        </Button>
        <Button
          disabled={!data.archetype?.archetype_id}
          onClick={() => {
            if (!data.archetype?.archetype_id) return;
            openDrawer({
              type: 'archetype',
              data: { id: data.archetype?.archetype_id },
              extra: { addToHistory: true },
            });
          }}
        >
          Open Archetype
        </Button>
      </Group>

      <Box>
        <Title order={3}>Adjustments</Title>

        <Accordion
          variant='separated'
          // Save opened state in drawer metadata (so it persists when opening links and going back)
          defaultValue={getMetadataOpenedDict().adjustment_section}
          onChange={(value) => {
            props.onMetadataChange?.({
              adjustment_section: value ?? '',
            });
          }}
        >
          {adjSections}
        </Accordion>

        {adjSections.length === 0 && (
          <Text c='gray.5' fz='sm' ta='center' fs='italic' py={10}>
            No adjustments found.
          </Text>
        )}
      </Box>

      <Stack>
        {data.archetype.override_skill_training_base !== undefined &&
          data.archetype.override_skill_training_base !== null && (
            <Badge>Overrides Base Class Skill Trainings: {data.archetype.override_skill_training_base}</Badge>
          )}
        {data.archetype.override_class_operations === true && (
          <Badge>
            <Group align='center' gap={2}>
              Overrides Base Class Operations <IconCheck size={14} />
            </Group>
          </Badge>
        )}
      </Stack>

      {props.data.showOperations && (
        <ShowOperationsButton name={data.archetype.name} operations={data.archetype.operations} />
      )}
    </Stack>
  );
}
