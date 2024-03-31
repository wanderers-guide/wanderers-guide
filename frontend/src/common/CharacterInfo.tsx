import classes from '@css/UserInfoIcons.module.css';
import { Avatar, Box, Button, Group, HoverCard, Stack, Text, useMantineTheme } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconTree, IconVocabulary, IconWindow } from '@tabler/icons-react';
import { Character } from '@typing/content';
import { phoneQuery } from '@utils/mobile-responsive';
import { truncate } from 'lodash-es';
import { LegacyRef, forwardRef } from 'react';

export const CharacterInfo = forwardRef(
  (
    props: {
      character: Character | null;
      onClick?: () => void;
      onClickAncestry?: () => void;
      onClickBackground?: () => void;
      onClickClass?: () => void;
      onClickClass2?: () => void;
      hideImage?: boolean;
      color?: string;
      nameCutOff?: number;
    },
    ref: LegacyRef<HTMLDivElement>
  ) => {
    const theme = useMantineTheme();
    const isPhone = useMediaQuery(phoneQuery());

    const hasClass = props.character?.details?.class?.name !== undefined;
    const hasAncestry = props.character?.details?.ancestry?.name !== undefined;
    const hasBackground = props.character?.details?.background?.name !== undefined;
    const hasClass2 = props.character?.details?.class_2?.name !== undefined;

    return (
      <div ref={ref} style={{ width: isPhone ? undefined : 240 }}>
        <Group wrap='nowrap' align='flex-start' gap={0}>
          {!props.hideImage && (
            <Avatar
              src={props.character?.details?.image_url}
              alt='Character Portrait'
              size={75}
              radius={75}
              mt={10}
              ml={5}
              mr={10}
              variant='transparent'
              color='dark.3'
              bg={theme.colors.dark[6]}
            />
          )}
          <div style={{ flex: 1 }}>
            <HoverCard shadow='md' openDelay={1000} position='top' withinPortal>
              <HoverCard.Target>
                <Text
                  c='gray.0'
                  fz={props.character && props.character.name.length >= 16 ? '0.9rem' : 'lg'}
                  fw={500}
                  className={classes.name}
                >
                  {truncate(props.character?.name, {
                    length: props.nameCutOff ?? 18,
                  })}
                </Text>
              </HoverCard.Target>
              <HoverCard.Dropdown py={5} px={10}>
                <Text c='gray.0' size='sm'>
                  {props.character?.name}
                </Text>
              </HoverCard.Dropdown>
            </HoverCard>

            <Stack gap={3}>
              <Box>
                {props.onClickAncestry ? (
                  <Group gap={0}>
                    <Button
                      variant={hasAncestry ? 'subtle' : 'filled'}
                      color={props.color}
                      size='compact-xs'
                      leftSection={<IconTree size='0.9rem' />}
                      onClick={props.onClickAncestry}
                      fw={400}
                    >
                      {props.character?.details?.ancestry?.name ?? 'Select Ancestry'}
                    </Button>
                  </Group>
                ) : (
                  <Group wrap='nowrap' gap={10}>
                    <IconTree stroke={1.5} size='1rem' className={classes.icon} />
                    <Text fz='xs' c='gray.3'>
                      {props.character?.details?.ancestry?.name ? (
                        <>
                          {/* {props.character?.details?.heritage?.name ?? ''}{' '} */}
                          {props.character.details.ancestry.name}
                        </>
                      ) : (
                        <>Missing Ancestry</>
                      )}
                    </Text>
                  </Group>
                )}
              </Box>
              <Box>
                {props.onClickBackground ? (
                  <Group gap={0}>
                    <Button
                      variant={hasBackground ? 'subtle' : 'filled'}
                      size='compact-xs'
                      color={props.color}
                      leftSection={<IconWindow size='0.9rem' />}
                      onClick={props.onClickBackground}
                      fw={400}
                    >
                      {props.character?.details?.background?.name ?? 'Select Background'}
                    </Button>
                  </Group>
                ) : (
                  <Group wrap='nowrap' gap={10}>
                    <IconWindow stroke={1.5} size='1rem' className={classes.icon} />
                    <Text fz='xs' c='gray.3'>
                      {props.character?.details?.background?.name ?? 'Missing Background'}
                    </Text>
                  </Group>
                )}
              </Box>
              <Box>
                {props.onClickClass ? (
                  <Group gap={3}>
                    <Button
                      variant={hasClass ? 'subtle' : 'filled'}
                      size='compact-xs'
                      color={props.color}
                      leftSection={<IconVocabulary size='0.9rem' />}
                      onClick={props.onClickClass}
                      fw={400}
                    >
                      {props.character?.details?.class?.name ?? 'Select Class'}
                    </Button>
                    {props.character?.variants?.dual_class && props.onClickClass2 && (
                      <>
                        <Text fz='xs' c='gray.5'>
                          /
                        </Text>
                        <Button
                          variant={hasClass2 ? 'subtle' : 'filled'}
                          size='compact-xs'
                          color={props.color}
                          onClick={props.onClickClass2}
                          fw={400}
                        >
                          {props.character?.details?.class_2?.name ?? 'Select Class'}
                        </Button>
                      </>
                    )}
                  </Group>
                ) : (
                  <Group wrap='nowrap' gap={10}>
                    <IconVocabulary stroke={1.5} size='1rem' className={classes.icon} />
                    <Text fz='xs' c='gray.3'>
                      {props.character?.details?.class?.name ?? 'Missing Class'}
                      {props.character?.variants?.dual_class && (
                        <> / {props.character?.details?.class_2?.name ?? 'Missing Class'}</>
                      )}
                    </Text>
                  </Group>
                )}
              </Box>
            </Stack>
          </div>
        </Group>
      </div>
    );
  }
);
