import { Box, Divider, Text, useMantineTheme } from '@mantine/core';

export default function ResultWrapper(props: { label: string; disabled?: boolean; children: React.ReactNode }) {
  const theme = useMantineTheme();

  if (props.disabled) return <>{props.children}</>;

  return (
    <>
      <Box
        px={10}
        pt={15}
        pb={10}
        style={{
          border: '1px solid ' + theme.colors.dark[3],
          borderRadius: theme.radius.md,
          position: 'relative',
        }}
      >
        <Text
          fz='xs'
          px={5}
          style={{
            position: 'absolute',
            top: -9,
            backgroundColor: 'rgba(255, 255, 255, 0.01)',
            backdropFilter: 'blur(12px)',
            borderRadius: 999,
          }}
        >
          {props.label}
        </Text>
        {props.children}
      </Box>
    </>
  );
}
