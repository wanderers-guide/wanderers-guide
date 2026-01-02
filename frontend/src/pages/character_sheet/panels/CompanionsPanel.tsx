import { characterState } from '@atoms/characterAtoms';
import { creatureDrawerState, drawerState } from '@atoms/navAtoms';
import { fetchContentAll, fetchContentPackage, getDefaultSources } from '@content/content-store';
import {
  Stack,
  Title,
  Text,
  Box,
  Group,
  Select,
  TextInput,
  ScrollArea,
  ActionIcon,
  useMantineTheme,
} from '@mantine/core';
import { getHotkeyHandler, useHover, useMediaQuery } from '@mantine/hooks';
import { useQuery } from '@tanstack/react-query';
import { Creature, Trait } from '@typing/content';
import { StoreID } from '@typing/variables';
import { findCreatureTraits } from '@utils/creature';
import { phoneQuery } from '@utils/mobile-responsive';
import { evaluate } from 'mathjs';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRecoilState } from 'recoil';
import { confirmHealth } from '../entity-handler';
import { DisplayIcon } from '@common/IconDisplay';
import { sign } from '@utils/numbers';
import { ConditionPills, selectCondition } from '../sections/ConditionSection';
import { setterOrUpdaterToValue } from '@utils/type-fixing';
import { IconPlus, IconX } from '@tabler/icons-react';
import { cloneDeep } from 'lodash-es';
import { executeOperations } from '@operations/operations.main';
import { applyConditions } from '@conditions/condition-handler';
import { getFinalAcValue, getFinalHealthValue, getFinalProfValue } from '@variables/variable-helpers';
import { getBestArmor } from '@items/inv-utils';
import { modals } from '@mantine/modals';
import { selectContent } from '@common/select/SelectContent';
import { hasTraitType } from '@utils/traits';
import { getEntityLevel } from '@utils/entity-utils';

