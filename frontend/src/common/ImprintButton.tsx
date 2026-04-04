import { Button, ButtonProps } from '@mantine/core';
import { useHover, useMergedRef } from '@mantine/hooks';
import { forwardRef } from 'react';

interface ImprintButtonProps extends ButtonProps {
  href?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement & HTMLAnchorElement>;
  multiplier?: 1 | 2;
  noBorder?: boolean;
}

const ImprintButton = forwardRef<HTMLButtonElement, ImprintButtonProps>((props, forwardedRef) => {
  const { multiplier = 1, href, ...rest } = props;
  const { hovered, ref: hoverRef } = useHover();
  const ref = useMergedRef(hoverRef, forwardedRef);

  const normalBg = multiplier === 2 ? 'var(--imprint-bg-color-2)' : 'var(--imprint-bg-color)';
  const hoverBg = multiplier === 2 ? 'var(--imprint-bg-color-hover-2)' : 'var(--imprint-bg-color-hover)';
  const bgColor = hovered ? hoverBg : normalBg;

  return (
    <Button
      ref={ref}
      {...(href ? { component: 'a' as const, href } : {})}
      onClick={rest.onClick}
      {...rest}
      bg={bgColor}
      style={{
        border: props.noBorder ? 'none' : `1px solid var(--imprint-border-color)`,
        ...rest.style,
      }}
    >
      {rest.children}
    </Button>
  );
});

export default ImprintButton;
