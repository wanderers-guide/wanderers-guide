import { drawerState } from '@atoms/navAtoms';
import RichText from '@common/RichText';
import TraitsDisplay from '@common/TraitsDisplay';
import { FeatSelectionOption } from '@common/select/SelectContent';
import { isAbilityBlockVisible } from '@content/content-hidden';
import { fetchContentAll, fetchContentById } from '@content/content-store';
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
  Text,
  Title,
} from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { AbilityBlock, VersatileHeritage } from '@typing/content';
import { groupBy } from 'lodash-es';
import { useState } from 'react';
import { useRecoilState } from 'recoil';

export function VersatileHeritageDrawerTitle(props: {
  data: { id?: number; versatileHeritage?: VersatileHeritage; onSelect?: () => void };
}) {
  const id = props.data.id;

  const [_drawer, openDrawer] = useRecoilState(drawerState);

  const { data: _versatileHeritage } = useQuery({
    queryKey: [`find-versatile-heritage-${id}`, { id }],
    queryFn: async ({ queryKey }) => {
      // @ts-ignore
      // eslint-disable-next-line
      const [_key, { id }] = queryKey;
      return await fetchContentById<VersatileHeritage>('versatile-heritage', id);
    },
    enabled: !!id,
  });
  const versatileHeritage = props.data.versatileHeritage ?? _versatileHeritage;

  return (
    <>
      {versatileHeritage && (
        <Group justify='space-between' wrap='nowrap'>
          <Group wrap='nowrap' gap={10}>
            <Box>
              <Title order={3}>{versatileHeritage.name}</Title>
            </Box>
          </Group>
          <TraitsDisplay traitIds={[]} rarity={versatileHeritage.rarity} />
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
              Select Versatile Heritage
            </Button>
          )}
        </Group>
      )}
    </>
  );
}

export function VersatileHeritageDrawerContent(props: {
  data: { id?: number; versatileHeritage?: VersatileHeritage; showOperations?: boolean };
  onMetadataChange?: (openedDict?: Record<string, string>) => void;
}) {
  const id = props.data.id;

  const { data } = useQuery({
    queryKey: [`find-versatileHeritage-details-${id}`, { id }],
    queryFn: async ({ queryKey }) => {
      // @ts-ignore
      // eslint-disable-next-line
      const [_key, { id }] = queryKey;
      const versatileHeritage = await fetchContentById<VersatileHeritage>('versatile-heritage', id);
      const abilityBlocks = await fetchContentAll<AbilityBlock>('ability-block');
      return {
        versatileHeritage: props.data.versatileHeritage ?? versatileHeritage,
        abilityBlocks,
      };
    },
  });

  const [descHidden, setDescHidden] = useState(true);
  const [_drawer, openDrawer] = useRecoilState(drawerState);

  const feats = groupBy(
    (data?.abilityBlocks ?? []).filter(
      (block) => block.type === 'feat' && block.traits?.includes(data?.versatileHeritage?.trait_id ?? -1)
    ),
    'level'
  );

  const featSections = Object.keys(feats).map((level) => (
    <Accordion.Item key={level} value={level}>
      <Accordion.Control>
        <Group wrap='nowrap' justify='space-between' gap={0}>
          <Text c='gray.5' fw={700} fz='md'>
            Level {level}
          </Text>
          <Badge mr='sm' variant='outline' color='gray.5' size='xs'>
            <Text fz='sm' c='gray.5' span>
              {feats[level].filter((feat) => isAbilityBlockVisible('CHARACTER', feat)).length}
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
          {feats[level]
            .filter((feat) => isAbilityBlockVisible('CHARACTER', feat))
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((feat, index) => (
              <FeatSelectionOption
                key={index}
                feat={feat}
                showButton={false}
                onClick={() => {
                  props.onMetadataChange?.();
                  openDrawer({
                    type: 'feat',
                    data: { id: feat.id },
                    extra: { addToHistory: true },
                  });
                }}
              />
            ))}
        </Stack>
      </Accordion.Panel>
    </Accordion.Item>
  ));

  if (!data || !data.versatileHeritage || !data.abilityBlocks) {
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
          {data.versatileHeritage.artwork_url && (
            <Image
              style={{
                float: 'right',
                maxWidth: 150,
                height: 'auto',
              }}
              ml='sm'
              radius='md'
              fit='contain'
              src={data.versatileHeritage.artwork_url}
            />
          )}
          <RichText ta='justify'>{data.versatileHeritage.description}</RichText>
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
      <Box>
        <Button
          fullWidth
          onClick={() => {
            openDrawer({
              type: 'feat',
              data: { id: data.versatileHeritage?.heritage_id },
              extra: { addToHistory: true },
            });
          }}
        >
          Open Heritage
        </Button>
      </Box>

      <Box>
        <Title order={3}>Feats</Title>

        <Accordion
          variant='separated'
          // Save opened state in drawer metadata (so it persists when opening links and going back)
          defaultValue={getMetadataOpenedDict().feat_section}
          onChange={(value) => {
            props.onMetadataChange?.({
              feat_section: value ?? '',
            });
          }}
        >
          {featSections}
        </Accordion>

        {featSections.length === 0 && (
          <Text c='gray.5' fz='sm' ta='center' fs='italic' py={10}>
            No feats found.
          </Text>
        )}
      </Box>
    </Stack>
  );
}
