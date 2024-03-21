import {
  Title,
  Image,
  Text,
  Button,
  Container,
  Group,
  rem,
  useMantineTheme,
  Box,
  Center,
  Avatar,
  Card,
  Loader,
  Divider,
  Badge,
  MantineColor,
  ColorInput,
} from '@mantine/core';
import { setPageTitle } from '@utils/document-change';
import { useNavigate } from 'react-router-dom';
import BlurBox from '@common/BlurBox';
import { useQuery } from '@tanstack/react-query';
import { getPublicUser } from '@auth/user-manager';
import { getDefaultBackgroundImage } from '@utils/background-images';
import { toLabel } from '@utils/strings';
import { GUIDE_BLUE } from '@constants/data';
import { IconBrandPatreon } from '@tabler/icons-react';

export function Component() {
  setPageTitle(`Account`);

  const { data: user } = useQuery({
    queryKey: [`find-account-self`],
    queryFn: async () => {
      return await getPublicUser();
    },
  });

  const theme = useMantineTheme();

  if (!user)
    return (
      <Loader
        size='lg'
        type='bars'
        style={{
          position: 'absolute',
          top: '30%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />
    );

  const patronTier = toLabel(user.patreon_tier) || 'Non-Patron';
  let patronColor: MantineColor = 'gray';
  if (patronTier === 'Non-Patron') patronColor = 'gray';
  if (patronTier === 'Advocate') patronColor = 'teal';
  if (patronTier === 'Wanderer') patronColor = 'blue';
  if (patronTier === 'Legend') patronColor = 'grape';
  if (patronTier === 'Game Master') patronColor = 'orange';

  return (
    <Center>
      <Box maw={400} w='100%'>
        <BlurBox w={'100%'}>
          <Card padding='xl' radius='md' style={{ backgroundColor: 'transparent' }}>
            <Card.Section
              h={140}
              style={{
                backgroundImage: `url(${user.background_image_url ?? getDefaultBackgroundImage().url})`,
                backgroundSize: 'cover',
              }}
            />

            <Avatar
              src={user.image_url}
              size={80}
              radius={80}
              mx='auto'
              mt={-30}
              style={{
                backgroundColor: theme.colors.dark[7],
                border: `2px solid ${theme.colors.dark[7] + 'D3'}`,
              }}
            />
            <Text ta='center' fz='lg' fw={500} mt={5}>
              {user.display_name}
            </Text>
            <Text ta='center' fz='xs' c='dimmed' fs='italic'>
              {user.summary}
            </Text>
            <Group mt='md' justify='center' gap={30}>
              <Box>
                <Text ta='center' fz='lg' fw={500}>
                  X
                </Text>
                <Text ta='center' fz='sm' c='dimmed' lh={1}>
                  Characters
                </Text>
              </Box>
              <Box>
                <Text ta='center' fz='lg' fw={500}>
                  X
                </Text>
                <Text ta='center' fz='sm' c='dimmed' lh={1}>
                  Bundles
                </Text>
              </Box>
              <Box>
                <Text ta='center' fz='lg' fw={500}>
                  X
                </Text>
                <Text ta='center' fz='sm' c='dimmed' lh={1}>
                  Campaigns
                </Text>
              </Box>
            </Group>
            <Divider mt='md' />
            <Group align='center' justify='center' p='xs'>
              {user.deactivated && (
                <Badge
                  variant='light'
                  size='lg'
                  color='red'
                  styles={{
                    root: {
                      textTransform: 'initial',
                    },
                  }}
                >
                  Deactivated
                </Badge>
              )}
              {user.is_admin && (
                <Badge
                  variant='light'
                  size='lg'
                  color='cyan'
                  styles={{
                    root: {
                      textTransform: 'initial',
                    },
                  }}
                >
                  Admin
                </Badge>
              )}
              {user.is_mod && (
                <Badge
                  variant='light'
                  size='lg'
                  color='green'
                  styles={{
                    root: {
                      textTransform: 'initial',
                    },
                  }}
                >
                  Mod
                </Badge>
              )}

              <Badge
                variant='light'
                size='lg'
                color={patronColor}
                styles={{
                  root: {
                    textTransform: 'initial',
                  },
                }}
              >
                {patronTier}
              </Badge>

              <Badge
                variant='light'
                size='lg'
                color='yellow'
                styles={{
                  root: {
                    textTransform: 'initial',
                  },
                }}
              >
                New User
              </Badge>
            </Group>

            <Divider />

            <Group align='center' justify='center' pt={10}>
              <Button size='xs' variant='light' leftSection={<IconBrandPatreon size={18} />} fullWidth>
                Connect to Patreon
              </Button>
            </Group>

            {/* <Group align='center' justify='center' pt={10}>
              <ColorInput
                radius='xl'
                size='xs'
                w={250}
                placeholder='Site Color Theme'
                defaultValue={user.site_theme?.color || GUIDE_BLUE}
                swatches={[
                  '#25262b',
                  '#868e96',
                  '#fa5252',
                  '#e64980',
                  '#be4bdb',
                  '#8d69f5',
                  '#577deb',
                  GUIDE_BLUE,
                  '#15aabf',
                  '#12b886',
                ]}
                onChange={(color) => {}}
              />
            </Group> */}
          </Card>
        </BlurBox>
      </Box>
    </Center>
  );
}
