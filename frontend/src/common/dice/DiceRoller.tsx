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
  Menu,
  Badge,
  Avatar,
  ScrollArea,
  Paper,
  Center,
  Divider,
  useMantineTheme,
  Collapse,
} from '@mantine/core';
import { useDebouncedState, useDebouncedValue, useDidUpdate, useDisclosure, useMediaQuery } from '@mantine/hooks';
import { tabletQuery } from '@utils/mobile-responsive';
import { ThreeDDice } from 'dddice-js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { deleteDiceRoom, findDefaultPresets } from './dice-utils';
import { GiRollingDiceCup } from 'react-icons/gi';
import useRefresh from '@utils/use-refresh';
import { IconArrowBigRightFilled, IconSquareRoundedArrowDown, IconTrash, IconX } from '@tabler/icons-react';
import { sign } from '@utils/numbers';
import { DICE_THEMES, findDiceTheme } from './dice-tray';
import { Carousel } from '@mantine/carousel';
import _ from 'lodash-es';
import { useRecoilState } from 'recoil';
import { characterState } from '@atoms/characterAtoms';
import { hasPatreonAccess } from '@utils/patreon';
import { getCachedPublicUser } from '@auth/user-manager';
import { displayPatronOnly } from '@utils/notifications';
import { rollDie } from '@utils/random';
import { Dice } from '@typing/content';
import { openContextModal } from '@mantine/modals';

const AUTH_KEY = (import.meta.env.VITE_DDDICE_AUTH_KEY ?? '') as string;
const OVERLAY_INDEX = 99999;

