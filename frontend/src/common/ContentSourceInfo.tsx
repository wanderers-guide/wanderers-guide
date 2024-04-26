import { convertToContentType, getIconFromContentType } from '@content/content-utils';
import classes from '@css/UserInfoIcons.module.css';
import {
  Avatar,
  Badge,
  Box,
  Button,
  Group,
  HoverCard,
  Indicator,
  RingProgress,
  Stack,
  Text,
  useMantineTheme,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { makeRequest } from '@requests/request-manager';
import { IconKey, IconTree, IconVocabulary, IconWindow } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { AbilityBlockType, ContentSource, ContentType } from '@typing/content';
import { getRingIcon } from '@utils/images';
import { phoneQuery } from '@utils/mobile-responsive';
import { pluralize, toLabel } from '@utils/strings';
import { truncate } from 'lodash-es';
import { useEffect, useState } from 'react';

const NOTABILITY_MAP: Record<ContentType | AbilityBlockType, number> = {
  trait: 2,
  item: 8,
  spell: 9,
  class: 30,
  archetype: 18,
  'versatile-heritage': 17,
  creature: 7,
  ancestry: 20,
  background: 15,
  language: 3,
  'content-source': 1,
  'class-feature': 1,
  heritage: 12,
  action: 5,
  feat: 10,
  'physical-feature': 2,
  sense: 2,
  'ability-block': 1,
};

export function ContentSourceInfo(props: { source: ContentSource; nameCutOff?: number }) {
  const theme = useMantineTheme();
  const isPhone = useMediaQuery(phoneQuery());

  const [icon, setIcon] = useState<string>();
  useEffect(() => {
    if (icon) return;
    getRingIcon(`${props.source.name}-${props.source.contact_info}-${props.source.id}`).then((svg) => {
      setIcon(svg);
    });
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: [`find-content-source-stats-${props.source.id}`],
    queryFn: async () => {
      return await makeRequest('get-content-source-stats', {
        content_source_id: props.source.id,
      });
    },
  });

  let noteableStats: { label: string; value: number; notability: number; type: ContentType }[] = [];
  for (const [key, value] of Object.entries(props.source.meta_data?.counts ?? {})) {
    if (value) {
      const keyy = key as ContentType | AbilityBlockType;
      noteableStats.push({
        label: pluralize(toLabel(key)),
        value: value,
        type: convertToContentType(keyy),
        notability: NOTABILITY_MAP[keyy] ?? -1,
      });
    }
  }
  noteableStats = noteableStats.sort((a, b) => b.notability - a.notability).slice(0, 3);

  return (
    <Box mih={105}>
      <Stack gap={0} w='100%'>
        <Group gap={0} wrap='nowrap' justify='space-between'>
          <HoverCard shadow='md' openDelay={1000} position='top' withinPortal>
            <HoverCard.Target>
              <Text c='gray.0' fz={props.source.name.length >= 24 ? '0.9rem' : 'lg'} fw={500} className={classes.name}>
                {truncate(props.source.name, {
                  length: props.nameCutOff ?? 26,
                })}
                {props.source.require_key ? (
                  <Text pl={5} span>
                    <IconKey size={14} />
                  </Text>
                ) : undefined}
              </Text>
            </HoverCard.Target>
            <HoverCard.Dropdown py={5} px={10}>
              <Text c='gray.0' size='sm'>
                {props.source.name}
              </Text>
            </HoverCard.Dropdown>
          </HoverCard>
          <Stack gap={0} pt={5}>
            <Text fz={8}>Subscribers</Text>
            <Text ta='right' fz={10} fw={600}>
              {data?.count ?? '...'}
            </Text>
          </Stack>
        </Group>
        <Group wrap='nowrap' align='flex-start' gap={0}>
          <Box style={{ position: 'relative' }} mt={0} mr={10}>
            <Avatar
              src={
                props.source.artwork_url
                  ? props.source.artwork_url
                  : icon
                    ? `data:image/svg+xml;utf8,${encodeURIComponent(icon)}`
                    : undefined
              }
              alt='Content Source Icon'
              size={55}
              radius={55}
              variant='transparent'
              color='dark.3'
              bg={theme.colors.dark[6]}
            />
          </Box>

          <div style={{ flex: 1 }}>
            <Stack gap={3}>
              {noteableStats.map((stat) => (
                <Box>
                  <Group wrap='nowrap' gap={10}>
                    {getIconFromContentType(stat.type, '1rem')}
                    <Text fz='xs' c='gray.3'>
                      {stat.label}
                    </Text>
                    <Text fz='xs' fw={700} c='gray.3'>
                      {stat.value}
                    </Text>
                  </Group>
                </Box>
              ))}
            </Stack>
          </div>
        </Group>
      </Stack>
    </Box>
  );
}
