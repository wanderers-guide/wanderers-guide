import { fetchContentAll } from "@content/content-store";
import { TagsInput, TagsInputProps } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { Trait } from "@typing/content";
import * as _ from "lodash-es";

interface TraitsInputProps extends TagsInputProps {
  defaultTraits?: number[];
  onTraitChange?: (traits: Trait[]) => void;
  includeCreatureTraits?: boolean;
}

export default function TraitsInput(props: TraitsInputProps) {
  const { data, isFetching } = useQuery({
    queryKey: [`get-traits`],
    queryFn: async () => {
      return await fetchContentAll<Trait>("trait");
    },
  });

  const traits =
    (data &&
      data
        .filter((trait) => trait)
        .sort((a, b) => a.name.localeCompare(b.name))
        .filter((trait) => !trait.meta_data?.unselectable)
        .filter((trait) =>
          props.includeCreatureTraits ? true : !trait.meta_data?.creature_trait
        )) ??
    [];

  // Remove the added props so they don't get passed to TagsInput
  const passedProps = { ...props };
  delete passedProps.defaultTraits;
  delete passedProps.onTraitChange;
  delete passedProps.includeCreatureTraits;

  return (
    <>
      {isFetching || !data ? (
        <TagsInput {...passedProps} readOnly />
      ) : (
        <TagsInput
          {...passedProps}
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
