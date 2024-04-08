import {
  ActionIcon,
  Text,
  Box,
  Button,
  Drawer,
  Group,
  NumberInput,
  Title,
  Stack,
  TextInput,
  Popover,
  Menu,
  Badge,
  Avatar,
  ScrollArea,
  Paper,
  Center,
  Divider,
  useMantineTheme,
} from '@mantine/core';
import { useElementSize, useMediaQuery } from '@mantine/hooks';
import { tabletQuery } from '@utils/mobile-responsive';
import { ThreeDDice } from 'dddice-js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { deleteDiceRoom, getDiceUserSettings, setDiceUserSettings } from './dice-utils';
import { GiRollingDiceCup } from 'react-icons/gi';
import useRefresh from '@utils/use-refresh';
import { set } from 'colorjs.io/fn';
import { IconPlus, IconTrack, IconTrash, IconVolume, IconVolumeOff, IconX } from '@tabler/icons-react';
import { sign } from '@utils/numbers';
import { DICE_THEMES, findDiceTheme } from './dice-tray';
import { Carousel } from '@mantine/carousel';
import _ from 'lodash';

const AUTH_KEY = (import.meta.env.VITE_DDDICE_AUTH_KEY ?? '') as string;
const OVERLAY_INDEX = 99999;

type Dice = {
  id: string;
  type: string;
  theme: string;
  bonus: number;
  label: string;
};

