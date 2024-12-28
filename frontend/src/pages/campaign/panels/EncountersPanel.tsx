import { drawerState } from '@atoms/navAtoms';
import ConditionPill from '@common/ConditionPill';
import { EllipsisText } from '@common/EllipsisText';
import { Icon } from '@common/Icon';
import { DisplayIcon } from '@common/IconDisplay';
import { selectContent } from '@common/select/SelectContent';
import { applyConditions, compiledConditions } from '@conditions/condition-handler';
import { GUIDE_BLUE } from '@constants/data';
import { fetchContentPackage } from '@content/content-store';
import { defineDefaultSourcesForUser } from '@content/homebrew';
import { getBestArmor } from '@items/inv-utils';
import {
  Tabs,
  ActionIcon,
  ScrollArea,
  Title,
  Box,
  Menu,
  Button,
  Stack,
  Group,
  Avatar,
  Text,
  NumberInput,
  TextInput,
  Badge,
  MantineColor,
} from '@mantine/core';
import {
  getHotkeyHandler,
  useDebouncedState,
  useDidUpdate,
  useElementSize,
  useHover,
  useMediaQuery,
} from '@mantine/hooks';
import { openContextModal } from '@mantine/modals';
import { CreateCombatantModal } from '@modals/CreateCombatantModal';
import { executeCreatureOperations } from '@operations/operation-controller';
import { confirmHealth } from '@pages/character_sheet/living-entity-utils';
import { ConditionPills } from '@pages/character_sheet/sections/ConditionSection';
import { makeRequest } from '@requests/request-manager';
import { en } from '@supabase/auth-ui-shared';
import {
  IconAtom2Filled,
  IconBat,
  IconBrandFunimation,
  IconCheck,
  IconCylinder,
  IconDownload,
  IconPlus,
  IconSettings,
  IconSword,
  IconUser,
  IconX,
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { JSONContent } from '@tiptap/react';
import { Campaign, Character, Combatant, Condition, Creature, Encounter, LivingEntity } from '@typing/content';
import { sleep } from '@utils/async';
import { isPhoneSized, phoneQuery, usePhoneSized } from '@utils/mobile-responsive';
import { sign } from '@utils/numbers';
import { rollDie } from '@utils/random';
import { convertToSetEntity, isCharacter, isCreature, setterOrUpdaterToValue } from '@utils/type-fixing';
import useRefresh from '@utils/use-refresh';
import { getFinalAcValue, getFinalHealthValue, getFinalProfValue } from '@variables/variable-display';
import _ from 'lodash-es';
import { evaluate } from 'mathjs';
import { useEffect, useMemo, useRef, useState } from 'react';
import { GiDiceTwentyFacesTwenty } from 'react-icons/gi';
import { useRecoilState } from 'recoil';

export default function EncountersPanel(props: {
  panelHeight: number;
  panelWidth: number;
  encounters: Encounter[];
  setEncounters: (encounters: Encounter[]) => void;
  campaign?: {
    data: Campaign;
    players: Character[];
  };
  zIndex?: number;
}) {
  const [activeTab, setActiveTab] = useState<string | null>('0');
  const isPhone = isPhoneSized(props.panelWidth);
  const [displayEncounters, refreshEncounters] = useRefresh();

  useEffect(() => {
    refreshEncounters();
  }, [activeTab]);

  useEffect(() => {
    // Prefetch content package for creature calculations
    defineDefaultSourcesForUser().then(() => {
      fetchContentPackage(undefined, { fetchSources: false, fetchCreatures: false });
    });
  }, []);

  const defaultEncounter: Encounter = {
    id: -1,
    created_at: '',
    user_id: '',
    //
    name: 'Combat',
    icon: 'combat',
    color: GUIDE_BLUE,
    campaign_id: props.campaign?.data.id,
    combatants: {
      list: [],
    },
    meta_data: {
      description: '',
      party_level: props.campaign ? _.mean(props.campaign.players.map((p) => p.level)) : undefined,
      party_size: props.campaign ? props.campaign.players.length : undefined,
    },
  };

  const encounters = props.encounters.length > 0 ? props.encounters : [_.cloneDeep(defaultEncounter)];

  const addEncounter = () => {
    const newEncounters = _.cloneDeep(encounters);
    newEncounters.push(_.cloneDeep(defaultEncounter));
    props.setEncounters(newEncounters);
    setActiveTab(`${newEncounters.length - 1}`);
  };

  const getEncounter = (encounter: Encounter, index: number) => {
    return (
      <ScrollArea h={props.panelHeight} scrollbars='y'>
        <EncounterView
          encounter={encounter}
          setEncounter={(e) => {
            const newEncounters = _.cloneDeep(encounters);
            newEncounters[index] = e;
            props.setEncounters(newEncounters);
          }}
          players={props.campaign?.players ?? []}
          panelHeight={props.panelHeight}
        />
        {isPhone && (
          <Menu shadow='md' width={160} zIndex={props.zIndex ?? 499}>
            <Menu.Target>
              <Button
                variant='light'
                aria-label={`Encounters List`}
                size='xs'
                radius='xl'
                color={isPhone ? encounter.color || 'gray.5' : 'gray.5'}
                style={{
                  position: 'absolute',
                  bottom: 10,
                  left: 10,
                  //
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                }}
                w={130}
                leftSection={
                  <ActionIcon variant='transparent' size='xs' color={encounter.color}>
                    <Icon name={encounter.icon} size='1rem' />
                  </ActionIcon>
                }
              >
                {encounter.name}
              </Button>
            </Menu.Target>

            <Menu.Dropdown>
              {encounters.map((encounter, index) => (
                <Menu.Item
                  key={index}
                  value={`${index}`}
                  leftSection={
                    <ActionIcon
                      variant='transparent'
                      aria-label={`${encounter.name}`}
                      color={encounter.color}
                      size='xs'
                    >
                      <Icon name={encounter.icon} size='1rem' />
                    </ActionIcon>
                  }
                  rightSection={
                    activeTab === `${index}` ? (
                      <ActionIcon variant='transparent' color={encounter.color} size='xs'>
                        <IconCheck size='1rem' />
                      </ActionIcon>
                    ) : undefined
                  }
                  color={encounter.color}
                  onClick={() => {
                    setActiveTab(`${index}`);
                  }}
                >
                  {_.truncate(encounter.name, { length: 16 })}
                </Menu.Item>
              ))}

              <Menu.Divider />

              <Menu.Item
                value='add_encounter'
                mt='auto'
                leftSection={
                  <ActionIcon variant='transparent' size='xs' color='gray.5'>
                    <IconPlus size='1rem' />
                  </ActionIcon>
                }
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  addEncounter();
                }}
              >
                New Encounter
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        )}
        <ActionIcon
          variant={isPhone ? 'light' : 'subtle'}
          aria-label={`Encounter Settings`}
          size='md'
          radius='xl'
          color={isPhone ? encounter.color || 'gray.5' : 'gray.5'}
          style={{
            position: 'absolute',
            top: isPhone ? undefined : 10,
            bottom: isPhone ? 10 : undefined,
            left: isPhone ? 150 : undefined,
            right: isPhone ? undefined : 10,
            //
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
          onClick={() => {
            openContextModal({
              modal: 'updateEncounter',
              title: <Title order={3}>Update Encounter</Title>,
              innerProps: {
                encounter: encounter,
                onUpdate: (encounter: Encounter) => {
                  const newEncounters = _.cloneDeep(encounters);
                  newEncounters[index] = encounter;
                  props.setEncounters(newEncounters);
                },
                onDelete: () => {
                  const newEncounters = _.cloneDeep(encounters);
                  newEncounters.splice(index, 1);
                  props.setEncounters(newEncounters);
                  setActiveTab(`0`);
                },
              },
            });
          }}
        >
          <IconSettings size='1.2rem' />
        </ActionIcon>
      </ScrollArea>
    );
  };

  if (isPhone) {
    if (displayEncounters) {
      return <Box>{getEncounter(encounters[parseInt(activeTab ?? '')], parseInt(activeTab ?? ''))}</Box>;
    } else {
      return <></>;
    }
  } else {
    return (
      <Tabs orientation='vertical' value={activeTab} onChange={setActiveTab}>
        <Tabs.List w={190} h={props.panelHeight}>
          {encounters.map((encounter, index) => (
            <Tabs.Tab
              key={index}
              value={`${index}`}
              leftSection={
                <ActionIcon variant='transparent' aria-label={`${encounter.name}`} color={encounter.color} size='xs'>
                  <Icon name={encounter.icon} size='1rem' />
                </ActionIcon>
              }
              color={encounter.color}
            >
              <Box maw={125}>
                <EllipsisText fz='sm' openDelay={1000}>
                  {encounter.name}
                </EllipsisText>
              </Box>
            </Tabs.Tab>
          ))}
          <Tabs.Tab
            value='add_encounter'
            mt='auto'
            leftSection={
              <ActionIcon variant='transparent' size='xs' color='gray.5'>
                <IconPlus size='1rem' />
              </ActionIcon>
            }
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              addEncounter();
            }}
          >
            New Encounter
          </Tabs.Tab>
        </Tabs.List>

        {encounters.map((encounter, index) => (
          <Tabs.Panel key={index} value={`${index}`} style={{ position: 'relative' }}>
            {getEncounter(encounter, index)}
          </Tabs.Panel>
        ))}
      </Tabs>
    );
  }
}

