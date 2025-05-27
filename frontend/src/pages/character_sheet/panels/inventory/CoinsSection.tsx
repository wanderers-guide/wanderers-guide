import CopperCoin from '@assets/images/currency/copper.png';
import GoldCoin from '@assets/images/currency/gold.png';
import PlatinumCoin from '@assets/images/currency/platinum.png';
import SilverCoin from '@assets/images/currency/silver.png';
import { isPlayingStarfinder } from '@content/system-handler';
import { LivingEntity } from '@typing/content';
import { Avatar, Group, Text } from '@mantine/core';

export function CurrencySection(props: { entity: LivingEntity | null; onClick?: () => void }) {
  const pp = props.entity?.inventory?.coins.pp ?? 0;
  const gp = props.entity?.inventory?.coins.gp ?? 0;
  const sp = props.entity?.inventory?.coins.sp ?? 0;
  const cp = props.entity?.inventory?.coins.cp ?? 0;

  const displayAll = isPlayingStarfinder() ? false : true;

  return (
    <Group
      gap={15}
      wrap='nowrap'
      justify='center'
      miw={100}
      style={{
        cursor: 'pointer',
      }}
      onClick={props.onClick}
    >
      <CoinSection pp={pp} gp={gp} sp={sp} cp={cp} displayAll={displayAll} justify='center' />
    </Group>
  );
}

export function CoinSection(props: {
  cp?: number;
  sp?: number;
  gp?: number;
  pp?: number;
  displayAll?: boolean;
  justify?: 'flex-start' | 'center' | 'flex-end';
}) {
  const pp = props.pp ?? 0;
  const gp = props.gp ?? 0;
  const sp = props.sp ?? 0;
  const cp = props.cp ?? 0;
  return (
    <Group gap={15} wrap='nowrap' justify={props.justify}>
      {(pp || props.displayAll) && (
        <Group wrap='nowrap' gap={5}>
          <Text c='gray.4' fz='md' fw={600}>
            {pp.toLocaleString()}
          </Text>
          <Avatar src={PlatinumCoin} alt='Platinum Coins' radius='xs' size='xs' />
        </Group>
      )}
      {(gp || props.displayAll) && (
        <Group wrap='nowrap' gap={5}>
          <Text c='gray.4' fz='md' fw={600}>
            {gp.toLocaleString()}
          </Text>
          <Avatar src={GoldCoin} alt='Gold Coins' radius='xs' size='xs' />
        </Group>
      )}
      {(sp || (!pp && !gp && !cp)) && ( // Always show silver coins, even if 0
        <Group wrap='nowrap' gap={5}>
          <Text c='gray.4' fz='md' fw={600}>
            {sp.toLocaleString()}
          </Text>
          <Avatar src={SilverCoin} alt='Silver Coins' radius='xs' size='xs' />
        </Group>
      )}
      {(cp || props.displayAll) && (
        <Group wrap='nowrap' gap={5}>
          <Text c='gray.4' fz='md' fw={600}>
            {cp.toLocaleString()}
          </Text>
          <Avatar src={CopperCoin} alt='Copper Coins' radius='xs' size='xs' />
        </Group>
      )}
    </Group>
  );
}
