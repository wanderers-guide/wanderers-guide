import { TextInput, Text, MantineSize, FocusTrap, Box, Group, VisuallyHidden } from '@mantine/core';
import { getHotkeyHandler } from '@mantine/hooks';
import { useState } from 'react';

export default function ClickEditText(props: {
  color: string;
  size: MantineSize;
  value: string;
  height: number;
  width: number;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(props.value);

  const finishEditing = () => {
    setEditing(false);
    props.onChange(value);
  };

  return (
    <Box style={{ position: 'relative' }}>
      <Group
        h={props.height}
        align='center'
        justify='center'
        style={{ visibility: editing ? 'hidden' : undefined, cursor: 'pointer' }}
        onClick={() => {
          setEditing(true);
          setValue(props.value);
        }}
      >
        <Text w='100%' c={props.color} size={props.size} ta='center'>
          {props.value}
        </Text>
      </Group>
      {editing && (
        <FocusTrap active={true}>
          <TextInput
            variant='unstyled'
            placeholder={props.placeholder}
            size={props.size}
            value={value === '—' ? '' : value}
            onChange={(event) => setValue(event.currentTarget.value)}
            onBlur={finishEditing}
            onKeyDown={getHotkeyHandler([
              ['mod+Enter', finishEditing],
              ['Enter', finishEditing],
            ])}
            styles={{
              input: {
                textAlign: 'center',
                height: props.height,
                width: props.width,
              },
            }}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          />
        </FocusTrap>
      )}
    </Box>
  );
}
