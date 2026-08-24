import { isTraitVisible } from '@content/content-hidden';
import { fetchContentAll, fetchContentSources } from '@content/content-store';
import { TagsInput, TagsInputProps } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { Trait } from '@schemas/content';
import { isTruthy } from '@utils/type-fixing';
import { isNumber } from 'lodash-es';
import { useMemo } from 'react';

interface TraitsInputProps extends TagsInputProps {
  defaultTraits?: number[];
  /**
   * Current value. Entries are trait IDs; bare strings are accepted so legacy operation
   * filters that stored a trait *name* keep working until they're re-saved.
   */
  traits?: (string | number)[];
  onTraitChange?: (traits: Trait[]) => void;
  /**
   * Like `onTraitChange`, but emits the raw storable values: a trait ID for every resolved
   * tag, and the original string for anything that couldn't be resolved (a free-typed tag, or
   * an ambiguous legacy name). Lets callers persist IDs without dropping unresolved entries.
   */
  onValuesChange?: (values: (string | number)[]) => void;
  includeCreatureTraits?: boolean;
  zIndex?: number;
}

export default function TraitsInput(props: TraitsInputProps) {
  const { data, isFetching } = useQuery({
    // The scope is a constant, so the queryKey needs no source fingerprint (and the distinct
    // literal avoids colliding with cached scope-keyed `get-traits` entries).
    queryKey: [`get-traits-all-accessible`],
    queryFn: async () => {
      // Fetch from every source the user can access, not just the page's default scope —
      // otherwise traits from other books (e.g. adding the Pahtra trait to a Galactic
      // Ancestries submission) are missing from the dropdown and silently dropped when typed.
      // Sources are fetched alongside the traits so two books defining the same trait name can
      // be told apart in the dropdown (see `label` below).
      const [traits, sources] = await Promise.all([
        fetchContentAll<Trait>('trait', 'ALL-USER-ACCESSIBLE'),
        fetchContentSources('ALL-USER-ACCESSIBLE'),
      ]);
      return { traits, sources };
    },
  });

  const { options, byLabel, byId, byName, labelById } = useMemo(() => {
    const traits = (data?.traits ?? [])
      .filter(isTruthy)
      .sort((a, b) => a.name.localeCompare(b.name))
      .filter((trait) => isTraitVisible('CHARACTER', trait));

    const sourceNames = new Map((data?.sources ?? []).map((source) => [source.id, source.name]));

    // More than one book can define a trait with the same name — "Rune" exists in both
    // Impossible Magic and Impossible Playtest. These used to collapse into a single dropdown
    // entry that resolved by name, so picking it silently bound whichever trait happened to be
    // fetched first, and two editing sessions could bind different traits.
    const nameCount = new Map<string, number>();
    for (const trait of traits) {
      const key = trait.name.toLowerCase();
      nameCount.set(key, (nameCount.get(key) ?? 0) + 1);
    }

    const options: string[] = [];
    const byLabel = new Map<string, Trait>();
    const byId = new Map<number, Trait>();
    const byName = new Map<string, Trait[]>();
    const labelById = new Map<number, string>();

    for (const trait of traits) {
      const key = trait.name.toLowerCase();
      // Only qualify the ambiguous ones, so every trait with a unique name keeps its plain name
      // and nothing changes for the vast majority of content.
      const label =
        (nameCount.get(key) ?? 0) > 1
          ? `${trait.name} (${sourceNames.get(trait.content_source_id) ?? `#${trait.id}`})`
          : trait.name;

      options.push(label);
      byLabel.set(label, trait);
      byId.set(trait.id, trait);
      byName.set(key, [...(byName.get(key) ?? []), trait]);
      labelById.set(trait.id, label);
    }

    return { options, byLabel, byId, byName, labelById };
  }, [data]);

  /**
   * Resolve a stored value to its trait. Numbers are trait IDs. Strings are legacy names, which
   * only resolve when exactly one trait claims the name — an ambiguous one is left as typed
   * rather than guessed at, which is the bug this component used to have.
   */
  const resolve = (value: string | number): Trait | undefined => {
    if (isNumber(value)) return byId.get(value);
    const matches = byName.get(`${value}`.toLowerCase()) ?? [];
    return matches.length === 1 ? matches[0] : undefined;
  };

  /** Display label for a stored value, falling back to the raw value when it doesn't resolve. */
  const labelOf = (value: string | number): string => {
    const trait = resolve(value);
    return trait ? (labelById.get(trait.id) ?? trait.name) : `${value}`;
  };

  // Remove the added props so they don't get passed to TagsInput
  const passedProps = { ...props };
  delete passedProps.defaultTraits;
  delete passedProps.traits;
  delete passedProps.onTraitChange;
  delete passedProps.onValuesChange;
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
          defaultValue={(props.defaultTraits ?? []).map(labelOf)}
          value={props.traits ? props.traits.map(labelOf) : props.value}
          data={options}
          limit={1000}
          onChange={(value) => {
            const traits: Trait[] = [];
            const values: (string | number)[] = [];

            for (const label of value.filter(isTruthy)) {
              // Match the qualified label first, then fall back to a plain name so a tag typed
              // by hand (or carried over from older content) still binds to its trait.
              const trait = byLabel.get(label) ?? resolve(label);
              if (trait) {
                traits.push(trait);
                values.push(trait.id);
              } else {
                values.push(label);
              }
            }

            props.onTraitChange?.(traits);
            props.onValuesChange?.(values);
          }}
        />
      )}
    </>
  );
}
