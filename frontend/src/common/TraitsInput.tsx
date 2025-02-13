import { isTraitVisible } from '@content/content-hidden';
import { fetchContentAll } from '@content/content-store';
import { TagsInput, TagsInputProps } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { Trait } from '@typing/content';
import { isTruthy } from '@utils/type-fixing';
import { uniq } from 'lodash-es';

interface TraitsInputProps extends TagsInputProps {
  defaultTraits?: number[];
  traits?: number[];
  onTraitChange?: (traits: Trait[]) => void;
  includeCreatureTraits?: boolean;
  zIndex?: number;
}

export default function TraitsInput(props: TraitsInputProps) {
  const { data, isFetching } = useQuery({
    queryKey: [`get-traits`],
    queryFn: async () => {
      return await fetchContentAll<Trait>('trait');
    },
  });

  const traits =
    (data &&
      data
        .filter(isTruthy)
        .sort((a, b) => a.name.localeCompare(b.name))
        .filter((trait) => isTraitVisible('CHARACTER', trait))) ??
    [];

  // Remove the added props so they don't get passed to TagsInput
  const passedProps = { ...props };
  delete passedProps.defaultTraits;
  delete passedProps.traits;
  delete passedProps.onTraitChange;
  delete passedProps.includeCreatureTraits;

  return (
    <>
      {isFetching || !data ? (
        <TagsInput
          styles={(t) => ({
            dropdown: {
              zIndex: props.zIndex ?? 1500,
            },
          })}
          {...passedProps}
          readOnly
        />
      ) : (
        <TagsInput
          styles={(t) => ({
            dropdown: {
              zIndex: props.zIndex ?? 1500,
            },
          })}
          {...passedProps}
          defaultValue={traits.filter((trait) => props.defaultTraits?.includes(trait.id)).map((trait) => trait.name)}
          value={
            props.traits
              ? traits.filter((trait) => props.traits?.includes(trait.id)).map((trait) => trait.name)
              : props.value
          }
          data={uniq(traits.map((trait) => trait.name))}
          limit={1000}
          onChange={(value) => {
            if (props.onTraitChange) {
              props.onTraitChange(
                value
                  .filter(isTruthy)
                  .map((trait) => traits.find((t) => t.name === trait)!)
                  .filter(isTruthy)
              );
            }
          }}
        />
      )}
    </>
  );
}
