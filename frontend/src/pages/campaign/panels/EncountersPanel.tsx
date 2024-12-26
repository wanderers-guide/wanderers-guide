import { drawerState } from '@atoms/navAtoms';
import ConditionPill from '@common/ConditionPill';
import { EllipsisText } from '@common/EllipsisText';
import { Icon } from '@common/Icon';
import { selectContent } from '@common/select/SelectContent';
import { applyConditions, compiledConditions } from '@conditions/condition-handler';
import { GUIDE_BLUE } from '@constants/data';
import { fetchContentPackage } from '@content/content-store';
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
import { executeCreatureOperations } from '@operations/operation-controller';
import { confirmHealth } from '@pages/character_sheet/living-entity-utils';
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
import { Campaign, Character, Creature, Encounter, LivingEntity } from '@typing/content';
import { isPhoneSized, phoneQuery, usePhoneSized } from '@utils/mobile-responsive';
import { sign } from '@utils/numbers';
import { convertToSetEntity, isCharacter, isCreature, setterOrUpdaterToValue } from '@utils/type-fixing';
import useRefresh from '@utils/use-refresh';
import { getFinalAcValue, getFinalHealthValue, getFinalProfValue } from '@variables/variable-display';
import _ from 'lodash-es';
import { evaluate } from 'mathjs';
import { useEffect, useRef, useState } from 'react';
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

  const defaultEncounter: Encounter = {
    id: -1,
    created_at: '',
    user_id: '',
    //
    name: 'Combat',
    icon: 'notebook',
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
                aria-label={`Encounter Settings`}
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
            // openContextModal({
            //   modal: 'updateEncounter',
            //   title: <Title order={3}>Update Encounter</Title>,
            //   innerProps: {
            //     encounter: encounter,
            //     onUpdate: (name: string, icon: string, color: string) => {
            //       if (!props.entity) return;
            //       const newPages = _.cloneDeep(pages);
            //       newPages[index] = {
            //         ...newPages[index],
            //         name: name,
            //         icon: icon,
            //         color: color,
            //       };
            //       props.setEntity({
            //         ...props.entity,
            //         notes: {
            //           ...props.entity.notes,
            //           pages: newPages,
            //         },
            //       });
            //     },
            //     onDelete: () => {
            //       if (!props.entity) return;
            //       const newPages = _.cloneDeep(pages);
            //       newPages.splice(index, 1);
            //       props.setEntity({
            //         ...props.entity,
            //         notes: {
            //           ...props.entity.notes,
            //           pages: newPages,
            //         },
            //       });
            //       setActiveTab(`0`);
            //     },
            //   },
            //   zIndex: props.zIndex,
            // });
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

interface Combatant extends LivingEntity {
  _id: string;
}

function EncounterView(props: {
  encounter: Encounter;
  setEncounter: (encounter: Encounter) => void;
  players?: Character[];
  panelHeight: number;
}) {
  const [initiative, setInitiative] = useState<Map<string, number>>(new Map());

  /**
   * Get the combatants from the encounter list
   * @param list - The list of combatants as player IDs or Creatures
   * @returns - The list of combatants as Combatant objects
   */
  const getCombatants = (list: (number | Creature)[]): Combatant[] => {
    return (
      list
        .map((c) => {
          if (_.isNumber(c)) {
            return props.players?.find((p) => p.id === c);
          } else {
            return c;
          }
        })
        .filter((c) => c !== undefined) as LivingEntity[]
    ).map((e) => {
      return {
        ...e,
        _id: crypto.randomUUID(),
      };
    });
  };

  /**
   * Update the encounter with a new combatant
   * @param combatant - The combatant to add or remove
   * @param change - 'ADD' or 'REMOVE'
   * @returns - The updated encounter
   */
  const updateCombatants = (entity: LivingEntity | Combatant, change: 'ADD' | 'REMOVE') => {
    const newEncounter = _.cloneDeep(props.encounter);

    if (change === 'ADD') {
      if (isCharacter(entity)) {
        newEncounter.combatants.list.push(entity.id);
      } else if (isCreature(entity)) {
        newEncounter.combatants.list.push(entity);
      }
    } else if (change === 'REMOVE') {
      // @ts-ignore
      const id = entity._id ?? entity.id;

      newEncounter.combatants.list = newEncounter.combatants.list.filter((c) => {
        if (_.isNumber(c)) {
          return c !== id;
        } else {
          return c.id !== id;
        }
      });
    }

    // Update party size and level
    const alliesInEncounter = getCombatants(newEncounter.combatants.list).filter((c) => isAllyCombatant(c));
    const partyLevel = _.mean(alliesInEncounter.map((p) => p.level));
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
   * Display the difficulty badge if there are both allies and enemies
   * @param combatants - The list of combatants
   * @returns - Whether to display the difficulty badge
   */
  const displayDifficulty = (combatants: Combatant[]): boolean => {
    if (combatants.length === 0) return false;
    // Display difficulty if there are both allies and enemies
    return combatants.some((c) => isAllyCombatant(c)) && combatants.some((c) => !isAllyCombatant(c));
  };

  const combatants = getCombatants(props.encounter.combatants.list);

  const { data: computedData } = useQuery({
    queryKey: [
      `computed-combatants`,
      {
        combatants: combatants.map((c) => {
          // Delete _id to prevent infinite loop
          // @ts-ignore
          delete c._id;
          return c;
        }),
      },
    ],
    queryFn: async () => {
      if (combatants.length === 0) return [];
      console.log('Computing combatants');
      return await computeCombatants(combatants);
    },
    enabled: combatants.length > 0,
  });

  const playersToAdd =
    props.players?.filter((p) => {
      return !props.encounter.combatants.list.find((c) => {
        if (_.isNumber(c)) {
          return c === p.id;
        } else {
          // Only players will have numbers, no need to check on creatures
          return false;
        }
      });
    }) ?? [];

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
                      <Menu.Item key={index} value={`${player.id}`} onClick={() => updateCombatants(player, 'ADD')}>
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
                      updateCombatants(option, 'ADD');
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
                let aI = initiative.get(a._id);
                let bI = initiative.get(b._id);
                if (aI === undefined || isNaN(aI)) aI = undefined;
                if (bI === undefined || isNaN(bI)) bI = undefined;

                if (aI === undefined) return -1;
                if (bI === undefined) return 1;

                if (aI === bI) {
                  // Creatures win ties
                  if (isCharacter(a) && isCreature(b)) {
                    return 1;
                  } else if (isCreature(a) && isCharacter(b)) {
                    return -1;
                  } else {
                    return a.name.localeCompare(b.name);
                  }
                } else {
                  return bI - aI;
                }
              })
              .map((combatant) => (
                <CombatantCard
                  key={combatant._id}
                  combatant={combatant}
                  computed={computedData?.find((d) => {
                    if (isCharacter(combatant)) {
                      return d._id === combatant._id && d.type === 'character';
                    } else if (isCreature(combatant)) {
                      return d._id === combatant._id && d.type === 'creature';
                    } else {
                      return false;
                    }
                  })}
                  updateHealth={(hp) => {}}
                  initiative={initiative.get(combatant._id) ?? null}
                  updateInitiative={(init) => {
                    setInitiative((i) => {
                      i.set(combatant._id, init);
                      return new Map(i);
                    });
                  }}
                  onRemove={() => updateCombatants(combatant, 'REMOVE')}
                />
              ))}
          </Stack>
        </ScrollArea>
      </Stack>
    </Box>
  );
}

