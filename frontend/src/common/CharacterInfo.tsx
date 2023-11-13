
import { Avatar, Text, Group, useMantineTheme, Button, Stack, Box, HoverCard } from '@mantine/core';
import { IconPhoneCall, IconAt, IconSword, IconHomeEco, IconUsersGroup, IconTree, IconWindow, IconVocabulary } from '@tabler/icons-react';
import classes from '@css/UserInfoIcons.module.css';
import { Character, Class } from '@typing/content';
import { getContent } from '@content/content-controller';
import { useQuery } from '@tanstack/react-query';
import _ from 'lodash';
import React from 'react';

export const CharacterInfo = React.forwardRef((props: {
  character: Character | null;
  onClick?: () => void;
  onClickAncestry?: () => void;
  onClickBackground?: () => void;
  onClickClass?: () => void;
}, ref: React.LegacyRef<HTMLDivElement>) => {
  
  const theme = useMantineTheme();

  const hasClass = props.character?.details?.class?.name !== undefined;
  const hasAncestry = props.character?.details?.ancestry?.name !== undefined;
  const hasBackground = props.character?.details?.background?.name !== undefined;

  return (
    <div ref={ref}>
      <Group wrap='nowrap' align='flex-start' gap={0}>
        <Avatar
          src={props.character?.details?.image_url}
          alt='Character Portrait'
          size={84}
          radius={84}
          mt={10}
          mx={10}
          variant='transparent'
          color='dark.3'
          bg={theme.colors.dark[6]}
        />
        <div>
          <HoverCard shadow='md' openDelay={1000} position='top' withinPortal>
            <HoverCard.Target>
              <Text pl={5} fz='lg' fw={500} className={classes.name}>
                {_.truncate(props.character?.name, { length: 16 })}
              </Text>
            </HoverCard.Target>
            <HoverCard.Dropdown py={5} px={10}>
              <Text size='sm'>{props.character?.name}</Text>
            </HoverCard.Dropdown>
          </HoverCard>

          <Stack gap={0}>
            <Box>
              {props.onClickAncestry ? (
                <Button
                  variant={hasAncestry ? 'subtle' : 'light'}
                  size='compact-xs'
                  leftSection={<IconTree size='0.9rem' />}
                  onClick={props.onClickAncestry}
                >
                  {props.character?.details?.ancestry?.name ?? 'Select Ancestry'}
                </Button>
              ) : (
                <Group wrap='nowrap' gap={10} mt={3}>
                  <IconTree stroke={1.5} size='1rem' className={classes.icon} />
                  <Text fz='xs' c='dimmed'>
                    {props.character?.details?.ancestry?.name ? (
                      <>
                        {props.character?.details?.heritage?.name ?? ''}{' '}
                        {props.character.details.ancestry.name}
                      </>
                    ) : (
                      <>
                        Missing Ancestry
                      </>
                    )}
                  </Text>
                </Group>
              )}
            </Box>
            <Box>
              {props.onClickBackground ? (
                <Button
                  variant={hasBackground ? 'subtle' : 'light'}
                  size='compact-xs'
                  leftSection={<IconWindow size='0.9rem' />}
                  onClick={props.onClickBackground}
                >
                  {props.character?.details?.background?.name ?? 'Select Background'}
                </Button>
              ) : (
                <Group wrap='nowrap' gap={10} mt={3}>
                  <IconWindow stroke={1.5} size='1rem' className={classes.icon} />
                  <Text fz='xs' c='dimmed'>
                    {props.character?.details?.background?.name ?? 'Missing Background'}
                  </Text>
                </Group>
              )}
            </Box>
            <Box>
              {props.onClickClass ? (
                <Button
                  variant={hasClass ? 'subtle' : 'light'}
                  size='compact-xs'
                  leftSection={<IconVocabulary size='0.9rem' />}
                  onClick={props.onClickClass}
                >
                  {props.character?.details?.class?.name ?? 'Select Class'}
                </Button>
              ) : (
                <Group wrap='nowrap' gap={10} mt={3}>
                  <IconVocabulary stroke={1.5} size='1rem' className={classes.icon} />
                  <Text fz='xs' c='dimmed'>
                    {props.character?.details?.class?.name ?? 'Missing Class'}
                  </Text>
                </Group>
              )}
            </Box>
          </Stack>
        </div>
      </Group>
    </div>
  );
});
