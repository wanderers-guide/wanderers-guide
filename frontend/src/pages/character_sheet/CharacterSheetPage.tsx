import ArmorIcon from '@assets/images/ArmorIcon';
import BoxIcon from '@assets/images/BoxIcon';
import D20Loader from '@assets/images/D20Loader';
import HeroPointIcon from '@assets/images/HeroPointIcon';
import PerceptionIcon from '@assets/images/PerceptionIcon';
import ShieldIcon from '@assets/images/ShieldIcon';
import SpeedIcon from '@assets/images/SpeedIcon';
import CopperCoin from '@assets/images/currency/copper.png';
import GoldCoin from '@assets/images/currency/gold.png';
import PlatinumCoin from '@assets/images/currency/platinum.png';
import SilverCoin from '@assets/images/currency/silver.png';
import { characterState } from '@atoms/characterAtoms';
import { drawerState } from '@atoms/navAtoms';
import { ActionSymbol } from '@common/Actions';
import BlurBox from '@common/BlurBox';
import BlurButton from '@common/BlurButton';
import { CharacterInfo } from '@common/CharacterInfo';
import ClickEditText from '@common/ClickEditText';
import ConditionPill from '@common/ConditionPill';
import { Icon } from '@common/Icon';
import { ItemIcon } from '@common/ItemIcon';
import TokenSelect from '@common/TokenSelect';
import TraitsDisplay from '@common/TraitsDisplay';
import RichTextInput from '@common/rich_text_input/RichTextInput';
import {
  ClassFeatureSelectionOption,
  FeatSelectionOption,
  HeritageSelectionOption,
  PhysicalFeatureSelectionOption,
  selectContent,
} from '@common/select/SelectContent';
import {
  applyConditions,
  compiledConditions,
  getAllConditions,
  getConditionByName,
} from '@conditions/condition-handler';
import { GUIDE_BLUE, ICON_BG_COLOR, ICON_BG_COLOR_HOVER } from '@constants/data';
import { collectCharacterAbilityBlocks } from '@content/collect-content';
import { defineDefaultSources, fetchContentAll, fetchContentPackage } from '@content/content-store';
import { saveCustomization } from '@content/customization-cache';
import classes from '@css/FaqSimple.module.css';
import tinyInputClasses from '@css/TinyBlurInput.module.css';
import { priceToString } from '@items/currency-handler';
import {
  getBestArmor,
  getBestShield,
  getInvBulk,
  getItemQuantity,
  handleAddItem,
  handleDeleteItem,
  handleMoveItem,
  handleUpdateItem,
  isItemContainer,
  isItemEquippable,
  isItemInvestable,
  isItemWeapon,
  isItemWithQuantity,
  labelizeBulk,
} from '@items/inv-utils';
import { getWeaponStats } from '@items/weapon-handler';
import {
  Accordion,
  ActionIcon,
  Avatar,
  Badge,
  Box,
  Button,
  Center,
  Divider,
  Grid,
  Group,
  Menu,
  Paper,
  Pill,
  RingProgress,
  ScrollArea,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  TextInput,
  Textarea,
  Title,
  rem,
  useMantineTheme,
} from '@mantine/core';
import {
  getHotkeyHandler,
  useDebouncedValue,
  useDidUpdate,
  useHover,
  useInterval,
} from '@mantine/hooks';
import { modals, openContextModal } from '@mantine/modals';
import { BuyItemModal } from '@modals/BuyItemModal';
import { executeCharacterOperations } from '@operations/operation-controller';
import { StatButton } from '@pages/character_builder/CharBuilderCreation';
import { makeRequest } from '@requests/request-manager';
import {
  IconBackpack,
  IconBadgesFilled,
  IconCaretLeftRight,
  IconDots,
  IconExternalLink,
  IconFlare,
  IconJewishStar,
  IconJewishStarFilled,
  IconListDetails,
  IconNotebook,
  IconNotes,
  IconPaw,
  IconPlus,
  IconSearch,
  IconSettings,
} from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AbilityBlock,
  ActionCost,
  Character,
  ContentPackage,
  Inventory,
  InventoryItem,
  Item,
  Rarity,
} from '@typing/content';
import { OperationResultPackage } from '@typing/operations';
import { JSendResponse } from '@typing/requests';
import { VariableAttr, VariableListStr, VariableNum, VariableProf } from '@typing/variables';
import { interpolateHealth } from '@utils/colors';
import { setPageTitle } from '@utils/document-change';
import { sign } from '@utils/numbers';
import { toLabel } from '@utils/strings';
import {
  displayAttributeValue,
  displayFinalProfValue,
  getFinalAcValue,
  getFinalHealthValue,
} from '@variables/variable-display';
import {
  getAllArmorGroupVariables,
  getAllArmorVariables,
  getAllSaveVariables,
  getAllSkillVariables,
  getAllWeaponGroupVariables,
  getAllWeaponVariables,
  getVariable,
} from '@variables/variable-manager';
import { variableNameToLabel, variableToLabel } from '@variables/variable-utils';
import * as JsSearch from 'js-search';
import * as _ from 'lodash-es';
import { evaluate } from 'mathjs/number';
import { useEffect, useRef, useState } from 'react';
import { useLoaderData, useNavigate } from 'react-router-dom';
import { SetterOrUpdater, useRecoilState, useRecoilValue } from 'recoil';

export function Component(props: {}) {
  setPageTitle(`Sheet`);

  const { characterId } = useLoaderData() as {
    characterId: number;
  };

  const theme = useMantineTheme();
  const [doneLoading, setDoneLoading] = useState(false);

  const { data: content, isFetching } = useQuery({
    queryKey: [`find-content-${characterId}`],
    queryFn: async () => {
      const content = await fetchContentPackage(undefined, true);
      interval.stop();
      return content;
    },
    refetchOnWindowFocus: false,
  });

  // Just load progress manually
  const [percentage, setPercentage] = useState(0);
  const interval = useInterval(() => setPercentage((p) => p + 2), 30);
  useEffect(() => {
    interval.start();
    return interval.stop;
  }, []);

  const loader = (
    <Box
      style={{
        width: '100%',
        height: '300px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <D20Loader size={100} color={theme.colors[theme.primaryColor][5]} percentage={percentage} />
    </Box>
  );

  if (isFetching || !content) {
    return loader;
  } else {
    return (
      <>
        <div style={{ display: doneLoading ? 'none' : undefined }}>{loader}</div>
        <div style={{ display: doneLoading ? undefined : 'none' }}>
          <CharacterSheetInner
            content={content}
            characterId={characterId}
            onFinishLoading={() => {
              interval.stop();
              setDoneLoading(true);
            }}
          />
        </div>
      </>
    );
  }
}

function confirmHealth(
  hp: string,
  character: Character,
  setCharacter: SetterOrUpdater<Character | null>
) {
  const maxHealth = getFinalHealthValue('CHARACTER');

  let result = -1;
  try {
    result = evaluate(hp);
  } catch (e) {
    result = parseInt(hp);
  }
  if (isNaN(result)) result = 0;
  result = Math.floor(result);
  if (result < 0) result = 0;
  if (result > maxHealth) result = maxHealth;

  if (result === character.hp_current) return;

  let newConditions = _.cloneDeep(character.details?.conditions ?? []);
  // Add dying condition
  if (result === 0 && character.hp_current > 0 && !newConditions.find((c) => c.name === 'Dying')) {
    const dying = getConditionByName('Dying')!;
    const wounded = newConditions.find((c) => c.name === 'Wounded');
    if (wounded) {
      dying.value = 1 + wounded.value!;
    }
    newConditions.push(dying);
  } else if (result > 0 && character.hp_current === 0) {
    // Remove dying condition
    newConditions = newConditions.filter((c) => c.name !== 'Dying');
    // Increase wounded condition
    const wounded = newConditions.find((c) => c.name === 'Wounded');
    if (wounded) {
      wounded.value = 1 + wounded.value!;
    } else {
      newConditions.push(getConditionByName('Wounded')!);
    }
  }

  setCharacter((c) => {
    if (!c) return c;
    return {
      ...c,
      hp_current: result,
      details: {
        ...c.details,
        conditions: newConditions,
      },
    };
  });
  return result;
}

function confirmExperience(
  exp: string,
  character: Character,
  setCharacter: SetterOrUpdater<Character | null>
) {
  let result = -1;
  try {
    result = evaluate(exp);
  } catch (e) {
    result = parseInt(exp);
  }
  if (isNaN(result)) result = 0;
  result = Math.floor(result);
  if (result < 0) result = 0;

  setCharacter((c) => {
    if (!c) return c;
    return {
      ...c,
      experience: result,
    };
  });
  return result;
}

function CharacterSheetInner(props: {
  content: ContentPackage;
  characterId: number;
  onFinishLoading: () => void;
}) {
  setPageTitle(`Sheet`);

  const queryClient = useQueryClient();

  const [character, setCharacter] = useRecoilState(characterState);

  // Fetch character from db
  const {
    data: resultCharacter,
    isLoading,
    isInitialLoading,
  } = useQuery({
    queryKey: [`find-character-${props.characterId}`],
    queryFn: async () => {
      const resultCharacter = await makeRequest<Character>('find-character', {
        id: props.characterId,
      });

      if (resultCharacter) {
        // Make sure we sync the enabled content sources
        defineDefaultSources(resultCharacter.content_sources?.enabled ?? []);

        // Cache character customization for fast loading
        saveCustomization({
          background_image_url: resultCharacter.details?.background_image_url,
          sheet_theme: resultCharacter.details?.sheet_theme,
        });
      } else {
        // Character not found, redirect to characters
        window.location.href = '/characters';
      }

      return resultCharacter;
    },
    refetchOnWindowFocus: false,
  });

  // Execute operations
  const [operationResults, setOperationResults] = useState<OperationResultPackage>();
  const executingOperations = useRef(false);
  useEffect(() => {
    if (!character || executingOperations.current) return;
    executingOperations.current = true;
    executeCharacterOperations(character, props.content, 'CHARACTER-SHEET').then((results) => {
      // Apply conditions after everything else
      applyConditions('CHARACTER', character.details?.conditions ?? []);
      // Because of the drained condition, let's confirm health
      confirmHealth(`${character.hp_current}`, character, setCharacter);

      setOperationResults(results);
      executingOperations.current = false;
      props.onFinishLoading?.();
    });
  }, [character]);

  //

  useEffect(() => {
    if (!resultCharacter) return;
    // Update character nav state
    setCharacter(resultCharacter);
    setInventory(getInventory(resultCharacter));
  }, [resultCharacter]);

  // Update character in db when state changed
  const [debouncedCharacter] = useDebouncedValue(character, 500);
  useDidUpdate(() => {
    if (!debouncedCharacter) return;
    mutateCharacter({
      name: debouncedCharacter.name,
      level: debouncedCharacter.level,
      experience: debouncedCharacter.experience,
      hp_current: debouncedCharacter.hp_current,
      hp_temp: debouncedCharacter.hp_temp,
      hero_points: debouncedCharacter.hero_points,
      stamina_current: debouncedCharacter.stamina_current,
      resolve_current: debouncedCharacter.resolve_current,
      inventory: debouncedCharacter.inventory,
      notes: debouncedCharacter.notes,
      details: debouncedCharacter.details,
      roll_history: debouncedCharacter.roll_history,
      custom_operations: debouncedCharacter.custom_operations,
      meta_data: debouncedCharacter.meta_data,
      options: debouncedCharacter.options,
      variants: debouncedCharacter.variants,
      content_sources: debouncedCharacter.content_sources,
      operation_data: debouncedCharacter.operation_data,
      spells: debouncedCharacter.spells,
      companions: debouncedCharacter.companions,
    });
  }, [debouncedCharacter]);

  // Update character stats
  const { mutate: mutateCharacter } = useMutation(
    async (data: Record<string, any>) => {
      const response = await makeRequest<JSendResponse>('update-character', {
        id: props.characterId,
        ...data,
      });
      return response ? response.status === 'success' : false;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries([`find-character-${props.characterId}`]);
      },
    }
  );

  // Inventory saving & management
  const getInventory = (character: Character | null) => {
    // Default inventory
    return _.cloneDeep(
      character?.inventory ?? {
        coins: {
          cp: 0,
          sp: 0,
          gp: 0,
          pp: 0,
        },
        unarmed_attacks: [],
        items: [],
      }
    );
  };
  const [inventory, setInventory] = useState(getInventory(character));
  const [debouncedInventory] = useDebouncedValue(inventory, 500);
  useDidUpdate(() => {
    setCharacter((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        inventory: debouncedInventory,
      };
    });
  }, [debouncedInventory]);

  return (
    <Center>
      <Box maw={1000} w='100%'>
        <Stack gap='xs' style={{ position: 'relative' }}>
          <SimpleGrid cols={3} spacing='xs' verticalSpacing='xs'>
            <CharacterInfoSection />
            <HealthSection />
            <ConditionSection />
            <AttributeSection />
            <ArmorSection inventory={inventory} setInventory={setInventory} />
            <SpeedSection />
          </SimpleGrid>
          <SectionPanels
            content={props.content}
            inventory={inventory}
            setInventory={setInventory}
          />
        </Stack>
      </Box>
    </Center>
  );
}

