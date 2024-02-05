import { fetchContentAll } from '@content/content-store';
import { Autocomplete, TagsInput } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { Item } from '@typing/content';
import _ from 'lodash';

function cleanName(name?: string) {
  if (!name) return name;
  return name.trim().replace(/\s/g, '-').toLowerCase();
}

export function ItemSelect(props: {
  label?: string;
  placeholder?: string;
  valueId?: number;
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
        <Autocomplete size='xs' w={190} readOnly />
      ) : (
        <Autocomplete
          size='xs'
          w={190}
          label={props.label}
          placeholder={props.placeholder}
          defaultValue={
            props.valueId
              ? `${props.valueId}`
              : data.find((item) => cleanName(item.name) === props.valueName)?.id.toString()
          }
          onChange={(value) => {
            const item = data.find((item) => `${item.id}` === value);
            props.onChange(item, cleanName(item?.name));
          }}
          data={data.filter(props.filter).map((item) => {
            return { label: item.name, value: `${item.id}` };
          })}
        />
      )}
    </>
  );
}

export function ItemMultiSelect(props: {
  label?: string;
  placeholder?: string;
  valueId?: number[];
  valueName?: string[];
  filter: (item: Item) => boolean;
  onChange: (items?: Item[], names?: string[]) => void;
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
        <TagsInput label={props.label} placeholder={props.placeholder} readOnly />
      ) : (
        <>
          <TagsInput
            label={props.label}
            placeholder={props.placeholder}
            defaultValue={data
              .filter((item) => {
                if (props.valueId && Array.isArray(props.valueId)) {
                  return props.valueId.includes(item.id);
                } else if (props.valueName && Array.isArray(props.valueName)) {
                  return props.valueName.includes(cleanName(item.name) ?? '');
                }
                return false;
              })
              .map((item) => `${item.id}`)}
            data={data.filter(props.filter).map((item) => {
              return { label: item.name, value: `${item.id}` };
            })}
            limit={1000}
            onChange={(value) => {
              const items = value
                .map((id) => data.find((item) => `${item.id}` === id))
                .filter((item) => !!item) as Item[];
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
