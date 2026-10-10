import type { Item } from '@schemas/content';

export type UpgradeReference = { name: string; id: number; upgrade?: Item };

/** UI-only occurrence keys preserve configured copies; persisted IDs remain actual item IDs. */
export function preserveItemUpgradeSelections(
  selectedKeys: readonly string[] | undefined,
  current: readonly UpgradeReference[] | undefined,
  catalog: readonly Item[]
): UpgradeReference[] {
  return (selectedKeys ?? []).flatMap((key) => {
    const existing = current?.find((reference, index) => key === `owned:${index}:${reference.id}`);
    if (existing) return [existing];
    const item = catalog.find((row) => key === `catalog:${row.id}`);
    return item ? [{ name: item.name, id: item.id, upgrade: item }] : [];
  });
}