export type PopulatedCombatant = Omit<Combatant, 'data'> & Required<Pick<Combatant, 'data'>>;

function EncounterView(props: {
  encounter: Encounter;
  setEncounter: (encounter: Encounter) => void;
  players?: Character[];
  panelHeight: number;
}) {
  const [openedAddCombatant, setOpenedAddCombatant] = useState(false);

  /**
   * Update the encounter with a new combatant
   * @param change - The change to make
   * @returns - The updated encounter
   */
  const changeCombatants = (
    change: { type: 'ADD'; data: LivingEntity; ally: boolean } | { type: 'REMOVE'; data: Combatant }
  ) => {
    const newEncounter = _.cloneDeep(props.encounter);

    if (change.type === 'ADD') {
      newEncounter.combatants.list.push({
        _id: crypto.randomUUID(),
        type: isCharacter(change.data) ? 'CHARACTER' : 'CREATURE',
        ally: change.ally,
        initiative: undefined,
        creature: isCreature(change.data) ? change.data : undefined,
        character: isCharacter(change.data) ? change.data.id : undefined,
        data: undefined,
      });
    } else if (change.type === 'REMOVE') {
      newEncounter.combatants.list = newEncounter.combatants.list.filter((c) => {
        return c._id !== change.data._id;
      });
    }

    // Update party size and level
    const alliesInEncounter = populateCombatants(newEncounter.combatants.list).filter((c) => c.ally);
    const partyLevel = _.mean(alliesInEncounter.map((p) => p.data.level));
    const partySize = alliesInEncounter.length;

    newEncounter.meta_data = {
      ...newEncounter.meta_data,
      party_level: partyLevel,
      party_size: partySize,
    };

    props.setEncounter(newEncounter);

    return newEncounter;
  };

  /**
   * Update the combatant in the encounter
   * @param combatant - The updated combatant
   * @returns - The updated encounter
   */
  const updateCombatant = (combatant: Combatant) => {
    const newEncounter = _.cloneDeep(props.encounter);
    const index = newEncounter.combatants.list.findIndex((c) => c._id === combatant._id);
    if (index === -1) return;

    newEncounter.combatants.list[index] = combatant;

    props.setEncounter(newEncounter);

    return newEncounter;
  };

  /**
   * Display the difficulty badge if there are both allies and enemies
   * @param combatants - The list of combatants
   * @returns - Whether to display the difficulty badge
   */
  const displayDifficulty = (combatants: Combatant[]): boolean => {
    if (combatants.length === 0) return false;
    // Display difficulty if there are both allies and enemies
    return combatants.some((c) => c.ally) && combatants.some((c) => !c.ally);
  };

  /**
   * Populate the combatants with their data
   * @param combatants - The list of combatants
   * @returns - The populated combatants
   */
  const populateCombatants = (combatants: Combatant[]): PopulatedCombatant[] => {
    const getCombatantData = (combatant: Combatant): LivingEntity | undefined => {
      if (combatant.type === 'CHARACTER') {
        return props.players?.find((p) => p.id === combatant.character);
      } else {
        return combatant.creature;
      }
    };
    return combatants.map((c) => ({
      ...c,
      data: getCombatantData(c)!,
    }));
  };

  // Get the combatants from the encounter
  const combatants = populateCombatants(props.encounter.combatants.list);

  // The players that can still be added to the encounter
  const playersToAdd = useMemo(() => {
    return (
      props.players?.filter((p) => {
        const foundPlayer = combatants.find((c) => {
          if (c.type === 'CHARACTER') {
            return c.character === p.id;
          } else {
            return false;
          }
        });

        return foundPlayer === undefined;
      }) ?? []
    );
  }, [props.players, combatants]);

  // Calculated data for the combatants
  const { data: computedData } = useQuery({
    queryKey: [
      `computed-combatants`,
      {
        combatants: combatants,
      },
    ],
    queryFn: async () => {
      if (combatants.length === 0) return [];
      console.log('Computing combatants');
      return await computeCombatants(combatants);
    },
    enabled: combatants.length > 0,
  });

  const getComputedData = (combatant: Combatant) => {
    return computedData?.find((d) => {
      if (combatant.type === 'CHARACTER') {
        return d._id === combatant._id && d.type === 'character';
      } else if (combatant.type === 'CREATURE') {
        return d._id === combatant._id && d.type === 'creature';
      } else {
        return false;
      }
    });
  };

  const difficulty = calculateDifficulty(props.encounter, combatants);

  return (
    <Box style={{}}>
      <Stack gap={0}>
        <Box
          p={8}
          style={{
            backgroundColor: `rgb(26, 27, 30)`,
            borderTopLeftRadius: 10,
            borderTopRightRadius: 10,
            border: '1px solid #373A40',
          }}
        >
          <Group justify='space-between' mr={40} wrap='nowrap' align='flex-start'>
            <Group>
              <Button
                variant='light'
                size='compact-sm'
                rightSection={<GiDiceTwentyFacesTwenty size={16} />}
                style={{
                  fontStyle: 'italic',
                }}
                color={props.encounter.color}
                disabled={combatants.length === 0}
                onClick={() => {
                  openContextModal({
                    modal: 'initiativeRoll',
                    title: <Title order={3}>Assign Initiative Skills</Title>,
                    innerProps: {
                      combatants: combatants,
                      onConfirm: (rollBonuses: Map<string, number | null>) => {
                        const newEncounter = _.cloneDeep(props.encounter);

                        // Roll initiative for each combatant
                        for (const [_id, bonus] of rollBonuses) {
                          if (bonus === null) continue;
                          newEncounter.combatants.list = newEncounter.combatants.list.map((c) => {
                            if (c._id === _id) {
                              return {
                                ...c,
                                initiative: rollDie('D20') + bonus,
                              };
                            } else {
                              return c;
                            }
                          });
                        }

                        props.setEncounter(newEncounter);
                      },
                    },
                  });
                }}
              >
                Roll Initiative
              </Button>

              {props.players && (
                <Menu shadow='md' width={160}>
                  <Menu.Target>
                    <Button
                      disabled={playersToAdd.length === 0}
                      variant='subtle'
                      size='xs'
                      rightSection={<IconUser size={14} />}
                      color={props.encounter.color}
                    >
                      Add Player
                    </Button>
                  </Menu.Target>

                  <Menu.Dropdown>
                    {playersToAdd.map((player, index) => (
                      <Menu.Item
                        key={index}
                        value={`${player.id}`}
                        onClick={() =>
                          changeCombatants({
                            type: 'ADD',
                            data: player,
                            ally: true,
                          })
                        }
                      >
                        {_.truncate(player.name, { length: 18 })}
                      </Menu.Item>
                    ))}
                  </Menu.Dropdown>
                </Menu>
              )}

              <Button
                variant='subtle'
                size='xs'
                rightSection={<IconBat size={14} />}
                color={props.encounter.color}
                onClick={() => {
                  selectContent<Creature>(
                    'creature',
                    (option) => {
                      changeCombatants({
                        type: 'ADD',
                        data: option,
                        ally: false,
                      });
                    },
                    {
                      showButton: true,
                      groupBySource: true,
                      zIndex: 400,
                    }
                  );
                }}
              >
                Add Creature
              </Button>
              <Button
                variant='subtle'
                size='xs'
                rightSection={<IconCylinder size={14} />}
                color={props.encounter.color}
                onClick={() => {
                  setOpenedAddCombatant(true);
                }}
              >
                Add Custom
              </Button>
            </Group>
            <Box>
              {displayDifficulty(combatants) && (
                <Badge
                  variant='dot'
                  color={difficulty.color}
                  size='lg'
                  styles={{
                    root: {
                      textTransform: 'initial',
                      fontSize: '0.6rem',
                    },
                  }}
                >
                  {difficulty.status} ({difficulty.xp} XP)
                </Badge>
              )}
            </Box>
          </Group>
        </Box>
        <ScrollArea
          p={8}
          style={{
            backgroundColor: `rgb(37, 38, 43)`,
            borderBottomLeftRadius: 10,
            borderBottomRightRadius: 10,
            border: '1px solid #373A40',
            borderTop: 'none',
            height: props.panelHeight - 50,
          }}
        >
          <Stack gap={15}>
            {combatants
              .sort((a, b) => {
                let aI = a.initiative;
                let bI = b.initiative;
                if (aI === undefined || isNaN(aI)) aI = undefined;
                if (bI === undefined || isNaN(bI)) bI = undefined;

                if (aI === undefined) return -1;
                if (bI === undefined) return 1;

                if (aI === bI) {
                  // Enemy win ties
                  if (a.ally && !b.ally) {
                    return 1;
                  } else if (!a.ally && b.ally) {
                    return -1;
                  } else {
                    return a._id.localeCompare(b._id);
                  }
                } else {
                  return bI - aI;
                }
              })
              .map((combatant) => (
                <CombatantCard
                  key={combatant._id}
                  combatant={combatant}
                  computed={getComputedData(combatant)}
                  // Returning updated populated entity data, will trigger update of the combatant
                  updateEntity={(input) => {
                    let entity = _.cloneDeep(input);

                    // If health changes, confirm and update entity with new changes
                    if (entity.hp_current !== combatant.data.hp_current) {
                      const computed = getComputedData(combatant);
                      if (computed) {
                        const result = confirmHealth(`${entity.hp_current}`, computed.maxHp, combatant.data);

                        if (result) {
                          entity.hp_current = result.entity.hp_current;
                          entity.details = {
                            ...entity.details,
                            conditions: result.entity.details?.conditions ?? [],
                          };
                          entity.meta_data = {
                            ...entity.meta_data,
                            reset_hp: false,
                          };
                        }
                      }
                    }

                    if (combatant.type === 'CHARACTER') {
                      // Send remote update to change character
                      makeRequest('update-character', {
                        ...(entity as Character),
                        id: combatant.character!,
                      });
                    } else if (combatant.type === 'CREATURE') {
                      updateCombatant({
                        ...combatant,
                        creature: {
                          ...(entity as Creature),
                        },
                      });
                    }
                  }}
                  // Update the initiative
                  updateInitiative={(init) => {
                    updateCombatant({
                      ...combatant,
                      initiative: init,
                    });
                  }}
                  // Remove the combatant
                  onRemove={() =>
                    changeCombatants({
                      type: 'REMOVE',
                      data: combatant,
                    })
                  }
                />
              ))}
            {combatants.length === 0 && (
              <Stack mt={40} gap={10}>
                <Text ta='center' c='gray.6' fz='sm' fs='italic'>
                  No combatants found. Go add some!
                </Text>
              </Stack>
            )}
          </Stack>
        </ScrollArea>
      </Stack>
      {openedAddCombatant && (
        <CreateCombatantModal
          opened={true}
          onComplete={async (combatant) => {
            console.log(combatant);
            changeCombatants({
              type: 'ADD',
              data: combatant.creature!,
              ally: combatant.ally,
            });
            setOpenedAddCombatant(false);
          }}
          onCancel={() => {
            setOpenedAddCombatant(false);
          }}
        />
      )}
    </Box>
  );
}