function CharacterInfoSection() {
  const navigate = useNavigate();
  const theme = useMantineTheme();

  const [_drawer, openDrawer] = useRecoilState(drawerState);
  const [character, setCharacter] = useRecoilState(characterState);

  const expRef = useRef<HTMLInputElement>(null);
  const [exp, setExp] = useState<string | undefined>();
  useEffect(() => {
    setExp(character?.experience ? `${character.experience}` : undefined);
  }, [character]);

  const handleExperienceSubmit = () => {
    if (!character) return;
    const finalExp = confirmExperience(exp ?? '0', character, setCharacter);
    setExp(`${finalExp}`);
    expRef.current?.blur();
  };

  const handleRest = () => {
    const newCharacter = _.cloneDeep(character);
    if (!newCharacter) return;

    // Regen Health
    const conMod = getVariable<VariableAttr>('CHARACTER', 'ATTRIBUTE_CON')?.value.value ?? 0;
    const level = getVariable<VariableNum>('CHARACTER', 'LEVEL')!.value;
    let regenAmount = level * (1 > conMod ? 1 : conMod);

    const maxHealth = getFinalHealthValue('CHARACTER');
    let currentHealth = character?.hp_current;
    if (currentHealth === undefined || currentHealth < 0) {
      currentHealth = maxHealth;
    }
    if (currentHealth + regenAmount > maxHealth) {
      regenAmount = maxHealth - currentHealth;
    }
    newCharacter.hp_current = currentHealth + regenAmount;

    // Regen Stamina and Resolve
    if (true) {
      const classHP = getVariable<VariableNum>('CHARACTER', 'MAX_HEALTH_CLASS_PER_LEVEL')!.value;
      const newStamina = (Math.floor(classHP / 2) + conMod) * level;

      let keyMod = 0;
      const classDC = getVariable<VariableProf>('CHARACTER', 'CLASS_DC')!;
      if (classDC.value.attribute) {
        keyMod = getVariable<VariableAttr>('CHARACTER', classDC.value.attribute)?.value.value ?? 0;
      }
      const newResolve = keyMod;

      newCharacter.stamina_current = newStamina;
      newCharacter.resolve_current = newResolve;
    }

    // Reset Innate Spells
    // TODO:

    // Reset Focus Points
    // TODO:

    // Reset Spell Slots
    // TODO:

    // Remove Fatigued Condition
    let newConditions = _.cloneDeep(character?.details?.conditions ?? []).filter(
      (c) => c.name !== 'Fatigued'
    );

    // Remove Wounded condition if we're now at full health
    const wounded = newConditions.find((c) => c.name === 'Wounded');
    if (wounded && newCharacter.hp_current === maxHealth) {
      newConditions = newConditions.filter((c) => c.name !== 'Wounded');
    }

    // Decrease Drained Condition
    const drained = newConditions.find((c) => c.name === 'Drained');
    if (drained) {
      drained.value = drained.value! - 1;
      if (drained.value! <= 0) {
        newConditions = newConditions.filter((c) => c.name !== 'Drained');
      }
    }

    // Decrease Doomed Condition
    const doomed = newConditions.find((c) => c.name === 'Doomed');
    if (doomed) {
      doomed.value = doomed.value! - 1;
      if (doomed.value! <= 0) {
        newConditions = newConditions.filter((c) => c.name !== 'Doomed');
      }
    }
    newCharacter.details = {
      ...newCharacter.details,
      conditions: newConditions,
    };

    // Update the character
    setCharacter(newCharacter);
  };

  return (
    <BlurBox blur={10}>
      <Box
        pt='xs'
        pb={5}
        px='xs'
        style={{
          borderTopLeftRadius: theme.radius.md,
          borderTopRightRadius: theme.radius.md,
          position: 'relative',
        }}
      >
        <Group gap={20} wrap='nowrap' align='flex-start'>
          <CharacterInfo
            character={character}
            color='gray.5'
            nameCutOff={20}
            onClickAncestry={() => {
              openDrawer({
                type: 'ancestry',
                data: { id: character?.details?.ancestry?.id },
              });
            }}
            onClickBackground={() => {
              openDrawer({
                type: 'background',
                data: { id: character?.details?.background?.id },
              });
            }}
            onClickClass={() => {
              openDrawer({
                type: 'class',
                data: { id: character?.details?.class?.id },
              });
            }}
          />
          <Stack gap={10} justify='flex-start' pt={3} style={{ flex: 1 }}>
            <Stack gap={5}>
              <Box>
                <BlurButton
                  size='compact-xs'
                  fw={500}
                  fullWidth
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    navigate(`/builder/${character?.id}`);
                  }}
                  href={`/builder/${character?.id}`}
                >
                  Edit
                </BlurButton>
              </Box>
              <Box>
                <BlurButton size='compact-xs' fw={500} fullWidth onClick={handleRest}>
                  Rest
                </BlurButton>
              </Box>
            </Stack>
            <Stack gap={0}>
              <Box>
                <Text fz='xs' ta='center' c='gray.3'>
                  Lvl. 1
                </Text>
              </Box>
              <Box>
                <TextInput
                  className={tinyInputClasses.input}
                  ref={expRef}
                  variant='filled'
                  size='xs'
                  radius='lg'
                  placeholder='Exp.'
                  value={exp}
                  onChange={(e) => {
                    setExp(e.currentTarget.value);
                  }}
                  onBlur={handleExperienceSubmit}
                  onKeyDown={getHotkeyHandler([
                    ['mod+Enter', handleExperienceSubmit],
                    ['Enter', handleExperienceSubmit],
                  ])}
                />
              </Box>
            </Stack>
          </Stack>
        </Group>
      </Box>
    </BlurBox>
  );
}

function HealthSection() {
  const navigate = useNavigate();
  const theme = useMantineTheme();

  const [_drawer, openDrawer] = useRecoilState(drawerState);
  const [character, setCharacter] = useRecoilState(characterState);

  const maxHealth = getFinalHealthValue('CHARACTER');
  let currentHealth = character?.hp_current;
  if (currentHealth === undefined || currentHealth < 0) {
    currentHealth = maxHealth;
  }

  let tempHealth = character?.hp_temp;
  if (tempHealth === undefined || tempHealth < 0) {
    tempHealth = 0;
  }

  return (
    <BlurBox blur={10}>
      <Box
        pt='xs'
        pb={5}
        px='xs'
        style={{
          borderTopLeftRadius: theme.radius.md,
          borderTopRightRadius: theme.radius.md,
          position: 'relative',
        }}
        h='100%'
      >
        <Group justify='space-between' style={{ flexDirection: 'column' }} h='100%' gap={0}>
          <Group wrap='nowrap' justify='space-between' align='flex-start' w='100%' gap={0} grow>
            <Box>
              <Text ta='center' fz='md' fw={500} c='gray.0'>
                Hit Points
              </Text>
              <Group wrap='nowrap' justify='center' align='center' gap={10}>
                <ClickEditText
                  color={interpolateHealth(currentHealth / maxHealth)}
                  size='xl'
                  value={`${currentHealth}`}
                  height={50}
                  miw={20}
                  placeholder='HP'
                  onChange={(value) => {
                    if (!character) return;
                    confirmHealth(value, character, setCharacter);
                  }}
                />
                <Box>
                  <Text size='md' c='gray.4'>
                    /
                  </Text>
                </Box>
                <Box>
                  <Text size='lg' c='gray.3'>
                    {maxHealth}
                  </Text>
                </Box>
              </Group>
            </Box>

            <Box>
              <Text ta='center' fz='sm' fw={500} c='gray.0'>
                Temp. HP
              </Text>
              <ClickEditText
                color={tempHealth ? `blue` : `gray.5`}
                size='xl'
                value={tempHealth ? `${tempHealth}` : `—`}
                height={50}
                miw={20}
                placeholder='HP'
                onChange={(value) => {
                  let result = -1;
                  try {
                    result = evaluate(value);
                  } catch (e) {
                    result = parseInt(value);
                  }
                  if (isNaN(result)) result = 0;
                  result = Math.floor(result);
                  if (result < 0) result = 0;

                  setCharacter((c) => {
                    if (!c) return c;
                    return {
                      ...c,
                      hp_temp: result,
                    };
                  });
                }}
              />
            </Box>
          </Group>
          <Button variant='subtle' color='gray.5' size='compact-xs' fw={400}>
            Resistances & Weaknesses
          </Button>
        </Group>
      </Box>
    </BlurBox>
  );
}

function ConditionSection() {
  const navigate = useNavigate();
  const theme = useMantineTheme();

  const [_drawer, openDrawer] = useRecoilState(drawerState);
  const [character, setCharacter] = useRecoilState(characterState);

  return (
    <BlurBox blur={10}>
      <Box
        pt='xs'
        pb={5}
        px='xs'
        style={{
          borderTopLeftRadius: theme.radius.md,
          borderTopRightRadius: theme.radius.md,
          position: 'relative',
        }}
        h='100%'
      >
        <Group align='flex-start' justify='space-between' gap={0}>
          <Box w={200}>
            <Group wrap='nowrap' gap={5} justify='center'>
              <Text ta='center' fz='md' fw={500} c='gray.0'>
                Conditions
              </Text>
              <ActionIcon
                variant='light'
                aria-label='Add Condition'
                size='xs'
                radius='xl'
                color='gray'
                onClick={() => {
                  selectContent(
                    'ability-block',
                    (option) => {
                      if (!character) return;
                      const condition = getConditionByName(option.name);
                      if (!condition) return;
                      const hasCondition = character.details?.conditions?.find(
                        (c) => c.name === condition.name
                      );
                      if (hasCondition) return;
                      setCharacter({
                        ...character,
                        details: {
                          ...character.details,
                          conditions: [...(character.details?.conditions ?? []), condition],
                        },
                      });
                    },
                    {
                      overrideOptions: getAllConditions()
                        .filter((condition) => condition.for_character)
                        .map((condition, index) => ({
                          id: index,
                          name: condition.name,
                          _custom_select: {
                            title: condition.name,
                            description: condition.description,
                          },
                        })),
                      overrideLabel: 'Select a Condition',
                      selectedId: -1,
                    }
                  );
                }}
              >
                <IconPlus size='1rem' stroke={1.5} />
              </ActionIcon>
            </Group>
            <ScrollArea h={70} scrollbars='y'>
              <Group gap={5} justify='center'>
                {compiledConditions(character?.details?.conditions ?? []).map(
                  (condition, index) => (
                    <ConditionPill
                      key={index}
                      text={condition.name}
                      amount={condition.value}
                      onClick={() => {
                        openContextModal({
                          modal: 'condition',
                          title: (
                            <Group justify='space-between'>
                              <Title order={3}>{condition.name}</Title>
                              {condition.source ? (
                                <Text fs='italic' fz='sm' mr={15}>
                                  From: <Text span>{condition.source}</Text>
                                </Text>
                              ) : (
                                <Button
                                  variant='light'
                                  color='gray'
                                  size='compact-xs'
                                  mr={15}
                                  onClick={() => {
                                    modals.closeAll();

                                    let newConditions = _.cloneDeep(
                                      character?.details?.conditions ?? []
                                    );
                                    // Remove condition
                                    newConditions = newConditions.filter(
                                      (c) => c.name !== condition.name
                                    );
                                    // Add wounded condition if we're removing dying
                                    if (condition.name === 'Dying') {
                                      const wounded = newConditions.find(
                                        (c) => c.name === 'Wounded'
                                      );
                                      if (wounded) {
                                        wounded.value = 1 + wounded.value!;
                                      } else {
                                        newConditions.push(getConditionByName('Wounded')!);
                                      }
                                    }

                                    setCharacter((c) => {
                                      if (!c) return c;
                                      return {
                                        ...c,
                                        details: {
                                          ...c.details,
                                          conditions: newConditions,
                                        },
                                      };
                                    });
                                  }}
                                >
                                  Remove
                                </Button>
                              )}
                            </Group>
                          ),
                          innerProps: {
                            condition: condition,
                            onValueChange: (condition, value) => {
                              setCharacter((c) => {
                                if (!c) return c;
                                return {
                                  ...c,
                                  details: {
                                    ...c.details,
                                    conditions: c.details?.conditions?.map((c) => {
                                      if (c.name === condition.name) {
                                        return {
                                          ...c,
                                          value: value,
                                        };
                                      } else {
                                        return c;
                                      }
                                    }),
                                  },
                                };
                              });
                            },
                          },
                          styles: {
                            title: {
                              width: '100%',
                            },
                          },
                        });
                      }}
                    />
                  )
                )}
                {(character?.details?.conditions ?? []).length === 0 && (
                  <Text c='gray.6' fz='xs' fs='italic'>
                    None active
                  </Text>
                )}
              </Group>
            </ScrollArea>
          </Box>
          <Box w={100} style={{ position: 'relative' }}>
            <Box
              style={{
                position: 'absolute',
                top: 20,
                left: '50%',
                transform: 'translate(-50%, 0px)',
              }}
            >
              <HeroPointIcon size={75} color={ICON_BG_COLOR} />
            </Box>
            <Group justify='flex-start' style={{ flexDirection: 'column' }} h={100} gap={15}>
              <Text ta='center' fz='md' fw={500} c='gray.0' style={{ whiteSpace: 'nowrap' }}>
                Hero Points
              </Text>
              <Group justify='center'>
                <TokenSelect
                  count={3}
                  size='xs'
                  emptySymbol={
                    <ActionIcon
                      variant='transparent'
                      color='gray.1'
                      aria-label='Hero Point Empty'
                      size='xs'
                      style={{ opacity: 0.7 }}
                    >
                      <IconJewishStar size='0.8rem' />
                    </ActionIcon>
                  }
                  fullSymbol={
                    <ActionIcon
                      variant='transparent'
                      color='gray.1'
                      aria-label='Hero Point Full'
                      size='xs'
                      style={{ opacity: 0.7 }}
                    >
                      <IconJewishStarFilled size='0.8rem' />
                    </ActionIcon>
                  }
                />
              </Group>
            </Group>
          </Box>
        </Group>
      </Box>
    </BlurBox>
  );
}