export default function DiceRoller(props: {
  opened: boolean;
  onClose: () => void;
  diceNum?: number;
  diceType?: string;
  diceBonus?: number;
  diceLabel?: string;
}) {
  const theme = useMantineTheme();
  const isTablet = useMediaQuery(tabletQuery());
  const [character, setCharacter] = useRecoilState(characterState);
  const [useFallback, setUseFallback] = useState(false);

  const [diceOverlay, setDiceOverlay] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [loadingRoll, setLoadingRoll] = useState(false);

  const [loaded, setLoaded] = useState(false);
  const roomId = useRef<string | null>(null);
  const dddice = useRef<ThreeDDice>();

  const [dice, setDice] = useState<Dice[]>([]);
  const [activeDie, setActiveDie] = useState<string | null>(null);
  const [displayCarousel, refreshCarousel] = useRefresh();

  const [openedPresets, setOpenedPresets] = useState(false);
  const [openedDefaultPresets, { open: openDefaultPresets, toggle: toggleDefaultPresets }] = useDisclosure();

  const [currentDiceNum, setCurrentDiceNum] = useState(props.diceNum ?? 1);
  const [currentDiceType, setCurrentDiceType] = useState(props.diceType ?? 'd20');
  const [currentDiceBonus, setCurrentDiceBonus] = useState(props.diceBonus ?? 0);
  const [currentDiceLabel, setCurrentDiceLabel] = useState(props.diceLabel ?? '');

  // Theme //

  const [debouncedTheme, setDebouncedTheme] = useDebouncedState<string | null>(null, 2000);
  useDidUpdate(() => {
    // Saving theme
    if (!character || !debouncedTheme) return;
    setCharacter({
      ...character,
      details: {
        ...character.details,
        dice: {
          ...character.details?.dice,
          default_theme: debouncedTheme,
        },
      },
    });
  }, [debouncedTheme]);

  // Roll History //

  const rollHistoryViewport = useRef<HTMLDivElement>(null);
  const [rollHistory, setRollHistory] = useState(_.cloneDeep(character?.roll_history?.rolls ?? []));
  const groupedRolls = _.groupBy(
    rollHistory.map((r) => ({ ...r, group: `${r.label}~${r.timestamp}~${r.type}` })),
    (r) => r.group
  );
  const [debouncedRollHistory] = useDebouncedValue(rollHistory, 5000);
  useDidUpdate(() => {
    // Saving roll history
    if (!character || !debouncedRollHistory) return;
    console.log('Dice Roller 🎲 Saving roll history,', debouncedRollHistory.length);
    setCharacter({
      ...character,
      roll_history: {
        ...character.roll_history,
        rolls: debouncedRollHistory,
      },
    });
  }, [debouncedRollHistory]);

  useEffect(() => {
    rollHistoryViewport.current?.scrollTo({ top: 0, behavior: 'instant' });
  }, [rollHistory]);

  const getRollHistory = () => {
    const getRollEntry = (
      dice: {
        group: string;
        type: string;
        label: string;
        result: number;
        bonus: number;
        timestamp: number;
      }[]
    ) => {
      const numColor = 'gray.6';
      const mathColor = 'gray.7';
      const maxColor = 'green.5';
      const minColor = 'red.5';
      const resultColor = 'blue.5';

      const dieType = parseInt(dice[0].type.slice(1));
      const bonus = dice.reduce((a, b) => a + b.bonus, 0);
      const result = dice.reduce((a, b) => a + b.result, 0) + bonus;
      return (
        <Group gap={5} wrap='nowrap' align='start'>
          <Text span>
            <Text c={numColor} span>
              {dice.length}
            </Text>
            <Text c={mathColor} span>
              d
            </Text>
            <Text c={numColor} span>
              {dieType}
            </Text>
            <Text c={mathColor} span>
              {bonus !== 0 && (bonus > 0 ? '+' : '-')}
            </Text>
            <Text c={numColor} span>
              {bonus !== 0 && bonus}
            </Text>
          </Text>
          <Text c={mathColor} span>
            <IconArrowBigRightFilled size='0.7rem' />
          </Text>
          <Text span>
            {dice.map((die, i) => (
              <Text key={i} span>
                <Text c={mathColor} span>
                  {`(`}
                </Text>
                <Text c={die.result === dieType ? maxColor : die.result === 1 ? minColor : numColor} span>
                  {die.result}
                </Text>
                <Text c={mathColor} span>
                  {`)`}
                </Text>
                <Text c={mathColor} span>
                  {dice.length - 1 !== i && '+'}
                </Text>
              </Text>
            ))}
          </Text>
          <Text c={mathColor} span>
            <IconArrowBigRightFilled size='0.7rem' />
          </Text>
          <Text span>
            <Text c={resultColor} fw={600} span>
              {result}
            </Text>
          </Text>
        </Group>
      );
    };

    return (
      <>
        <Stack gap={5}>
          {Object.keys(groupedRolls)
            .filter((group) => groupedRolls[group].length > 0)
            .sort((a, b) => groupedRolls[b][0].timestamp - groupedRolls[a][0].timestamp)
            .map((group, i) => (
              <Paper key={i} withBorder p={3} style={{ backgroundColor: theme.colors.dark[6] + '77' }}>
                <Group justify='space-between' align='start' wrap='nowrap' pl={5} pr={10}>
                  <Box>{getRollEntry(groupedRolls[group])}</Box>
                  <Box>
                    <Stack gap={0} justify='space-between' align='end'>
                      <Text fz={8} c='gray.6' fs='italic' ta='end' style={{ whiteSpace: 'nowrap' }}>
                        {new Date(groupedRolls[group][0].timestamp).toLocaleTimeString()}
                      </Text>
                      <Text fz={10} c='gray.5' ta='end'>
                        {groupedRolls[group][0].label}
                      </Text>
                    </Stack>
                  </Box>
                </Group>
              </Paper>
            ))}
        </Stack>
      </>
    );
  };

  // Presets //

  const [presets, setPresets] = useState(_.cloneDeep(character?.details?.dice?.presets ?? []));
  const [debouncedPresets] = useDebouncedValue(presets, 1000);
  useDidUpdate(() => {
    // Saving presets
    if (!character) return;
    console.log('Dice Roller 🎲 Saving presets,', debouncedPresets.length, openedDefaultPresets);
    setCharacter({
      ...character,
      details: {
        ...character.details,
        dice: {
          ...character.details?.dice,
          presets: debouncedPresets,
          opened_default_presets: openedDefaultPresets,
        },
      },
    });
  }, [debouncedPresets, openedDefaultPresets]);

  // When opening default presets, load them
  const defaultPresets = useMemo(() => {
    if (openedDefaultPresets) {
      return findDefaultPresets('CHARACTER', character);
    } else {
      return [];
    }
  }, [openedDefaultPresets]);

  const getPresetList = () => {
    const getPresetEntry = (preset: { id: string; name: string; dice: Dice[] }, includeDelete: boolean) => {
      return (
        <Paper withBorder p={3} style={{ backgroundColor: theme.colors.dark[6] + '77' }}>
          <Group justify='space-between' align='center' wrap='nowrap' px={5}>
            <Group wrap='nowrap' gap={10}>
              <Text fz='sm'>{preset.name}</Text>
            </Group>

            <Group align='center' wrap='nowrap' px={5}>
              <Badge variant='outline' size='xs' circle>
                {preset.dice.length}
              </Badge>
              <Group gap={5} justify='space-between' align='end' wrap='nowrap'>
                <Button
                  size='compact-xs'
                  onClick={() => {
                    setDice((prev) => [
                      ...prev,
                      ...preset.dice.map((die) => ({
                        ...die,
                        id: crypto.randomUUID(),
                      })),
                    ]);
                  }}
                >
                  Add to tray
                </Button>
                {includeDelete && (
                  <ActionIcon
                    variant='subtle'
                    aria-label='Delete Preset'
                    size='sm'
                    radius={'xl'}
                    color='gray.6'
                    onClick={() => {
                      setPresets((prev) => prev.filter((p) => p.id !== preset.id));
                    }}
                  >
                    <IconTrash style={{ width: '60%', height: '60%' }} stroke={1.5} />
                  </ActionIcon>
                )}
              </Group>
            </Group>
          </Group>
        </Paper>
      );
    };

    return (
      <>
        <Stack gap={5}>
          {_.cloneDeep(presets)
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((preset, i) => (
              <Box key={i}>{getPresetEntry(preset, true)}</Box>
            ))}
          {presets.length === 0 && (
            <>
              <Divider />
              <Text w='100%' pt='xs' fz='xs' c='gray.7' ta='center' fs='italic'>
                No custom presets found.
              </Text>
            </>
          )}
        </Stack>
        <Divider
          my='xs'
          label={
            <Group gap={3} wrap='nowrap'>
              <Button variant={openedDefaultPresets ? 'outline' : 'subtle'} size='compact-xs' color='gray.6'>
                Default Presets
              </Button>
              <Badge variant='light' color={theme.primaryColor} size='xs'>
                10+
              </Badge>
            </Group>
          }
          labelPosition='left'
          onClick={toggleDefaultPresets}
        />
        <Collapse in={openedDefaultPresets}>
          {openedDefaultPresets && (
            <Stack gap={5}>
              {defaultPresets.map((preset, i) => (
                <Box key={i}>{getPresetEntry(preset, false)}</Box>
              ))}
            </Stack>
          )}
        </Collapse>
      </>
    );
  };

  // Setup & Cleanup DDDice
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeDiceTray();
        props.onClose();
      }
    };

    if (props.opened) {
      document.addEventListener('keydown', handleKeyDown);
      setTimeout(async () => {
        if (dddice.current && roomId.current) return;
        if (!canvasRef.current) {
          console.warn('Canvas not found');
          props.onClose();
          return;
        }
        try {
          // Initialize dddice
          dddice.current = new ThreeDDice(canvasRef.current, AUTH_KEY, {
            autoClear: null,
            dice: {
              drawOutlines: false,
            },
          });
          dddice.current.controlsEnabled = false;
          dddice.current.start();
          if (!roomId.current) {
            const room = await dddice.current.api?.room.create();
            roomId.current = room?.data.slug ?? '';
          }
          console.log('Dice Roller 🎲 Connecting to room: ', roomId.current);
          dddice.current.connect(roomId.current);
          // Takes a little time to join room and we can't await it,
          setTimeout(() => {
            setLoaded(true);
          }, 500);
        } catch (e) {
          setUseFallback(true);
          setLoaded(true);
        }
      }, 200);
    } else {
      // Cleanup
      document.removeEventListener('keydown', handleKeyDown);
      closeDiceTray();
      setLoaded(false);
      setDice([]);
      setActiveDie(null);
      setOpenedPresets(false);
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
    dddice.current?.resetCamera();

    setActiveDie(null);
    setLoadingRoll(true);
    openDiceTray();

    let results: { type: string; label: string; result: number; bonus: number }[] = [];
    if (useFallback) {
      // RNG Dice Roll
      results =
        dice.map((value) => ({
          type: value.type,
          label: value.label ?? '',
          result: rollDie(value.type),
          bonus: value.bonus,
        })) ?? [];
    } else {
      // 3D Dice Roll
      const vResult = await dddice.current?.roll(
        dice
          .map((die) => ({
            type: die.type,
            theme: die.theme,
            label: die.label.trim() || undefined,
            meta: {
              bonus: die.bonus,
              type: die.type,
            },
          }))
          .map((die) => {
            if (die.theme !== DICE_THEMES[0].theme && !hasPatreonAccess(getCachedPublicUser(), 2)) {
              displayPatronOnly('Special dice themes are only available to patrons!');
              return {
                ...die,
                theme: DICE_THEMES[0].theme,
              };
            } else {
              return die;
            }
          }),
        {}
      );

      results =
        vResult?.data.values.map((value) => ({
          type: value.meta?.type,
          label: value.label ?? '',
          result: value.value,
          bonus: value.meta?.bonus,
        })) ?? [];
    }

    // Takes a little time to finish rolling
    setTimeout(() => {
      setLoadingRoll(false);
      setOpenedPresets(false);
      // Add to history
      const timestamp = Date.now();
      setRollHistory((prev) => [...prev, ...results.map((result) => ({ ...result, timestamp: timestamp }))]);
    }, 1000);
    setDice([]);
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
          <Group wrap='nowrap' gap={10} justify='space-between'>
            <Title order={3}>Dice Roller</Title>
            <Button
              size='xs'
              color='gray.6'
              variant={openedPresets ? 'outline' : 'subtle'}
              mr={5}
              onClick={() => {
                setOpenedPresets(!openedPresets);
                setActiveDie(null);

                // Open (& load) default presets if not already opened
                if (!openedPresets) {
                  if (character?.details?.dice?.opened_default_presets) {
                    openDefaultPresets();
                  }
                }
              }}
            >
              View Presets
            </Button>
          </Group>
        }
        size={'min(100vw, 400px)'}
        overlayProps={{ backgroundOpacity: 0.5, blur: 2 }}
        styles={{
          title: {
            width: '100%',
          },
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
                  <Box pl={5}>
                    <Button
                      size='xs'
                      variant='filled'
                      radius={'xl'}
                      onClick={() => {
                        const newDice: Dice[] = [];
                        for (let i = 0; i < currentDiceNum; i++) {
                          newDice.push({
                            id: crypto.randomUUID(),
                            type: currentDiceType,
                            theme: character?.details?.dice?.default_theme ?? DICE_THEMES[0].theme,
                            bonus: i === currentDiceNum - 1 ? currentDiceBonus : 0,
                            label: currentDiceLabel,
                          });
                        }
                        setDice([...dice, ...newDice]);
                        setCurrentDiceNum(1);
                        //setCurrentDiceType('d20');
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
                          userSelect: 'none',
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
                          setOpenedPresets(false);
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
                  {dice.length === 0 && (
                    <Text w='100%' py='xs' fz='xs' c='gray.7' ta='center' fs='italic'>
                      Dice tray
                      <br />
                      Add some dice to roll
                    </Text>
                  )}
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
            {activeDie ? (
              <>
                {displayCarousel && (
                  <Paper withBorder p={5}>
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
                          slideSize='70%'
                          slideGap='md'
                          loop
                          height={80}
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
                              setDebouncedTheme(theme.theme);
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
                  </Paper>
                )}
              </>
            ) : (
              <>
                {openedPresets ? (
                  <>
                    <Paper withBorder p={5}>
                      <Stack gap={5}>
                        <Box>
                          <Group wrap='nowrap' justify='space-between' ml={5}>
                            <Title order={4}>Presets</Title>

                            <Group wrap='nowrap'>
                              <Button
                                size='compact-xs'
                                variant='light'
                                disabled={dice.length === 0}
                                onClick={() => {
                                  closeDiceTray();
                                  openContextModal({
                                    modal: 'createDicePreset',
                                    title: <Title order={3}>Create Preset</Title>,
                                    innerProps: {
                                      onConfirm: (name) => {
                                        setPresets((prev) => [
                                          ...prev,
                                          {
                                            id: crypto.randomUUID(),
                                            name: name,
                                            dice: dice,
                                          },
                                        ]);
                                      },
                                    },
                                  });
                                }}
                              >
                                Save tray to preset
                              </Button>
                            </Group>
                          </Group>
                        </Box>
                        <Box>
                          <ScrollArea h={`min(40vh, 350px)`} scrollbars='y'>
                            {getPresetList()}
                          </ScrollArea>
                        </Box>
                      </Stack>
                    </Paper>
                  </>
                ) : (
                  <>
                    {rollHistory.length !== 0 && (
                      <Paper withBorder p={5}>
                        <Stack gap={5}>
                          <Box>
                            <Group wrap='nowrap' justify='space-between' mx={5}>
                              <Title order={4}>History</Title>
                              <ActionIcon
                                variant='subtle'
                                aria-label='Clear History'
                                size='sm'
                                radius={'xl'}
                                color='gray.9'
                                onClick={() => {
                                  setRollHistory([]);
                                }}
                              >
                                <IconTrash style={{ width: '60%', height: '60%' }} stroke={1.5} />
                              </ActionIcon>
                            </Group>
                          </Box>
                          <Box>
                            <ScrollArea h={`min(40vh, 350px)`} scrollbars='y' viewportRef={rollHistoryViewport}>
                              {getRollHistory()}
                            </ScrollArea>
                          </Box>
                        </Stack>
                      </Paper>
                    )}
                  </>
                )}
              </>
            )}
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
