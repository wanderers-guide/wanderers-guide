import { IMPRINT_BG_COLOR_HOVER } from '@constants/data';
import { glassStyle } from '@utils/colors';
import { Button, ButtonProps } from '@mantine/core';
import { useHover, useMergedRef } from '@mantine/hooks';
import { forwardRef } from 'react';

interface BlurButtonProps extends ButtonProps {
  bgColor?: string;
  bgColorHover?: string;
  children: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
  href?: string;
  selected?: boolean;
}

const BlurButton = forwardRef<HTMLButtonElement, BlurButtonProps>((props, forwardedRef) => {
  const { hovered, ref: hoverRef } = useHover();
  const ref = useMergedRef(hoverRef, forwardedRef);

  const componentProps = props.href ? { component: 'a' as const, href: props.href } : {};

  return (
    <Button
      variant='light'
      color='gray.2'
      radius='xl'
      ref={ref}
      onClick={props.onClick}
      {...componentProps}
      {...props}
      style={{
        flex: 1,
        ...glassStyle(),
        borderRadius: undefined,
        backgroundColor: hovered ? (props.bgColorHover ?? IMPRINT_BG_COLOR_HOVER) : (props.bgColor ?? '#00000000'),
        ...props.style,
      }}
    >
      {props.children}
    </Button>
  );
});

export default BlurButton;
