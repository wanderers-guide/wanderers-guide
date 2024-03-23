import { Item, ItemGroup } from '@typing/content';
import {
  GiBroadsword,
  GiChestArmor,
  GiCloak,
  GiCubes,
  GiRuneStone,
  GiShield,
  GiShoulderArmor,
  GiSlashedShield,
  GiSwapBag,
} from 'react-icons/gi';

const getIconMap = (size: string, color: string) => ({
  GENERAL: <GiSwapBag color={color} size={size} />,
  ARMOR: <GiChestArmor color={color} size={size} />,
  WEAPON: <GiBroadsword color={color} size={size} />,
  SHIELD: <GiSlashedShield color={color} size={size} />,
  RUNE: <GiRuneStone color={color} size={size} />,
  MATERIAL: <GiCubes color={color} size={size} />,
});

export function ItemIcon(props: { group: ItemGroup; size: string; color: string }) {
  return <>{getIconMap(props.size, props.color)[props.group]}</>;
}
