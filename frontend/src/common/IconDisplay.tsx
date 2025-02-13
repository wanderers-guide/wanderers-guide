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
  Image,
  MantineStyleProp,
} from '@mantine/core';
import { isValidImage } from '@utils/images';
import { useEffect, useState } from 'react';
import { Icon } from './Icon';
import { SelectIconModalContents } from '@modals/SelectIconModal';
import DOMPurify from 'dompurify';
import { GUIDE_BLUE } from '@constants/data';
import { usePrevious } from '@mantine/hooks';
import useRefresh from '@utils/use-refresh';

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
  const updateIconValue = (iconValue: { type: 'icon' | 'image'; value: string; color?: string }) => {
    props.setValue(stringifyIconValue(iconValue), iconValue);
  };

  const [isValidImageURL, setIsValidImageURL] = useState(true);
  const [openedModal, setOpenedModal] = useState(false);

  // Fix bug with semented control not updating properly
  const prevStrValue = usePrevious(props.strValue);
  const [displaySegmented, refreshSegmented] = useRefresh();
  useEffect(() => {
    if (!prevStrValue && props.strValue) {
      refreshSegmented();
    }
  }, [props.strValue]);

  return (
    <Group h={65} align='flex-start'>
      {displaySegmented && !props.iconOnly && (
        <SegmentedControl
          defaultValue={iconValue.type}
          value={iconValue.type}
          onChange={(t) => {
            if (t === 'icon') {
              updateIconValue({ type: 'icon', value: 'secretbook', color: GUIDE_BLUE });
            } else {
              updateIconValue({ type: 'image', value: '' });
            }
          }}
          data={[
            { label: 'Image', value: 'image' },
            { label: 'Icon', value: 'icon' },
          ]}
          mt='lg'
        />
      )}
      {iconValue.type === 'image' && (
        <Box>
          <TextInput
            defaultValue={iconValue.value}
            label={
              <Text fz='xs' c='gray.4'>
                Image URL
              </Text>
            }
            placeholder='Valid URL'
            onBlur={async (e) => {
              const valid = !e.target?.value ? true : await isValidImage(e.target?.value);
              setIsValidImageURL(valid);
              if (valid) {
                updateIconValue({ type: 'image', value: e.target.value });
              }
            }}
            error={isValidImageURL ? false : 'Invalid Image'}
          />
        </Box>
      )}
      {iconValue.type === 'icon' && (
        <Group wrap='nowrap' align='flex-start' pt={2}>
          <Box pt={4}>
            <Text fz='xs' c='gray.5'>
              Icon
            </Text>
            <UnstyledButton
              onClick={() => {
                setOpenedModal(true);
              }}
            >
              <ActionIcon variant='light' aria-label='Icon' size='lg' radius='xl' color={iconValue.color}>
                <Icon name={iconValue.value} style={{ width: '70%', height: '70%' }} stroke={1.5} />
              </ActionIcon>
            </UnstyledButton>
          </Box>

          <ColorInput
            w={140}
            radius='xl'
            size='xs'
            label={
              <Text fz='xs' c='gray.5'>
                Color
              </Text>
            }
            placeholder='Color'
            defaultValue={iconValue.color}
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
              updateIconValue({ type: 'icon', value: iconValue.value, color });
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
        opened={iconValue.type === 'icon' && openedModal}
        onClose={() => setOpenedModal(false)}
        title={<Title order={3}>Select Icon</Title>}
        zIndex={props.zIndex ?? 1000}
      >
        <SelectIconModalContents
          color={iconValue.color}
          onSelect={(option) => {
            updateIconValue({ type: 'icon', value: option, color: iconValue.color });
            setOpenedModal(false);
          }}
          onClose={() => setOpenedModal(false)}
        />
      </Modal>
    </Group>
  );
}

export function DisplayIcon(props: { strValue: string | undefined; iconStyles?: MantineStyleProp; width?: number }) {
  const iconValue = parseIconValue(props.strValue ?? '');
  const width = props.width ?? 90;

  if (iconValue.value === '') {
    return null;
  }

  if (iconValue.type === 'icon') {
    return (
      <ActionIcon
        variant='transparent'
        style={{
          float: 'right',
          width: width,
          height: 'auto',
          cursor: 'default',
          ...props.iconStyles,
        }}
        ml='sm'
        radius='lg'
        color={iconValue.color}
      >
        <Icon name={iconValue.value} style={{ width: width, height: width }} stroke={1.5} />
      </ActionIcon>
    );
  } else {
    return (
      <Image
        style={{
          float: 'right',
          width: width,
          height: 'auto',
          cursor: 'default',
          ...props.iconStyles,
        }}
        ml='sm'
        radius='md'
        fit='contain'
        src={iconValue.value}
      />
    );
  }
}

export function parseIconValue(value: string): { type: 'icon' | 'image'; value: string; color?: string } {
  const parts = value.split('|||');

  if (parts.length === 1) {
    return { type: 'image', value: DOMPurify.sanitize(parts[0]) };
  } else if (parts.length === 2) {
    return { type: 'image', value: DOMPurify.sanitize(parts[1]) };
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

export function stringifyIconValue(icon: { type: 'icon' | 'image'; value: string; color?: string }) {
  if (icon.type === 'icon') {
    return DOMPurify.sanitize(`icon|||${icon.value}|||${icon.color ?? ''}`);
  } else {
    return DOMPurify.sanitize(`image|||${icon.value}`);
  }
}