function AttributeSection() {
  const navigate = useNavigate();
  const theme = useMantineTheme();

  const [_drawer, openDrawer] = useRecoilState(drawerState);
  const [character, setCharacter] = useRecoilState(characterState);

  // Ordered this way so it's in two columns of physical & mental
  const attributes = [
    'ATTRIBUTE_STR',
    'ATTRIBUTE_INT',
    'ATTRIBUTE_DEX',
    'ATTRIBUTE_WIS',
    'ATTRIBUTE_CON',
    'ATTRIBUTE_CHA',
  ];

  const handleAttributeOpen = (attribute: string) => {
    openDrawer({ type: 'stat-attr', data: { attributeName: attribute } });
  };

  return (
    <BlurBox blur={10}>
      <Box
        px='xs'
        style={{
          borderTopLeftRadius: theme.radius.md,
          borderTopRightRadius: theme.radius.md,
          position: 'relative',
        }}
        h='100%'
      >
        <Group justify='center' style={{ flexDirection: 'column' }} h='100%'>
          <SimpleGrid cols={2} spacing='sm' verticalSpacing={8}>
            {attributes.map((attribute, index) => (
              <Button.Group key={index}>
                <BlurButton
                  size='compact-xs'
                  fw={400}
                  onClick={() => {
                    handleAttributeOpen(attribute);
                  }}
                >
                  {variableNameToLabel(attribute)}
                </BlurButton>
                <Button
                  radius='xl'
                  variant='light'
                  color='dark.2'
                  size='compact-xs'
                  w={35}
                  onClick={() => {
                    handleAttributeOpen(attribute);
                  }}
                >
                  {displayAttributeValue('CHARACTER', attribute, {
                    c: 'gray.0',
                    ta: 'center',
                    fz: 'xs',
                  })}
                </Button>
              </Button.Group>
            ))}
          </SimpleGrid>
        </Group>
      </Box>
    </BlurBox>
  );
}

function ArmorSection(props: {
  inventory: Inventory;
  setInventory: React.Dispatch<React.SetStateAction<Inventory>>;
}) {
  const navigate = useNavigate();
  const theme = useMantineTheme();

  const [_drawer, openDrawer] = useRecoilState(drawerState);
  const character = useRecoilState(characterState);

  const { hovered: armorHovered, ref: armorRef } = useHover();
  const { hovered: shieldHovered, ref: shieldRef } = useHover();

  const handleSaveOpen = (save: VariableProf) => {
    openDrawer({
      type: 'stat-prof',
      data: { variableName: save.name },
    });
  };

  const bestArmor = getBestArmor('CHARACTER', props.inventory);
  const bestShield = getBestShield('CHARACTER', props.inventory);

  return (
    <BlurBox blur={10}>
      <Box
        pt='xs'
        pb={5}
        px='xs'
        style={{
          borderTopLeftRadius: theme.radius.md,
          borderTopRightRadius: theme.radius.md,
          position: 'relative',
        }}
        h='100%'
      >
        <Group wrap='nowrap' gap={5} justify='space-between'>
          <Group wrap='nowrap' gap={0} justify='center' style={{ flex: 1 }}>
            <Box
              style={{ position: 'relative', cursor: 'pointer' }}
              ref={armorRef}
              onClick={() => {
                //openDrawer({ type: 'armor' });
              }}
            >
              <ArmorIcon size={85} color={armorHovered ? ICON_BG_COLOR_HOVER : ICON_BG_COLOR} />
              <Stack
                gap={0}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <Text ta='center' fz='lg' c='gray.0' fw={500} lh='1.1em'>
                  {getFinalAcValue('CHARACTER', bestArmor?.item)}
                </Text>
                <Text ta='center' c='gray.5' fz='xs'>
                  AC
                </Text>
              </Stack>
            </Box>
            <Box ref={shieldRef}>
              {bestShield && (
                <Box
                  style={{ position: 'relative', cursor: 'pointer' }}
                  onClick={() => {
                    openDrawer({
                      type: 'inv-item',
                      data: {
                        zIndex: 100,
                        invItem: _.cloneDeep(bestShield),
                        onItemUpdate: (newInvItem: InventoryItem) => {
                          handleUpdateItem(props.setInventory, newInvItem);
                        },
                        onItemDelete: (newInvItem: InventoryItem) => {
                          handleDeleteItem(props.setInventory, newInvItem);
                          openDrawer(null);
                        },
                        onItemMove: (
                          invItem: InventoryItem,
                          containerItem: InventoryItem | null
                        ) => {
                          handleMoveItem(props.setInventory, invItem, containerItem);
                        },
                      },
                    });
                  }}
                >
                  <ShieldIcon
                    size={85}
                    color={shieldHovered ? ICON_BG_COLOR_HOVER : ICON_BG_COLOR}
                  />
                  <Stack
                    gap={0}
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    <Text ta='center' fz='lg' c='gray.0' fw={500} lh='1.1em' pr={5}>
                      {sign(bestShield.item.meta_data?.ac_bonus ?? 0)}
                    </Text>
                    <Text ta='center' fz={8} style={{ whiteSpace: 'nowrap' }}>
                      Hardness {bestShield.item.meta_data?.hardness ?? 0}
                    </Text>
                    <Center>
                      <RingProgress
                        size={30}
                        thickness={3}
                        sections={[
                          {
                            value: Math.ceil(
                              ((bestShield.item.meta_data?.hp ?? 0) /
                                (bestShield.item.meta_data?.hp_max ?? 1)) *
                                100
                            ),
                            color: 'guide',
                          },
                        ]}
                        label={
                          <Text fz={8} ta='center' style={{ pointerEvents: 'none' }}>
                            HP
                          </Text>
                        }
                      />
                    </Center>
                  </Stack>
                </Box>
              )}
            </Box>
          </Group>
          <Stack gap={8}>
            {getAllSaveVariables('CHARACTER').map((save, index) => (
              <Button.Group key={index}>
                <BlurButton size='compact-xs' fw={400} onClick={() => handleSaveOpen(save)}>
                  {variableToLabel(save)}
                </BlurButton>
                <Button
                  radius='xl'
                  variant='light'
                  color='dark.2'
                  size='compact-xs'
                  w={50}
                  style={{ position: 'relative' }}
                  onClick={() => handleSaveOpen(save)}
                >
                  <Text c='gray.0' fz='xs' pr={15}>
                    {displayFinalProfValue('CHARACTER', save.name)}
                  </Text>
                  <Badge
                    size='xs'
                    variant='light'
                    color='gray.0'
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '80%',
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    {save?.value.value}
                  </Badge>
                </Button>
              </Button.Group>
            ))}
          </Stack>
        </Group>
      </Box>
    </BlurBox>
  );
}

function SpeedSection() {
  const navigate = useNavigate();
  const theme = useMantineTheme();

  const [_drawer, openDrawer] = useRecoilState(drawerState);
  const [character, setCharacter] = useRecoilState(characterState);

  return (
    <BlurBox blur={10}>
      <Box
        pt='xs'
        pb={5}
        px='xs'
        style={{
          borderTopLeftRadius: theme.radius.md,
          borderTopRightRadius: theme.radius.md,
          position: 'relative',
        }}
        h='100%'
      >
        <Group wrap='nowrap' gap={5} align='flex-start' grow>
          <Box style={{ position: 'relative' }}>
            <Box
              style={{
                position: 'absolute',
                top: '55%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
              }}
            >
              <PerceptionIcon size={80} color={ICON_BG_COLOR} />
            </Box>
            <Stack gap={10}>
              <Text ta='center' fz='sm' fw={500} c='gray.0'>
                Perception
              </Text>
              <Text ta='center' fz='lg' c='gray.0' fw={500} lh='1.5em'>
                {displayFinalProfValue('CHARACTER', 'PERCEPTION')}
              </Text>
              <Text fz='xs' c='gray.5' ta='center'>
                Normal Vision
              </Text>
            </Stack>
          </Box>
          <Box style={{ position: 'relative' }}>
            <Box
              style={{
                position: 'absolute',
                top: '60%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
              }}
            >
              <SpeedIcon size={75} color={ICON_BG_COLOR} />
            </Box>
            <Stack gap={10}>
              <Text ta='center' fz='sm' fw={500} c='gray.0'>
                Speed
              </Text>
              <Text ta='center' fz='lg' c='gray.0' fw={500} lh='1.5em' pl={15}>
                {25}
                <Text fz='xs' c='gray.3' span>
                  {' '}
                  ft.
                </Text>
              </Text>
              <Text fz='xs' c='gray.5' ta='center'>
                And Others
              </Text>
            </Stack>
          </Box>
          <Box style={{ position: 'relative' }}>
            <Box
              style={{
                position: 'absolute',
                top: '85%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
              }}
            >
              <BoxIcon size={50} color={ICON_BG_COLOR} />
            </Box>
            <Stack gap={10}>
              <Text ta='center' fz='sm' fw={500} c='gray.0'>
                Class DC
              </Text>
              <Text ta='center' fz='lg' c='gray.0' fw={500} lh='1.5em'>
                {displayFinalProfValue('CHARACTER', 'CLASS_DC', true)}
              </Text>
              {/* <Text fz='xs' c='gray.5' ta='center'>
                And Others
              </Text> */}
            </Stack>
          </Box>
        </Group>
      </Box>
    </BlurBox>
  );
}

