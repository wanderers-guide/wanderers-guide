import { getTraits } from '@content/content-controller';
import {
  useMantineTheme,
  Loader,
  Group,
  Text,
  Badge,
  MantineColor,
  MantineSize,
  Stack,
  HoverCard,
} from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { Rarity } from '@typing/content';
import _ from 'lodash';
import RichText from './RichText';

export default function TraitsDisplay(props: {
  traitIds: number[];
  interactable?: boolean;
  size?: MantineSize;
  rarity?: Rarity;
  skill?: string;
  justify?: 'flex-start' | 'flex-end';
}) {
  const theme = useMantineTheme();

  const { data: traits } = useQuery({
    queryKey: [`find-traits-${props.traitIds.join('_')}`, {}],
    queryFn: async ({ queryKey }) => {
      // @ts-ignore
      // eslint-disable-next-line
      const [_key, {}] = queryKey;

      if (props.traitIds.length === 0) return [];
      return (await getTraits(props.traitIds)).sort((a, b) => a.name.localeCompare(b.name));
    },
  });

  if (!traits) {
    return <Loader color={theme.primaryColor} size={props.size ?? 'md'} type='dots' />;
  }

  return (
    <Group gap={3} justify={props.justify}>
      {props.rarity && (
        <RarityDisplay interactable={props.interactable} size={props.size} rarity={props.rarity} />
      )}
      {props.skill && (
        <SkillDisplay interactable={props.interactable} size={props.size} skill={props.skill} />
      )}
      {traits.map((trait, index) => (
        <HoverCard
          key={index}
          disabled={!props.interactable}
          width={265}
          shadow='md'
          zIndex={2000}
          openDelay={250}
          withinPortal
          withArrow
        >
          <HoverCard.Target>
            <Badge
              variant='dot'
              size={props.size ?? 'md'}
              styles={{
                root: {
                  // @ts-ignore
                  '--badge-dot-size': trait.meta_data?.important ? undefined : 0,
                  textTransform: 'initial',
                  color: theme.colors.dark[1],
                  cursor: props.interactable ? 'pointer' : undefined,
                },
              }}
            >
              {trait.name}
            </Badge>
          </HoverCard.Target>
          <HoverCard.Dropdown>
            <TraitOverview
              name={trait.name}
              description={trait.description}
              important={!!trait.meta_data?.important}
            />
          </HoverCard.Dropdown>
        </HoverCard>
      ))}
    </Group>
  );
}

export function RarityDisplay(props: {
  rarity: Rarity;
  interactable?: boolean;
  size?: MantineSize;
}) {
  if (props.rarity === 'COMMON') return null;

  let color: MantineColor = 'gray';
  if (props.rarity === 'UNCOMMON') color = 'teal';
  if (props.rarity === 'RARE') color = 'indigo';
  if (props.rarity === 'UNIQUE') color = 'violet';

  return (
    <Badge
      size={props.size ?? 'md'}
      color={color}
      styles={{
        root: {
          textTransform: 'initial',
        },
      }}
    >
      {_.startCase(props.rarity.toLowerCase())}
    </Badge>
  );
}

export function SkillDisplay(props: { skill: string; interactable?: boolean; size?: MantineSize }) {
  const theme = useMantineTheme();
  return (
    <Badge
      size={props.size ?? 'md'}
      variant='dot'
      styles={{
        root: {
          // @ts-ignore
          '--badge-dot-size': 0,
          textTransform: 'initial',
          color: theme.colors.dark[2],
        },
      }}
    >
      {_.startCase(props.skill.toLowerCase())}
    </Badge>
  );
}

export function TraitOverview(props: { name: string; description: string; important: boolean }) {
  const theme = useMantineTheme();

  return (
    <Stack gap={5}>
      <Badge
        variant='dot'
        size={'xl'}
        styles={{
          root: {
            // @ts-ignore
            '--badge-dot-size': props.important ? undefined : 0,
            textTransform: 'initial',
            color: theme.colors.dark[0],
          },
        }}
      >
        {props.name}
      </Badge>
      <RichText ta='justify' fz='sm'>
        {props.description || 'No description given.'}
      </RichText>
    </Stack>
  );
}
