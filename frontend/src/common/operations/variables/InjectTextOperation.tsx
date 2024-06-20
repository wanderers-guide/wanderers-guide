import { fetchContentAll } from '@content/content-store';
import { OperationWrapper } from '../Operations';
import { Autocomplete, Group, Select, Stack } from '@mantine/core';
import { useDidUpdate } from '@mantine/hooks';
import { useQuery } from '@tanstack/react-query';
import { AbilityBlock, AbilityBlockType, ContentSource, ContentType, Item } from '@typing/content';
import { useEffect, useState } from 'react';
import _ from 'lodash-es';
import { SelectContentButton } from '@common/select/SelectContent';
import RichTextInput from '@common/rich_text_input/RichTextInput';
import { JSONContent } from '@tiptap/react';
import { convertToContentType, toHTML } from '@content/content-utils';
import useRefresh from '@utils/use-refresh';

export function InjectTextOperation(props: {
  type: ContentType | AbilityBlockType;
  id: number;
  text: string;
  onChange: (type: ContentType | AbilityBlockType, id: number, text: string) => void;
  onRemove: () => void;
}) {
  const [text, setText] = useState<JSONContent>();
  const [displaySelect, refreshSelect] = useRefresh();

  return (
    <OperationWrapper onRemove={props.onRemove} title='Inject Text'>
      <Stack w='100%'>
        <Group>
          <Select
            size='xs'
            placeholder='Content Type'
            w={140}
            data={
              [
                { value: 'feat', label: 'Feat' },
                { value: 'action', label: 'Action' },
                { value: 'spell', label: 'Spell' },
                { value: 'item', label: 'Item' },
                { value: 'trait', label: 'Trait' },
                { value: 'class-feature', label: 'Class Feature' },
                { value: 'physical-feature', label: 'Physical Feature' },
                { value: 'mode', label: 'Mode' },
                { value: 'sense', label: 'Sense' },
                { value: 'heritage', label: 'Heritage' },
                { value: 'language', label: 'Language' },
              ] satisfies { value: ContentType | AbilityBlockType; label: string }[]
            }
            value={props.type}
            onChange={(value) => {
              if (!value) return;
              props.onChange(value as ContentType | AbilityBlockType, -1, props.text);
              refreshSelect();
            }}
          />
          {displaySelect && (
            <SelectContentButton
              type={convertToContentType(props.type)}
              onClick={(option) => {
                console.log('option', option);
                props.onChange(props.type, option.id, props.text);
              }}
              selectedId={props.id}
              options={{
                abilityBlockType:
                  convertToContentType(props.type) === 'ability-block' ? (props.type as AbilityBlockType) : undefined,
                showButton: false,
              }}
            />
          )}
        </Group>
        <RichTextInput
          value={text ?? toHTML(props.text)}
          onChange={(text, json) => {
            setText(json);
            props.onChange(props.type, props.id, text);
          }}
        />
      </Stack>
    </OperationWrapper>
  );
}
