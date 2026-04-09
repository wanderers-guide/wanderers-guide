import React from 'react';
import { MantineSize, NativeSelect, Rating, Select } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { isTabletSized, isTouchDevice, tabletQuery } from '@utils/mobile-responsive';
import { useState } from 'react';
import { IMPRINT_BG_COLOR, IMPRINT_BORDER_COLOR } from '@constants/data';

export default function TokenSelect(props: {
  emptySymbol?: React.JSX.Element;
  fullSymbol?: React.JSX.Element;
  count: number;
  value?: number;
  onChange?: (value: number) => void;
  size?: MantineSize;
  invertedSelect?: boolean;
}) {
  const [value, setValue] = useState(props.value ?? props.count);
  const isMobileTouch = useMediaQuery(tabletQuery()) && isTouchDevice();

  return (
    <>
      {isMobileTouch ? (
        <>
          <NativeSelect
            size='xs'
            w={60}
            data={Array.from({ length: props.count + 1 }, (_, i) => i).map((v) => `${v}`)}
            value={`${props.invertedSelect ? props.count - value : value}`}
            onChange={(e) => {
              let val = parseInt(e.target.value ?? '');
              // Invert the value if needed
              val = props.invertedSelect ? props.count - val : val;

              setValue(val);
              props.onChange?.(val);
            }}
            styles={{
              input: {
                backgroundColor: IMPRINT_BG_COLOR,
                borderColor: IMPRINT_BORDER_COLOR,
                textAlign: 'center',
              },
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
