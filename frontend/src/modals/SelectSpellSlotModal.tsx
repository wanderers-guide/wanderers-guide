import { characterState } from '@atoms/characterAtoms';
import { collectEntitySpellcasting } from '@content/collect-content';
import classes from '@css/ActionsGrid.module.css';
import { Text, Card, ScrollArea, SimpleGrid, Stack, UnstyledButton, Divider, Box } from '@mantine/core';
import { ContextModalProps } from '@mantine/modals';
import { Spell, SpellSlot, SpellSlotRecord } from '@typing/content';
import { rankNumber } from '@utils/numbers';
import { useRecoilState } from 'recoil';

export default function SelectSpellSlotModal({
  context,
  id,
  innerProps,
}: ContextModalProps<{
  allSpells: Spell[];
  text?: string;
  source?: string;
  onSelect: (slot: SpellSlotRecord) => void;
}>) {
  return (
    <SelectSpellSlotModalContents
      allSpells={innerProps.allSpells}
      text={innerProps.text}
      source={innerProps.source}
      onSelect={innerProps.onSelect}
      onClose={() => context.closeModal(id)}
    />
  );
}

export function SelectSpellSlotModalContents(props: {
  allSpells: Spell[];
  text?: string;
  source?: string;
  onSelect: (slot: SpellSlotRecord) => void;
  onClose: () => void;
}) {
  const [character, setCharacter] = useRecoilState(characterState);
  const slots = (character && collectEntitySpellcasting('CHARACTER', character).slots) ?? [];

  const items = slots
    .sort((a, b) => a.rank - b.rank)
    .filter((slot) => {
      if (props.source) {
        return slot.source === props.source;
      } else {
        return true;
      }
    })
    .filter((slot) => slot.rank !== 0)
    .map((slot, index) => (
      <UnstyledButton
        key={index}
        className={classes.item}
        onClick={() => {
          props.onSelect(slot);
          props.onClose();
        }}
        disabled={slot.exhausted}
      >
        <Stack align='center' justify='flex-start' gap={10} style={{ height: '100%' }}>
          <Box>
            <Text>{`${rankNumber(slot.rank)} Rank`}</Text>
            <Divider c={'gray.0'} />
          </Box>

          <Text>
            {slot.spell_id ? (
              <Text fw={600}>{props.allSpells.find((s) => s.id === slot.spell_id)!.name}</Text>
            ) : (
              <Text c='gray.6' fs='italic' fz='sm'>
                {'No Spell Prepared'}
              </Text>
            )}
          </Text>
        </Stack>
      </UnstyledButton>
    ));

  return (
    <Stack>
      {props.text && <Text>{props.text}</Text>}
      <Card withBorder radius='md' className={classes.card} pl={15} py={15} pr={5}>
        <ScrollArea h={315} scrollbars='y'>
          <SimpleGrid cols={3} pl={5} py={5} pr={15}>
            {items}
          </SimpleGrid>
        </ScrollArea>
      </Card>
    </Stack>
  );
}
