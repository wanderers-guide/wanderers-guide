import { Center, Stack, Title, Box, Text } from '@mantine/core';

export default function ExtrasPanel(props: { panelHeight: number; panelWidth: number }) {
  return (
    <Box h={props.panelHeight}>
      <Center pt={50}>
        <Stack>
          <Title ta='center' fs='italic' order={2}>
            More to come!
          </Title>
          <Text c='dimmed' ta='center' fz='sm' maw={500}>
            This miscellaneous section will be updated with more features in the future. You can expect to see support
            for vehicles, snares, and whatever other awesome stuff Paizo comes up with! 🔥
          </Text>
        </Stack>
      </Center>
    </Box>
  );
}
