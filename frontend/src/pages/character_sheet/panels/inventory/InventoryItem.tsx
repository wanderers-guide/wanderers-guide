import { EllipsisText } from '@common/EllipsisText';
import { ItemIcon } from '@common/ItemIcon';

import { priceToString } from '@items/currency-handler';
import {
  getItemBulk,
  getItemQuantity,
  isItemContainer,
  isItemEquippable,
  isItemImplantable,
  isItemInvestable,
  isItemWeapon,
  isItemWithQuantity,
  labelizeBulk,
  reachedImplantLimit,
  reachedInvestedLimit,
} from '@items/inv-utils';
import { getWeaponStats, parseOtherDamage } from '@items/weapon-handler';
import { Button, Grid, Group, Text, useMantineTheme } from '@mantine/core';
import { InventoryItem, LivingEntity } from '@typing/content';
import { StoreID } from '@typing/variables';
import { sign } from '@utils/numbers';
import _ from 'lodash-es';

export function InvItemOption(props: {
  invItem: InventoryItem;
  id: StoreID;
  entity: LivingEntity | null;
  onEquip?: (invItem: InventoryItem) => void;
  onInvest?: (invItem: InventoryItem) => void;
  onViewItem?: (invItem: InventoryItem) => void;
  hideSections?: boolean;
  preventEquip?: boolean;
  isPhone?: boolean;
  additionalButtons?: React.ReactNode;
}) {
  const theme = useMantineTheme();

  const weaponStats = isItemWeapon(props.invItem.item) ? getWeaponStats(props.id, props.invItem.item) : null;

  return (
    <Grid w={'100%'}>
      <Grid.Col span='auto'>
        <Group wrap='nowrap' gap={10}>
          <ItemIcon item={props.invItem.item} size='1.0rem' color={theme.colors.gray[6]} />
          <Text c='gray.0' fz='sm'>
            {props.invItem.item.name}
          </Text>
          {isItemContainer(props.invItem.item) && props.hideSections && (
            <Button
              variant='light'
              size='compact-xs'
              radius='xl'
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                props.onViewItem?.(props.invItem);
              }}
            >
              View Item
            </Button>
          )}

          {isItemWeapon(props.invItem.item) && weaponStats && (
            <Group wrap='nowrap' gap={10} maw={300}>
              <Text c='gray.6' fz='xs' fs='italic' span>
                {sign(weaponStats.attack_bonus.total[0])}
              </Text>
              <EllipsisText c='gray.6' fz='xs' fs='italic' span>
                {_.truncate(
                  `${weaponStats.damage.dice}${weaponStats.damage.die}${weaponStats.damage.bonus.total > 0 ? ` + ${weaponStats.damage.bonus.total}` : ``} ${weaponStats.damage.damageType}${parseOtherDamage(weaponStats.damage.other)}${weaponStats.damage.extra ? ` + ${weaponStats.damage.extra}` : ''}`,
                  { length: props.isPhone ? 15 : 45 }
                )}
              </EllipsisText>
            </Group>
          )}
        </Group>
      </Grid.Col>
      {!props.isPhone && (
        <Grid.Col span={3}>
          <Grid>
            <Grid.Col span={2}>
              {!props.hideSections && (
                <>
                  {' '}
                  {isItemWithQuantity(props.invItem.item) && (
                    <Text ta='center' fz='xs'>
                      {getItemQuantity(props.invItem.item)}
                    </Text>
                  )}
                </>
              )}
            </Grid.Col>
            <Grid.Col span={3}>
              {!props.hideSections && (
                <>
                  {' '}
                  <Text ta='center' fz='xs'>
                    {labelizeBulk(getItemBulk(props.invItem))}
                  </Text>
                </>
              )}
            </Grid.Col>
            <Grid.Col span={7}>
              {!props.hideSections && (
                <>
                  {' '}
                  <Text ta='left' fz='xs'>
                    {priceToString(props.invItem.item.price)}
                  </Text>
                </>
              )}
            </Grid.Col>
          </Grid>
        </Grid.Col>
      )}
      <Grid.Col span={3} offset={props.isPhone ? 1 : 0}>
        <Group justify='flex-end' wrap='nowrap' align='center' h={'100%'} gap={10}>
          {isItemInvestable(props.invItem.item) && (
            <Button
              size='compact-xs'
              variant={props.invItem.is_invested ? 'subtle' : 'outline'}
              color={props.invItem.is_invested ? 'gray.7' : undefined}
              disabled={!props.invItem.is_invested && reachedInvestedLimit(props.id, props.entity?.inventory)}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                props.onInvest?.(props.invItem);
              }}
              w={80}
            >
              {props.invItem.is_invested ? 'Divest' : 'Invest'}
            </Button>
          )}
          {isItemImplantable(props.invItem.item) && (
            <Button
              size='compact-xs'
              variant={props.invItem.is_implanted ? 'subtle' : 'outline'}
              color={props.invItem.is_implanted ? 'gray.7' : undefined}
              disabled={!props.invItem.is_implanted && reachedImplantLimit(props.id, props.entity?.inventory)}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                props.onInvest?.(props.invItem);
              }}
              w={80}
            >
              {props.invItem.is_implanted ? 'Extract' : 'Implant'}
            </Button>
          )}
          {isItemEquippable(props.invItem.item) && (
            <Button
              size='compact-xs'
              variant={props.invItem.is_equipped ? 'subtle' : 'outline'}
              color={props.invItem.is_equipped ? 'gray.7' : undefined}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                props.onEquip?.(props.invItem);
              }}
              w={80}
              disabled={props.preventEquip}
            >
              {props.invItem.is_equipped ? 'Unequip' : 'Equip'}
            </Button>
          )}
          {props.additionalButtons}
        </Group>
      </Grid.Col>
    </Grid>
  );
}
