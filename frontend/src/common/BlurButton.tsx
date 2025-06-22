import { ICON_BG_COLOR_HOVER } from '@constants/data';
import { Box, BoxComponentProps, Button, ButtonProps, useMantineTheme } from '@mantine/core';
import { useHover } from '@mantine/hooks';

interface BlurButtonProps extends ButtonProps {
  blur?: number;
  bgColor?: string;
  bgColorHover?: string;
  children: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
  href?: string;
  selected?: boolean;
}

export default function BlurButton(props: BlurButtonProps) {
  const theme = useMantineTheme();

  const { hovered, ref } = useHover<HTMLAnchorElement>();

  return (
    <Button
      variant='light'
      color='gray.2'
      radius='xl'
      ref={ref}
      onClick={props.onClick}
      component='a'
      href={props.href}
      {...props}
      style={{
        flex: 1,
        backdropFilter: `blur(${props.blur ?? 6}px)`,
        WebkitBackdropFilter: `blur(${props.blur ?? 6}px)`,
        backgroundColor: hovered ? props.bgColorHover ?? ICON_BG_COLOR_HOVER : props.bgColor,
        ...props.style,
      }}
    >
      {props.children}
    </Button>
  );
}
