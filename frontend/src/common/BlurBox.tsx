import { glassStyle } from '@utils/colors';
import { Box, BoxComponentProps } from '@mantine/core';

interface BlurBoxProps extends BoxComponentProps {
  children: React.ReactNode;
  bgColor?: string;
}

export default function BlurBox(props: BlurBoxProps) {
  return (
    <Box
      {...props}
      style={[
        {
          ...glassStyle({ bg: true, border: true }),
          ...(props.bgColor ? { backgroundColor: props.bgColor } : {}),
        },
        props.style,
      ]}
    >
      {props.children}
    </Box>
  );
}
