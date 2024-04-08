import { Box, Button, MantineSize, Menu, Rating, Select, Text } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import {
  IconSettings,
  IconMessageCircle,
  IconPhoto,
  IconSearch,
  IconArrowsLeftRight,
  IconTrash,
} from '@tabler/icons-react';
import { phoneQuery } from '@utils/mobile-responsive';
import { useState } from 'react';

export default function TokenSelect(props: {
  emptySymbol?: JSX.Element;
  fullSymbol?: JSX.Element;
  count: number;
  value?: number;
  onChange?: (value: number) => void;
  size?: MantineSize;
}) {
  const [value, setValue] = useState(props.value ?? props.count);
  const isPhone = useMediaQuery(phoneQuery());

  return (
    <>
      {isPhone ? (
        <>
          <Select
            size='xs'
            w={60}
            data={Array.from({ length: props.count + 1 }, (_, i) => i).map((v) => `${v}`)}
            value={`${value}`}
            //onClick={(e) => e.stopPropagation()}
            onChange={(v) => {
              const val = parseInt(v ?? '');
              setValue(val);
              props.onChange?.(val);
            }}
          />
        </>
      ) : (
        <Rating
          count={props.count}
          size={props.size}
          emptySymbol={props.emptySymbol}
          fullSymbol={props.fullSymbol}
          value={value}
          onClick={(e) => e.stopPropagation()}
          onChange={(v) => {
            let newVal;
            if (v === value) {
              newVal = v - 1;
            } else {
              newVal = v;
            }
            setValue(newVal);
            props.onChange?.(newVal);
          }}
        />
      )}
    </>
  );
}
