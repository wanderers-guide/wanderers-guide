import { fetchContentAll } from '@content/content-store';
import { OperationWrapper } from '../Operations';
import { Autocomplete, Group, Select, Stack } from '@mantine/core';
import { useDidUpdate } from '@mantine/hooks';
import { useQuery } from '@tanstack/react-query';
import { AbilityBlock, ContentSource, Item } from '@typing/content';
import { useEffect, useState } from 'react';
import { flatten, uniqWith, isEqual, uniqBy } from 'lodash-es';
import { Operation, OperationSelect, OperationSelectOptionCustom } from '@typing/operations';
import { SelectionPredefinedCustomOption } from './SelectionOperation';

export interface InjectedSelectOption {
  opId: string;
  option: OperationSelectOptionCustom;
}
interface WrappedOperationSelect extends OperationSelect {
  _sourceName: string;
}

export function InjectSelectOptionOperation(props: {
  value: string;
  onSelect: (value: string) => void;
  onRemove: () => void;
}) {
  const [option, setOption] = useState<InjectedSelectOption | null>(props.value ? JSON.parse(props.value) : null);

  const { data, isFetching } = useQuery({
    queryKey: [`get-all-selection-options`],
    queryFn: async () => {
      const operations: Operation[] = [];

      const abOpps = (await fetchContentAll<AbilityBlock>('ability-block')).map((ab) => {
        return (ab.operations ?? []).map((op) => ({ ...op, _sourceName: ab.name }));
      });
      operations.push(...uniqWith(flatten(abOpps), isEqual));

      const csOpps = (await fetchContentAll<ContentSource>('content-source')).map((cs) => {
        return (cs.operations ?? []).map((op) => ({ ...op, _sourceName: cs.name }));
      });
      operations.push(...uniqWith(flatten(csOpps), isEqual));

      const iOpps = (await fetchContentAll<Item>('item')).map((i) => {
        return (i.operations ?? []).map((op) => ({ ...op, _sourceName: i.name }));
      });
      operations.push(...uniqWith(flatten(iOpps), isEqual));

      return uniqBy(
        operations.filter(
          (op) => op.type === 'select' && op.data.modeType === 'PREDEFINED' && op.data.optionType === 'CUSTOM'
        ) as WrappedOperationSelect[],
        'id'
      );
    },
  });

  useDidUpdate(() => {
    props.onSelect(JSON.stringify(option));
  }, [option]);

  return (
    <OperationWrapper onRemove={props.onRemove} title='Inject Select Option'>
      <Stack w='100%'>
        <Select
          size='xs'
          placeholder='Selection to Inject Into'
          w={220}
          data={data?.map((op) => ({
            value: op.id,
            label: `${op._sourceName} - ${op.data.title ?? 'Select an Option'}`,
          }))}
          value={option?.opId}
          onChange={(value) => {
            if (!value) return;
            setOption({
              opId: value,
              option: {
                id: crypto.randomUUID(),
                type: 'CUSTOM',
                title: '',
                description: '',
                operations: [],
              } satisfies OperationSelectOptionCustom,
            });
          }}
        />
        {option?.opId && (
          <SelectionPredefinedCustomOption
            option={option?.option}
            onChange={(newOption) => {
              setOption((prev) => ({ ...prev!, option: newOption }));
            }}
          />
        )}
      </Stack>
    </OperationWrapper>
  );
}
