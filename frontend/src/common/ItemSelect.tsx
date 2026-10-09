import { fetchContentAll, getDefaultSources, getDefaultSourcesKey } from '@content/content-store';
import { Autocomplete, MultiSelect, TagsInput } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { Item } from '@schemas/content';
import { isTruthy } from '@utils/type-fixing';
import { uniq } from 'lodash-es';
import { preserveItemUpgradeSelections, type UpgradeReference } from '@items/upgrade-selection';

function cleanName(name?: string) {
  if (!name) return name;
  return name.trim().replace(/\s/g, '-').toLowerCase();
}

export function ItemSelect(props: {
  label?: string;
  placeholder?: string;
  valueName?: string;
  filter: (item: Item) => boolean;
  onChange: (item?: Item, name?: string) => void;
}) {
  const { data, isFetching } = useQuery({
    queryKey: [`get-items`, { sources: getDefaultSourcesKey('INFO') }],
    queryFn: async () => {
      return await fetchContentAll<Item>('item', getDefaultSources('INFO'));
    },
  });

  return (
    <>
      {isFetching || !data ? (
        <Autocomplete readOnly />
      ) : (
        <Autocomplete
          label={props.label}
          placeholder={props.placeholder}
          value={data.find((item) => cleanName(item.name) === props.valueName)?.name}
          onChange={(value) => {
            console.log(value);
            const item = data.find((item) => item.name === value);
            props.onChange(item, cleanName(item?.name));
          }}
          data={uniq(data.filter(props.filter).map((item) => item.name))}
        />
      )}
    </>
  );
}

type ItemMultiSelectProps = {
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  filter: (item: Item) => boolean;
} & (
  | {
      referenceMode: true;
      valueReferences?: UpgradeReference[];
      onReferenceChange: (references: UpgradeReference[]) => void;
    }
  | {
      referenceMode?: false;
      valueName?: string[];
      onChange: (items?: Item[], names?: string[]) => void;
    }
);

export function ItemMultiSelect(props: ItemMultiSelectProps) {
  const { data, isFetching } = useQuery({
    queryKey: [`get-items`, { sources: getDefaultSourcesKey('INFO') }],
    queryFn: async () => {
      return await fetchContentAll<Item>('item', getDefaultSources('INFO'));
    },
  });

  if (props.referenceMode) {
    const catalog = (data ?? []).filter(props.filter);
    const options = new Map(
      catalog.map((item) => [`catalog:${item.id}`, { value: `catalog:${item.id}`, label: item.name }])
    );
    const values = (props.valueReferences ?? []).map((reference, index) => {
      const value = `owned:${index}:${reference.id}`;
      options.set(value, { value, label: reference.name });
      return value;
    });
    return (
      <MultiSelect
        disabled={props.disabled}
        label={props.label}
        placeholder={props.placeholder}
        data={[...options.values()]}
        value={values}
        readOnly={isFetching || !data}
        searchable
        selectFirstOptionOnChange
        limit={1000}
        onChange={(selectedKeys) => {
          props.onReferenceChange(preserveItemUpgradeSelections(selectedKeys, props.valueReferences, catalog));
        }}
      />
    );
  }

  const names = props.valueName?.map((name) => cleanName(name));

  return (
    <>
      {isFetching || !data ? (
        <TagsInput disabled={props.disabled} label={props.label} placeholder={props.placeholder} readOnly />
      ) : (
        <>
          <TagsInput
            disabled={props.disabled}
            label={props.label}
            placeholder={props.placeholder}
            value={data
              .filter((item) => {
                if (names && Array.isArray(names)) {
                  const itemName = cleanName(item.name);
                  if (itemName) {
                    return names.includes(itemName);
                  }
                }
                return false;
              })
              .map((item) => item.name)}
            data={uniq(data.filter(props.filter).map((item) => item.name))}
            limit={1000}
            onChange={(value) => {
              const items = value.map((name) => data.find((item) => item.name === name)).filter(isTruthy);
              props.onChange(
                items,
                items.map((item) => cleanName(item.name)!)
              );
            }}
          />
        </>
      )}
    </>
  );
}
