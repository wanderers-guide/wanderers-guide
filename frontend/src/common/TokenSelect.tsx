import { MantineSize, Rating } from '@mantine/core';
import { useState } from 'react';

export default function TokenSelect(props: {
  emptySymbol?: JSX.Element;
  fullSymbol?: JSX.Element;
  count: number;
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
        if (v === 1 && value === 1) {
          setValue(0);
        } else {
          setValue(v);
        }
      }}
    />
  );
}
