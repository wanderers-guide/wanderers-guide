import { fetchContentAll } from '@content/content-store';
import { Autocomplete, TagsInput } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { Item } from '@typing/content';
import { isTruthy } from '@utils/type-fixing';
import { uniq } from 'lodash-es';

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
    queryKey: [`get-items`],
    queryFn: async () => {
      return await fetchContentAll<Item>('item');
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

export function ItemMultiSelect(props: {
  label?: string;
  placeholder?: string;
  valueName?: string[];
  disabled?: boolean;
  filter: (item: Item) => boolean;
  onChange: (items?: Item[], names?: string[]) => void;
}) {
  const { data, isFetching } = useQuery({
    queryKey: [`get-items`],
    queryFn: async () => {
      return await fetchContentAll<Item>('item');
    },
  });

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
