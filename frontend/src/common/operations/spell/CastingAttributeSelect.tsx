import { Select } from '@mantine/core';
import { CastingAttribute, CastingAttributeSchema } from '@schemas/shared';
import { toLabel } from '@utils/strings';

/** Optional innate casting attribute; clearing the selection restores Charisma. */
export function CastingAttributeSelect(props: {
  value: CastingAttribute | undefined;
  onChange: (value: CastingAttribute | undefined) => void;
}) {
  return (
    <Select
      label='Casting attribute'
      placeholder='Charisma'
      size='xs'
      maw={280}
      clearable
      value={props.value ?? null}
      data={CastingAttributeSchema.options.map((attribute) => ({ value: attribute, label: toLabel(attribute) }))}
      onChange={(value) => props.onChange(value === null ? undefined : CastingAttributeSchema.parse(value))}
    />
  );
}
