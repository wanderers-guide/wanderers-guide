import { characterState } from '@atoms/characterAtoms';
import { Icon, iconComponents } from '@common/Icon';
import { collectEntitySpellcasting } from '@content/collect-content';
import classes from '@css/ActionsGrid.module.css';
import {
  Text,
  Card,
  ScrollArea,
  SimpleGrid,
  Stack,
  UnstyledButton,
  Divider,
  Box,
  Menu,
  Button,
  Group,
} from '@mantine/core';
import { ContextModalProps } from '@mantine/modals';
import { Spell, SpellSlot, SpellSlotRecord } from '@typing/content';
import { rankNumber } from '@utils/numbers';
import _ from 'lodash';
import { useRecoilState } from 'recoil';

/**
 * This modal is used for selecting the casting option when casting a spell from a staff and you're a spontaneous caster.
 */
export default function SelectStaffCastingModal({
  context,
  id,
  innerProps,
}: ContextModalProps<{
  spell: Spell;
  canCastNormally: boolean;
  onSelect: (option: 'NORMAL' | 'SLOT-CONSUME', slotRank?: number) => void;
}>) {
  return (
    <SelectStaffCastingModalContents
      spell={innerProps.spell}
      canCastNormally={innerProps.canCastNormally}
      onSelect={innerProps.onSelect}
      onClose={() => context.closeModal(id)}
    />
  );
}

export function SelectStaffCastingModalContents(props: {
  spell: Spell;
  canCastNormally: boolean;
  onSelect: (option: 'NORMAL' | 'SLOT-CONSUME', slotRank?: number) => void;
  onClose: () => void;
}) {
  const [character, setCharacter] = useRecoilState(characterState);
  const slots = (character && collectEntitySpellcasting('CHARACTER', character).slots) ?? [];
  const groupedSlots = _.groupBy(slots, 'rank');

  const rankLevels: number[] = [];
  for (const rank of Object.keys(groupedSlots)) {
    const nonExhaustedSlot = groupedSlots[rank].find((s) => s.exhausted !== true);
    if (nonExhaustedSlot) {
      const rankInt = parseInt(rank);
      if (rankInt >= props.spell.rank) {
        rankLevels.push(rankInt);
      }
    }
  }

  return (
    <Stack>
      <Text fz='sm'>
        Since you're a spontaneous spellcaster, you can cast this spell either normally (by consuming charges equal to
        the spell's rank) or by consuming 1 charge and a spell slot of the same rank or greater as the spell you're
        casting.
      </Text>
      <Divider my={0} />
      <Group align='center' justify='center'>
        <Box>
          <Button
            variant='light'
            size='sm'
            radius='xl'
            onClick={() => {
              props.onSelect('NORMAL');
              props.onClose();
            }}
            disabled={!props.canCastNormally}
          >
            Cast Normally
          </Button>
        </Box>
        <Box>
          <Menu withinPortal>
            <Menu.Target>
              <Button variant='light' size='sm' radius='xl' disabled={rankLevels.length === 0}>
                Cast with Slot
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              {rankLevels.map((rank, index) => (
                <Menu.Item
                  key={index}
                  onClick={() => {
                    props.onSelect('SLOT-CONSUME', rank);
                    props.onClose();
                  }}
                >
                  {rankNumber(rank)} Rank Slot
                </Menu.Item>
              ))}
            </Menu.Dropdown>
          </Menu>
        </Box>
      </Group>
    </Stack>
  );
}
