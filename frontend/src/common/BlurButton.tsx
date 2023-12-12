import { Box, BoxComponentProps, Button, ButtonProps, useMantineTheme } from '@mantine/core';
import { useHover } from '@mantine/hooks';

interface BlurButtonProps extends ButtonProps {
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
      color='gray'
      radius='xl'
      ref={ref}
      style={{ flex: 1, backgroundColor: hovered ? 'rgba(0, 0, 0, 0.1)' : undefined }}
      onClick={props.onClick}
      component='a'
      href={props.href}
      {...props}
    >
      {props.children}
    </Button>
  );
}
