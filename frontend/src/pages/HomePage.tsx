import {
  Box,
  Button,
  Stack,
  Title,
  Text,
  BackgroundImage,
  Anchor,
  Center,
  Group,
  SimpleGrid,
  Avatar,
  useMantineTheme,
  ActionIcon,
} from '@mantine/core';
import { setPageTitle } from '@utils/document-change';
import BlurBox from '@common/BlurBox';
import { getHomeBackgroundImage } from '@utils/background-images';
import { IconBrush, IconExternalLink } from '@tabler/icons-react';
import { DISCORD_URL } from '@constants/data';

export function Component() {
  setPageTitle();
  const theme = useMantineTheme();

  const background = getHomeBackgroundImage();

  return (
    <>
      <Stack mih={'80vh'} justify='center' align='center'>
        <Box p={30} mb={'15vh'}>
          <Title fz={'3em'} c='gray.0' ta='center' fs='italic'>
            Journey with Guidance
          </Title>
          <Text c='gray.0' ta='center'>
            A character builder and digital toolbox for Pathfinder Second Edition.
          </Text>
          <Center>
            <Button
              component='a'
              href='/characters'
              variant='default'
              w={250}
              radius='lg'
              mt={20}
              style={{
                backgroundColor: theme.colors.dark[7] + 'D3',
                backdropFilter: `blur(8px)`,
              }}
            >
              Start your Adventure
            </Button>
          </Center>
        </Box>
        {/* <Group>
          <Box>
            <WidgetBot
              server='735260060682289254'
              channel='735260060682289257'
              height={200}
              width={300}
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
              }}
            />
          </Box>
        </Group> */}
        <SimpleGrid cols={3} maw={800}>
          <UnderSection
            title='Archives of Nethys'
            description='The official up-to-date, online resource and compendium for Pathfinder and Starfinder.'
            iconSize={50}
            url='https://2e.aonprd.com/'
            iconURL='https://i.imgur.com/GH6MDmW.png'
          />
          <UnderSection
            title='Paizo Inc.'
            description='The creators of Pathfinder and Starfinder. Support them by purchasing your own hardcover rulebooks.'
            iconSize={50}
            url='https://paizo.com/'
            iconURL='https://i.imgur.com/H0eCdBX.png'
          />
          <UnderSection
            title='Discord'
            description='Join the community on Discord to chat with other players and ask questions.'
            iconSize={40}
            url={DISCORD_URL}
            iconURL='https://i.imgur.com/qE8Q9xv.jpg'
          />
        </SimpleGrid>
      </Stack>
      <BackgroundImage
        src={background?.url ?? ''}
        radius={0}
        style={{ position: 'fixed', top: 0, left: 0, zIndex: -1000 }}
        w='100vw'
        h='100vh'
      />
      {background?.source?.trim() && (
        <Anchor href={background.source_url} target='_blank' underline='hover'>
          <Text
            size='xs'
            c='dimmed'
            style={{
              position: 'fixed',
              bottom: 6,
              right: 10,
              zIndex: 1,
            }}
          >
            <IconBrush size='0.5rem' /> {background.source}
          </Text>
        </Anchor>
      )}
    </>
  );
}

function UnderSection(props: { title: string; description: string; url: string; iconURL: string; iconSize: number }) {
  const theme = useMantineTheme();

  return (
    <Box style={{ position: 'relative' }}>
      <BlurBox p={20} h={175}>
        <Avatar
          style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
          size={props.iconSize}
          src={props.iconURL}
          alt={props.title}
        />
        <Stack gap={5}>
          <Anchor ta='center' c='gray.2' fz='lg' fw={500} target='_blank' href={props.url}>
            <span style={{ position: 'relative' }}>
              {props.title}
              <ActionIcon
                style={{
                  position: 'absolute',
                  top: 0,
                  right: -18,
                }}
                color='gray.5'
                variant='transparent'
                size='xs'
              >
                <IconExternalLink style={{ width: '70%', height: '70%' }} stroke={1.5} />
              </ActionIcon>
            </span>
          </Anchor>
          <Text fz='sm' ta='center'>
            {props.description}
          </Text>
        </Stack>
      </BlurBox>
    </Box>
  );
}