function CombatantCard(props: {
  combatant: Combatant;
  computed?: {
    id: number;
    type: 'character' | 'creature';
    ac: number;
    fort: number;
    reflex: number;
    will: number;
    maxHp: number;
  };
  initiative: number | null;
  updateHealth: (hp: number) => void;
  updateInitiative: (init: number) => void;
  onRemove: () => void;
}) {
  const isPhone = useMediaQuery(phoneQuery());
  const { hovered, ref } = useHover();

  const [_drawer, openDrawer] = useRecoilState(drawerState);

  // Initiative

  const [initiative, setInitiative] = useState<number | null>(props.initiative);
  const initiativeRef = useRef<HTMLInputElement>(null);

  const handleInitiativeSubmit = () => {
    if (initiative !== null) {
      initiativeRef.current?.blur();
      props.updateInitiative(initiative);
    }
  };

  // Health

  const [health, setHealth] = useState<string | undefined>();
  const healthRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (props.combatant) {
      const currentHealth =
        props.combatant.hp_current === undefined ? props.computed?.maxHp ?? 0 : props.combatant.hp_current;
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

    props.updateHealth(result);

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
          if (isCharacter(props.combatant)) {
            window.open(`/sheet/${props.combatant.id}`, '_blank');
          } else if (isCreature(props.combatant)) {
            openDrawer({
              type: 'creature',
              data: { id: props.combatant.id, zIndex: 495 },
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
            Lvl. {props.combatant.level}
          </Text>
          <ActionIcon size='sm' variant='transparent' radius={100} color='dark.3' onClick={() => {}}>
            {isAllyCombatant(props.combatant) ? (
              <IconAtom2Filled size='0.9rem' stroke={1} />
            ) : (
              <IconSword size='1.0rem' stroke={2} />
            )}
          </ActionIcon>
        </Group>

        <Avatar
          src={props.combatant.details?.image_url}
          radius='xl'
          styles={{
            image: {
              objectFit: 'contain',
            },
          }}
        />
        <Box pr={5} style={{ flex: 1 }}>
          <Text size='sm' fw={600} span>
            {props.combatant.name}
          </Text>

          {props.computed && (
            <Group gap={5}>
              <Text fz='xs'>{props.computed.ac} AC</Text>
              <Text fz='xs' c='dimmed'>
                |
              </Text>
              <Text fz='xs'>Fort. {sign(props.computed.fort)},</Text>
              <Text fz='xs'>Ref. {sign(props.computed.reflex)},</Text>
              <Text fz='xs'>Will {sign(props.computed.will)}</Text>
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
          <Group gap={5} justify='center'>
            {compiledConditions(props.combatant?.details?.conditions ?? []).map((condition, index) => (
              <ConditionPill key={index} text={condition.name} amount={condition.value} onClick={() => {}} />
            ))}
          </Group>
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

async function computeCombatants(combatants: Combatant[]) {
  const content = await fetchContentPackage(undefined, { fetchSources: false, fetchCreatures: false });

  async function computeCombatant(combatant: Combatant): Promise<{
    _id: string;
    id: number;
    type: 'character' | 'creature';
    ac: number;
    fort: number;
    reflex: number;
    will: number;
    maxHp: number;
  }> {
    if (isCharacter(combatant)) {
      return {
        _id: combatant._id,
        id: combatant.id,
        type: 'character',
        ac: combatant.meta_data?.calculated_stats?.ac ?? 10,
        fort: combatant.meta_data?.calculated_stats?.profs?.SAVE_FORT?.total ?? 0,
        reflex: combatant.meta_data?.calculated_stats?.profs?.SAVE_REFLEX?.total ?? 0,
        will: combatant.meta_data?.calculated_stats?.profs?.SAVE_WILL?.total ?? 0,
        maxHp: combatant.meta_data?.calculated_stats?.hp_max ?? 0,
      };
    } else if (isCreature(combatant)) {
      let creature = _.cloneDeep(combatant);

      // Variable store ID
      const STORE_ID = `CREATURE_${creature._id}`;

      await executeCreatureOperations(STORE_ID, creature, content);
      // Apply conditions after everything else
      applyConditions(STORE_ID, creature.details?.conditions ?? []);

      const maxHealth = getFinalHealthValue(STORE_ID);
      const ac = getFinalAcValue(STORE_ID, getBestArmor(STORE_ID, creature.inventory)?.item);
      const fort = getFinalProfValue(STORE_ID, 'SAVE_FORT');
      const reflex = getFinalProfValue(STORE_ID, 'SAVE_REFLEX');
      const will = getFinalProfValue(STORE_ID, 'SAVE_WILL');

      return {
        _id: creature._id,
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

function calculateDifficulty(encounter: Encounter, combatants: Combatant[]) {
  const alliesInEncounter = combatants.filter((c) => isAllyCombatant(c));
  const partyLevel = encounter.meta_data.party_level ?? _.mean(alliesInEncounter.map((p) => p.level));
  const partySize = encounter.meta_data.party_size ?? alliesInEncounter.length;

  let xpBudget = 0;
  for (const entity of combatants) {
    if (isAllyCombatant(entity)) {
      continue;
    }
    switch (entity.level - partyLevel) {
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
        if (entity.level > partyLevel) {
          // greater than +4
          xpBudget += (entity.level - partyLevel) * 40;
        } else if (entity.level < partyLevel) {
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

function isAllyCombatant(combatant: Combatant) {
  // @ts-ignore
  return isCharacter(combatant) || combatant._isAlly === true;
}
