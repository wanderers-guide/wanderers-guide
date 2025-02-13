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
  Pill,
  ScrollArea,
  Stack,
  useMantineTheme,
} from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { Availability, Rarity, Size } from '@typing/content';
import { useRecoilState } from 'recoil';
import RichText from './RichText';
import { getTraitIdByType } from '@utils/traits';
import { uniq } from 'lodash-es';
import { toLabel } from '@utils/strings';
import { getVariable } from '@variables/variable-manager';
import { VariableBool } from '@typing/variables';

export default function TraitsDisplay(props: {
  traitIds: number[];
  interactable?: boolean;
  size?: MantineSize;
  rarity?: Rarity;
  pfSize?: Size;
  availability?: Availability;
  skill?: string | string[];
  archaic?: boolean;
  broken?: boolean;
  shoddy?: boolean;
  formula?: boolean;
  displayAll?: boolean;
  justify?: 'flex-start' | 'flex-end';
}) {
  const theme = useMantineTheme();
  const [_drawer, openDrawer] = useRecoilState(drawerState);

  const { data: traits } = useQuery({
    queryKey: [
      `find-traits-${props.traitIds.join('_')}`,
      { traitIds: props.archaic ? uniq([...props.traitIds, getTraitIdByType('ARCHAIC')]) : props.traitIds },
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
      {props.rarity && (
        <RarityDisplay
          interactable={props.interactable}
          size={props.size}
          rarity={props.rarity}
          displayAll={props.displayAll}
        />
      )}
      {props.skill && <SkillDisplay interactable={props.interactable} size={props.size} skill={props.skill} />}
      {props.broken && <BrokenDisplay interactable={props.interactable} size={props.size} />}
      {props.availability && (
        <AvailabilityDisplay interactable={props.interactable} size={props.size} availability={props.availability} />
      )}
      {props.pfSize && (
        <SizeDisplay
          interactable={props.interactable}
          size={props.size}
          pfSize={props.pfSize}
          displayAll={props.displayAll}
        />
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

export function RarityDisplay(props: {
  rarity: Rarity;
  interactable?: boolean;
  size?: MantineSize;
  displayAll?: boolean;
}) {
  if (props.rarity === 'COMMON' && !props.displayAll) return null;

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

export function SizeDisplay(props: { pfSize: Size; interactable?: boolean; size?: MantineSize; displayAll?: boolean }) {
  const theme = useMantineTheme();
  if (props.pfSize === 'MEDIUM' && !props.displayAll) return null;

  let name = ``;
  let description = ``;

  if (props.pfSize === 'TINY') {
    name = 'Tiny';
    description = `A Tiny object is about half the size of a normal Medium-sized version. Tiny creatures come with their own set of rules about space and reach. They can enter another creature's space, which is important because their melee Strikes typically have no reach, meaning they must enter someone else’s space to attack them. They don't automatically receive lesser cover from being in a larger creature's space, but circumstances might allow them to Take Cover. They treat 10 items of negligible Bulk as 1 Bulk and their Bulk limit is half that of normal.`;
  } else if (props.pfSize === 'SMALL') {
    name = 'Small';
    description = `A Small object is slightly smaller than a normal Medium-sized version but the difference usually doesn’t come with any noteworthy rules adjustments. Small creatures typically stand between 2 to 4 feet tall.`;
  } else if (props.pfSize === 'MEDIUM') {
    name = 'Medium';
    description = `A Medium object is the standard size for most creatures and objects. Medium creatures typically stand between 4 to 7 feet tall.`;
  } else if (props.pfSize === 'LARGE') {
    name = 'Large';
    description = `A Large object is about twice the size of a normal Medium-sized version. Large creatures take up twice the space of a Medium-sized creature. They treat 10 items of 1 Bulk as 1 Bulk and their Bulk limit is twice that of normal.`;
  } else if (props.pfSize === 'HUGE') {
    name = 'Huge';
    description = `A Huge object is about four times the size of a normal Medium-sized version. Huge creatures take up four times the space of a Medium-sized creature. They treat 10 items of 2 Bulk as 1 Bulk and their Bulk limit is four times that of normal.`;
  } else if (props.pfSize === 'GARGANTUAN') {
    name = 'Gargantuan';
    description = `A Gargantuan object is about eight times the size of a normal Medium-sized version. Gargantuan creatures take up eight times the space of a Medium-sized creature. They treat 10 items of 4 Bulk as 1 Bulk and their Bulk limit is eight times that of normal.`;
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
          <Pill.Group>
            <Pill
              size={props.size ?? 'sm'}
              styles={{
                label: {
                  cursor: 'pointer',
                },
                root: {
                  border: `1px solid ${theme.colors.dark[4]}`,
                  backgroundColor: theme.colors.dark[6],
                  cursor: props.interactable ? 'pointer' : undefined,
                },
              }}
            >
              {name}
            </Pill>
          </Pill.Group>
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
