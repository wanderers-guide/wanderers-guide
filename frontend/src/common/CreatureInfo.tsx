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
import { IconTree, IconVocabulary, IconWindow } from '@tabler/icons-react';
import { Creature, Size, Trait } from '@typing/content';
import { interpolateHealth } from '@utils/colors';
import { phoneQuery } from '@utils/mobile-responsive';
import { truncate } from 'lodash-es';
import { DisplayIcon } from './IconDisplay';
import TraitsDisplay from './TraitsDisplay';
import { StoreID, VariableStr } from '@typing/variables';
import { getAllAncestryTraitVariables, getVariable } from '@variables/variable-manager';
import { useQuery } from '@tanstack/react-query';
import { fetchContentAll } from '@content/content-store';
import { isTruthy } from '@utils/type-fixing';
import { convertToSize } from '@upload/foundry-utils';

export function CreatureDetailedInfo(props: { id: StoreID; creature: Creature }) {
  const theme = useMantineTheme();
  const isPhone = useMediaQuery(phoneQuery());

  // const currentHealth = props.creature?.hp_current ?? 0;
  // let maxHealth = props.creature?.meta_data?.calculated_stats?.hp_max ?? 1;
  // if (currentHealth > maxHealth) {
  //   maxHealth = currentHealth;
  // }
  // const conditions = props.creature?.details?.conditions ?? [];

  const { data } = useQuery({
    queryKey: [`get-traits`],
    queryFn: async () => {
      return await fetchContentAll<Trait>('trait');
    },
  });
  const traits = getAllAncestryTraitVariables(props.id)
    .map((v) => {
      const trait = data?.find((trait) => trait.id === v.value);
      return trait;
    })
    .filter(isTruthy);

  const size = getVariable<VariableStr>(props.id, 'SIZE')?.value;

  return (
    <div style={{ width: isPhone ? undefined : 240 }}>
      <Group wrap='nowrap' align='center' gap={10}>
        <DisplayIcon strValue={props.creature?.details.image_url} />

        <TraitsDisplay
          justify='flex-start'
          size='xs'
          traitIds={traits.map((t) => t.id)}
          rarity={props.creature?.rarity}
          pfSize={convertToSize(size)}
        />
      </Group>
    </div>
  );
}
