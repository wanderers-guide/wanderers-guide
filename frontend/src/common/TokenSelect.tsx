import { MantineSize, Rating } from '@mantine/core';
import { useState } from 'react';

export default function TokenSelect(props: {
  emptySymbol?: JSX.Element;
  fullSymbol?: JSX.Element;
  count: number;
  onChange?: (value: number) => void;
  size?: MantineSize;
}) {
  const [value, setValue] = useState(props.count);

  return (
    <Rating
      count={props.count}
      size={props.size}
      emptySymbol={props.emptySymbol}
      fullSymbol={props.fullSymbol}
      value={value}
      onChange={(v) => {
        let value;
        if (v === value) {
          value = v - 1;
        } else {
          value = v;
        }
        setValue(value);
        props.onChange?.(value);
      }}
    />
  );
}
