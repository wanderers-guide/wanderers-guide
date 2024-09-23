import { drawerState } from '@atoms/navAtoms';
import { SpellSelectionOption } from '@common/select/SelectContent';
import { Text } from '@mantine/core';
import { StatButton } from '@pages/character_builder/CharBuilderCreation';
import { isCantrip, isRitual } from '@spells/spell-utils';
import { Spell } from '@typing/content';
import { useRecoilState } from 'recoil';

export default function SpellListEntrySection(props: {
  spell?: Spell;
  exhausted: boolean;
  tradition: string;
  attribute: string;
  onCastSpell: (cast: boolean) => void;
  onOpenManageSpells?: () => void;
  hasFilters: boolean;
  leftSection?: React.ReactNode;
  prefix?: React.ReactNode;
}) {
  const [_drawer, openDrawer] = useRecoilState(drawerState);
  const exhausted = props.spell && isCantrip(props.spell) ? false : props.exhausted;

  if (props.spell) {
    return (
      <StatButton
        onClick={() => {
          if (!props.spell) return;

          if (isRitual(props.spell)) {
            openDrawer({
              type: 'spell',
              data: {
                id: props.spell.id,
                spell: props.spell,
              },
              extra: { addToHistory: true },
            });
            return;
          }

          openDrawer({
            type: 'cast-spell',
            data: {
              id: props.spell.id,
              spell: props.spell,
              exhausted: exhausted,
              tradition: props.tradition,
              attribute: props.attribute,
              onCastSpell: (cast: boolean) => {
                props.onCastSpell(cast);
              },
            },
            extra: { addToHistory: true },
          });
        }}
      >
        <SpellSelectionOption
          noBackground
          hideRank
          exhausted={exhausted}
          showButton={false}
          spell={props.spell}
          leftSection={props.leftSection}
          px={0}
          prefix={props.prefix}
        />
      </StatButton>
    );
  }

  if (props.hasFilters) {
    return null;
  }

  return (
    <StatButton
      onClick={() => {
        props.onOpenManageSpells?.();
      }}
    >
      <Text fz='xs' fs='italic' c='dimmed' fw={500}>
        No Spell Prepared
      </Text>
    </StatButton>
  );
}