export default function CompanionsPanel(props: { panelHeight: number; panelWidth: number }) {
  const theme = useMantineTheme();
  const [character, setCharacter] = useRecoilState(characterState);

  // Calculated data for the companions
  const companions = character?.companions?.list ?? [];
  const { data: computedData } = useQuery({
    queryKey: [
      `computed-companions`,
      {
        companions: companions,
      },
    ],
    queryFn: async () => {
      if (companions.length === 0) return [];
      return await computeCompanions(companions);
    },
    enabled: companions.length > 0,
  });

  if (companions.length === 0) {
    return (
      <ScrollArea
        p={8}
        style={{
          height: props.panelHeight - 50,
        }}
      >
        <Stack mt={20} gap={10}>
          <Text ta='center' c='gray.5' fs='italic' fz='sm'>
            No companions found, want to add one?
          </Text>
          <Group justify='center'>
            <AddCompanionSection />
          </Group>
        </Stack>
      </ScrollArea>
    );
  }

  return (
    <Stack h={props.panelHeight} gap={12}>
      <ScrollArea
        p={8}
        style={{
          height: props.panelHeight,
        }}
      >
        <Stack gap={12} mih={props.panelHeight - 75}>
          {companions.map((c, index) => (
            <CompanionCard
              key={index}
              storeId={`COMPANION_${index}`}
              panelWidth={props.panelWidth}
              companion={c}
              computed={computedData?.find((d) => d._id === `COMPANION_${index}`)}
              updateCreature={(input) => {
                let entity = cloneDeep(input);

                // If health changes, confirm and update entity with new changes
                if (entity.hp_current !== c.hp_current) {
                  const computed = computedData?.find((d) => d._id === `COMPANION_${index}`);
                  if (computed) {
                    const result = confirmHealth(`${entity.hp_current}`, computed.maxHp, c);

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

                setCharacter((prev) => {
                  if (!prev) return prev;
                  return {
                    ...prev,
                    companions: {
                      ...(prev.companions ?? {}),
                      list: [...(prev.companions?.list ?? [])].map((comp, i) => (i === index ? entity : comp)),
                    },
                  };
                });
              }}
              onRemove={() => {
                modals.openConfirmModal({
                  id: 'remove-option',
                  title: <Title order={4}>Delete Companion</Title>,
                  children: (
                    <Text size='sm'>Are you sure you want to delete "{c.name}"? This action cannot be undone.</Text>
                  ),
                  labels: { confirm: 'Confirm', cancel: 'Cancel' },
                  onCancel: () => {},
                  onConfirm: () => {
                    setCharacter((prev) => {
                      if (!prev) return prev;
                      return {
                        ...prev,
                        companions: {
                          ...(prev.companions ?? {}),
                          list: [...(prev.companions?.list ?? [])].filter((_, i) => i !== index),
                        },
                      };
                    });
                  },
                });
              }}
            />
          ))}
        </Stack>
        <Group justify='center'>
          <AddCompanionSection />
        </Group>
      </ScrollArea>
    </Stack>
  );
}

function CompanionCard(props: {
  storeId: StoreID;
  companion: Creature;
  panelWidth: number;
  computed?: {
    id: number;
    type: 'character' | 'creature';
    ac: number;
    fort: number;
    reflex: number;
    will: number;
    maxHp: number;
  };
  updateCreature: (creature: Creature) => void;
  onRemove: () => void;
}) {
  const isPhone = useMediaQuery(phoneQuery());
  const { hovered, ref } = useHover();

  const [creatureDrawer, openCreatureDrawer] = useRecoilState(creatureDrawerState);

  // Health

  const [health, setHealth] = useState<string | undefined>();
  const healthRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (props.companion) {
      const currentHealth =
        props.companion.hp_current === undefined ? (props.computed?.maxHp ?? 0) : props.companion.hp_current;
      setHealth(`${currentHealth}` === 'null' ? `${props.computed?.maxHp ?? ''}` : `${currentHealth}`);
    }
  }, [props.companion, props.computed]);

  const handleUpdateCreature = (c: Creature) => {
    props.updateCreature(c);

    // If the drawer is open, do janky refresh
    if (creatureDrawer) {
      handleOpenDrawer(c);
    }
  };

  const handleOpenDrawer = (c: Creature) => {
    openCreatureDrawer(null);
    setTimeout(() => {
      openCreatureDrawer({
        data: {
          STORE_ID: props.storeId,
          creature: c,
          updateCreature: props.updateCreature,
        },
      });
    }, 1);
  };

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

    handleUpdateCreature({
      ...props.companion,
      hp_current: result,
    });

    setHealth(`${result}` === 'null' ? `${props.computed?.maxHp ?? ''}` : `${result}`);
    healthRef.current?.blur();
  };

  const traits = findCreatureTraits(props.companion);
  // Use player saves and AC instead
  const boundSaves = hasTraitType('PET', traits) || hasTraitType('FAMILIAR', traits);

  return (
    <Group
      wrap='nowrap'
      gap={10}
      style={{
        position: 'relative',
      }}
      align='stretch'
    >
      <Group
        ref={ref}
        wrap='nowrap'
        w={`min(60dvw, 320px)`}
        p={5}
        style={(t) => ({
          backgroundColor: hovered ? t.colors.dark[5] : t.colors.dark[6],
          borderRadius: t.radius.md,
          cursor: 'pointer',
          position: 'relative',
        })}
        onClick={() => {
          handleOpenDrawer(props.companion);
        }}
      >
        <Group
          gap={2}
          style={{
            position: 'absolute',
            top: 6,
            right: 10,
          }}
        >
          <Text size={'10px'} fw={400} c='dimmed' fs='italic'>
            Lvl. {getEntityLevel(props.companion)}
          </Text>
        </Group>

        <Box w={40}>
          <DisplayIcon
            strValue={props.companion.details?.image_url ?? 'icon|||avatar|||#373A40'}
            width={40}
            iconStyles={{
              objectFit: 'contain',
              height: 40,
            }}
          />
        </Box>

        <Box pr={5} style={{ flex: 1 }}>
          <Group gap={1}>
            <Text size='md' fw={550} span>
              {props.companion.name}
            </Text>
          </Group>

          {props.computed && !boundSaves && (
            <Group gap={5} wrap='nowrap'>
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
          styles={(t) => ({
            wrapper: {
              height: '100%',
            },
            input: {
              backgroundColor: t.colors.dark[6],
              borderRadius: t.radius.md,
              height: '100%',
            },
          })}
          size='md'
          w={120}
          placeholder='HP'
          autoComplete='nope'
          value={health}
          onChange={(e) => {
            setHealth(e.target.value);
          }}
          onFocus={(e) => {
            const length = e.target.value.length;
            // Move cursor to end
            requestAnimationFrame(() => {
              e.target.setSelectionRange(length, length);
            });
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
        <ScrollArea
          h={50}
          scrollbars='y'
          style={{
            position: 'relative',
          }}
          px={25}
        >
          <ConditionPills
            id={props.storeId}
            entity={props.companion}
            setEntity={(call) => {
              const result = setterOrUpdaterToValue(call, props.companion);

              handleUpdateCreature({
                ...props.companion,
                details: {
                  ...props.companion.details,
                  conditions: result?.details?.conditions ?? [],
                },
              });
            }}
            groupProps={{
              w: props.panelWidth - 500,
            }}
          />
          <ActionIcon
            variant='subtle'
            aria-label='Add Condition'
            size='xs'
            radius='xl'
            color='dark.0'
            onClick={() => {
              selectCondition(props.companion.details?.conditions ?? [], (condition) => {
                if (!props.companion) return;
                handleUpdateCreature({
                  ...props.companion,
                  details: {
                    ...props.companion.details,
                    conditions: [...(props.companion.details?.conditions ?? []), condition],
                  },
                });
              });
            }}
            style={{
              position: 'absolute',
              top: '50%',
              left: 10,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <IconPlus size='1rem' stroke={1.5} />
          </ActionIcon>
        </ScrollArea>
      )}

      <ActionIcon
        size='sm'
        variant='light'
        radius={100}
        color='gray'
        aria-label='Remove Companion'
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

async function computeCompanions(companions: Creature[]) {
  const content = await fetchContentPackage(getDefaultSources('PAGE'), { fetchSources: false, fetchCreatures: false });

  async function computeCompanion(
    companion: Creature,
    index: number
  ): Promise<{
    _id: string;
    id: number;
    type: 'character' | 'creature';
    ac: number;
    fort: number;
    reflex: number;
    will: number;
    maxHp: number;
  }> {
    const creature = cloneDeep(companion);

    // Variable store ID
    const STORE_ID = `COMPANION_${index}`;

    await executeOperations({
      type: 'CREATURE',
      data: {
        id: STORE_ID,
        creature,
        content,
      },
    });
    // Apply conditions after everything else
    applyConditions(STORE_ID, creature.details?.conditions ?? []);

    const maxHealth = getFinalHealthValue(STORE_ID);
    const ac = getFinalAcValue(STORE_ID, getBestArmor(STORE_ID, creature.inventory)?.item);
    const fort = getFinalProfValue(STORE_ID, 'SAVE_FORT');
    const reflex = getFinalProfValue(STORE_ID, 'SAVE_REFLEX');
    const will = getFinalProfValue(STORE_ID, 'SAVE_WILL');

    return {
      _id: STORE_ID,
      id: creature.id,
      type: 'creature',
      ac: ac,
      fort: parseInt(fort),
      reflex: parseInt(reflex),
      will: parseInt(will),
      maxHp: maxHealth,
    };
  }

  return await Promise.all(companions.map(computeCompanion));
}

function AddCompanionSection() {
  const [character, setCharacter] = useRecoilState(characterState);
  const [selectedType, setSelectedType] = useState<number | null>(null);
  const isPhone = useMediaQuery(phoneQuery());

  const { data, isFetching } = useQuery({
    queryKey: [`get-companions-data`],
    queryFn: async () => {
      const traits = await fetchContentAll<Trait>('trait', getDefaultSources('PAGE'));
      const creatures = await fetchContentAll<Creature>('creature', getDefaultSources('PAGE'));

      return {
        traits,
        creatures,
      };
    },
  });

  const selectionTypes = useMemo(() => {
    return (
      data?.traits
        ?.filter((t) => t.meta_data?.companion_type_trait)
        .sort((a, b) => {
          return a.name.localeCompare(b.name);
        }) ?? []
    );
  }, [data]);

  const creatureOptions = useMemo(() => {
    return (
      data?.creatures
        ?.filter((c) => findCreatureTraits(c).includes(selectedType ?? -1))
        .sort((a, b) => {
          return a.name.localeCompare(b.name);
        }) ?? []
    );
  }, [data, selectedType]);

  return (
    <Box
      p='xs'
      style={(t) => ({
        backgroundColor: t.colors.dark[6],
        borderRadius: t.radius.xl,
      })}
    >
      <Group gap={0} align='center' justify='center'>
        <Text c='gray.5' mx={10}>
          Add
        </Text>
        <Select
          variant='filled'
          size='sm'
          placeholder='Companion'
          data={[
            ...selectionTypes.map((t) => ({ value: `${t.id}`, label: t.name })),
            { value: '-10', label: 'Creature' },
          ]}
          value={selectedType ? `${selectedType}` : null}
          onChange={(value) => {
            if (value === '-10') {
              // Select any creature
              selectContent<Creature>(
                'creature',
                (option) => {
                  // Add creature to character
                  setCharacter((prev) => {
                    if (!prev) return prev;
                    return {
                      ...prev,
                      companions: {
                        ...(prev.companions ?? {}),
                        list: [...(prev.companions?.list ?? []), option!],
                      },
                    };
                  });
                },
                {
                  showButton: true,
                  zIndex: 400,
                  // Hide companions
                  filterFn: (c) => c.level !== -100,
                }
              );
              setSelectedType(null);
            } else {
              setSelectedType(parseInt(`${value ?? -1}`));
            }
          }}
          w={isPhone ? 120 : 150}
          styles={(theme) => ({
            input: {
              borderTopRightRadius: 0,
              borderBottomRightRadius: 0,
              '--input-placeholder-color': theme.colors.gray[6],
            },
          })}
        />
        <Select
          variant='filled'
          size='sm'
          placeholder='Type'
          disabled={!selectedType || selectedType === -1}
          data={creatureOptions.map((c) => ({ value: `${c.id}`, label: c.name }))}
          onChange={(value) => {
            if (!value) return;
            const creature = creatureOptions.find((c) => c.id === parseInt(`${value}`));
            // Add creature to character
            setCharacter((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                companions: {
                  ...(prev.companions ?? {}),
                  list: [...(prev.companions?.list ?? []), creature!],
                },
              };
            });

            setSelectedType(null);
          }}
          value={''}
          w={isPhone ? 120 : 150}
          styles={(theme) => ({
            input: {
              borderTopLeftRadius: 0,
              borderBottomLeftRadius: 0,
              '--input-placeholder-color': theme.colors.gray[6],
            },
          })}
        />
      </Group>
    </Box>
  );
}