function SectionPanels(props: {
  content: ContentPackage;
  inventory: Inventory;
  setInventory: React.Dispatch<React.SetStateAction<Inventory>>;
}) {
  const theme = useMantineTheme();
  const [activeTab, setActiveTab] = useState<string | null>('skills-actions');
  const { hovered: hoveredTabOptions, ref: tabOptionsRef } = useHover<HTMLButtonElement>();

  const panelHeight = 550;

  const iconStyle = { width: rem(12), height: rem(12) };
  const allBuilderTabs = [
    'skills-actions',
    'inventory',
    'spells',
    'feats-features',
    'companions',
    'details',
    'notes',
    'extras',
  ];
  const primaryBuilderTabs =
    getVariable<VariableListStr>('CHARACTER', 'PRIMARY_BUILDER_TABS')?.value ?? [];
  const tabOptions = allBuilderTabs.filter((tab) => !primaryBuilderTabs.includes(tab));
  const openedTabOption = tabOptions.find((tab) => tab === activeTab);
  const getTabIcon = (tab: string) => {
    switch (tab) {
      case 'skills-actions':
        return <IconBadgesFilled style={iconStyle} />;
      case 'inventory':
        return <IconBackpack style={iconStyle} />;
      case 'spells':
        return <IconFlare style={iconStyle} />;
      case 'feats-features':
        return <IconCaretLeftRight style={iconStyle} />;
      case 'companions':
        return <IconPaw style={iconStyle} />;
      case 'details':
        return <IconListDetails style={iconStyle} />;
      case 'notes':
        return <IconNotebook style={iconStyle} />;
      case 'extras':
        return <IconNotes style={iconStyle} />;
      default:
        return null;
    }
  };

  return (
    <BlurBox blur={10} p='sm'>
      <Tabs
        color='dark.6'
        variant='pills'
        radius='xl'
        keepMounted={false}
        value={activeTab}
        onChange={setActiveTab}
      >
        <Tabs.List pb={10} grow>
          {primaryBuilderTabs.includes('skills-actions') && (
            <Tabs.Tab value='skills-actions' leftSection={getTabIcon('skills-actions')}>
              Skills & Actions
            </Tabs.Tab>
          )}
          {primaryBuilderTabs.includes('inventory') && (
            <Tabs.Tab value='inventory' leftSection={getTabIcon('inventory')}>
              Inventory
            </Tabs.Tab>
          )}
          {primaryBuilderTabs.includes('spells') && (
            <Tabs.Tab value='spells' leftSection={getTabIcon('spells')}>
              Spells
            </Tabs.Tab>
          )}
          {primaryBuilderTabs.includes('feats-features') && (
            <Tabs.Tab value='feats-features' leftSection={getTabIcon('feats-features')}>
              Feats & Features
            </Tabs.Tab>
          )}
          {primaryBuilderTabs.includes('companions') && (
            <Tabs.Tab value='companions' leftSection={getTabIcon('companions')}>
              Companions
            </Tabs.Tab>
          )}
          {primaryBuilderTabs.includes('details') && (
            <Tabs.Tab value='details' leftSection={getTabIcon('details')}>
              Details
            </Tabs.Tab>
          )}
          {primaryBuilderTabs.includes('notes') && (
            <Tabs.Tab value='notes' leftSection={getTabIcon('notes')}>
              Notes
            </Tabs.Tab>
          )}
          <Menu shadow='md' width={160} trigger='hover' openDelay={100} closeDelay={100}>
            <Menu.Target>
              <ActionIcon
                variant='subtle'
                color='gray.4'
                size='lg'
                radius='xl'
                aria-label='Tab Options'
                ref={tabOptionsRef}
                style={{
                  backgroundColor:
                    hoveredTabOptions || openedTabOption ? theme.colors.dark[6] : 'transparent',
                  color: openedTabOption ? theme.colors.gray[0] : undefined,
                }}
              >
                <IconDots style={{ width: '70%', height: '70%' }} stroke={1.5} />
              </ActionIcon>
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Label>Other sections</Menu.Label>
              {tabOptions.map((tab, index) => (
                <Menu.Item
                  key={index}
                  leftSection={getTabIcon(tab)}
                  onClick={() => {
                    setActiveTab(tab);
                  }}
                  style={{
                    backgroundColor: activeTab === tab ? theme.colors.dark[4] : undefined,
                    color: activeTab === tab ? theme.colors.gray[0] : undefined,
                  }}
                >
                  {toLabel(tab)}
                </Menu.Item>
              ))}
            </Menu.Dropdown>
          </Menu>
        </Tabs.List>

        <Tabs.Panel value='skills-actions'>
          <PanelSkillsActions content={props.content} panelHeight={panelHeight} />
        </Tabs.Panel>

        <Tabs.Panel value='inventory'>
          <PanelInventory
            content={props.content}
            panelHeight={panelHeight}
            inventory={props.inventory}
            setInventory={props.setInventory}
          />
        </Tabs.Panel>

        <Tabs.Panel value='spells'>
          <PanelSpells panelHeight={panelHeight} />
        </Tabs.Panel>

        <Tabs.Panel value='feats-features'>
          <PanelFeatsFeatures panelHeight={panelHeight} />
        </Tabs.Panel>

        <Tabs.Panel value='companions'>
          <PanelCompanions panelHeight={panelHeight} />
        </Tabs.Panel>

        <Tabs.Panel value='details'>
          <PanelDetails content={props.content} panelHeight={panelHeight} />
        </Tabs.Panel>

        <Tabs.Panel value='notes'>
          <PanelNotes panelHeight={panelHeight} />
        </Tabs.Panel>

        <Tabs.Panel value='extras'>
          <PanelExtras panelHeight={panelHeight} />
        </Tabs.Panel>
      </Tabs>
    </BlurBox>
  );
}

interface ActionItem {
  id: number;
  name: string;
  type: string;
  cost: ActionCost;
  level?: number;
  traits?: number[];
  rarity?: Rarity;
}
function PanelSkillsActions(props: { content: ContentPackage; panelHeight: number }) {
  const theme = useMantineTheme();
  const [skillsSearch, setSkillsSearch] = useState<string>('');
  const [_drawer, openDrawer] = useRecoilState(drawerState);

  const [actionTypeFilter, setActionTypeFilter] = useState<ActionCost | 'ALL'>('ALL');
  const [actionSectionValue, setActionSectionValue] = useState<string | null>(null);

  return (
    <Group gap={10} align='flex-start' style={{ height: props.panelHeight }}>
      <Box style={{ flexBasis: 'calc(30% - 10px)' }} h='100%'>
        {/* <Paper
          shadow='sm'
          h='100%'
          p={10}
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.13)',
          }}
        ></Paper> */}
        <Stack gap={5}>
          <TextInput
            style={{ flex: 1 }}
            leftSection={<IconSearch size='0.9rem' />}
            placeholder={`Search skills`}
            onChange={(event) => setSkillsSearch(event.target.value)}
            styles={{
              input: {
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
              },
            }}
          />
          <ScrollArea h={props.panelHeight - 50} scrollbars='y'>
            <Stack gap={5}>
              {getAllSkillVariables('CHARACTER')
                .filter((skill) => skill.name !== 'SKILL_LORE____')
                .filter(
                  (skill) =>
                    variableToLabel(skill) // Normal filter by query
                      .toLowerCase()
                      .includes(skillsSearch.toLowerCase().trim()) || // If it starts with "Strength" find those skills
                    variableNameToLabel(skill.value.attribute ?? '')
                      .toLowerCase()
                      .endsWith(skillsSearch.toLowerCase().trim()) || // If it starrts with "Str" find those skills
                    skill.value.attribute?.toLowerCase().endsWith(skillsSearch.toLowerCase().trim())
                )
                .map((skill, index) => (
                  <StatButton
                    key={index}
                    onClick={() => {
                      openDrawer({
                        type: 'stat-prof',
                        data: { variableName: skill.name },
                      });
                    }}
                  >
                    <Box>
                      <Text c='gray.0' fz='sm'>
                        {variableToLabel(skill)}
                      </Text>
                    </Box>
                    <Group>
                      <Text c='gray.0'>{displayFinalProfValue('CHARACTER', skill.name)}</Text>
                      <Badge variant='default'>{skill?.value.value}</Badge>
                    </Group>
                  </StatButton>
                ))}
            </Stack>
          </ScrollArea>
        </Stack>
      </Box>
      <Box style={{ flexBasis: '70%' }} h='100%'>
        <Stack gap={5}>
          <Group>
            <TextInput
              style={{ flex: 1 }}
              leftSection={<IconSearch size='0.9rem' />}
              placeholder={`Search actions & activities`}
              onChange={(event) => setSkillsSearch(event.target.value)}
              styles={{
                input: {
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                },
              }}
            />
            <Group gap={5}>
              <ActionIcon
                variant='subtle'
                color='dark'
                radius='xl'
                size='lg'
                aria-label='Filter One Action'
                style={{
                  backgroundColor: actionTypeFilter === 'ALL' ? theme.colors.dark[6] : undefined,
                }}
                onClick={() => {
                  setActionTypeFilter('ALL');
                }}
              >
                <Text c='gray.3'>All</Text>
              </ActionIcon>
              <ActionIcon
                variant='subtle'
                color='dark'
                radius='xl'
                size='lg'
                aria-label='Filter One Action'
                style={{
                  backgroundColor:
                    actionTypeFilter === 'ONE-ACTION' ? theme.colors.dark[6] : undefined,
                }}
                onClick={() => {
                  setActionTypeFilter('ONE-ACTION');
                }}
              >
                <ActionSymbol cost={'ONE-ACTION'} size={'1.9rem'} />
              </ActionIcon>
              <ActionIcon
                variant='subtle'
                color='dark'
                radius='xl'
                size='lg'
                aria-label='Filter Two Actions'
                style={{
                  backgroundColor:
                    actionTypeFilter === 'TWO-ACTIONS' ? theme.colors.dark[6] : undefined,
                }}
                onClick={() => {
                  setActionTypeFilter('TWO-ACTIONS');
                }}
              >
                <ActionSymbol cost={'TWO-ACTIONS'} size={'1.9rem'} />
              </ActionIcon>
              <ActionIcon
                variant='subtle'
                color='dark'
                radius='xl'
                size='lg'
                aria-label='Filter Three Actions'
                style={{
                  backgroundColor:
                    actionTypeFilter === 'THREE-ACTIONS' ? theme.colors.dark[6] : undefined,
                }}
                onClick={() => {
                  setActionTypeFilter('THREE-ACTIONS');
                }}
              >
                <ActionSymbol cost={'THREE-ACTIONS'} size={'1.9rem'} />
              </ActionIcon>
              <ActionIcon
                variant='subtle'
                color='dark'
                radius='xl'
                size='lg'
                aria-label='Filter Free Action'
                style={{
                  backgroundColor:
                    actionTypeFilter === 'FREE-ACTION' ? theme.colors.dark[6] : undefined,
                }}
                onClick={() => {
                  setActionTypeFilter('FREE-ACTION');
                }}
              >
                <ActionSymbol cost={'FREE-ACTION'} size={'1.9rem'} />
              </ActionIcon>
              <ActionIcon
                variant='subtle'
                color='dark'
                radius='xl'
                size='lg'
                aria-label='Filter Reaction'
                style={{
                  backgroundColor:
                    actionTypeFilter === 'REACTION' ? theme.colors.dark[6] : undefined,
                }}
                onClick={() => {
                  setActionTypeFilter('REACTION');
                }}
              >
                <ActionSymbol cost={'REACTION'} size={'1.9rem'} />
              </ActionIcon>
            </Group>
          </Group>
          <ScrollArea h={props.panelHeight - 50} scrollbars='y'>
            <Accordion
              value={actionSectionValue}
              onChange={setActionSectionValue}
              variant='filled'
              styles={{
                label: {
                  paddingTop: 5,
                  paddingBottom: 5,
                },
                control: {
                  paddingLeft: 13,
                  paddingRight: 13,
                },
                item: {
                  marginTop: 0,
                  marginBottom: 5,
                },
              }}
            >
              <ActionAccordionItem
                id='weapon-attacks'
                title='Weapon Attacks'
                opened={actionSectionValue === 'weapon-attacks'}
                actions={[]}
              />
              <ActionAccordionItem
                id='feats'
                title='Feats (with Actions)'
                opened={actionSectionValue === 'feats'}
                actions={[]}
              />
              <ActionAccordionItem
                id='items'
                title='Items (with Actions)'
                opened={actionSectionValue === 'items'}
                actions={[]}
              />
              <ActionAccordionItem
                id='basic-actions'
                title='Basic Actions'
                opened={actionSectionValue === 'basic-actions'}
                actions={[]}
              />
              <ActionAccordionItem
                id='skill-actions'
                title='Skill Actions'
                opened={actionSectionValue === 'skill-actions'}
                actions={[]}
              />
              <ActionAccordionItem
                id='speciality-basic-actions'
                title='Speciality Basics'
                opened={actionSectionValue === 'speciality-basic-actions'}
                actions={[]}
              />
              <ActionAccordionItem
                id='exploration-activities'
                title='Exploration Activities'
                opened={actionSectionValue === 'exploration-activities'}
                actions={[]}
              />
              <ActionAccordionItem
                id='downtime-activities'
                title='Downtime Activities'
                opened={actionSectionValue === 'downtime-activities'}
                actions={[]}
              />
            </Accordion>
          </ScrollArea>
        </Stack>
      </Box>
    </Group>
  );
}

