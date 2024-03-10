import { Box, BoxComponentProps, useMantineTheme } from '@mantine/core';

interface BlurBoxProps extends BoxComponentProps {
  children: React.ReactNode;
  blur?: number;
}

export default function BlurBox(props: BlurBoxProps) {
  const theme = useMantineTheme();

  return (
    <Box
      style={{
        border: `0px solid`,
        borderRadius: theme.radius.md,
        backdropFilter: `blur(${props.blur ?? 8}px)`,
        // Add alpha channel to hex color (browser support: https://caniuse.com/css-rrggbbaa)
        backgroundColor: theme.colors.dark[8] + 'D3',
      }}
      {...props}
    >
      {props.children}
    </Box>
  );
}
