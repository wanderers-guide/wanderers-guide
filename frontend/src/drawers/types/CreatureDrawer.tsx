import { drawerState, drawerZIndexState } from '@atoms/navAtoms';
import BlurBox from '@common/BlurBox';
import { DisplayIcon } from '@common/IconDisplay';
import StatBlockSection from '@common/StatBlockSection';
import { applyConditions } from '@conditions/condition-handler';
import { fetchContentById, fetchContentPackage } from '@content/content-store';
import { getMetadataOpenedDict } from '@drawers/drawer-utils';
import { addExtraItems, applyEquipmentPenalties, checkBulkLimit } from '@items/inv-utils';
import {
  Title,
  Loader,
  Group,
  Stack,
  Box,
  ActionIcon,
  Button,
  Popover,
  SimpleGrid,
  Text,
  useMantineTheme,
  HoverCard,
} from '@mantine/core';
import { useDebouncedValue, useDidUpdate, useHover, useLocalStorage } from '@mantine/hooks';
import { CreateCreatureModal } from '@modals/CreateCreatureModal';
import { executeCreatureOperations } from '@operations/operation-controller';
import { convertKeyToBasePrefix } from '@operations/operation-utils';
import { DisplayOperationResult } from '@pages/character_builder/CharBuilderCreation';
import { confirmHealth, getEntityLevel, handleRest } from '@pages/character_sheet/living-entity-utils';
import CreatureAbilitiesPanel from '@pages/character_sheet/panels/CreatureAbilitiesPanel';
import CreatureDetailsPanel from '@pages/character_sheet/panels/CreatureDetailsPanel';
import InventoryPanel from '@pages/character_sheet/panels/InventoryPanel';
import NotesPanel from '@pages/character_sheet/panels/NotesPanel';
import SkillsActionsPanel from '@pages/character_sheet/panels/SkillsActionsPanel';
import SpellsPanel from '@pages/character_sheet/panels/SpellsPanel';
import ArmorSection from '@pages/character_sheet/sections/ArmorSection';
import AttributeSection from '@pages/character_sheet/sections/AttributeSection';
import HealthSection from '@pages/character_sheet/sections/HealthSection';
import { AltSpeedSection } from '@pages/character_sheet/sections/SpeedSection';
import {
  IconX,
  IconLayoutGrid,
  IconLayoutList,
  IconBadgesFilled,
  IconCaretLeftRight,
  IconBackpack,
  IconFlare,
  IconNotebook,
  IconListDetails,
  IconDualScreen,
  IconEdit,
  IconZzz,
  IconAlignBoxLeftMiddle,
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { Creature, Inventory, Trait } from '@typing/content';
import { OperationCreatureResultPackage } from '@typing/operations';
import { findCreatureTraits } from '@utils/creature';
import { getDcForLevel } from '@utils/numbers';
import { toLabel } from '@utils/strings';
import { convertToSetEntity, isTruthy, setStateActionToValue } from '@utils/type-fixing';
import { getFinalHealthValue } from '@variables/variable-display';
import { useEffect, useRef, useState } from 'react';
import { useRecoilState } from 'recoil';

export const CREATURE_DRAWER_ZINDEX = 495;

export function CreatureDrawerTitle(props: { data: { id?: number; creature?: Creature } }) {
  const theme = useMantineTheme();
  const id = props.data.id;

  const { data: _creature } = useQuery({
    queryKey: [`find-creature-${id}`, { id }],
    queryFn: async ({ queryKey }) => {
      // @ts-ignore
      // eslint-disable-next-line
      const [_key, { id }] = queryKey;
      return await fetchContentById<Creature>('creature', id);
    },
    enabled: !!id,
  });
  const creature = props.data.creature ?? _creature;

  return (
    <>
      {creature && (
        <Group justify='space-between' wrap='nowrap'>
          <Group wrap='nowrap' gap={10}>
            <Box>
              <Title order={3}>{toLabel(creature.name)}</Title>
            </Box>
          </Group>
          <Text style={{ textWrap: 'nowrap' }}>Creature {getEntityLevel(creature)}</Text>
        </Group>
      )}
    </>
  );
}

export function CreatureDrawerContent(props: {
  data: {
    id?: number;
    creature?: Creature;
    STORE_ID?: string;
    showOperations?: boolean;
    updateCreature?: (creature: Creature) => void;
  };
  onMetadataChange?: (openedDict?: Record<string, string>) => void;
}) {
  const id = props.data.id;

  const [drawerData, setDrawerData] = useLocalStorage<{ view: 'BLOCK' | 'SHEET' }>({
    key: 'creature-drawer-view',
    defaultValue: {
      view: 'SHEET',
    },
  });

  const { data: content } = useQuery({
    queryKey: [`find-creature-details-${id}`, { id }],
    queryFn: async ({ queryKey }) => {
      // @ts-ignore
      // eslint-disable-next-line
      const [_key, { id }] = queryKey;

      if (id) {
        const _creature = await fetchContentById<Creature>('creature', id);
        setCreature(_creature);
      }

      const content = await fetchContentPackage(undefined, { fetchSources: false, fetchCreatures: false });
      return content;
    },
  });
  const [_drawer, openDrawer] = useRecoilState(drawerState);
  const theme = useMantineTheme();
  const [loading, setLoading] = useState(true);
  const [creature, setCreature] = useState<Creature | null>(props.data.creature ?? null);
  const [editingCreature, _setEditingCreature] = useState(false);
  const [drawerZIndex, setDrawerZIndex] = useRecoilState(drawerZIndexState);
  const toggleEditing = () => {
    if (editingCreature) {
      _setEditingCreature(false);
      setDrawerZIndex(CREATURE_DRAWER_ZINDEX);
    } else {
      _setEditingCreature(true);
      setDrawerZIndex(100);
    }
  };

  // Update creature when state changed
  const [debouncedCreature] = useDebouncedValue(creature, 100);
  useDidUpdate(() => {
    if (!debouncedCreature) return;
    props.data.updateCreature?.(debouncedCreature);
  }, [debouncedCreature]);

  const [openedSelectionPanel, setOpenedSelectionPanel] = useState(false);
  const [activeTab, setActiveTab] = useState(getMetadataOpenedDict().active_tab || 'main');

  // Track active tab
  useEffect(() => {
    props.onMetadataChange?.({
      active_tab: activeTab ?? '',
    });
  }, [activeTab]);

  // Panel dimensions
  const panelWidth = 400;
  const panelHeight = 650;

  // Variable store ID
  const STORE_ID = props.data.STORE_ID ?? `CREATURE_${creature?.id ?? 'UNKNOWN'}`;

  const [operationResults, setOperationResults] = useState<OperationCreatureResultPackage>();
  const executingOperations = useRef(false);
  useEffect(() => {
    if (!creature || !content || executingOperations.current) return;
    setTimeout(() => {
      if (!creature || !content || executingOperations.current) return;
      executingOperations.current = true;
      executeCreatureOperations(STORE_ID, creature, content).then((results) => {
        // Final execution pipeline:

        // Add the extra items to the inventory from variables
        addExtraItems(STORE_ID, content.items, creature, convertToSetEntity(setCreature));

        // Check bulk limits
        checkBulkLimit(STORE_ID, creature, convertToSetEntity(setCreature));

        // Apply armor/shield penalties
        applyEquipmentPenalties(STORE_ID, creature, convertToSetEntity(setCreature));

        // Apply conditions after everything else
        applyConditions(STORE_ID, creature.details?.conditions ?? []);
        if (creature.meta_data?.reset_hp !== false) {
          // To reset hp, we need to confirm health
          const maxHealth = getFinalHealthValue(STORE_ID);
          confirmHealth(`${maxHealth}`, maxHealth, creature, convertToSetEntity(setCreature));
        } else {
          // Because of the drained condition, let's confirm health
          const maxHealth = getFinalHealthValue(STORE_ID);
          confirmHealth(`${creature.hp_current}`, maxHealth, creature, convertToSetEntity(setCreature));
        }

        setOperationResults(results);
        executingOperations.current = false;

        setTimeout(() => {
          setLoading(false);
        }, 100);
      });
    }, 1);
  }, [creature, content]);

  // Inventory saving & management
  const getInventory = (creature: Creature | null) => {
    return (
      creature?.inventory ?? {
        coins: {
          cp: 0,
          sp: 0,
          gp: 0,
          pp: 0,
        },
        items: [],
      }
    );
  };
  const setInventory = (call: React.SetStateAction<Inventory>) => {
    // Update source immediately, needed for some item changes which close the drawer
    if (creature) {
      props.data.updateCreature?.({
        ...creature,
        inventory: setStateActionToValue(call, getInventory(creature)),
      });
    }
    // Update normal local state, will update source again after delay
    setCreature((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        inventory: setStateActionToValue(call, getInventory(creature)),
      };
    });
  };

  const setCreatureInstant = (call: React.SetStateAction<Creature | null>) => {
    // Update source immediately
    if (creature) {
      const newCreature = setStateActionToValue(call, creature);
      if (newCreature) {
        props.data.updateCreature?.(newCreature);
      }
    }
    // Update normal local state, will update source again after delay
    setCreature(call);
  };

  const saveSelectionChange = (path: string, value: string) => {
    setCreatureInstant((prev) => {
      if (!prev) return prev;
      const newSelections = { ...prev.operation_data?.selections };
      if (!value) {
        delete newSelections[path];
      } else {
        newSelections[path] = `${value}`;
      }
      return {
        ...prev,
        operation_data: {
          ...prev.operation_data,
          selections: newSelections,
        },
      };
    });
  };

  if (loading || !creature || !content) {
    return (
      <Loader
        type='bars'
        style={{
          position: 'absolute',
          top: '35%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />
    );
  }

  return (
    <Stack>
      {drawerData.view === 'BLOCK' ? (
        <Stack gap={10}>
          <Group gap={15}>
            <Box style={{ flex: 1 }}>
              <HealthSection id={STORE_ID} entity={creature} setEntity={convertToSetEntity(setCreature)} />
            </Box>
            {creature.details.image_url && (
              <BlurBox blur={10} h={111} pr='sm' pt='sm'>
                <DisplayIcon
                  strValue={creature.details.image_url}
                  width={90}
                  iconStyles={{
                    height: 90,
                  }}
                />
              </BlurBox>
            )}
          </Group>
          <StatBlockSection
            entity={creature}
            options={{
              hideName: true,
              hideHealth: true,
              hideImage: true,
            }}
          />

          {operationResults && (
            <CreatureOperationResults
              creature={creature}
              operationResults={operationResults}
              onSaveChanges={(path, value) => {
                saveSelectionChange(path, value);
              }}
            />
          )}
        </Stack>
      ) : (
        <Stack>
          <Stack>
            {activeTab === 'main' && (
              <Stack gap={15}>
                <Group gap={15}>
                  <Box style={{ flex: 1 }}>
                    <HealthSection id={STORE_ID} entity={creature} setEntity={convertToSetEntity(setCreature)} />
                  </Box>
                  {creature.details.image_url && (
                    <BlurBox blur={10} h={111} pr='sm' pt='sm'>
                      <DisplayIcon
                        strValue={creature.details.image_url}
                        width={90}
                        iconStyles={{
                          height: 90,
                        }}
                      />
                    </BlurBox>
                  )}
                </Group>
                <RecallKnowledgeSection entity={creature} traits={content.traits} />
                <AltSpeedSection id={STORE_ID} entity={creature} setEntity={convertToSetEntity(setCreature)} />
                <ArmorSection id={STORE_ID} inventory={getInventory(creature)} setInventory={setInventory} />
                <AttributeSection id={STORE_ID} entity={creature} setEntity={convertToSetEntity(setCreature)} />

                {operationResults && (
                  <CreatureOperationResults
                    creature={creature}
                    operationResults={operationResults}
                    onSaveChanges={(path, value) => {
                      saveSelectionChange(path, value);
                    }}
                  />
                )}
              </Stack>
            )}

            {activeTab === 'abilities' && (
              <CreatureAbilitiesPanel
                content={content}
                panelHeight={panelHeight}
                panelWidth={panelWidth}
                creature={creature}
                setCreature={setCreature}
              />
            )}

            {activeTab === 'skills-actions' && (
              <SkillsActionsPanel
                id={STORE_ID}
                entity={creature}
                content={content}
                panelHeight={panelHeight - 55}
                panelWidth={panelWidth}
                inventory={getInventory(creature)}
                setInventory={setInventory}
              />
            )}

            {activeTab === 'inventory' && (
              <InventoryPanel
                id={STORE_ID}
                entity={creature}
                content={content}
                panelHeight={panelHeight}
                panelWidth={panelWidth}
                inventory={getInventory(creature)}
                setInventory={setInventory}
              />
            )}

            {activeTab === 'spells' && (
              <SpellsPanel
                panelHeight={panelHeight}
                panelWidth={panelWidth}
                id={STORE_ID}
                entity={creature}
                setEntity={convertToSetEntity(setCreatureInstant)}
              />
            )}

            {activeTab === 'notes' && (
              <NotesPanel
                panelHeight={panelHeight}
                panelWidth={panelWidth}
                entity={creature}
                setEntity={convertToSetEntity(setCreature)}
              />
            )}

            {activeTab === 'details' && (
              <CreatureDetailsPanel
                id={STORE_ID}
                creature={creature}
                content={content}
                panelHeight={panelHeight}
                panelWidth={panelWidth}
              />
            )}

            <Box
              style={{
                zIndex: 1000,
                position: 'fixed',
                bottom: 20,
                right: 20,
              }}
            >
              <Popover
                position='top'
                shadow='md'
                withArrow
                opened={openedSelectionPanel}
                onChange={setOpenedSelectionPanel}
                zIndex={1000}
              >
                <Popover.Target>
                  <ActionIcon
                    size={55}
                    variant='filled'
                    radius={100}
                    aria-label='Panel Grid'
                    onClick={() => setOpenedSelectionPanel((o) => !o)}
                  >
                    {openedSelectionPanel ? (
                      <IconX size='2rem' stroke={2} />
                    ) : (
                      <IconLayoutGrid size='2rem' stroke={1.5} />
                    )}
                  </ActionIcon>
                </Popover.Target>
                <Popover.Dropdown w={'calc(min(95dvw, 430px))'}>
                  <Box>
                    <Stack>
                      <Button
                        leftSection={<IconLayoutList size='1.2rem' stroke={2} />}
                        variant={activeTab === 'main' ? 'filled' : 'outline'}
                        onClick={() => {
                          setActiveTab('main');
                          setOpenedSelectionPanel(false);
                        }}
                      >
                        Health, Conditions, Saves
                      </Button>
                      <SimpleGrid cols={2}>
                        <Button
                          leftSection={<IconCaretLeftRight size='1.2rem' stroke={2} />}
                          variant={activeTab === 'abilities' ? 'filled' : 'outline'}
                          onClick={() => {
                            setActiveTab('abilities');
                            setOpenedSelectionPanel(false);
                          }}
                        >
                          Abilities
                        </Button>
                        <Button
                          leftSection={<IconBadgesFilled size='1.2rem' stroke={2} />}
                          variant={activeTab === 'skills-actions' ? 'filled' : 'outline'}
                          onClick={() => {
                            setActiveTab('skills-actions');
                            setOpenedSelectionPanel(false);
                          }}
                        >
                          Skills
                        </Button>
                      </SimpleGrid>
                      <SimpleGrid cols={2}>
                        <Button
                          leftSection={<IconBackpack size='1.2rem' stroke={2} />}
                          variant={activeTab === 'inventory' ? 'filled' : 'outline'}
                          onClick={() => {
                            setActiveTab('inventory');
                            setOpenedSelectionPanel(false);
                          }}
                        >
                          Inventory
                        </Button>
                        <Button
                          leftSection={<IconFlare size='1.2rem' stroke={2} />}
                          variant={activeTab === 'spells' ? 'filled' : 'outline'}
                          onClick={() => {
                            setActiveTab('spells');
                            setOpenedSelectionPanel(false);
                          }}
                        >
                          Spells
                        </Button>
                      </SimpleGrid>
                      <SimpleGrid cols={2}>
                        <Button
                          leftSection={<IconNotebook size='1.2rem' stroke={2} />}
                          variant={activeTab === 'notes' ? 'filled' : 'outline'}
                          onClick={() => {
                            setActiveTab('notes');
                            setOpenedSelectionPanel(false);
                          }}
                        >
                          Notes
                        </Button>
                        <Button
                          leftSection={<IconListDetails size='1.2rem' stroke={2} />}
                          variant={activeTab === 'details' ? 'filled' : 'outline'}
                          onClick={() => {
                            setActiveTab('details');
                            setOpenedSelectionPanel(false);
                          }}
                        >
                          Details
                        </Button>
                      </SimpleGrid>
                    </Stack>
                  </Box>
                </Popover.Dropdown>
              </Popover>
            </Box>
          </Stack>
        </Stack>
      )}

      <Box
        style={{
          position: 'absolute',
          bottom: 0,
          width: '100%',
        }}
      >
        <Group justify='space-between' wrap='nowrap'>
          <Group wrap='nowrap' gap={15} mr={15}>
            <ActionIcon
              variant='light'
              color='cyan'
              radius='xl'
              aria-label='Edit Creature'
              style={{
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
              }}
              onClick={toggleEditing}
            >
              <IconEdit style={{ width: '70%', height: '70%' }} stroke={1.5} />
            </ActionIcon>
            <HoverCard shadow='md' openDelay={250} zIndex={1000} withinPortal>
              <HoverCard.Target>
                <ActionIcon
                  variant='light'
                  color='blue'
                  radius='xl'
                  aria-label='Rest Creature'
                  style={{
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                  }}
                  onClick={() => {
                    handleRest(STORE_ID, creature, convertToSetEntity(setCreature));
                  }}
                >
                  <IconZzz style={{ width: '70%', height: '70%' }} stroke={1.5} />
                </ActionIcon>
              </HoverCard.Target>
              <HoverCard.Dropdown py={5} px={10}>
                <Text c='gray.0' size='sm'>
                  Rest
                </Text>
              </HoverCard.Dropdown>
            </HoverCard>
            <HoverCard shadow='md' openDelay={250} zIndex={1000} withinPortal>
              <HoverCard.Target>
                {drawerData.view === 'BLOCK' ? (
                  <ActionIcon
                    variant='light'
                    color='yellow'
                    radius='xl'
                    aria-label='Switch View Mode'
                    style={{
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                    }}
                    onClick={() => {
                      setDrawerData({ view: 'SHEET' });
                    }}
                  >
                    <IconDualScreen style={{ width: '70%', height: '70%' }} stroke={1.5} />
                  </ActionIcon>
                ) : (
                  <ActionIcon
                    variant='light'
                    color='yellow'
                    radius='xl'
                    aria-label='Switch View Mode'
                    style={{
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                    }}
                    onClick={() => {
                      setDrawerData({ view: 'BLOCK' });
                    }}
                  >
                    <IconAlignBoxLeftMiddle style={{ width: '70%', height: '70%' }} stroke={1.5} />
                  </ActionIcon>
                )}
              </HoverCard.Target>
              <HoverCard.Dropdown py={5} px={10}>
                <Text c='gray.0' size='sm'>
                  {drawerData.view === 'BLOCK' ? 'Open Sheet View' : 'Open Stat Block View'}
                </Text>
              </HoverCard.Dropdown>
            </HoverCard>
          </Group>
        </Group>
        {editingCreature && (
          <CreateCreatureModal
            opened={editingCreature}
            editCreature={creature}
            onComplete={async (result) => {
              if (result) {
                setCreature(result);
                toggleEditing();
              }
            }}
            onCancel={() => {
              toggleEditing();
            }}
          />
        )}
      </Box>
    </Stack>
  );
}

function RecallKnowledgeSection(props: { entity: Creature; traits: Trait[] }) {
  const theme = useMantineTheme();

  return (
    <BlurBox blur={10}>
      <Box
        px='xs'
        py={10}
        style={{
          borderTopLeftRadius: theme.radius.md,
          borderTopRightRadius: theme.radius.md,
          position: 'relative',
        }}
        h='100%'
      >
        <Group justify='center' style={{ flexDirection: 'column' }} h='100%'>
          <RecallKnowledgeText entity={props.entity} traits={props.traits} />
        </Group>
      </Box>
    </BlurBox>
  );
}

export function RecallKnowledgeText(props: { entity: Creature; traits: Trait[] }) {
  const traits = findCreatureTraits(props.entity)
    .map((id) => props.traits.find((t) => t.id === id))
    .filter(isTruthy);
  const knowledgeSkillMap: Record<string, string> = {
    aberration: 'Occultism',
    animal: 'Nature',
    astral: 'Occultism',
    beast: 'Arcana or Nature',
    celestial: 'Religion',
    construct: 'Arcana or Crafting',
    dragon: 'Arcana',
    dream: 'Occultism',
    elemental: 'Arcana or Nature',
    ethereal: 'Occultism',
    fey: 'Nature',
    fiend: 'Religion',
    fungus: 'Nature',
    humanoid: 'Society',
    monitor: 'Religion',
    ooze: 'Occultism',
    plant: 'Nature',
    shade: 'Religion',
    spirit: 'Occultism',
    time: 'Occultism',
    undead: 'Religion',
  };
  const knowledgeTrait = traits.find((t) => {
    return !!knowledgeSkillMap[t.name.toLowerCase()];
  });
  const knowledgeSkill = knowledgeTrait ? knowledgeSkillMap[knowledgeTrait.name.toLowerCase()] : null;
  if (!knowledgeSkill) return null;

  return (
    <Text fz='xs' span>
      <Text fz='xs' fw={600} c='gray.4' span>
        Recall Knowledge
      </Text>{' '}
      (
      <Text fz='xs' fs='italic' span>
        {knowledgeTrait?.name.toLowerCase()}
        {props.entity.rarity !== 'COMMON' ? `, ${props.entity.rarity.toLowerCase()}` : ''}{' '}
      </Text>
      ) {knowledgeSkill} DC {getDcForLevel(getEntityLevel(props.entity), props.entity.rarity)}
    </Text>
  );
}

function CreatureOperationResults(props: {
  operationResults: OperationCreatureResultPackage;
  onSaveChanges: (path: string, value: string) => void;
  creature: Creature;
}) {
  return (
    <Stack gap={15} mb={50}>
      <DisplayOperationResult
        source={undefined}
        level={props.creature.level}
        results={props.operationResults.creatureResults}
        onChange={(path, value) => {
          props.onSaveChanges(`${convertKeyToBasePrefix('creatureResults')}_${path}`, value);
        }}
      />
      {props.operationResults.abilityResults.map((s, index) => (
        <DisplayOperationResult
          key={index}
          source={{
            ...s.baseSource,
            _select_uuid: `${s.baseSource.id}`,
            _content_type: 'ability-block',
          }}
          level={s.baseSource.level}
          results={s.baseResults}
          onChange={(path, value) => {
            props.onSaveChanges(`${convertKeyToBasePrefix('abilityResults', s.baseSource.id)}_${path}`, value);
          }}
        />
      ))}
      {props.operationResults.itemResults.map((s, index) => (
        <DisplayOperationResult
          key={index}
          source={{
            ...s.baseSource,
            _select_uuid: `${s.baseSource.id}`,
            _content_type: 'item',
          }}
          level={s.baseSource.level}
          results={s.baseResults}
          onChange={(path, value) => {
            props.onSaveChanges(`${convertKeyToBasePrefix('itemResults', s.baseSource.id)}_${path}`, value);
          }}
        />
      ))}
    </Stack>
  );
}