function ActionAccordionItem(props: {
  id: string;
  title: string;
  opened: boolean;
  actions: ActionItem[];
}) {
  const theme = useMantineTheme();
  const [subSectionValue, setSubSectionValue] = useState<string | null>(null);
  const { hovered, ref } = useHover();

  return (
    <Accordion.Item
      ref={ref}
      value={props.id}
      style={{
        backgroundColor: hovered && !props.opened ? ICON_BG_COLOR_HOVER : undefined,
      }}
    >
      <Accordion.Control>
        <Group wrap='nowrap' justify='space-between' gap={0}>
          <Text c='gray.5' fw={700} fz='sm'>
            {props.title}
          </Text>
          <Badge mr='sm' variant='outline' color='gray.5' size='xs'>
            <Text fz='sm' c='gray.5' span>
              {props.actions.length}
            </Text>
          </Badge>
        </Group>
      </Accordion.Control>
      <Accordion.Panel>
        {props.actions.map((action, index) => (
          <ActionSelectionOption key={index} action={action} onClick={() => {}} />
        ))}
      </Accordion.Panel>
    </Accordion.Item>
  );
}

function ActionSelectionOption(props: {
  action: ActionItem;
  onClick: (action: ActionItem) => void;
}) {
  const theme = useMantineTheme();
  const { hovered, ref } = useHover();
  const [_drawer, openDrawer] = useRecoilState(drawerState);

  return (
    <Group
      ref={ref}
      p='sm'
      style={{
        cursor: 'pointer',
        borderBottom: '1px solid ' + theme.colors.dark[6],
        backgroundColor: hovered ? theme.colors.dark[6] : 'transparent',
        position: 'relative',
      }}
      onClick={() => props.onClick(props.action)}
      justify='space-between'
    >
      {props.action.level && (
        <Text
          fz={10}
          c='dimmed'
          ta='right'
          w={14}
          style={{
            position: 'absolute',
            top: 15,
            left: 1,
          }}
        >
          {props.action.level}.
        </Text>
      )}
      <Group wrap='nowrap' gap={5}>
        <Box pl={8}>
          <Text fz='sm'>{props.action.name}</Text>
        </Box>
        <Box>
          <ActionSymbol cost={props.action.cost} />
        </Box>
      </Group>
      <Group wrap='nowrap' justify='flex-end' style={{ marginLeft: 'auto' }}>
        <Box>
          <TraitsDisplay
            justify='flex-end'
            size='xs'
            traitIds={props.action.traits ?? []}
            rarity={props.action.rarity}
          />
        </Box>
        {true && <Box w={50}></Box>}
      </Group>
      {true && (
        <Button
          size='compact-xs'
          variant='subtle'
          style={{
            position: 'absolute',
            top: 12,
            right: 10,
          }}
          onClick={(e) => {
            e.stopPropagation();
            openDrawer({ type: 'feat', data: { id: props.action.id } });
          }}
        >
          Details
        </Button>
      )}
    </Group>
  );
}

function PanelInventory(props: {
  content: ContentPackage;
  panelHeight: number;
  inventory: Inventory;
  setInventory: React.Dispatch<React.SetStateAction<Inventory>>;
}) {
  const [character, setCharacter] = useRecoilState(characterState);
  const [searchQuery, setSearchQuery] = useState('');
  const [_drawer, openDrawer] = useRecoilState(drawerState);

  const [confirmBuyItem, setConfirmBuyItem] = useState<{ item: Item }>();

  const invItems = searchQuery.trim()
    ? props.inventory.items.filter((invItem) => {
        // Custom search, alt could be to use JsSearch here
        const query = searchQuery.trim().toLowerCase();

        const checkInvItem = (invItem: InventoryItem) => {
          if (invItem.item.name.toLowerCase().includes(query)) return true;
          if (invItem.item.description.toLowerCase().includes(query)) return true;
          if (invItem.item.group.toLowerCase().includes(query)) return true;
          return false;
        };

        if (checkInvItem(invItem)) return true;
        if (invItem.container_contents.some((containedItem) => checkInvItem(containedItem)))
          return true;
        return false;
      })
    : props.inventory.items;

  return (
    <Box h='100%'>
      <Stack gap={5}>
        <Group>
          <TextInput
            style={{ flex: 1 }}
            leftSection={<IconSearch size='0.9rem' />}
            placeholder={`Search items`}
            onChange={(event) => setSearchQuery(event.target.value)}
            styles={{
              input: {
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
              },
            }}
          />
          <Badge
            variant='light'
            color='gray'
            size='lg'
            styles={{
              root: {
                textTransform: 'initial',
              },
            }}
          >
            Bulk: {labelizeBulk(getInvBulk(props.inventory), true)} / 8
          </Badge>
          <CurrencySection character={character} />
          <Button
            color='dark.6'
            radius='md'
            fw={500}
            rightSection={<IconPlus size='1.0rem' />}
            onClick={() => {
              openDrawer({
                type: 'add-item',
                data: {
                  onClick: (item: Item, type: 'GIVE' | 'BUY' | 'FORMULA') => {
                    if (!character) return;
                    if (type === 'BUY') {
                      setConfirmBuyItem({ item });
                    } else {
                      handleAddItem(props.setInventory, item, type === 'FORMULA');
                    }
                  },
                },
              });
            }}
          >
            Add Item
          </Button>
        </Group>
        <ScrollArea h={props.panelHeight - 50} scrollbars='y'>
          <Grid w={'100%'}>
            <Grid.Col span='auto'>
              <Text ta='left' fz='xs' pl={5}>
                Name
              </Text>
            </Grid.Col>
            <Grid.Col span={3}>
              <Grid>
                <Grid.Col span={2}>
                  <Text ta='center' fz='xs'>
                    Qty
                  </Text>
                </Grid.Col>
                <Grid.Col span={3}>
                  <Text ta='center' fz='xs'>
                    Bulk
                  </Text>
                </Grid.Col>
                <Grid.Col span={7}>
                  <Text ta='left' fz='xs'>
                    Price
                  </Text>
                </Grid.Col>
              </Grid>
            </Grid.Col>
            <Grid.Col span={2} offset={1}>
              <Group justify='flex-end' wrap='nowrap' align='center' h={'100%'} gap={10}></Group>
            </Grid.Col>
          </Grid>
          <Accordion
            variant='separated'
            styles={{
              label: {
                paddingTop: 5,
                paddingBottom: 5,
              },
              control: {
                paddingLeft: 13,
                paddingRight: 13,
              },
              item: {
                marginTop: 0,
                marginBottom: 5,
              },
            }}
          >
            {_.cloneDeep(invItems)
              .sort((a, b) => a.item.name.localeCompare(b.item.name))
              .map((invItem, index) => (
                <Box key={index}>
                  {isItemContainer(invItem.item) ? (
                    <Accordion.Item className={classes.item} value={`${index}`} w='100%'>
                      <Accordion.Control>
                        <InvItemOption
                          hideSections
                          invItem={invItem}
                          onEquip={() => {
                            const newInvItem = _.cloneDeep(invItem);
                            newInvItem.is_equipped = !newInvItem.is_equipped;
                            handleUpdateItem(props.setInventory, newInvItem);
                          }}
                          onInvest={() => {
                            const newInvItem = _.cloneDeep(invItem);
                            newInvItem.is_invested = !newInvItem.is_invested;
                            handleUpdateItem(props.setInventory, newInvItem);
                          }}
                          onViewItem={() => {
                            openDrawer({
                              type: 'inv-item',
                              data: {
                                zIndex: 100,
                                invItem: _.cloneDeep(invItem),
                                onItemUpdate: (newInvItem: InventoryItem) => {
                                  handleUpdateItem(props.setInventory, newInvItem);
                                },
                                onItemDelete: (newInvItem: InventoryItem) => {
                                  handleDeleteItem(props.setInventory, newInvItem);
                                  openDrawer(null);
                                },
                                onItemMove: (
                                  invItem: InventoryItem,
                                  containerItem: InventoryItem | null
                                ) => {
                                  handleMoveItem(props.setInventory, invItem, containerItem);
                                },
                              },
                            });
                          }}
                        />
                      </Accordion.Control>
                      <Accordion.Panel>
                        <Stack gap={5}>
                          {invItem?.container_contents.map((containedItem, index) => (
                            <StatButton
                              key={index}
                              onClick={() => {
                                openDrawer({
                                  type: 'inv-item',
                                  data: {
                                    zIndex: 100,
                                    invItem: _.cloneDeep(containedItem),
                                    onItemUpdate: (newInvItem: InventoryItem) => {
                                      handleUpdateItem(props.setInventory, newInvItem);
                                    },
                                    onItemDelete: (newInvItem: InventoryItem) => {
                                      handleDeleteItem(props.setInventory, newInvItem);
                                      openDrawer(null);
                                    },
                                    onItemMove: (
                                      invItem: InventoryItem,
                                      containerItem: InventoryItem | null
                                    ) => {
                                      handleMoveItem(props.setInventory, invItem, containerItem);
                                    },
                                  },
                                });
                              }}
                            >
                              <InvItemOption
                                invItem={containedItem}
                                preventEquip
                                onEquip={() => {
                                  const newInvItem = _.cloneDeep(containedItem);
                                  newInvItem.is_equipped = !newInvItem.is_equipped;
                                  handleUpdateItem(props.setInventory, newInvItem);
                                }}
                                onInvest={() => {
                                  const newInvItem = _.cloneDeep(containedItem);
                                  newInvItem.is_invested = !newInvItem.is_invested;
                                  handleUpdateItem(props.setInventory, newInvItem);
                                }}
                              />
                            </StatButton>
                          ))}
                          {invItem?.container_contents.length === 0 && (
                            <Text c='gray.7' fz='sm' ta='center' fs='italic'>
                              Container is empty
                            </Text>
                          )}
                        </Stack>
                      </Accordion.Panel>
                    </Accordion.Item>
                  ) : (
                    <Box mb={5}>
                      <StatButton
                        key={index}
                        onClick={() => {
                          openDrawer({
                            type: 'inv-item',
                            data: {
                              zIndex: 100,
                              invItem: _.cloneDeep(invItem),
                              onItemUpdate: (newInvItem: InventoryItem) => {
                                handleUpdateItem(props.setInventory, newInvItem);
                              },
                              onItemDelete: (newInvItem: InventoryItem) => {
                                handleDeleteItem(props.setInventory, newInvItem);
                                openDrawer(null);
                              },
                              onItemMove: (
                                invItem: InventoryItem,
                                containerItem: InventoryItem | null
                              ) => {
                                handleMoveItem(props.setInventory, invItem, containerItem);
                              },
                            },
                          });
                        }}
                      >
                        <InvItemOption
                          invItem={invItem}
                          onEquip={() => {
                            const newInvItem = _.cloneDeep(invItem);
                            newInvItem.is_equipped = !newInvItem.is_equipped;
                            handleUpdateItem(props.setInventory, newInvItem);
                          }}
                          onInvest={() => {
                            const newInvItem = _.cloneDeep(invItem);
                            newInvItem.is_invested = !newInvItem.is_invested;
                            handleUpdateItem(props.setInventory, newInvItem);
                          }}
                        />
                      </StatButton>
                    </Box>
                  )}
                </Box>
              ))}
            {invItems.length === 0 && (
              <Text c='gray.5' fz='sm' ta='center' fs='italic' py={20}>
                Your inventory is empty, add some items!
              </Text>
            )}
          </Accordion>
        </ScrollArea>
      </Stack>
      {confirmBuyItem && (
        <BuyItemModal
          open={!!confirmBuyItem}
          inventory={props.inventory}
          item={confirmBuyItem.item}
          onConfirm={(coins) => {
            if (!character) return;
            handleAddItem(props.setInventory, confirmBuyItem.item, false);

            // Update coins
            props.setInventory((prev) => {
              return {
                ...prev,
                coins,
              };
            });
          }}
          onClose={() => setConfirmBuyItem(undefined)}
        />
      )}
    </Box>
  );
}

function CurrencySection(props: { character: Character | null; onClick?: () => void }) {
  const pp = props.character?.inventory?.coins.pp ?? 0;
  const gp = props.character?.inventory?.coins.gp ?? 0;
  const sp = props.character?.inventory?.coins.sp ?? 0;
  const cp = props.character?.inventory?.coins.cp ?? 0;

  const displayAll = true; //!pp && !gp && !sp && !cp;

  return (
    <Group
      gap={15}
      wrap='nowrap'
      justify='center'
      miw={200}
      style={{
        cursor: 'pointer',
      }}
      onClick={props.onClick}
    >
      <CoinSection pp={pp} gp={gp} sp={sp} cp={cp} displayAll={displayAll} justify='center' />
    </Group>
  );
}

