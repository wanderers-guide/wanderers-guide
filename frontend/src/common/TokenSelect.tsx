import { MantineSize, Rating } from '@mantine/core';
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

  return (
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
  );
}
