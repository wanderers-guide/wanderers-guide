import React from 'react';
import { isItemArmor, isItemRangedWeapon, isItemWeapon } from '@items/inv-utils';
import { Item, ItemGroup } from '@schemas/content';
import { hasTraitType } from '@utils/traits';
// Render game icons via the lazy <Icon> component (which dynamic-imports react-icons/gi) so
// these item-category icons don't pull the 6.9MB icon monolith onto the eager first-paint path.
import { Icon } from '@common/Icon';

type ItemIconType =
  | 'GENERAL'
  | 'ARMOR'
  | 'WEAPON'
  | 'SHIELD'
  | 'RUNE'
  | 'UPGRADE'
  | 'MATERIAL'
  | 'UNARMED'
  | 'BOMB'
  | 'CONTAINER'
  | 'STAFF'
  | 'WAND'
  | 'BOW'
  | 'LIGHT_ARMOR'
  | 'MEDIUM_ARMOR'
  | 'HEAVY_ARMOR'
  | 'LIGHT_BARDING'
  | 'HEAVY_BARDING'
  | 'HIGH_TECH_GUN';

export const getIconMap = (size: string, color: string): Record<ItemIconType, React.JSX.Element> => ({
  GENERAL: <Icon name='swapbag' color={color} size={size} />,
  ARMOR: <Icon name='chestarmor' color={color} size={size} />,
  WEAPON: <Icon name='broadsword' color={color} size={size} />,
  SHIELD: <Icon name='slashedshield' color={color} size={size} />,
  RUNE: <Icon name='runestone' color={color} size={size} />,
  UPGRADE: <Icon name='upgrade' color={color} size={size} />,
  MATERIAL: <Icon name='cubes' color={color} size={size} />,
  UNARMED: <Icon name='fist' color={color} size={size} />,
  BOMB: <Icon name='rollingbomb' color={color} size={size} />,
  CONTAINER: <Icon name='lightbackpack' color={color} size={size} />,
  STAFF: <Icon name='wizardstaff' color={color} size={size} />,
  WAND: <Icon name='crystalwand' color={color} size={size} />,
  BOW: <Icon name='pocketbow' color={color} size={size} />,
  LIGHT_ARMOR: <Icon name='ninjaarmor' color={color} size={size} />,
  MEDIUM_ARMOR: <Icon name='chestarmor' color={color} size={size} />,
  HEAVY_ARMOR: <Icon name='abdominalarmor' color={color} size={size} />,
  LIGHT_BARDING: <Icon name='dorsalscales' color={color} size={size} />,
  HEAVY_BARDING: <Icon name='metalscales' color={color} size={size} />,
  HIGH_TECH_GUN: <Icon name='boltergun' color={color} size={size} />,
});

export function ItemIcon(props: { item: Item; size: string; color: string; useDefaultIcon?: boolean }) {
  let type: ItemIconType = props.item.group;
  if (props.item.meta_data?.category === 'unarmed_attack') {
    type = 'UNARMED';
  }

  if (hasTraitType('BOMB', props.item.traits ?? undefined)) {
    type = 'BOMB';
  }

  if (hasTraitType('STAFF', props.item.traits ?? undefined)) {
    type = 'STAFF';
  }

  if (hasTraitType('WAND', props.item.traits ?? undefined)) {
    type = 'WAND';
  }

  // @ts-ignore, TODO, fix items with incorrect types
  if (type === 'BACKPACK' || type === 'KIT') {
    type = 'CONTAINER';
  }

  if (type === 'GENERAL' && props.item.meta_data?.bulk.capacity) {
    type = 'CONTAINER';
  }

  if (isItemArmor(props.item)) {
    if (hasTraitType('COMPANION', props.item.traits ?? undefined)) {
      if (props.item.meta_data?.category === 'light') {
        type = 'LIGHT_BARDING';
      } else if (props.item.meta_data?.category === 'heavy') {
        type = 'HEAVY_BARDING';
      } else {
        type = 'HEAVY_BARDING';
      }
    } else {
      if (props.item.meta_data?.category === 'light') {
        type = 'LIGHT_ARMOR';
      } else if (props.item.meta_data?.category === 'medium') {
        type = 'MEDIUM_ARMOR';
      } else if (props.item.meta_data?.category === 'heavy') {
        type = 'HEAVY_ARMOR';
      }
    }
  }

  if (isItemRangedWeapon(props.item)) {
    type = 'BOW';
  }

  if (
    isItemWeapon(props.item) &&
    hasTraitType('TECH', props.item.traits ?? undefined) &&
    props.item.meta_data?.range &&
    Number(props.item.meta_data.range) > 0
  ) {
    type = 'HIGH_TECH_GUN';
  }

  let icon = getIconMap(props.size, props.color)[type];
  if (!icon && props.useDefaultIcon) {
    return <>{getIconMap(props.size, props.color)['GENERAL']}</>;
  } else {
    return <>{icon}</>;
  }
}