export function CoinSection(props: {
  cp?: number;
  sp?: number;
  gp?: number;
  pp?: number;
  displayAll?: boolean;
  justify?: 'flex-start' | 'center' | 'flex-end';
}) {
  const pp = props.pp ?? 0;
  const gp = props.gp ?? 0;
  const sp = props.sp ?? 0;
  const cp = props.cp ?? 0;
  return (
    <Group gap={15} wrap='nowrap' justify={props.justify}>
      {(pp || props.displayAll) && (
        <Group wrap='nowrap' gap={5}>
          <Text c='gray.4' fz='md' fw={600}>
            {pp.toLocaleString()}
          </Text>
          <Avatar src={PlatinumCoin} alt='Platinum Coins' radius='xs' size='xs' />
        </Group>
      )}
      {(gp || props.displayAll) && (
        <Group wrap='nowrap' gap={5}>
          <Text c='gray.4' fz='md' fw={600}>
            {gp.toLocaleString()}
          </Text>
          <Avatar src={GoldCoin} alt='Gold Coins' radius='xs' size='xs' />
        </Group>
      )}
      {(sp || props.displayAll) && (
        <Group wrap='nowrap' gap={5}>
          <Text c='gray.4' fz='md' fw={600}>
            {sp.toLocaleString()}
          </Text>
          <Avatar src={SilverCoin} alt='Silver Coins' radius='xs' size='xs' />
        </Group>
      )}
      {(cp || props.displayAll) && (
        <Group wrap='nowrap' gap={5}>
          <Text c='gray.4' fz='md' fw={600}>
            {cp.toLocaleString()}
          </Text>
          <Avatar src={CopperCoin} alt='Copper Coins' radius='xs' size='xs' />
        </Group>
      )}
    </Group>
  );
}

function InvItemOption(props: {
  invItem: InventoryItem;
  onEquip?: (invItem: InventoryItem) => void;
  onInvest?: (invItem: InventoryItem) => void;
  onViewItem?: (invItem: InventoryItem) => void;
  hideSections?: boolean;
  preventEquip?: boolean;
}) {
  const theme = useMantineTheme();

  const weaponStats = isItemWeapon(props.invItem.item)
    ? getWeaponStats('CHARACTER', props.invItem.item)
    : null;

  return (
    <Grid w={'100%'}>
      <Grid.Col span='auto'>
        <Group wrap='nowrap' gap={10}>
          <ItemIcon group={props.invItem.item.group} size='1.2rem' color={theme.colors.gray[6]} />
          <Text c='gray.0' fz='sm'>
            {props.invItem.item.name}
          </Text>
          {isItemContainer(props.invItem.item) && props.hideSections && (
            <Button
              variant='light'
              size='compact-xs'
              radius='xl'
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                props.onViewItem?.(props.invItem);
              }}
            >
              View Item
            </Button>
          )}
          {isItemWeapon(props.invItem.item) && weaponStats && (
            <Group wrap='nowrap' gap={10}>
              <Text c='gray.6' fz='xs' fs='italic' span>
                {sign(weaponStats.attack_bonus.total[0])}
              </Text>
              <Text c='gray.6' fz='xs' fs='italic' span>
                {weaponStats.damage.dice}
                {weaponStats.damage.die}
                {weaponStats.damage.bonus.total > 0
                  ? ` + ${weaponStats.damage.bonus.total}`
                  : ``}{' '}
                {weaponStats.damage.damageType}
              </Text>
            </Group>
          )}
        </Group>
      </Grid.Col>
      <Grid.Col span={3}>
        <Grid>
          <Grid.Col span={2}>
            {!props.hideSections && (
              <>
                {' '}
                {isItemWithQuantity(props.invItem.item) && (
                  <Text ta='center' fz='xs'>
                    {getItemQuantity(props.invItem.item)}
                  </Text>
                )}
              </>
            )}
          </Grid.Col>
          <Grid.Col span={3}>
            {!props.hideSections && (
              <>
                {' '}
                <Text ta='center' fz='xs'>
                  {labelizeBulk(props.invItem.item.bulk)}
                </Text>
              </>
            )}
          </Grid.Col>
          <Grid.Col span={7}>
            {!props.hideSections && (
              <>
                {' '}
                <Text ta='left' fz='xs'>
                  {priceToString(props.invItem.item.price)}
                </Text>
              </>
            )}
          </Grid.Col>
        </Grid>
      </Grid.Col>
      <Grid.Col span={2} offset={1}>
        <Group justify='flex-end' wrap='nowrap' align='center' h={'100%'} gap={10}>
          {isItemInvestable(props.invItem.item) && (
            <Button
              size='compact-xs'
              variant={props.invItem.is_invested ? 'subtle' : 'outline'}
              color={props.invItem.is_equipped ? 'gray.7' : undefined}
              onClick={(e) => {
                e.stopPropagation();
                props.onInvest?.(props.invItem);
              }}
              w={80}
            >
              {props.invItem.is_invested ? 'Divest' : 'Invest'}
            </Button>
          )}
          {isItemEquippable(props.invItem.item) && (
            <Button
              size='compact-xs'
              variant={props.invItem.is_equipped ? 'subtle' : 'outline'}
              color={props.invItem.is_equipped ? 'gray.7' : undefined}
              onClick={(e) => {
                e.stopPropagation();
                props.onEquip?.(props.invItem);
              }}
              w={80}
              disabled={props.preventEquip}
            >
              {props.invItem.is_equipped ? 'Unequip' : 'Equip'}
            </Button>
          )}
        </Group>
      </Grid.Col>
    </Grid>
  );
}

function PanelSpells(props: { panelHeight: number }) {
  return null;
}

function PanelFeatsFeatures(props: { panelHeight: number }) {
  const theme = useMantineTheme();
  const character = useRecoilValue(characterState);
  const [searchQuery, setSearchQuery] = useState('');
  const [_drawer, openDrawer] = useRecoilState(drawerState);
  const [section, setSection] = useState('FEATS');

  const { data: rawData } = useQuery({
    queryKey: [`find-feats-and-features`],
    queryFn: async () => {
      if (!character) return null;

      const abilityBlocks = await fetchContentAll<AbilityBlock>('ability-block');
      return collectCharacterAbilityBlocks(character, abilityBlocks);
    },
  });

  // Filter options based on search query
  const search = useRef(new JsSearch.Search('id'));
  useEffect(() => {
    if (!rawData) return;
    search.current.addIndex('name');
    search.current.addIndex('description');
    search.current.addIndex('_group');
    search.current.addDocuments([
      ...rawData.ancestryFeats.map((feat) => ({
        ...feat,
        _group: 'ancestryFeats',
      })),
      ...rawData.classFeats.map((feat) => ({ ...feat, _group: 'classFeats' })),
      ...rawData.generalAndSkillFeats.map((feat) => ({
        ...feat,
        _group: 'generalAndSkillFeats',
      })),
      ...rawData.otherFeats.map((feat) => ({ ...feat, _group: 'otherFeats' })),
      ...rawData.classFeatures.map((feat) => ({
        ...feat,
        _group: 'classFeatures',
      })),
      ...rawData.heritages.map((feat) => ({ ...feat, _group: 'heritages' })),
      ...rawData.physicalFeatures.map((feat) => ({
        ...feat,
        _group: 'physicalFeatures',
      })),
    ]);
  }, [rawData]);

  const constructData = (data: Record<string, any>[]) => {
    const classFeats = data.filter((feat) => feat._group === 'classFeats');
    const ancestryFeats = data.filter((feat) => feat._group === 'ancestryFeats');
    const generalAndSkillFeats = data.filter((feat) => feat._group === 'generalAndSkillFeats');
    const otherFeats = data.filter((feat) => feat._group === 'otherFeats');
    const classFeatures = data.filter((feat) => feat._group === 'classFeatures');
    const heritages = data.filter((feat) => feat._group === 'heritages');
    const physicalFeatures = data.filter((feat) => feat._group === 'physicalFeatures');

    return {
      classFeats,
      ancestryFeats,
      generalAndSkillFeats,
      otherFeats,
      classFeatures,
      heritages,
      physicalFeatures,
    } as typeof rawData;
  };

  const data = searchQuery.trim()
    ? constructData(search.current.search(searchQuery.trim()))
    : rawData;

  return (
    <Box h='100%'>
      <Stack gap={5}>
        <Group>
          <TextInput
            style={{ flex: 1 }}
            leftSection={<IconSearch size='0.9rem' />}
            placeholder={`Search feats & features`}
            onChange={(event) => setSearchQuery(event.target.value)}
            styles={{
              input: {
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
              },
            }}
          />
          <SegmentedControl
            value={section}
            onChange={setSection}
            disabled={!!searchQuery.trim()}
            data={[
              { label: 'Feats', value: 'FEATS' },
              { label: 'Features', value: 'FEATURES' },
            ]}
          />
        </Group>
        <ScrollArea h={props.panelHeight - 50} scrollbars='y'>
          {data && (section === 'FEATS' || searchQuery.trim()) && (
            <Accordion
              variant='separated'
              multiple
              defaultValue={['class-feats', 'ancestry-feats', 'general-skill-feats', 'other-feats']}
              styles={{
                label: {
                  paddingTop: 5,
                  paddingBottom: 5,
                },
                control: {
                  paddingLeft: 13,
                  paddingRight: 13,
                },
                item: {
                  marginTop: 0,
                  marginBottom: 5,
                },
              }}
            >
              {data.classFeats.length > 0 && (
                <Accordion.Item value='class-feats'>
                  <Accordion.Control>Class Feats</Accordion.Control>
                  <Accordion.Panel
                    styles={{
                      content: {
                        padding: 0,
                      },
                    }}
                  >
                    <Stack gap={0}>
                      <Divider color='dark.6' />
                      {data.classFeats.map((feat, index) => (
                        <FeatSelectionOption
                          key={index}
                          feat={feat}
                          displayLevel
                          onClick={() => {
                            openDrawer({
                              type: 'feat',
                              data: { id: feat.id },
                              extra: { addToHistory: true },
                            });
                          }}
                        />
                      ))}
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>
              )}
              {data.ancestryFeats.length > 0 && (
                <Accordion.Item value='ancestry-feats'>
                  <Accordion.Control>Ancestry Feats</Accordion.Control>
                  <Accordion.Panel
                    styles={{
                      content: {
                        padding: 0,
                      },
                    }}
                  >
                    <Stack gap={0}>
                      <Divider color='dark.6' />
                      {data.ancestryFeats.map((feat, index) => (
                        <FeatSelectionOption
                          key={index}
                          feat={feat}
                          displayLevel
                          onClick={() => {
                            openDrawer({
                              type: 'feat',
                              data: { id: feat.id },
                              extra: { addToHistory: true },
                            });
                          }}
                        />
                      ))}
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>
              )}
              {data.generalAndSkillFeats.length > 0 && (
                <Accordion.Item value='general-skill-feats'>
                  <Accordion.Control>General & Skill Feats</Accordion.Control>
                  <Accordion.Panel
                    styles={{
                      content: {
                        padding: 0,
                      },
                    }}
                  >
                    <Stack gap={0}>
                      <Divider color='dark.6' />
                      {data.generalAndSkillFeats.map((feat, index) => (
                        <FeatSelectionOption
                          key={index}
                          feat={feat}
                          displayLevel
                          onClick={() => {
                            openDrawer({
                              type: 'feat',
                              data: { id: feat.id },
                              extra: { addToHistory: true },
                            });
                          }}
                        />
                      ))}
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>
              )}
              {data.otherFeats.length > 0 && (
                <Accordion.Item value='other-feats'>
                  <Accordion.Control>Other Feats</Accordion.Control>
                  <Accordion.Panel
                    styles={{
                      content: {
                        padding: 0,
                      },
                    }}
                  >
                    <Stack gap={0}>
                      <Divider color='dark.6' />
                      {data.otherFeats.map((feat, index) => (
                        <FeatSelectionOption
                          key={index}
                          feat={feat}
                          displayLevel
                          onClick={() => {
                            openDrawer({
                              type: 'feat',
                              data: { id: feat.id },
                              extra: { addToHistory: true },
                            });
                          }}
                        />
                      ))}
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>
              )}
            </Accordion>
          )}

          {data && (section === 'FEATURES' || searchQuery.trim()) && (
            <Accordion
              variant='separated'
              multiple
              defaultValue={['class-features', 'heritages', 'ancestry-features']}
              styles={{
                label: {
                  paddingTop: 5,
                  paddingBottom: 5,
                },
                control: {
                  paddingLeft: 13,
                  paddingRight: 13,
                },
                item: {
                  marginTop: 0,
                  marginBottom: 5,
                },
              }}
            >
              {data.classFeatures.length > 0 && (
                <Accordion.Item value='class-features'>
                  <Accordion.Control>Class Features</Accordion.Control>
                  <Accordion.Panel
                    styles={{
                      content: {
                        padding: 0,
                      },
                    }}
                  >
                    <Stack gap={0}>
                      <Divider color='dark.6' />
                      {data.classFeatures.map((feature, index) => (
                        <ClassFeatureSelectionOption
                          key={index}
                          classFeature={feature}
                          onClick={() => {
                            openDrawer({
                              type: 'class-feature',
                              data: { id: feature.id },
                              extra: { addToHistory: true },
                            });
                          }}
                        />
                      ))}
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>
              )}
              {data.heritages.length > 0 && (
                <Accordion.Item value='heritages'>
                  <Accordion.Control>Heritage</Accordion.Control>
                  <Accordion.Panel
                    styles={{
                      content: {
                        padding: 0,
                      },
                    }}
                  >
                    <Stack gap={0}>
                      <Divider color='dark.6' />
                      {data.heritages.map((heritage, index) => (
                        <HeritageSelectionOption
                          key={index}
                          heritage={heritage}
                          onClick={() => {
                            openDrawer({
                              type: 'heritage',
                              data: { id: heritage.id },
                              extra: { addToHistory: true },
                            });
                          }}
                        />
                      ))}
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>
              )}
              {data.physicalFeatures.length > 0 && (
                <Accordion.Item value='ancestry-features'>
                  <Accordion.Control>Ancestry Features</Accordion.Control>
                  <Accordion.Panel
                    styles={{
                      content: {
                        padding: 0,
                      },
                    }}
                  >
                    <Stack gap={0}>
                      <Divider color='dark.6' />
                      {data.physicalFeatures.map((feature, index) => (
                        <PhysicalFeatureSelectionOption
                          key={index}
                          physicalFeature={feature}
                          onClick={() => {
                            openDrawer({
                              type: 'physical-feature',
                              data: { id: feature.id },
                              extra: { addToHistory: true },
                            });
                          }}
                        />
                      ))}
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>
              )}
            </Accordion>
          )}
        </ScrollArea>
      </Stack>
    </Box>
  );
}

