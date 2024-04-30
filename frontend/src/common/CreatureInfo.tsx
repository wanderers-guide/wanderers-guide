import classes from '@css/UserInfoIcons.module.css';
import {
  Avatar,
  Badge,
  Box,
  Button,
  Group,
  HoverCard,
  Indicator,
  RingProgress,
  Stack,
  Text,
  useMantineTheme,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconTree, IconVocabulary, IconWindow } from '@tabler/icons-react';
import { Creature } from '@typing/content';
import { interpolateHealth } from '@utils/colors';
import { phoneQuery } from '@utils/mobile-responsive';
import { truncate } from 'lodash-es';

export function CreatureDetailedInfo(props: { creature: Creature | null; nameCutOff?: number }) {
  const theme = useMantineTheme();
  const isPhone = useMediaQuery(phoneQuery());

  const currentHealth = props.creature?.hp_current ?? 0;
  let maxHealth = props.creature?.meta_data?.calculated_stats?.hp_max ?? 1;
  if (currentHealth > maxHealth) {
    maxHealth = currentHealth;
  }
  const conditions = props.creature?.details?.conditions ?? [];

  return (
    <div style={{ width: isPhone ? undefined : 240 }}>
      <Group wrap='nowrap' align='flex-start' gap={0}>
        <Box style={{ position: 'relative' }} mt={0} mr={10}>
          {conditions.length > 0 && (
            <HoverCard shadow='md' openDelay={250}>
              <HoverCard.Target>
                <Badge
                  size='xs'
                  color='red.6'
                  style={{ position: 'absolute', bottom: 0, left: 0, zIndex: 100, cursor: 'pointer' }}
                  circle
                >
                  {conditions.length}
                </Badge>
              </HoverCard.Target>
              <HoverCard.Dropdown p={10}>
                <Stack gap={10}>
                  {conditions.map((condition) => (
                    <Badge
                      size='md'
                      variant='light'
                      color='gray'
                      styles={{
                        root: {
                          textTransform: 'initial',
                        },
                      }}
                    >
                      {condition.name}
                      {condition.value ? `, ${condition.value}` : ''}
                    </Badge>
                  ))}
                </Stack>
              </HoverCard.Dropdown>
            </HoverCard>
          )}
          <Avatar
            src={props.creature?.details?.image_url}
            alt='Character Portrait'
            size={75}
            radius={75}
            variant='transparent'
            color='dark.3'
            bg={theme.colors.dark[6]}
          />

          <Box
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          >
            <RingProgress
              style={{
                opacity: 0.5,
              }}
              size={90}
              thickness={3}
              sections={[
                {
                  value: currentHealth === 0 ? 100 : Math.ceil((currentHealth / maxHealth) * 100),
                  color: interpolateHealth(currentHealth / maxHealth),
                },
              ]}
            />
          </Box>
        </Box>

        <div style={{ flex: 1 }}>
          <HoverCard shadow='md' openDelay={1000} position='top' withinPortal>
            <HoverCard.Target>
              <Text
                c='gray.0'
                fz={props.creature && props.creature.name.length >= 16 ? '0.9rem' : 'lg'}
                fw={500}
                className={classes.name}
              >
                {truncate(props.creature?.name, {
                  length: props.nameCutOff ?? 18,
                })}
              </Text>
            </HoverCard.Target>
            <HoverCard.Dropdown py={5} px={10}>
              <Text c='gray.0' size='sm'>
                {props.creature?.name}
              </Text>
            </HoverCard.Dropdown>
          </HoverCard>

          <Stack gap={3}>
            {/* <Box>
              <Group wrap='nowrap' gap={10}>
                <IconTree stroke={1.5} size='1rem' className={classes.icon} />
                <Text fz='xs' c='gray.3'>
                  {props.character?.details?.ancestry?.name ? (
                    <>{props.character.details.ancestry.name}</>
                  ) : (
                    <>Missing Ancestry</>
                  )}
                </Text>
              </Group>
            </Box>
            <Box>
              <Group wrap='nowrap' gap={10}>
                <IconWindow stroke={1.5} size='1rem' className={classes.icon} />
                <Text fz='xs' c='gray.3'>
                  {props.character?.details?.background?.name ?? 'Missing Background'}
                </Text>
              </Group>
            </Box>
            <Box>
              <Group wrap='nowrap' gap={10}>
                <IconVocabulary stroke={1.5} size='1rem' className={classes.icon} />
                <Text fz='xs' c='gray.3'>
                  {props.character?.details?.class?.name ?? 'Missing Class'}
                  {props.character?.variants?.dual_class && (
                    <> / {props.character?.details?.class_2?.name ?? 'Missing Class'}</>
                  )}
                </Text>
              </Group>
            </Box> */}
          </Stack>
        </div>
      </Group>
    </div>
  );
}
