import { characterState } from '@atoms/characterAtoms';
import { drawerState } from '@atoms/navAtoms';
import ConditionPill from '@common/ConditionPill';
import { EllipsisText } from '@common/EllipsisText';
import { Icon } from '@common/Icon';
import RichTextInput from '@common/rich_text_input/RichTextInput';
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
  IconBat,
  IconBrandFunimation,
  IconCheck,
  IconCylinder,
  IconDownload,
  IconPlus,
  IconSettings,
  IconUser,
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
import { SetterOrUpdater, useRecoilState } from 'recoil';

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

function EncounterView(props: {
  encounter: Encounter;
  setEncounter: (encounter: Encounter) => void;
  players?: Character[];
  panelHeight: number;
}) {
  const combatants = props.encounter.combatants.list
    .map((combatant) => {
      if (_.isNumber(combatant)) {
        return props.players?.find((p) => p.id === combatant);
      } else {
        return combatant;
      }
    })
    .filter((c) => c !== undefined) as LivingEntity[];

  const { data: computedData } = useQuery({
    queryKey: [`computed-combatants`, { combatants: combatants }],
    queryFn: async () => {
      if (combatants.length === 0) return [];
      return await computeCombatants(combatants);
    },
  });

  const playersToAdd =
    props.players?.filter((p) => {
      return !props.encounter.combatants.list.find((c) => {
        if (_.isNumber(c)) {
          return c === p.id;
        } else {
          return c.id === p.id;
        }
      });
    }) ?? [];

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
                    <Menu.Item
                      key={index}
                      value={`${player.id}`}
                      onClick={() => {
                        const newEncounter = _.cloneDeep(props.encounter);
                        newEncounter.combatants.list.push(player.id);
                        props.setEncounter(newEncounter);
                      }}
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
                    const newEncounter = _.cloneDeep(props.encounter);
                    newEncounter.combatants.list.push(option);
                    props.setEncounter(newEncounter);
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
            <Button variant='subtle' size='xs' rightSection={<IconCylinder size={14} />} color={props.encounter.color}>
              Add Custom
            </Button>
          </Group>
        </Box>
        <Box
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
            {combatants.map((combatant, index) => (
              <CombatantCard
                key={index}
                combatant={combatant}
                computed={computedData?.find((d) => {
                  if (isCharacter(combatant)) {
                    return d.id === combatant.id && d.type === 'character';
                  } else if (isCreature(combatant)) {
                    return d.id === combatant.id && d.type === 'creature';
                  } else {
                    return false;
                  }
                })}
                updateHealth={(hp) => {}}
              />
            ))}
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
}

function CombatantCard(props: {
  combatant: LivingEntity;
  computed?: {
    id: number;
    type: 'character' | 'creature';
    ac: number;
    fort: number;
    reflex: number;
    will: number;
    maxHp: number;
  };
  updateHealth: (hp: number) => void;
}) {
  const isPhone = useMediaQuery(phoneQuery());
  const { hovered, ref } = useHover();

  const [_drawer, openDrawer] = useRecoilState(drawerState);

  const [health, setHealth] = useState<string | undefined>();
  const healthRef = useRef<HTMLInputElement>(null);

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
    <Group wrap='nowrap' gap={10}>
      <NumberInput variant='filled' w={70} size='md' />
      <Group
        ref={ref}
        wrap='nowrap'
        w={`min(60dvw, 320px)`}
        p={5}
        style={(t) => ({
          backgroundColor: hovered ? t.colors.dark[5] : 'transparent',
          borderRadius: t.radius.md,
          cursor: 'pointer',
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
          <Text size='sm' fw={600}>
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
    </Group>
  );
}

async function computeCombatants(combatants: LivingEntity[]) {
  const content = await fetchContentPackage(undefined, { fetchSources: false, fetchCreatures: false });

  async function computeCombatant(combatant: LivingEntity): Promise<{
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
      const STORE_ID = `CREATURE_${creature.id}`;

      await executeCreatureOperations(STORE_ID, creature, content);
      // Apply conditions after everything else
      applyConditions(STORE_ID, creature.details?.conditions ?? []);

      const maxHealth = getFinalHealthValue(STORE_ID);
      const ac = getFinalAcValue(STORE_ID, getBestArmor(STORE_ID, creature.inventory)?.item);
      const fort = getFinalProfValue(STORE_ID, 'SAVE_FORT');
      const reflex = getFinalProfValue(STORE_ID, 'SAVE_REFLEX');
      const will = getFinalProfValue(STORE_ID, 'SAVE_WILL');

      return {
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