function PanelCompanions(props: { panelHeight: number }) {
  return null;
}

function PanelDetails(props: { content: ContentPackage; panelHeight: number }) {
  const [_drawer, openDrawer] = useRecoilState(drawerState);

  const [character, setCharacter] = useRecoilState(characterState);

  const languages = (getVariable<VariableListStr>('CHARACTER', 'LANGUAGE_IDS')?.value ?? []).map(
    (langId) => {
      const lang = props.content.languages.find((lang) => `${lang.id}` === langId);
      return lang;
    }
  );

  const weaponGroupProfs = getAllWeaponGroupVariables('CHARACTER').filter(
    (prof) => prof.value.value !== 'U'
  );
  const weaponProfs = getAllWeaponVariables('CHARACTER').filter((prof) => prof.value.value !== 'U');

  const armorGroupProfs = getAllArmorGroupVariables('CHARACTER').filter(
    (prof) => prof.value.value !== 'U'
  );
  const armorProfs = getAllArmorVariables('CHARACTER').filter((prof) => prof.value.value !== 'U');

  return (
    <Group align='flex-start'>
      <Paper
        shadow='sm'
        p='sm'
        h='100%'
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.13)',
          flex: 1,
        }}
      >
        <Stack gap={10}>
          <Title order={4}>Information</Title>
          <ScrollArea h={props.panelHeight - 60} scrollbars='y'>
            <Box w={280}>
              <Stack gap={5}>
                <TextInput
                  label='Organized Play ID'
                  placeholder='Organized Play ID'
                  defaultValue={character?.details?.info?.organized_play_id}
                  onChange={(e) => {
                    if (!character) return;
                    setCharacter({
                      ...character,
                      details: {
                        ...character.details,
                        info: {
                          ...character.details?.info,
                          organized_play_id: e.target.value,
                        },
                      },
                    });
                  }}
                  rightSection={
                    <ActionIcon
                      variant='subtle'
                      radius='xl'
                      color='gray.5'
                      aria-label='Organized Play Website'
                      component='a'
                      href='https://paizo.com/organizedplay'
                      target='_blank'
                    >
                      <IconExternalLink style={{ width: '70%', height: '70%' }} stroke={1.5} />
                    </ActionIcon>
                  }
                />
                <Divider mt='sm' />
                <Textarea
                  label='Appearance'
                  placeholder='Appearance'
                  autosize
                  defaultValue={character?.details?.info?.appearance}
                  onChange={(e) => {
                    if (!character) return;
                    setCharacter({
                      ...character,
                      details: {
                        ...character.details,
                        info: {
                          ...character.details?.info,
                          appearance: e.target.value,
                        },
                      },
                    });
                  }}
                />
                <Textarea
                  label='Personality'
                  placeholder='Personality'
                  autosize
                  defaultValue={character?.details?.info?.personality}
                  onChange={(e) => {
                    if (!character) return;
                    setCharacter({
                      ...character,
                      details: {
                        ...character.details,
                        info: {
                          ...character.details?.info,
                          personality: e.target.value,
                        },
                      },
                    });
                  }}
                />
                <Textarea
                  label='Alignment'
                  placeholder='Alignment'
                  autosize
                  defaultValue={character?.details?.info?.alignment}
                  onChange={(e) => {
                    if (!character) return;
                    setCharacter({
                      ...character,
                      details: {
                        ...character.details,
                        info: {
                          ...character.details?.info,
                          alignment: e.target.value,
                        },
                      },
                    });
                  }}
                />
                <Textarea
                  label='Beliefs'
                  placeholder='Beliefs'
                  autosize
                  defaultValue={character?.details?.info?.beliefs}
                  onChange={(e) => {
                    if (!character) return;
                    setCharacter({
                      ...character,
                      details: {
                        ...character.details,
                        info: {
                          ...character.details?.info,
                          beliefs: e.target.value,
                        },
                      },
                    });
                  }}
                />
                <Divider mt='sm' />
                <TextInput
                  label='Age'
                  placeholder='Age'
                  defaultValue={character?.details?.info?.age}
                  onChange={(e) => {
                    if (!character) return;
                    setCharacter({
                      ...character,
                      details: {
                        ...character.details,
                        info: {
                          ...character.details?.info,
                          age: e.target.value,
                        },
                      },
                    });
                  }}
                />
                <TextInput
                  label='Height'
                  placeholder='Height'
                  defaultValue={character?.details?.info?.height}
                  onChange={(e) => {
                    if (!character) return;
                    setCharacter({
                      ...character,
                      details: {
                        ...character.details,
                        info: {
                          ...character.details?.info,
                          height: e.target.value,
                        },
                      },
                    });
                  }}
                />
                <TextInput
                  label='Weight'
                  placeholder='Weight'
                  defaultValue={character?.details?.info?.weight}
                  onChange={(e) => {
                    if (!character) return;
                    setCharacter({
                      ...character,
                      details: {
                        ...character.details,
                        info: {
                          ...character.details?.info,
                          weight: e.target.value,
                        },
                      },
                    });
                  }}
                />
                <TextInput
                  label='Gender'
                  placeholder='Gender'
                  defaultValue={character?.details?.info?.gender}
                  onChange={(e) => {
                    if (!character) return;
                    setCharacter({
                      ...character,
                      details: {
                        ...character.details,
                        info: {
                          ...character.details?.info,
                          gender: e.target.value,
                        },
                      },
                    });
                  }}
                />
                <TextInput
                  label='Pronouns'
                  placeholder='Pronouns'
                  defaultValue={character?.details?.info?.pronouns}
                  onChange={(e) => {
                    if (!character) return;
                    setCharacter({
                      ...character,
                      details: {
                        ...character.details,
                        info: {
                          ...character.details?.info,
                          pronouns: e.target.value,
                        },
                      },
                    });
                  }}
                />
                <Divider mt='sm' />
                <TextInput
                  label='Faction'
                  placeholder='Faction'
                  defaultValue={character?.details?.info?.faction}
                  onChange={(e) => {
                    if (!character) return;
                    setCharacter({
                      ...character,
                      details: {
                        ...character.details,
                        info: {
                          ...character.details?.info,
                          faction: e.target.value,
                        },
                      },
                    });
                  }}
                />
                <TextInput
                  label='Ethnicity'
                  placeholder='Ethnicity'
                  defaultValue={character?.details?.info?.ethnicity}
                  onChange={(e) => {
                    if (!character) return;
                    setCharacter({
                      ...character,
                      details: {
                        ...character.details,
                        info: {
                          ...character.details?.info,
                          ethnicity: e.target.value,
                        },
                      },
                    });
                  }}
                />
                <TextInput
                  label='Nationality'
                  placeholder='Nationality'
                  defaultValue={character?.details?.info?.nationality}
                  onChange={(e) => {
                    if (!character) return;
                    setCharacter({
                      ...character,
                      details: {
                        ...character.details,
                        info: {
                          ...character.details?.info,
                          nationality: e.target.value,
                        },
                      },
                    });
                  }}
                />
                <TextInput
                  label='Birthplace'
                  placeholder='Birthplace'
                  defaultValue={character?.details?.info?.birthplace}
                  onChange={(e) => {
                    if (!character) return;
                    setCharacter({
                      ...character,
                      details: {
                        ...character.details,
                        info: {
                          ...character.details?.info,
                          birthplace: e.target.value,
                        },
                      },
                    });
                  }}
                />
              </Stack>
            </Box>
          </ScrollArea>
        </Stack>
      </Paper>
      <Paper
        shadow='sm'
        p='sm'
        h='100%'
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.13)',
        }}
      >
        <Stack gap={10}>
          <Title order={4}>Languages</Title>
          <ScrollArea h={props.panelHeight - 60} scrollbars='y'>
            <Box w={280}>
              <Pill.Group>
                {languages.map((language, index) => (
                  <Pill
                    key={index}
                    size='md'
                    styles={{
                      label: {
                        cursor: 'pointer',
                      },
                    }}
                    onClick={() => {
                      openDrawer({
                        type: 'language',
                        data: { id: language?.id },
                      });
                    }}
                  >
                    {language?.name ?? 'Unknown'}
                  </Pill>
                ))}
              </Pill.Group>
            </Box>
          </ScrollArea>
        </Stack>
      </Paper>
      <Paper
        shadow='sm'
        p='sm'
        h='100%'
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.13)',
        }}
      >
        <Stack gap={10}>
          <Title order={4}>Proficiencies</Title>
          <ScrollArea h={props.panelHeight - 60} scrollbars='y'>
            <Box w={280}>
              <Accordion
                variant='separated'
                styles={{
                  label: {
                    paddingTop: 5,
                    paddingBottom: 5,
                  },
                  control: {
                    paddingLeft: 13,
                    paddingRight: 13,
                  },
                  item: {
                    marginTop: 0,
                    marginBottom: 5,
                  },
                }}
              >
                <Accordion.Item className={classes.item} value={'attacks'} w='100%'>
                  <Accordion.Control>
                    <Text c='white' fz='sm'>
                      Attacks
                    </Text>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <Stack gap={5}>
                      <StatButton
                        onClick={() => {
                          openDrawer({
                            type: 'stat-prof',
                            data: { variableName: 'SIMPLE_WEAPONS' },
                          });
                        }}
                      >
                        <Box>
                          <Text c='gray.0' fz='sm'>
                            Simple Weapons
                          </Text>
                        </Box>
                        <Group>
                          <Badge variant='default'>
                            {getVariable<VariableProf>('CHARACTER', 'SIMPLE_WEAPONS')?.value.value}
                          </Badge>
                        </Group>
                      </StatButton>
                      <StatButton
                        onClick={() => {
                          openDrawer({
                            type: 'stat-prof',
                            data: { variableName: 'MARTIAL_WEAPONS' },
                          });
                        }}
                      >
                        <Box>
                          <Text c='gray.0' fz='sm'>
                            Martial Weapons
                          </Text>
                        </Box>
                        <Group>
                          <Badge variant='default'>
                            {getVariable<VariableProf>('CHARACTER', 'MARTIAL_WEAPONS')?.value.value}
                          </Badge>
                        </Group>
                      </StatButton>
                      <StatButton
                        onClick={() => {
                          openDrawer({
                            type: 'stat-prof',
                            data: { variableName: 'ADVANCED_WEAPONS' },
                          });
                        }}
                      >
                        <Box>
                          <Text c='gray.0' fz='sm'>
                            Advanced Weapons
                          </Text>
                        </Box>
                        <Group>
                          <Badge variant='default'>
                            {
                              getVariable<VariableProf>('CHARACTER', 'ADVANCED_WEAPONS')?.value
                                .value
                            }
                          </Badge>
                        </Group>
                      </StatButton>
                      <StatButton
                        onClick={() => {
                          openDrawer({
                            type: 'stat-prof',
                            data: { variableName: 'UNARMED_ATTACKS' },
                          });
                        }}
                      >
                        <Box>
                          <Text c='gray.0' fz='sm'>
                            Unarmed Attacks
                          </Text>
                        </Box>
                        <Group>
                          <Badge variant='default'>
                            {getVariable<VariableProf>('CHARACTER', 'UNARMED_ATTACKS')?.value.value}
                          </Badge>
                        </Group>
                      </StatButton>
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>
                <Accordion.Item className={classes.item} value={'defenses'}>
                  <Accordion.Control>
                    <Text c='white' fz='sm'>
                      Defenses
                    </Text>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <Stack gap={5}>
                      <StatButton
                        onClick={() => {
                          openDrawer({
                            type: 'stat-prof',
                            data: { variableName: 'LIGHT_ARMOR' },
                          });
                        }}
                      >
                        <Box>
                          <Text c='gray.0' fz='sm'>
                            Light Armor
                          </Text>
                        </Box>
                        <Group>
                          <Badge variant='default'>
                            {getVariable<VariableProf>('CHARACTER', 'LIGHT_ARMOR')?.value.value}
                          </Badge>
                        </Group>
                      </StatButton>
                      <StatButton
                        onClick={() => {
                          openDrawer({
                            type: 'stat-prof',
                            data: { variableName: 'MEDIUM_ARMOR' },
                          });
                        }}
                      >
                        <Box>
                          <Text c='gray.0' fz='sm'>
                            Medium Armor
                          </Text>
                        </Box>
                        <Group>
                          <Badge variant='default'>
                            {getVariable<VariableProf>('CHARACTER', 'MEDIUM_ARMOR')?.value.value}
                          </Badge>
                        </Group>
                      </StatButton>
                      <StatButton
                        onClick={() => {
                          openDrawer({
                            type: 'stat-prof',
                            data: { variableName: 'HEAVY_ARMOR' },
                          });
                        }}
                      >
                        <Box>
                          <Text c='gray.0' fz='sm'>
                            Heavy Armor
                          </Text>
                        </Box>
                        <Group>
                          <Badge variant='default'>
                            {getVariable<VariableProf>('CHARACTER', 'HEAVY_ARMOR')?.value.value}
                          </Badge>
                        </Group>
                      </StatButton>
                      <StatButton
                        onClick={() => {
                          openDrawer({
                            type: 'stat-prof',
                            data: { variableName: 'UNARMORED_DEFENSE' },
                          });
                        }}
                      >
                        <Box>
                          <Text c='gray.0' fz='sm'>
                            Unarmored Defense
                          </Text>
                        </Box>
                        <Group>
                          <Badge variant='default'>
                            {
                              getVariable<VariableProf>('CHARACTER', 'UNARMORED_DEFENSE')?.value
                                .value
                            }
                          </Badge>
                        </Group>
                      </StatButton>
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>
                <Accordion.Item className={classes.item} value={'spellcasting'}>
                  <Accordion.Control>
                    <Text c='white' fz='sm'>
                      Spellcasting
                    </Text>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <Stack gap={5}>
                      <StatButton
                        onClick={() => {
                          openDrawer({
                            type: 'stat-prof',
                            data: { variableName: 'SPELL_ATTACK' },
                          });
                        }}
                      >
                        <Box>
                          <Text c='gray.0' fz='sm'>
                            Spell Attack
                          </Text>
                        </Box>
                        <Group>
                          <Text c='gray.0'>
                            {displayFinalProfValue('CHARACTER', 'SPELL_ATTACK')}
                          </Text>
                          <Badge variant='default'>
                            {getVariable<VariableProf>('CHARACTER', 'SPELL_ATTACK')?.value.value}
                          </Badge>
                        </Group>
                      </StatButton>
                      <StatButton
                        onClick={() => {
                          openDrawer({
                            type: 'stat-prof',
                            data: { variableName: 'SPELL_DC' },
                          });
                        }}
                      >
                        <Box>
                          <Text c='gray.0' fz='sm'>
                            Spell DC
                          </Text>
                        </Box>
                        <Group>
                          <Text c='gray.0'>{displayFinalProfValue('CHARACTER', 'SPELL_DC')}</Text>
                          <Badge variant='default'>
                            {getVariable<VariableProf>('CHARACTER', 'SPELL_DC')?.value.value}
                          </Badge>
                        </Group>
                      </StatButton>
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>

                {weaponProfs.length > 0 && (
                  <Accordion.Item className={classes.item} value={'weapons'}>
                    <Accordion.Control>
                      <Text c='white' fz='sm'>
                        Weapons
                      </Text>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Stack gap={5}>
                        {weaponProfs.map((weapon, index) => (
                          <StatButton
                            key={index}
                            onClick={() => {
                              openDrawer({
                                type: 'stat-prof',
                                data: { variableName: weapon.name },
                              });
                            }}
                          >
                            <Box>
                              <Text c='gray.0' fz='sm'>
                                {variableToLabel(weapon)}
                              </Text>
                            </Box>
                            <Group>
                              <Badge variant='default'>{weapon.value.value}</Badge>
                            </Group>
                          </StatButton>
                        ))}
                      </Stack>
                    </Accordion.Panel>
                  </Accordion.Item>
                )}
                {weaponGroupProfs.length > 0 && (
                  <Accordion.Item className={classes.item} value={'weapon-groups'}>
                    <Accordion.Control>
                      <Text c='white' fz='sm'>
                        Weapon Groups
                      </Text>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Stack gap={5}>
                        {weaponGroupProfs.map((weapon, index) => (
                          <StatButton
                            key={index}
                            onClick={() => {
                              openDrawer({
                                type: 'stat-prof',
                                data: { variableName: weapon.name },
                              });
                            }}
                          >
                            <Box>
                              <Text c='gray.0' fz='sm'>
                                {variableToLabel(weapon)}
                              </Text>
                            </Box>
                            <Group>
                              <Badge variant='default'>{weapon.value.value}</Badge>
                            </Group>
                          </StatButton>
                        ))}
                      </Stack>
                    </Accordion.Panel>
                  </Accordion.Item>
                )}

                {armorProfs.length > 0 && (
                  <Accordion.Item className={classes.item} value={'armor'}>
                    <Accordion.Control>
                      <Text c='white' fz='sm'>
                        Armor
                      </Text>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Stack gap={5}>
                        {armorProfs.map((armor, index) => (
                          <StatButton
                            key={index}
                            onClick={() => {
                              openDrawer({
                                type: 'stat-prof',
                                data: { variableName: armor.name },
                              });
                            }}
                          >
                            <Box>
                              <Text c='gray.0' fz='sm'>
                                {variableToLabel(armor)}
                              </Text>
                            </Box>
                            <Group>
                              <Badge variant='default'>{armor.value.value}</Badge>
                            </Group>
                          </StatButton>
                        ))}
                      </Stack>
                    </Accordion.Panel>
                  </Accordion.Item>
                )}
                {armorGroupProfs.length > 0 && (
                  <Accordion.Item className={classes.item} value={'armor-groups'}>
                    <Accordion.Control>
                      <Text c='white' fz='sm'>
                        Armor Groups
                      </Text>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Stack gap={5}>
                        {armorGroupProfs.map((armor, index) => (
                          <StatButton
                            key={index}
                            onClick={() => {
                              openDrawer({
                                type: 'stat-prof',
                                data: { variableName: armor.name },
                              });
                            }}
                          >
                            <Box>
                              <Text c='gray.0' fz='sm'>
                                {variableToLabel(armor)}
                              </Text>
                            </Box>
                            <Group>
                              <Badge variant='default'>{armor.value.value}</Badge>
                            </Group>
                          </StatButton>
                        ))}
                      </Stack>
                    </Accordion.Panel>
                  </Accordion.Item>
                )}

                <StatButton
                  onClick={() => {
                    openDrawer({
                      type: 'stat-prof',
                      data: { variableName: 'CLASS_DC', isDC: true },
                    });
                  }}
                >
                  <Box>
                    <Text c='gray.0' fz='sm'>
                      Class DC
                    </Text>
                  </Box>
                  <Group>
                    <Text c='gray.0'>{displayFinalProfValue('CHARACTER', 'CLASS_DC', true)}</Text>
                    <Badge variant='default'>
                      {getVariable<VariableProf>('CHARACTER', 'CLASS_DC')?.value.value}
                    </Badge>
                  </Group>
                </StatButton>
              </Accordion>
            </Box>
          </ScrollArea>
        </Stack>
      </Paper>
    </Group>
  );
}

