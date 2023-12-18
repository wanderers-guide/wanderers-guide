import { Item, ItemGroup } from '@typing/content';
import { GiCloak } from 'react-icons/gi';

const getIconMap = (size: string, color: string) => ({
  GENERAL: <GiCloak color={color} size={size} />,
  ARMOR: <GiCloak color={color} size={size} />,
  WEAPON: <GiCloak color={color} size={size} />,
  SHIELD: <GiCloak color={color} size={size} />,
});

export function ItemIcon(props: { group: ItemGroup; size: string; color: string }) {
  return <>{getIconMap(props.size, props.color)[props.group]}</>;
}
