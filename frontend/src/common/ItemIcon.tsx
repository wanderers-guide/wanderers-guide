import { isItemArmor, isItemRangedWeapon, isItemWeapon } from '@items/inv-utils';
import { Item, ItemGroup } from '@typing/content';
import { hasTraitType } from '@utils/traits';
import {
  GiBolterGun,
  GiBroadsword,
  GiChestArmor,
  GiCloak,
  GiCubes,
  GiFist,
  GiLightBackpack,
  GiRollingBomb,
  GiRuneStone,
  GiShield,
  GiWizardStaff,
  GiCrystalWand,
  GiSlashedShield,
  GiSwapBag,
  GiUpgrade,
  GiPocketBow,
  GiAbdominalArmor,
  GiNinjaArmor,
  GiDirewolf,
  GiDorsalScales,
  GiMetalScales,
} from 'react-icons/gi';

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

export const getIconMap = (size: string, color: string): Record<ItemIconType, JSX.Element> => ({
  GENERAL: <GiSwapBag color={color} size={size} />,
  ARMOR: <GiChestArmor color={color} size={size} />,
  WEAPON: <GiBroadsword color={color} size={size} />,
  SHIELD: <GiSlashedShield color={color} size={size} />,
  RUNE: <GiRuneStone color={color} size={size} />,
  UPGRADE: <GiUpgrade color={color} size={size} />,
  MATERIAL: <GiCubes color={color} size={size} />,
  UNARMED: <GiFist color={color} size={size} />,
  BOMB: <GiRollingBomb color={color} size={size} />,
  CONTAINER: <GiLightBackpack color={color} size={size} />,
  STAFF: <GiWizardStaff color={color} size={size} />,
  WAND: <GiCrystalWand color={color} size={size} />,
  BOW: <GiPocketBow color={color} size={size} />,
  LIGHT_ARMOR: <GiNinjaArmor color={color} size={size} />,
  MEDIUM_ARMOR: <GiChestArmor color={color} size={size} />,
  HEAVY_ARMOR: <GiAbdominalArmor color={color} size={size} />,
  LIGHT_BARDING: <GiDorsalScales color={color} size={size} />,
  HEAVY_BARDING: <GiMetalScales color={color} size={size} />,
  HIGH_TECH_GUN: <GiBolterGun color={color} size={size} />,
});

export function ItemIcon(props: { item: Item; size: string; color: string; useDefaultIcon?: boolean }) {
  let type: ItemIconType = props.item.group;
  if (props.item.meta_data?.category === 'unarmed_attack') {
    type = 'UNARMED';
  }

  if (hasTraitType('BOMB', props.item.traits)) {
    type = 'BOMB';
  }

  if (hasTraitType('STAFF', props.item.traits)) {
    type = 'STAFF';
  }

  if (hasTraitType('WAND', props.item.traits)) {
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
    if (hasTraitType('COMPANION', props.item.traits)) {
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
    hasTraitType('TECH', props.item.traits) &&
    props.item.meta_data?.range &&
    props.item.meta_data.range > 0
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
