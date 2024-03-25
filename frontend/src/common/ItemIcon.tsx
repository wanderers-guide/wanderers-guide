import { Item, ItemGroup } from '@typing/content';
import { hasTraitType } from '@utils/traits';
import {
  GiBroadsword,
  GiChestArmor,
  GiCloak,
  GiCubes,
  GiFist,
  GiLightBackpack,
  GiRollingBomb,
  GiRuneStone,
  GiShield,
  GiShoulderArmor,
  GiSlashedShield,
  GiSwapBag,
} from 'react-icons/gi';

type ItemIconType = 'GENERAL' | 'ARMOR' | 'WEAPON' | 'SHIELD' | 'RUNE' | 'MATERIAL' | 'UNARMED' | 'BOMB' | 'CONTAINER';

const getIconMap = (size: string, color: string): Record<ItemIconType, JSX.Element> => ({
  GENERAL: <GiSwapBag color={color} size={size} />,
  ARMOR: <GiChestArmor color={color} size={size} />,
  WEAPON: <GiBroadsword color={color} size={size} />,
  SHIELD: <GiSlashedShield color={color} size={size} />,
  RUNE: <GiRuneStone color={color} size={size} />,
  MATERIAL: <GiCubes color={color} size={size} />,
  UNARMED: <GiFist color={color} size={size} />,
  BOMB: <GiRollingBomb color={color} size={size} />,
  CONTAINER: <GiLightBackpack color={color} size={size} />,
});

export function ItemIcon(props: { item: Item; size: string; color: string }) {
  let type: ItemIconType = props.item.group;
  if (props.item.meta_data?.category === 'unarmed_attack') {
    type = 'UNARMED';
  }

  if (hasTraitType('BOMB', props.item.traits)) {
    type = 'BOMB';
  }

  if (type === 'GENERAL' && props.item.meta_data?.bulk.capacity) {
    type = 'CONTAINER';
  }

  return <>{getIconMap(props.size, props.color)[type]}</>;
}