export default function DiceRoller(props: { opened: boolean; onClose: () => void }) {
  const theme = useMantineTheme();
  const isTablet = useMediaQuery(tabletQuery());

  const [diceOverlay, setDiceOverlay] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [loadingRoll, setLoadingRoll] = useState(false);

  const [loaded, setLoaded] = useState(false);
  const roomId = useRef<string | null>(null);
  const dddice = useRef<ThreeDDice>();

  const [dice, setDice] = useState<Dice[]>([]);
  const [activeDie, setActiveDie] = useState<string | null>(null);
  const [displayCarousel, refreshCarousel] = useRefresh();

  const [currentDiceNum, setCurrentDiceNum] = useState(1);
  const [currentDiceType, setCurrentDiceType] = useState('d20');
  const [currentDiceBonus, setCurrentDiceBonus] = useState(0);
  const [currentDiceLabel, setCurrentDiceLabel] = useState('');

  // Dice Settings
  const [diceSettings, setDiceSettings] = useState(getDiceUserSettings());
  useEffect(() => {
    setDiceUserSettings(diceSettings);
  }, [diceSettings]);

  // Setup & Cleanup DDDice
  useEffect(() => {
    if (props.opened) {
      setTimeout(async () => {
        if (dddice.current && roomId.current) return;
        if (!canvasRef.current) {
          console.warn('Canvas not found');
          props.onClose();
          return;
        }
        // Initialize dddice
        dddice.current = new ThreeDDice(canvasRef.current, AUTH_KEY, {
          autoClear: null,
        });
        dddice.current.controlsEnabled = false;
        dddice.current.start();
        if (!roomId.current) {
          const room = await dddice.current.api?.room.create();
          roomId.current = room?.data.slug ?? '';
        }
        console.log('Dice Roller 🎲 Connecting to room: ', roomId.current);
        await dddice.current.connect(roomId.current);
        setLoaded(true);
      }, 200);
    } else {
      // Cleanup
      closeDiceTray();
      setLoaded(false);
      setDice([]);
      setActiveDie(null);
      if (dddice.current) {
        dddice.current.clear();
        dddice.current = undefined;
        if (roomId.current) {
          deleteDiceRoom(AUTH_KEY, roomId.current).then((success) => {
            if (success) {
              console.log('Dice Roller 🎲 Room deleted');
            } else {
              console.warn('Dice Roller 🎲 Failed to delete room');
            }
          });
          roomId.current = null;
        }
      }
    }
  }, [props.opened]);

  // Roll Dice
  const onRollDice = async () => {
    if (!dddice.current || !roomId.current) {
      console.warn('dddice is not initialized');
      return;
    }
    dddice.current.resetCamera();

    setActiveDie(null);
    setLoadingRoll(true);
    openDiceTray();

    const result = await dddice.current.roll(
      dice.map((die) => ({
        type: die.type,
        theme: die.theme,
        label: die.label.trim() || undefined,
        meta: {
          bonus: die.bonus,
        },
      })),
      {}
    );
    console.log(result);
    setDice([]);
    setLoadingRoll(false);
  };

  // Open & Close Dice Tray
  const openDiceTray = () => {
    dddice.current?.clear();
    setDiceOverlay(true);
  };

  const closeDiceTray = () => {
    setLoadingRoll(false);
    dddice.current?.clear();
    setTimeout(() => {
      setDiceOverlay(false);
    }, 1000);
  };

  const activeDieData = useMemo(() => {
    return {
      die: dice.find((die) => die.id === activeDie),
      theme: findDiceTheme(dice.find((die) => die.id === activeDie)?.theme ?? ''),
    };
  }, [activeDie, dice]);

  return (
    <>
      <Drawer
        opened={props.opened}
        onClose={props.onClose}
        title={
          <Group wrap='nowrap' gap={10}>
            <Title order={3}>Dice Roller</Title>
          </Group>
        }
        size={'min(100vw, 400px)'}
        overlayProps={{ backgroundOpacity: 0.5, blur: 2 }}
        styles={{
          body: {
            height: 'calc(100% - 64px)',
          },
        }}
      >
        <Stack justify='space-between' h='100%'>
          <Stack gap={10}>
            <Group wrap='nowrap' justify='space-between' align='start'>
              <Stack gap={5}>
                <Group wrap='nowrap' justify='end' gap={10}>
                  <Button.Group>
                    <Menu shadow='md' width={50}>
                      <Menu.Target>
                        <Button variant='default' w={50}>
                          {currentDiceNum}
                        </Button>
                      </Menu.Target>
                      <Menu.Dropdown>
                        {Array.from({ length: 10 }, (_, i) => (
                          <Menu.Item key={i} onClick={() => setCurrentDiceNum(i + 1)}>
                            <Text ta='center'>{i + 1}</Text>
                          </Menu.Item>
                        ))}
                      </Menu.Dropdown>
                    </Menu>
                    <Menu shadow='md' width={65}>
                      <Menu.Target>
                        <Button variant='default' w={65}>
                          {currentDiceType}
                        </Button>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item onClick={() => setCurrentDiceType('d4')}>
                          <Text ta='center'>d4</Text>
                        </Menu.Item>
                        <Menu.Item onClick={() => setCurrentDiceType('d6')}>
                          <Text ta='center'>d6</Text>
                        </Menu.Item>
                        <Menu.Item onClick={() => setCurrentDiceType('d8')}>
                          <Text ta='center'>d8</Text>
                        </Menu.Item>
                        <Menu.Item onClick={() => setCurrentDiceType('d10')}>
                          <Text ta='center'>d10</Text>
                        </Menu.Item>
                        <Menu.Item onClick={() => setCurrentDiceType('d12')}>
                          <Text ta='center'>d12</Text>
                        </Menu.Item>
                        <Menu.Item onClick={() => setCurrentDiceType('d20')}>
                          <Text ta='center'>d20</Text>
                        </Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  </Button.Group>
                  <Text>+</Text>
                  <NumberInput
                    hideControls
                    placeholder='0'
                    w={50}
                    value={currentDiceBonus || ''}
                    onChange={(value) => setCurrentDiceBonus(parseInt(`${value}`))}
                  />
                  <Box pl={10}>
                    <Button
                      size='compact-sm'
                      radius={'xl'}
                      onClick={() => {
                        const newDice: Dice[] = [];
                        for (let i = 0; i < currentDiceNum; i++) {
                          newDice.push({
                            id: crypto.randomUUID(),
                            type: currentDiceType,
                            theme: diceSettings.diceTray.length > 0 ? diceSettings.diceTray[0] : DICE_THEMES[0].theme,
                            bonus: currentDiceBonus,
                            label: currentDiceLabel,
                          });
                        }
                        setDice([...dice, ...newDice]);
                        setCurrentDiceNum(1);
                        setCurrentDiceType('d20');
                        setCurrentDiceBonus(0);
                        setCurrentDiceLabel('');
                      }}
                    >
                      Add
                    </Button>
                  </Box>
                </Group>
                <i>
                  <TextInput
                    pl={2}
                    variant='unstyled'
                    size='xs'
                    placeholder='Roll label or description'
                    value={currentDiceLabel}
                    onChange={(e) => setCurrentDiceLabel(e.currentTarget.value)}
                  />
                </i>
              </Stack>
              <ActionIcon variant='subtle' aria-label='Clear History' size='sm' radius={'xl'} color='gray.9'>
                <IconTrash style={{ width: '70%', height: '70%' }} stroke={1.5} />
              </ActionIcon>
            </Group>

            <Paper withBorder p={5} mb={5}>
              <ScrollArea h={100} type='always' scrollbars='y'>
                <Group gap={10}>
                  {dice.map((die, i) => (
                    <Badge
                      key={i}
                      color='gray'
                      variant='light'
                      styles={{
                        root: {
                          textTransform: 'initial',
                        },
                      }}
                      style={{
                        border: activeDie === die.id ? `1px solid ${theme.colors.gray[6]}` : undefined,
                        cursor: 'pointer',
                      }}
                      p={0}
                      onClick={() => {
                        if (activeDie === die.id) {
                          setActiveDie(null);
                        } else {
                          refreshCarousel();
                          setActiveDie(die.id);
                        }
                      }}
                      leftSection={<Avatar size={18} src={findDiceTheme(die.theme).imageURL} alt='Dice Icon' />}
                      rightSection={
                        <ActionIcon
                          variant='subtle'
                          color='gray'
                          size='xs'
                          aria-label='Remove Dice'
                          onClick={(e) => {
                            e.stopPropagation();
                            setDice(dice.filter((_, index) => index !== i));
                            if (activeDie === die.id) setActiveDie(null);
                          }}
                        >
                          <IconX style={{ width: '70%', height: '70%' }} stroke={1.5} />
                        </ActionIcon>
                      }
                    >
                      {die.type}
                      {die.bonus ? `${sign(die.bonus)}` : ''}
                    </Badge>
                  ))}
                </Group>
              </ScrollArea>
            </Paper>

            <Button
              size='compact-sm'
              fullWidth
              loading={loadingRoll}
              disabled={!loaded || dice.length === 0}
              onClick={() => {
                onRollDice();
              }}
            >
              Roll Dice
            </Button>
          </Stack>
          <Box>
            <Paper withBorder p={5}>
              {activeDie && displayCarousel ? (
                <Stack>
                  <Group align='start'>
                    <Avatar size={40} src={activeDieData.theme.imageURL} alt='Dice Icon' />
                    <Stack gap={0} h={40}>
                      <Title order={4}>{activeDieData.theme.name}</Title>
                      <Text fz='xs' fs='italic'>
                        {activeDieData.die?.label
                          ? `${activeDieData.die?.type}${activeDieData.die?.bonus ? `${sign(activeDieData.die?.bonus)}` : ''}, ${activeDieData.die?.label}`
                          : `${activeDieData.die?.type}${activeDieData.die?.bonus ? `${sign(activeDieData.die?.bonus)}` : ''}`}
                      </Text>
                    </Stack>
                  </Group>
                  <Divider />

                  {
                    <Carousel
                      withIndicators
                      height={100}
                      initialSlide={DICE_THEMES.findIndex((theme) => theme.theme === activeDieData.theme.theme)}
                      onSlideChange={(index) => {
                        setTimeout(() => {
                          const theme = DICE_THEMES[index];
                          setDice((prev) => {
                            return prev.map((die) => {
                              if (die.id === activeDie) {
                                return {
                                  ...die,
                                  theme: theme.theme,
                                };
                              }
                              return die;
                            });
                          });
                        }, 500);
                      }}
                    >
                      {DICE_THEMES.map((theme, index) => (
                        <Carousel.Slide key={index}>
                          <Center>
                            <Avatar size={70} src={theme.imageURL} alt='Dice Icon' />
                          </Center>
                        </Carousel.Slide>
                      ))}
                    </Carousel>
                  }
                </Stack>
              ) : (
                <>History</>
              )}
            </Paper>
          </Box>
        </Stack>
      </Drawer>
      <Box
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          zIndex: diceOverlay ? OVERLAY_INDEX : -1 * OVERLAY_INDEX,
          height: '100vh',
          width: isTablet ? '100vw' : `calc(100vw - min(100vw, 400px))`,
        }}
        onClick={() => {
          closeDiceTray();
        }}
      >
        <Box
          style={{
            position: 'absolute',
            top: 5,
            right: 5,
            zIndex: OVERLAY_INDEX + 1,
          }}
        >
          <GiRollingDiceCup size='1.3rem' />
        </Box>
        <canvas
          ref={canvasRef}
          style={{
            //border: 'solid',
            marginTop: 15,
            width: '95%',
            height: '95%',
          }}
        />
      </Box>
    </>
  );
}
