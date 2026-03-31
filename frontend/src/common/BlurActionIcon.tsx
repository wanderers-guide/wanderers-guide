import { ICON_BG_COLOR_HOVER } from '@constants/data';
import { glassStyle, GLASS_BG_COLOR } from '@utils/colors';
import { ActionIcon, ActionIconProps } from '@mantine/core';
import { useHover } from '@mantine/hooks';

interface BlurActionIconProps extends ActionIconProps {
  bgColor?: string;
  bgColorHover?: string;
  children: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
  href?: string;
  selected?: boolean;
}

export default function BlurActionIcon(props: BlurActionIconProps) {
  const { hovered, ref } = useHover<HTMLAnchorElement>();

  return (
    <ActionIcon
      variant='light'
      color='gray.2'
      radius='xl'
      ref={ref}
      onClick={props.onClick}
      component='a'
      href={props.href}
      {...props}
      style={{
        ...glassStyle({ border: true }),
        backgroundColor: hovered ? props.bgColorHover ?? ICON_BG_COLOR_HOVER : props.bgColor ?? GLASS_BG_COLOR,
        ...props.style,
      }}
    >
      {props.children}
    </ActionIcon>
  );
}
