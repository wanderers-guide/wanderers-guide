import { characterState } from '@atoms/characterAtoms';
import { drawerState } from '@atoms/navAtoms';
import { LEGACY_URL } from '@constants/data';
import { fetchContentAll, fetchContentPackage } from '@content/content-store';
import { CREATURE_DRAWER_ZINDEX } from '@drawers/types/CreatureDrawer';
import {
  Center,
  Stack,
  Title,
  Anchor,
  Text,
  Box,
  Group,
  Select,
  TextInput,
  ScrollArea,
  ActionIcon,
  Paper,
} from '@mantine/core';
import { getHotkeyHandler, useHover, useMediaQuery } from '@mantine/hooks';
import { useQuery } from '@tanstack/react-query';
import { Creature, LivingEntity, Trait } from '@typing/content';
import { StoreID } from '@typing/variables';
import { findCreatureTraits } from '@utils/creature';
import { phoneQuery } from '@utils/mobile-responsive';
import { evaluate } from 'mathjs';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRecoilState } from 'recoil';
import { getEntityLevel } from '../living-entity-utils';
import { DisplayIcon } from '@common/IconDisplay';
import { sign } from '@utils/numbers';
import { ConditionPills, selectCondition } from '../sections/ConditionSection';
import { setterOrUpdaterToValue } from '@utils/type-fixing';
import { IconPaw, IconPlus, IconX } from '@tabler/icons-react';
import { cloneDeep } from 'lodash-es';
import { executeCreatureOperations } from '@operations/operation-controller';
import { applyConditions } from '@conditions/condition-handler';
import { getFinalAcValue, getFinalHealthValue, getFinalProfValue } from '@variables/variable-display';
import { addExtraItems, getBestArmor } from '@items/inv-utils';
import { modals } from '@mantine/modals';
import { selectContent } from '@common/select/SelectContent';

export default function CompanionsPanel(props: { panelHeight: number; panelWidth: number }) {
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
          backgroundColor: `rgb(37, 38, 43)`,
          borderRadius: 10,
          border: '1px solid #373A40',
          height: props.panelHeight - 50,
        }}
      >
        <Stack mt={20} gap={10}>
          <Text ta='center' c='gray.5' fs='italic'>
            No companions found, want to add one?
          </Text>
          <AddCompanionSection />
        </Stack>
      </ScrollArea>
    );
  }

  return (
    <Stack h={props.panelHeight} gap={12}>
      {/* <Center pt={50}>
        <Stack>
          <Title ta='center' fs='italic' order={2}>
            Coming soon!
          </Title>
          <Text c='dimmed' ta='center' fz='sm' maw={500}>
            Companions will be added in future update. You can expect to see support for animal companions, familiars,
            pets, condition tracking, inventory management, in-depth stat breakdowns, and more! 🎉
          </Text>
          <Text c='dimmed' ta='center' fz='xs' maw={500} fs='italic'>
            If you <b>really</b> want companions, you can still use the{' '}
            <Anchor fz='xs' fs='italic' target='_blank' href={LEGACY_URL}>
              legacy site
            </Anchor>{' '}
            :)
          </Text>
        </Stack>
      </Center> */}

      <ScrollArea
        p={8}
        style={{
          backgroundColor: `rgb(37, 38, 43)`,
          borderRadius: 10,
          border: '1px solid #373A40',
          height: props.panelHeight - 50,
        }}
      >
        <Stack gap={12}>
          {companions.map((c, index) => (
            <CompanionCard
              storeId={`COMPANION_${index}`}
              panelWidth={props.panelWidth}
              companion={c}
              computed={computedData?.find((d) => d._id === `COMPANION_${index}`)}
              updateCreature={(e) => {
                setCharacter((prev) => {
                  if (!prev) return prev;
                  return {
                    ...prev,
                    companions: {
                      ...(prev.companions ?? {}),
                      list: [...(prev.companions?.list ?? [])].map((comp, i) => (i === index ? e : comp)),
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
      </ScrollArea>

      <AddCompanionSection />
    </Stack>
  );
}

function AddCompanionSection() {
  const [character, setCharacter] = useRecoilState(characterState);
  const [selectedType, setSelectedType] = useState<number | null>(null);

  const { data, isFetching } = useQuery({
    queryKey: [`get-companions-data`],
    queryFn: async () => {
      const traits = await fetchContentAll<Trait>('trait');
      const creatures = await fetchContentAll<Creature>('creature');

      return {
        traits,
        creatures,
      };
    },
  });

  const selectionTypes = useMemo(() => {
    return data?.traits?.filter((t) => t.meta_data?.companion_type_trait) ?? [];
  }, [data]);

  const creatureOptions = useMemo(() => {
    return data?.creatures?.filter((c) => findCreatureTraits(c).includes(selectedType ?? -1)) ?? [];
  }, [data, selectedType]);

  return (
    <Group gap={0} align='center' justify='center'>
      <Text c='gray.5' fw={'bolder'}>
        Add
      </Text>
      <ActionIcon
        variant='transparent'
        color='gray.5'
        style={{
          cursor: 'default',
        }}
        ml={5}
        mr={10}
      >
        <IconPaw style={{ width: '80%', height: '80%' }} stroke={1.5} />
      </ActionIcon>
      <Select
        variant='filled'
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
                groupBySource: true,
                zIndex: 400,
              }
            );
            setSelectedType(null);
          } else {
            setSelectedType(parseInt(`${value ?? -1}`));
          }
        }}
        w={150}
        styles={{
          input: {
            borderTopRightRadius: 0,
            borderBottomRightRadius: 0,
          },
        }}
      />
      <Select
        variant='filled'
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
        w={100}
        styles={{
          input: {
            borderTopLeftRadius: 0,
            borderBottomLeftRadius: 0,
          },
        }}
      />
    </Group>
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

  const [_drawer, openDrawer] = useRecoilState(drawerState);

  // Health

  const [health, setHealth] = useState<string | undefined>();
  const healthRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (props.companion) {
      const currentHealth =
        props.companion.hp_current === undefined ? props.computed?.maxHp ?? 0 : props.companion.hp_current;
      setHealth(`${currentHealth}`);
    }
  }, [props.companion, props.computed]);

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

    props.updateCreature({
      ...props.companion,
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
          openDrawer({
            type: 'creature',
            data: {
              STORE_ID: props.storeId,
              creature: props.companion,
              zIndex: CREATURE_DRAWER_ZINDEX,
              updateCreature: (creature: Creature) => {
                props.updateCreature(creature);
              },
            },
          });
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
            <Text size='sm' fw={600} span>
              {props.companion.name}
            </Text>
          </Group>

          {props.computed && (
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
          size='md'
          w={120}
          placeholder='HP'
          autoComplete='nope'
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
        <ScrollArea
          h={40}
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

              props.updateCreature({
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
            color='dark.3'
            onClick={() => {
              selectCondition(props.companion.details?.conditions ?? [], (condition) => {
                if (!props.companion) return;
                props.updateCreature({
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
  const content = await fetchContentPackage(undefined, { fetchSources: false, fetchCreatures: false });

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

    await executeCreatureOperations(STORE_ID, creature, content);
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