function CombatantCard(props: {
  combatant: PopulatedCombatant;
  computed?: {
    id: number;
    type: 'character' | 'creature';
    ac: number;
    fort: number;
    reflex: number;
    will: number;
    maxHp: number;
  };
  updateInitiative: (init: number) => void;
  updateEntity: (entity: LivingEntity) => void;
  onRemove: () => void;
}) {
  const isPhone = useMediaQuery(phoneQuery());
  const { hovered, ref } = useHover();

  const [_drawer, openDrawer] = useRecoilState(drawerState);

  // Initiative

  const [initiative, setInitiative] = useState<number | null>(props.combatant.initiative ?? null);
  const initiativeRef = useRef<HTMLInputElement>(null);

  const handleInitiativeSubmit = () => {
    if (initiative !== null) {
      initiativeRef.current?.blur();
      props.updateInitiative(initiative);
    }
  };

  // Update initiative when it changes in the combatant
  useEffect(() => {
    if (props.combatant.initiative !== undefined && props.combatant.initiative !== initiative) {
      setInitiative(props.combatant.initiative);
    }
  }, [props.combatant.initiative]);

  // Health

  const [health, setHealth] = useState<string | undefined>();
  const healthRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (props.combatant.data) {
      const currentHealth =
        props.combatant.data.hp_current === undefined ? props.computed?.maxHp ?? 0 : props.combatant.data.hp_current;
      setHealth(`${currentHealth}`);
    }
  }, [props.combatant, props.computed]);

  const handleHealthSubmit = () => {
    const inputHealth = health ?? '0';
    let result = -1;
    try {
      result = evaluate(inputHealth);
    } catch (e) {
      result = parseInt(inputHealth);
    }
    if (isNaN(result)) result = 0;
    result = Math.floor(result);
    if (result < 0) result = 0;
    if (props.computed && result > props.computed.maxHp) result = props.computed.maxHp;

    props.updateEntity({
      ...props.combatant.data,
      hp_current: result,
    });

    setHealth(`${result}`);
    healthRef.current?.blur();
  };

  return (
    <Group
      wrap='nowrap'
      gap={10}
      style={{
        position: 'relative',
      }}
    >
      <NumberInput
        ref={initiativeRef}
        variant='filled'
        w={70}
        size='md'
        placeholder='Init.'
        value={initiative ?? undefined}
        onChange={(val) => {
          setInitiative(parseInt(`${val}`));
        }}
        onBlur={handleInitiativeSubmit}
        onKeyDown={getHotkeyHandler([
          ['mod+Enter', handleInitiativeSubmit],
          ['Enter', handleInitiativeSubmit],
        ])}
      />
      <Group
        ref={ref}
        wrap='nowrap'
        w={`min(60dvw, 320px)`}
        p={5}
        style={(t) => ({
          backgroundColor: hovered ? t.colors.dark[5] : 'transparent',
          borderRadius: t.radius.md,
          cursor: 'pointer',
          position: 'relative',
        })}
        onClick={() => {
          if (props.combatant.type === 'CHARACTER') {
            window.open(`/sheet/${props.combatant.character}`, '_blank');
          } else if (props.combatant.type === 'CREATURE') {
            openDrawer({
              type: 'creature',
              data: {
                STORE_ID: getCombatantStoreID(props.combatant),
                creature: props.combatant.creature!,
                zIndex: 495,
                updateCreature: (creature: Creature) => {
                  props.updateEntity(creature);
                },
              },
            });
          }
        }}
      >
        <Group
          gap={2}
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
          }}
        >
          <Text size={'10px'} fw={400} c='dimmed' fs='italic'>
            Lvl. {props.combatant.data.level}
          </Text>
          <ActionIcon size='sm' variant='transparent' radius={100} color='dark.3' onClick={() => {}}>
            {props.combatant.ally ? (
              <IconAtom2Filled size='0.9rem' stroke={1} />
            ) : (
              <IconSword size='1.0rem' stroke={2} />
            )}
          </ActionIcon>
        </Group>

        {/* <Avatar
          src={props.combatant.data.details?.image_url}
          radius='xl'
          styles={{
            image: {
              objectFit: 'contain',
            },
          }}
        /> */}
        <DisplayIcon
          strValue={props.combatant.data.details?.image_url}
          width={40}
          iconStyles={{
            objectFit: 'contain',
          }}
        />

        <Box pr={5} style={{ flex: 1 }}>
          <Text size='sm' fw={600} span>
            {props.combatant.data.name}
          </Text>

          {props.computed && (
            <Group gap={5}>
              <Text fz='xs' c='gray.6'>
                {props.computed.ac} AC
              </Text>
              <Text fz='xs' c='gray.7'>
                |
              </Text>
              <Text fz='xs' c='gray.6'>
                Fort. {sign(props.computed.fort)},
              </Text>
              <Text fz='xs' c='gray.6'>
                Ref. {sign(props.computed.reflex)},
              </Text>
              <Text fz='xs' c='gray.6'>
                Will {sign(props.computed.will)}
              </Text>
            </Group>
          )}
        </Box>
      </Group>
      {!isPhone && (
        <TextInput
          ref={healthRef}
          variant='filled'
          size='md'
          w={120}
          placeholder='HP'
          value={health}
          onChange={(e) => {
            setHealth(e.target.value);
          }}
          onBlur={handleHealthSubmit}
          onKeyDown={getHotkeyHandler([
            ['mod+Enter', handleHealthSubmit],
            ['Enter', handleHealthSubmit],
          ])}
          rightSection={
            <Group>
              <Text>/</Text>
              <Text>{props.computed?.maxHp}</Text>
            </Group>
          }
          rightSectionWidth={60}
        />
      )}
      {!isPhone && (
        <ScrollArea h={40} scrollbars='y'>
          <ConditionPills
            id={getCombatantStoreID(props.combatant)}
            entity={props.combatant.data}
            setEntity={(call) => {
              const result = setterOrUpdaterToValue(call, props.combatant.data);

              props.updateEntity({
                ...props.combatant.data,
                details: {
                  ...props.combatant.data.details,
                  conditions: result?.details?.conditions ?? [],
                },
              });
            }}
            groupProps={{
              w: 225,
            }}
          />
        </ScrollArea>
      )}

      <ActionIcon
        size='sm'
        variant='light'
        radius={100}
        color='gray'
        aria-label='Remove Combatant'
        onClick={props.onRemove}
        style={{
          position: 'absolute',
          top: '50%',
          right: 0,
          transform: 'translate(-50%, -50%)',
        }}
      >
        <IconX size='1.5rem' stroke={2} />
      </ActionIcon>
    </Group>
  );
}

