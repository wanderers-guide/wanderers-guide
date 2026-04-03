import { Button, ButtonProps } from '@mantine/core';
import { useHover, useMergedRef } from '@mantine/hooks';
import { forwardRef } from 'react';

function applyMultiplier(rgba: string, multiplier: number): string {
  return rgba.replace(/[\d.]+\)$/, `${(parseFloat(rgba.match(/[\d.]+(?=\))/)![0]) * multiplier).toFixed(2)})`);
}

interface ImprintButtonProps extends ButtonProps {
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  multiplier?: number;
  noBorder?: boolean;
}

const ImprintButton = forwardRef<HTMLButtonElement, ImprintButtonProps>((props, forwardedRef) => {
  const { multiplier = 1, ...rest } = props;
  const { hovered, ref: hoverRef } = useHover();
  const ref = useMergedRef(hoverRef, forwardedRef);

  const bgColor = applyMultiplier(hovered ? 'rgba(128, 128, 130, 0.05)' : 'rgba(222, 226, 230, 0.06)', multiplier);

  return (
    <Button
      ref={ref}
      onClick={rest.onClick}
      {...rest}
      bg={bgColor}
      style={{
        border: props.noBorder ? 'none' : `1px solid ${applyMultiplier('rgba(209, 213, 219, 0.2)', multiplier)}`,
        ...rest.style,
      }}
    >
      {rest.children}
    </Button>
  );
});

export default ImprintButton;
