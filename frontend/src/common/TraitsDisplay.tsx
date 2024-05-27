import { drawerState } from '@atoms/navAtoms';
import { getConditionByName } from '@conditions/condition-handler';
import { fetchTraits } from '@content/content-store';
import {
  Badge,
  Group,
  HoverCard,
  Loader,
  MantineColor,
  MantineSize,
  ScrollArea,
  Stack,
  useMantineTheme,
} from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { Availability, Rarity } from '@typing/content';
import { startCase } from 'lodash-es';
import { useRecoilState } from 'recoil';
import RichText from './RichText';
import { getTraitIdByType } from '@utils/traits';
import _ from 'lodash-es';
import { toLabel } from '@utils/strings';
import { getVariable } from '@variables/variable-manager';
import { VariableBool } from '@typing/variables';

export default function TraitsDisplay(props: {
  traitIds: number[];
  interactable?: boolean;
  size?: MantineSize;
  rarity?: Rarity;
  availability?: Availability;
  skill?: string | string[];
  archaic?: boolean;
  broken?: boolean;
  shoddy?: boolean;
  formula?: boolean;
  justify?: 'flex-start' | 'flex-end';
}) {
  const theme = useMantineTheme();
  const [_drawer, openDrawer] = useRecoilState(drawerState);

  const { data: traits } = useQuery({
    queryKey: [
      `find-traits-${props.traitIds.join('_')}`,
      { traitIds: props.archaic ? _.uniq([...props.traitIds, getTraitIdByType('ARCHAIC')]) : props.traitIds },
    ],
    queryFn: async ({ queryKey }) => {
      // @ts-ignore
      // eslint-disable-next-line
      const [_key, { traitIds }] = queryKey;

      if (traitIds.length === 0) return [];
      return (await fetchTraits(traitIds)).sort((a, b) => a.name.localeCompare(b.name));
    },
  });

  if (!traits) {
    return <Loader color={theme.primaryColor} size={props.size ?? 'sm'} type='dots' />;
  }

  return (
    <Group gap={3} justify={props.justify}>
      {props.formula && <FormulaDisplay interactable={props.interactable} size={props.size} />}
      {props.rarity && <RarityDisplay interactable={props.interactable} size={props.size} rarity={props.rarity} />}
      {props.skill && <SkillDisplay interactable={props.interactable} size={props.size} skill={props.skill} />}
      {props.broken && <BrokenDisplay interactable={props.interactable} size={props.size} />}
      {props.availability && (
        <AvailabilityDisplay interactable={props.interactable} size={props.size} availability={props.availability} />
      )}
      {traits.map((trait, index) => (
        <HoverCard
          key={index}
          disabled={!props.interactable}
          width={265}
          shadow='md'
          zIndex={2000}
          openDelay={500}
          withinPortal
          withArrow
        >
          <HoverCard.Target>
            <Badge
              variant='dot'
              color='gray.5'
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
            <TraitOverview name={trait.name} description={trait.description} important={!!trait.meta_data?.important} />
          </HoverCard.Dropdown>
        </HoverCard>
      ))}
    </Group>
  );
}

export function RarityDisplay(props: { rarity: Rarity; interactable?: boolean; size?: MantineSize }) {
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
      {toLabel(props.rarity.toLowerCase())}
    </Badge>
  );
}

export function SkillDisplay(props: { skill: string | string[]; interactable?: boolean; size?: MantineSize }) {
  const theme = useMantineTheme();
  const skills = Array.isArray(props.skill) ? props.skill : [props.skill];

  return (
    <>
      {skills.map((skill, index) => (
        <Badge
          key={index}
          size={props.size ?? 'md'}
          variant='dot'
          color='gray.0'
          styles={{
            root: {
              // @ts-ignore
              '--badge-dot-size': 0,
              textTransform: 'initial',
              color: theme.colors.dark[2],
            },
          }}
        >
          {toLabel(skill.toLowerCase())}
        </Badge>
      ))}
    </>
  );
}

export function FormulaDisplay(props: { interactable?: boolean; size?: MantineSize }) {
  const theme = useMantineTheme();
  const [_drawer, openDrawer] = useRecoilState(drawerState);

  return (
    <>
      <HoverCard
        disabled={!props.interactable}
        width={265}
        shadow='md'
        zIndex={2000}
        openDelay={500}
        withinPortal
        withArrow
      >
        <HoverCard.Target>
          <Badge
            size={props.size ?? 'md'}
            color='green'
            styles={{
              root: {
                textTransform: 'initial',
              },
            }}
          >
            Formula
          </Badge>
        </HoverCard.Target>
        <HoverCard.Dropdown>
          <TraitOverview
            name={'Formula'}
            description={`Formulas are formalized instructions for making items. Their primary purpose is to reduce the time it takes you to start the Craft activity, which is helpful for items you'll make frequently. You can usually read a formula as long as you can read the language it's written in, even if you lack the skill to Craft the item. Often, alchemists and crafting guilds use obscure languages or create codes to protect their formulas. If you obtain a formula for an uncommon or rarer item, you have access to that item so you can Craft it. These formulas can be significantly more valuable—if you can find them at all!`}
            important={false}
          />
        </HoverCard.Dropdown>
      </HoverCard>
    </>
  );
}

export function BrokenDisplay(props: { interactable?: boolean; size?: MantineSize }) {
  const theme = useMantineTheme();
  const [_drawer, openDrawer] = useRecoilState(drawerState);

  const broken = getConditionByName('Broken')!;

  return (
    <>
      <HoverCard
        disabled={!props.interactable}
        width={265}
        shadow='md'
        zIndex={2000}
        openDelay={500}
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
            onClick={() => {
              if (props.interactable) {
                openDrawer({
                  type: 'condition',
                  data: { id: broken.name },
                  extra: { addToHistory: true },
                });
              }
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
        openDelay={500}
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

export function AvailabilityDisplay(props: { availability: Availability; interactable?: boolean; size?: MantineSize }) {
  let name = ``;
  let description = ``;
  let color = ``;

  const isOrgPlay = getVariable<VariableBool>('CHARACTER', 'ORGANIZED_PLAY')?.value ?? false;
  if (!isOrgPlay) {
    return null;
  }

  if (props.availability === 'LIMITED') {
    name = 'Limited';
    description = `A limited option is rarer in organized play, but not unheard of. A limited option can be selected only if specifically allowed by a boon — whether from the Achievement Points system, a Chronicle Sheet, or another other option from a Society source — even if the option is common or if the character meets the normal prerequisites or access requirements printed in the option’s source.`;
    color = 'yellow';
  } else if (props.availability === 'RESTRICTED') {
    name = 'Restricted';
    description = `A restricted option is one that is not generally appropriate for all tables or conducive to the Society's shared campaign setting, such as a one-of-a-kind weapon, a horrific spell used by only the most evil magic-users, or player options that require high degrees of GM adjudication. Such options will generally be made available for Society Play in only a very few special cases, such as via boons given out as part of charity events, if at all.`;
    color = 'red';
  } else {
    return null;
  }

  return (
    <>
      <HoverCard
        disabled={!props.interactable}
        width={265}
        shadow='md'
        zIndex={2000}
        openDelay={500}
        withinPortal
        withArrow
      >
        <HoverCard.Target>
          <Badge
            size={props.size ?? 'md'}
            color={color}
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
        color='gray.0'
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
      <ScrollArea h={props.description.length > 400 ? 300 : undefined} pr={14} scrollbars='y'>
        <RichText ta='justify' fz='sm'>
          {props.description || 'No description given.'}
        </RichText>
      </ScrollArea>
    </Stack>
  );
}
