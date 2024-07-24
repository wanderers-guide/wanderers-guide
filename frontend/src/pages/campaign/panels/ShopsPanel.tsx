import { LEGACY_URL } from '@constants/data';
import { Center, Stack, Title, Anchor, Text, Box } from '@mantine/core';
import { Campaign } from '@typing/content';

export default function ShopsPanel(props: {
  panelHeight: number;
  panelWidth: number;
  campaign: Campaign;
  setCampaign: (campaign: Campaign) => void;
}) {
  return (
    <Box h={props.panelHeight}>
      <Center pt={50}>
        <Stack>
          <Title ta='center' fs='italic' order={2}>
            Coming soon!
          </Title>
          <Text c='dimmed' ta='center' fz='sm' maw={500}>
            Shops will be added in future update. You can expect to see support for shop profiles, random inventory
            generation based on category & level, custom shop themes, importing / exporting, and more! 🎉
          </Text>
          <Text c='dimmed' ta='center' fz='xs' maw={500} fs='italic'>
            If you <b>really</b> want to use shops, you can still use the{' '}
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