async function computeCombatants(combatants: PopulatedCombatant[]) {
  const content = await fetchContentPackage(undefined, { fetchSources: false, fetchCreatures: false });

  async function computeCombatant(combatant: PopulatedCombatant): Promise<{
    _id: string;
    id: number;
    type: 'character' | 'creature';
    ac: number;
    fort: number;
    reflex: number;
    will: number;
    maxHp: number;
  }> {
    if (combatant.type === 'CHARACTER') {
      return {
        _id: combatant._id,
        id: combatant.data.id!,
        type: 'character',
        ac: combatant.data.meta_data?.calculated_stats?.ac ?? 10,
        fort: combatant.data.meta_data?.calculated_stats?.profs?.SAVE_FORT?.total ?? 0,
        reflex: combatant.data.meta_data?.calculated_stats?.profs?.SAVE_REFLEX?.total ?? 0,
        will: combatant.data.meta_data?.calculated_stats?.profs?.SAVE_WILL?.total ?? 0,
        maxHp: combatant.data.meta_data?.calculated_stats?.hp_max ?? 0,
      };
    } else if (combatant.type === 'CREATURE') {
      const creature = _.cloneDeep(combatant.data) as Creature;

      // Variable store ID
      const STORE_ID = getCombatantStoreID(combatant);

      await executeCreatureOperations(STORE_ID, creature, content);
      // Apply conditions after everything else
      applyConditions(STORE_ID, creature.details?.conditions ?? []);

      const maxHealth = getFinalHealthValue(STORE_ID);
      const ac = getFinalAcValue(STORE_ID, getBestArmor(STORE_ID, creature.inventory)?.item);
      const fort = getFinalProfValue(STORE_ID, 'SAVE_FORT');
      const reflex = getFinalProfValue(STORE_ID, 'SAVE_REFLEX');
      const will = getFinalProfValue(STORE_ID, 'SAVE_WILL');

      return {
        _id: combatant._id,
        id: creature.id,
        type: 'creature',
        ac: ac,
        fort: parseInt(fort),
        reflex: parseInt(reflex),
        will: parseInt(will),
        maxHp: maxHealth,
      };
    } else {
      return {
        _id: '',
        id: -1,
        type: 'character',
        ac: 10,
        fort: 0,
        reflex: 0,
        will: 0,
        maxHp: 0,
      };
    }
  }

  return await Promise.all(combatants.map(computeCombatant));
}

