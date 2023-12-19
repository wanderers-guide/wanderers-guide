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
  ScrollArea,
} from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { Rarity } from '@typing/content';
import _ from 'lodash';
import RichText from './RichText';
import { fetchTraits } from '@content/content-store';
import { drawerState } from '@atoms/navAtoms';
import { useRecoilState } from 'recoil';
import { getConditionByName } from '@conditions/condition-handler';

export default function TraitsDisplay(props: {
  traitIds: number[];
  interactable?: boolean;
  size?: MantineSize;
  rarity?: Rarity;
  skill?: string | string[];
  broken?: boolean;
  shoddy?: boolean;
  justify?: 'flex-start' | 'flex-end';
}) {
  const theme = useMantineTheme();
  const [_drawer, openDrawer] = useRecoilState(drawerState);

  const { data: traits } = useQuery({
    queryKey: [`find-traits-${props.traitIds.join('_')}`, {}],
    queryFn: async ({ queryKey }) => {
      // @ts-ignore
      // eslint-disable-next-line
      const [_key, {}] = queryKey;

      if (props.traitIds.length === 0) return [];
      return (await fetchTraits(props.traitIds)).sort((a, b) => a.name.localeCompare(b.name));
    },
  });

  if (!traits) {
    return <Loader color={theme.primaryColor} size={props.size ?? 'sm'} type='dots' />;
  }

  return (
    <Group gap={3} justify={props.justify}>
      {props.rarity && (
        <RarityDisplay interactable={props.interactable} size={props.size} rarity={props.rarity} />
      )}
      {props.skill && (
        <SkillDisplay interactable={props.interactable} size={props.size} skill={props.skill} />
      )}
      {props.broken && <BrokenDisplay interactable={props.interactable} size={props.size} />}
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
              onClick={() => {
                if (props.interactable) {
                  openDrawer({
                    type: 'trait',
                    data: { id: trait.id },
                    extra: { addToHistory: true },
                  });
                }
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

export function SkillDisplay(props: {
  skill: string | string[];
  interactable?: boolean;
  size?: MantineSize;
}) {
  const theme = useMantineTheme();
  const skills = Array.isArray(props.skill) ? props.skill : [props.skill];

  return (
    <>
      {skills.map((skill, index) => (
        <Badge
          key={index}
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
          {_.startCase(skill.toLowerCase())}
        </Badge>
      ))}
    </>
  );
}

export function BrokenDisplay(props: { interactable?: boolean; size?: MantineSize }) {
  const theme = useMantineTheme();

  const broken = getConditionByName('Broken')!;

  return (
    <>
      <HoverCard
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
            size={props.size ?? 'md'}
            color='red'
            styles={{
              root: {
                textTransform: 'initial',
                cursor: props.interactable ? 'pointer' : undefined,
              },
            }}
          >
            {broken.name}
          </Badge>
        </HoverCard.Target>
        <HoverCard.Dropdown>
          <TraitOverview name={broken.name} description={broken.description} important={false} />
        </HoverCard.Dropdown>
      </HoverCard>
    </>
  );
}

export function ShoddyDisplay(props: { interactable?: boolean; size?: MantineSize }) {
  const name = 'Shoddy';
  const description = `Improvised or of dubious make, shoddy items are never available for purchase except for in the most desperate of communities. When available, a shoddy item usually costs half the Price of a standard item, though you can never sell one.
  Attacks and checks involving a shoddy item take a –2 item penalty. This penalty also applies to any DCs that a shoddy item applies to (such as the AC provided when wearing shoddy armor, or the DC to break out of shoddy manacles). A shoddy suit of armor also worsens the armor’s check penalty by 2. A shoddy item’s Hit Points and Broken Threshold are each half that of a normal item of its type.`;

  return (
    <>
      <HoverCard
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
            size={props.size ?? 'md'}
            color='yellow'
            styles={{
              root: {
                textTransform: 'initial',
                cursor: props.interactable ? 'pointer' : undefined,
              },
            }}
          >
            {name}
          </Badge>
        </HoverCard.Target>
        <HoverCard.Dropdown>
          <TraitOverview name={name} description={description} important={false} />
        </HoverCard.Dropdown>
      </HoverCard>
    </>
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
      <ScrollArea h={props.description.length > 400 ? 300 : undefined} offsetScrollbars>
        <RichText ta='justify' fz='sm'>
          {props.description || 'No description given.'}
        </RichText>
      </ScrollArea>
    </Stack>
  );
}
