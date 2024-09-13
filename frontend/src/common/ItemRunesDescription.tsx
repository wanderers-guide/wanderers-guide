import { isItemWithPropertyRunes } from "@items/inv-utils";
import { Divider, Group, Text, useMantineTheme } from "@mantine/core";
import { Item } from "@typing/content";
import { GiRuneStone } from "react-icons/gi";
import RichText from "./RichText";
import { getIconMap } from "./ItemIcon";

export function ItemRunesDescription(
  props: {
    item: Item;
  }
) {
  const theme = useMantineTheme();
  const { item } = props;

  if (!isItemWithPropertyRunes(item)) {
    return <></>;
  }

  const runes = item.meta_data?.runes?.property || [];
  runes.sort((a, b) => a.name.localeCompare(b.name));

  return <>
    {runes.map(
      (rune, _) => <>
        <Divider />
        <Group>
          {getIconMap('1.0rem', theme.colors.gray[6])['RUNE']}
          <Text fw={600} c='gray.5' span>{rune.name}</Text>
        </Group>
        <RichText>{rune.rune?.description}</RichText>
      </>
    )}
  </>;
}