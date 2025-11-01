import { OperationWrapper } from '../Operations';
import { ColorInput, Group, Text, Stack, Textarea, TextInput } from '@mantine/core';
import { GUIDE_BLUE } from '@constants/data';

export function SendNotificationOperation(props: {
  title: string;
  message: string;
  color: string;
  onChange: (title: string, message: string, color: string) => void;
  onRemove: () => void;
}) {
  return (
    <OperationWrapper onRemove={props.onRemove} title='Send Notification'>
      <Stack w='100%' gap={5}>
        <Group grow>
          <TextInput
            label='Title'
            placeholder='Title'
            value={props.title}
            onChange={(e) => props.onChange(e.currentTarget.value, props.message, props.color)}
          />
          <Group w={140}>
            <ColorInput
              w={140}
              radius='xl'
              size='sm'
              label={
                <Text fz='sm' c='gray.5'>
                  Color
                </Text>
              }
              placeholder='Color'
              value={props.color}
              swatches={[
                '#25262b',
                '#868e96',
                '#fa5252',
                '#e64980',
                '#be4bdb',
                '#8d69f5',
                '#577deb',
                GUIDE_BLUE,
                '#15aabf',
                '#12b886',
                '#40c057',
                '#82c91e',
                '#fab005',
                '#fd7e14',
              ]}
              swatchesPerRow={7}
              onChange={(color) => {
                props.onChange(props.title, props.message, color);
              }}
              styles={(t) => ({
                dropdown: {
                  zIndex: 1500,
                },
              })}
            />
          </Group>
        </Group>
        <Textarea
          label='Message'
          placeholder='Message'
          value={props.message}
          onChange={(e) => props.onChange(props.title, e.currentTarget.value, props.color)}
        />
      </Stack>
    </OperationWrapper>
  );
}
