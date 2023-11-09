import { getContentStore } from '@content/content-controller';
import { TagsInput, TagsInputProps } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { Trait } from '@typing/content';
import _ from 'lodash';

interface TraitsInputProps extends TagsInputProps {
  defaultTraits?: number[];
  onTraitChange?: (traits: Trait[]) => void;
  includeCreatureTraits?: boolean;
}

export default function TraitsInput(props: TraitsInputProps) {
  const { data, isFetching } = useQuery({
    queryKey: [`get-traits`],
    queryFn: async () => {
      const traits = await getContentStore<Trait>('trait');
      return [...traits.values()];
    },
  });

  const traits =
    (data &&
      data
        .sort((a, b) => a?.name.localeCompare(b?.name))
        .filter((trait) => !trait.meta_data?.unselectable)
        .filter((trait) =>
          props.includeCreatureTraits ? true : !trait.meta_data?.creature_trait
        )) ??
    [];

  return (
    <>
      {isFetching || !data ? (
        <TagsInput {...props} readOnly />
      ) : (
        <TagsInput
          {...props}
          defaultValue={traits
            .filter((trait) => props.defaultTraits?.includes(trait.id))
            .map((trait) => trait.name)}
          data={_.uniq(traits.map((trait) => trait.name))}
          limit={1000}
          onChange={(value) => {
            if (props.onTraitChange) {
              props.onTraitChange(
                value
                  .filter((trait) => trait)
                  .map((trait) => traits.find((t) => t.name === trait)!)
                  .filter((trait) => trait)
              );
            }
          }}
        />
      )}
    </>
  );
}