function calculateDifficulty(encounter: Encounter, combatants: PopulatedCombatant[]) {
  const alliesInEncounter = combatants.filter((c) => c.ally);
  const partyLevel = encounter.meta_data.party_level ?? _.mean(alliesInEncounter.map((p) => p.data.level));
  const partySize = encounter.meta_data.party_size ?? alliesInEncounter.length;

  let xpBudget = 0;
  for (const entity of combatants) {
    if (entity.ally) {
      continue;
    }
    switch (entity.data.level - partyLevel) {
      case -4:
        xpBudget += 10;
        break;
      case -3:
        xpBudget += 15;
        break;
      case -2:
        xpBudget += 20;
        break;
      case -1:
        xpBudget += 30;
        break;
      case 0:
        xpBudget += 40;
        break;
      case 1:
        xpBudget += 60;
        break;
      case 2:
        xpBudget += 80;
        break;
      case 3:
        xpBudget += 120;
        break;
      case 4:
        xpBudget += 160;
        break;
      default:
        if (entity.data.level > partyLevel) {
          // greater than +4
          xpBudget += (entity.data.level - partyLevel) * 40;
        } else if (entity.data.level < partyLevel) {
          // less than -4
          xpBudget += 0;
        }
        break;
    }
  }

  let partySizeDiff = partySize - 4;

  let difficulty;
  let color: MantineColor = 'gray';
  if (xpBudget >= 200 + partySizeDiff * 40) {
    // 200+ is impossible
    difficulty = 'IMPOSSIBLE';
    color = 'dark';
  } else if (xpBudget >= 140 + partySizeDiff * 40) {
    // 140-199 is extreme
    difficulty = 'Extreme';
    color = 'red';
  } else if (xpBudget >= 100 + partySizeDiff * 30) {
    // 100-139 is severe
    difficulty = 'Severe';
    color = 'orange';
  } else if (xpBudget >= 70 + partySizeDiff * 20) {
    // 70-99 is moderate
    difficulty = 'Moderate';
    color = 'yellow';
  } else if (xpBudget >= 50 + partySizeDiff * 15) {
    // 50-69 is low
    difficulty = 'Low';
    color = 'green';
  } else {
    // 0-50 is trivial
    difficulty = 'Trivial';
    color = 'blue';
  }

  return {
    status: difficulty,
    color: color,
    xp: xpBudget,
  };
}

export function getCombatantStoreID(combatant: Combatant) {
  if (combatant.type === 'CHARACTER') {
    return `CHARACTER_${combatant._id}`;
  } else if (combatant.type === 'CREATURE') {
    return `CREATURE_${combatant._id}`;
  } else {
    return '';
  }
}
