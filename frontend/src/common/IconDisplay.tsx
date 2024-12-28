import {
  ActionIcon,
  Box,
  Group,
  SegmentedControl,
  TextInput,
  UnstyledButton,
  Text,
  Modal,
  Title,
  ColorInput,
} from '@mantine/core';
import { isValidImage } from '@utils/images';
import { useEffect, useState } from 'react';
import { Icon } from './Icon';
import { SelectIconModalContents } from '@modals/SelectIconModal';
import DOMPurify from 'dompurify';
import { GUIDE_BLUE } from '@constants/data';
import _ from 'lodash-es';

export function SelectIcon(props: {
  strValue: string;
  setValue: (
    strValue: string,
    iconValue: {
      type: 'icon' | 'image';
      value: string;
      color?: string;
    }
  ) => void;
  zIndex?: number;
  iconOnly?: boolean;
}) {
  const iconValue = parseIconValue(props.strValue);

  const [type, setType] = useState(props.iconOnly ? 'icon' : iconValue.type);
  const [value, setValue] = useState(iconValue.value);
  const [color, setColor] = useState(iconValue.color);

  useEffect(() => {
    props.setValue(stringifyIconValue({ type, value, color }), _.cloneDeep({ type, value, color }));
  }, [type, value, color]);

  const [isValidImageURL, setIsValidImageURL] = useState(true);
  const [openedModal, setOpenedModal] = useState(false);

  return (
    <Group>
      {!props.iconOnly && (
        <SegmentedControl
          value={type}
          onChange={(t) => {
            setType(t as 'icon' | 'image');
          }}
          data={[
            { label: 'Image', value: 'image' },
            { label: 'Icon', value: 'icon' },
          ]}
        />
      )}
      {type === 'image' && (
        <TextInput
          defaultValue={value}
          label='Image URL'
          onBlur={async (e) => {
            const valid = !e.target?.value ? true : await isValidImage(e.target?.value);
            setIsValidImageURL(valid);
            if (valid) {
              setValue(e.target.value);
            }
          }}
          error={isValidImageURL ? false : 'Invalid URL'}
        />
      )}
      {type === 'icon' && (
        <Group wrap='nowrap' align='flex-start'>
          <Box pt={2}>
            <Text fz='xs' c='gray.4'>
              Icon
            </Text>
            <UnstyledButton
              w={'50%'}
              onClick={() => {
                setOpenedModal(true);
              }}
            >
              <ActionIcon variant='light' aria-label='Icon' size='lg' radius='xl' color={color}>
                <Icon name={value} style={{ width: '70%', height: '70%' }} stroke={1.5} />
              </ActionIcon>
            </UnstyledButton>
          </Box>

          <ColorInput
            radius='xl'
            size='xs'
            label='Color'
            placeholder='Color'
            defaultValue={color}
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
              setColor(color);
            }}
            styles={(t) => ({
              dropdown: {
                zIndex: props.zIndex ?? 1500,
              },
            })}
          />
        </Group>
      )}
      <Modal
        opened={type === 'icon' && openedModal}
        onClose={() => setOpenedModal(false)}
        title={<Title order={3}>Select Icon</Title>}
        zIndex={props.zIndex ?? 1000}
      >
        <SelectIconModalContents
          color={color}
          onSelect={(option) => {
            setValue(option);
            setOpenedModal(false);
          }}
          onClose={() => setOpenedModal(false)}
        />
      </Modal>
    </Group>
  );
}

function parseIconValue(value: string): { type: 'icon' | 'image'; value: string; color?: string } {
  const parts = value.split('|||');

  if (parts.length === 1) {
    return { type: 'image', value: DOMPurify.sanitize(parts[0]) };
  } else if (parts.length === 3) {
    let type: 'icon' | 'image' = 'image';
    let color: string | undefined;
    if (parts[0] === 'icon') {
      type = 'icon';
      color = DOMPurify.sanitize(parts[2]);
    }
    return { type, value: DOMPurify.sanitize(parts[1]), color };
  } else {
    return { type: 'image', value: '' };
  }
}

function stringifyIconValue(icon: { type: 'icon' | 'image'; value: string; color?: string }) {
  if (icon.type === 'icon') {
    return DOMPurify.sanitize(`icon|||${icon.value}|||${icon.color}`);
  } else {
    return DOMPurify.sanitize(`image|||${icon.value}`);
  }
}
