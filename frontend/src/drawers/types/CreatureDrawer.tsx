import { drawerState } from '@atoms/navAtoms';
import { applyConditions } from '@conditions/condition-handler';
import { fetchContentById, fetchContentPackage } from '@content/content-store';
import { addExtraItems, checkBulkLimit } from '@items/inv-utils';
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
  Pill,
  useMantineTheme,
  Avatar,
} from '@mantine/core';
import { useDebouncedValue, useDidUpdate } from '@mantine/hooks';
import { executeCharacterOperations, executeCreatureOperations } from '@operations/operation-controller';
import { confirmHealth } from '@pages/character_sheet/living-entity-utils';
import CreatureDetailsPanel from '@pages/character_sheet/panels/CreatureDetailsPanel';
import DetailsPanel from '@pages/character_sheet/panels/DetailsPanel';
import InventoryPanel from '@pages/character_sheet/panels/InventoryPanel';
import ArmorSection from '@pages/character_sheet/sections/ArmorSection';
import AttributeSection from '@pages/character_sheet/sections/AttributeSection';
import EntityInfoSection from '@pages/character_sheet/sections/EntityInfoSection';
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
  IconPaw,
  IconNotes,
  IconBlockquote,
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { Creature } from '@typing/content';
import { OperationCharacterResultPackage, OperationCreatureResultPackage } from '@typing/operations';
import { VariableListStr } from '@typing/variables';
import { convertToSetEntity } from '@utils/type-fixing';
import { saveCalculatedStats } from '@variables/calculated-stats';
import { getFinalHealthValue } from '@variables/variable-display';
import { getAllAncestryTraitVariables, getVariable, setVariable } from '@variables/variable-manager';
import _ from 'lodash';
import { useEffect, useRef, useState } from 'react';
import { useRecoilState } from 'recoil';

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
            {creature?.details?.image_url && (
              <Avatar
                src={creature?.details?.image_url}
                alt='Creature Artwork'
                size={75}
                radius={75}
                variant='transparent'
                color='dark.3'
                bg={theme.colors.dark[6]}
              />
            )}

            <Box>
              <Title order={3}>{creature.name}</Title>
            </Box>
            <Box></Box>
          </Group>
          <Box>
            <Button size='compact-sm'>View</Button>
            {/* Sheet, Stat Block */}
          </Box>
        </Group>
      )}
    </>
  );
}

export function CreatureDrawerContent(props: {
  data: { id?: number; creature?: Creature; uuid?: string; showOperations?: boolean };
}) {
  const id = props.data.id;

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

  const [openedSelectionPanel, setOpenedSelectionPanel] = useState(false);
  const [activeTab, setActiveTab] = useState('main');

  // Panel dimensions
  const panelWidth = 400;
  const panelHeight = 500;

  // Variable store ID
  const STORE_ID = `CREATURE_${creature?.id}_${props.data.uuid}`;

  const [operationResults, setOperationResults] = useState<OperationCreatureResultPackage>();
  const executingOperations = useRef(false);
  useEffect(() => {
    if (!creature || !content || executingOperations.current) return;
    setTimeout(() => {
      if (!creature || !content || executingOperations.current) return;
      executingOperations.current = true;
      executeCreatureOperations(STORE_ID, creature, content).then((results) => {
        // Apply conditions after everything else
        applyConditions(STORE_ID, creature.details?.conditions ?? []);
        if (creature.meta_data?.reset_hp !== false) {
          // To reset hp, we need to confirm health
          confirmHealth(`${getFinalHealthValue(STORE_ID)}`, STORE_ID, creature, convertToSetEntity(setCreature));
        } else {
          // Because of the drained condition, let's confirm health
          confirmHealth(`${creature.hp_current}`, STORE_ID, creature, convertToSetEntity(setCreature));
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
  const setInventory = (updateInventory: any) => {
    setCreature((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        inventory:
          typeof updateInventory === 'function' && prev.inventory ? updateInventory(prev.inventory) : undefined,
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

  const languages = (getVariable<VariableListStr>(STORE_ID, 'LANGUAGE_IDS')?.value ?? []).map((langId) => {
    const lang = content.languages.find((lang) => `${lang.id}` === langId);
    return lang;
  });

  const traits = getAllAncestryTraitVariables(STORE_ID).map((v) => {
    const trait = content.traits.find((trait) => trait.id === v.value);
    return trait;
  });

  return (
    <Stack>
      <Stack>
        {activeTab === 'main' && (
          <Stack>
            {/* <EntityInfoSection id={STORE_ID} entity={creature} setEntity={convertToSetEntity(setCreature)} /> */}
            <HealthSection id={STORE_ID} entity={creature} setEntity={convertToSetEntity(setCreature)} />
            <AltSpeedSection id={STORE_ID} entity={creature} setEntity={convertToSetEntity(setCreature)} />
            <ArmorSection id={STORE_ID} inventory={getInventory(creature)} setInventory={setInventory} />
            <AttributeSection id={STORE_ID} entity={creature} setEntity={convertToSetEntity(setCreature)} />
          </Stack>
        )}

        {activeTab === 'inventory' && (
          <InventoryPanel
            content={content}
            panelHeight={panelHeight}
            panelWidth={panelWidth}
            inventory={getInventory(creature)}
            setInventory={setInventory}
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
                {openedSelectionPanel ? <IconX size='2rem' stroke={2} /> : <IconLayoutGrid size='2rem' stroke={1.5} />}
              </ActionIcon>
            </Popover.Target>
            <Popover.Dropdown w={'calc(min(100dvh, 430px))'}>
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
  );
}
