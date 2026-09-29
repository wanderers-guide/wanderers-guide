import { Spell } from '@schemas/content';
import { hasTraitType } from '@utils/traits';

type InnateSpellEntry = { rank: number; spell: Spell };

export type InnateStatBlockGroup<T extends InnateSpellEntry> = {
  kind: 'rank' | 'cantrip' | 'constant';
  rank: number;
  spells: T[];
};

export function getInnateStatBlockGroups<T extends InnateSpellEntry>(
  spells: T[],
  level: number,
  frequencies?: Record<string, 'AT-WILL' | 'CONSTANT'>
): InnateStatBlockGroup<T>[] {
  const groups = new Map<string, InnateStatBlockGroup<T>>();

  for (const spell of spells) {
    const frequency = frequencies?.[`${spell.rank}:${spell.spell.name.toLowerCase()}`];
    const kind =
      frequency === 'CONSTANT'
        ? 'constant'
        : hasTraitType('CANTRIP', spell.spell.traits ?? undefined)
          ? 'cantrip'
          : 'rank';
    const rank = kind === 'cantrip' && spell.rank === 0 ? Math.ceil(level / 2) : spell.rank;
    const key = `${kind}:${rank}`;
    const group = groups.get(key) ?? { kind, rank, spells: [] };
    group.spells.push(spell);
    groups.set(key, group);
  }

  const order = { rank: 0, cantrip: 1, constant: 2 };
  return [...groups.values()].sort((a, b) => order[a.kind] - order[b.kind] || b.rank - a.rank);
}