function PanelNotes(props: { panelHeight: number }) {
  const [activeTab, setActiveTab] = useState<string | null>('0');
  const [character, setCharacter] = useRecoilState(characterState);

  const defaultPage = {
    name: 'Notes',
    icon: 'notebook',
    color: character?.details?.sheet_theme?.color || GUIDE_BLUE,
    contents: null,
  };

  const pages = character?.notes?.pages ?? [_.cloneDeep(defaultPage)];

  return (
    <Tabs orientation='vertical' value={activeTab} onChange={setActiveTab}>
      <Tabs.List w={180} h={props.panelHeight}>
        {pages.map((page, index) => (
          <Tabs.Tab
            key={index}
            value={`${index}`}
            leftSection={
              <ActionIcon
                variant='transparent'
                aria-label={`${page.name}`}
                color={page.color}
                size='xs'
              >
                <Icon name={page.icon} size='1rem' />
              </ActionIcon>
            }
            color={page.color}
          >
            {_.truncate(page.name, { length: 16 })}
          </Tabs.Tab>
        ))}
        <Tabs.Tab
          value='add_page'
          mt='auto'
          leftSection={
            <ActionIcon variant='transparent' size='xs' color='gray.5'>
              <IconPlus size='1rem' />
            </ActionIcon>
          }
          onClick={(e) => {
            if (!character) return;
            e.stopPropagation();
            e.preventDefault();
            const newPages = _.cloneDeep(pages);
            newPages.push(_.cloneDeep(defaultPage));
            setCharacter({
              ...character,
              notes: {
                ...character.notes,
                pages: newPages,
              },
            });
            setActiveTab(`${newPages.length - 1}`);
          }}
        >
          Add Page
        </Tabs.Tab>
      </Tabs.List>

      {pages.map((page, index) => (
        <Tabs.Panel key={index} value={`${index}`} style={{ position: 'relative' }}>
          <ScrollArea h={props.panelHeight} scrollbars='y'>
            <RichTextInput
              placeholder='Your notes...'
              value={page.contents}
              onChange={(text, json) => {
                if (!character) return;
                const newPages = _.cloneDeep(pages);
                newPages[index].contents = json;
                setCharacter({
                  ...character,
                  notes: {
                    ...character.notes,
                    pages: newPages,
                  },
                });
              }}
            />
            <ActionIcon
              variant='subtle'
              aria-label={`Page Settings`}
              size='md'
              radius='xl'
              color='gray.5'
              style={{
                position: 'absolute',
                top: 10,
                right: 10,
              }}
              onClick={() => {
                openContextModal({
                  modal: 'updateNotePage',
                  title: <Title order={3}>Update Page</Title>,
                  innerProps: {
                    page: page,
                    onUpdate: (name, icon, color) => {
                      if (!character) return;
                      const newPages = _.cloneDeep(pages);
                      newPages[index] = {
                        ...newPages[index],
                        name: name,
                        icon: icon,
                        color: color,
                      };
                      setCharacter({
                        ...character,
                        notes: {
                          ...character.notes,
                          pages: newPages,
                        },
                      });
                    },
                    onDelete: () => {
                      if (!character) return;
                      const newPages = _.cloneDeep(pages);
                      newPages.splice(index, 1);
                      setCharacter({
                        ...character,
                        notes: {
                          ...character.notes,
                          pages: newPages,
                        },
                      });
                      setActiveTab(`0`);
                    },
                  },
                });
              }}
            >
              <IconSettings size='1.2rem' />
            </ActionIcon>
          </ScrollArea>
        </Tabs.Panel>
      ))}
    </Tabs>
  );
}

function PanelExtras(props: { panelHeight: number }) {
  return null;
}
