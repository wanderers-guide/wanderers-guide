import { LEGACY_URL } from '@constants/data';
import { Center, Stack, Title, Anchor, Text, Box } from '@mantine/core';

export default function CompanionsPanel(props: { panelHeight: number; panelWidth: number }) {
  return (
    <Box h={props.panelHeight}>
      <Center pt={50}>
        <Stack>
          <Title ta='center' fs='italic' order={2}>
            Coming soon!
          </Title>
          <Text c='dimmed' ta='center' fz='sm' maw={500}>
            Companions will be added in future update. You can expect to see support for animal companions, familiars,
            pets, condition tracking, inventory management, in-depth stat breakdowns, and more! 🎉
          </Text>
          <Text c='dimmed' ta='center' fz='xs' maw={500} fs='italic'>
            If you <b>really</b> want companions, you can still use the{' '}
            <Anchor fz='xs' fs='italic' target='_blank' href={LEGACY_URL}>
              legacy site
            </Anchor>{' '}
            :)
          </Text>
        </Stack>
      </Center>
    </Box>
  );
}
