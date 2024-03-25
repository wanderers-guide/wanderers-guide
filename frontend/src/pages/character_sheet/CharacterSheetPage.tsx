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
import { getCachedPublicUser } from '@auth/user-manager';
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
  SpellSelectionOption,
  selectContent,
} from '@common/select/SelectContent';
import {
  applyConditions,
  compiledConditions,
  getAllConditions,
  getConditionByName,
} from '@conditions/condition-handler';
import { GUIDE_BLUE, ICON_BG_COLOR, ICON_BG_COLOR_HOVER, LEGACY_URL } from '@constants/data';
import { collectCharacterAbilityBlocks, collectCharacterSpellcasting } from '@content/collect-content';
import { defineDefaultSources, fetchContentAll, fetchContentPackage } from '@content/content-store';
import { saveCustomization } from '@content/customization-cache';
import classes from '@css/FaqSimple.module.css';
import tinyInputClasses from '@css/TinyBlurInput.module.css';
import { priceToString } from '@items/currency-handler';
import {
  addExtraItems,
  checkBulkLimit,
  getBestArmor,
  getBestShield,
  getBulkLimit,
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
  reachedInvestedLimit,
} from '@items/inv-utils';
import { getWeaponStats } from '@items/weapon-handler';
import {
  Accordion,
  ActionIcon,
  Anchor,
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
  useForceUpdate,
  useHover,
  useInterval,
} from '@mantine/hooks';
import { modals, openContextModal } from '@mantine/modals';
import { BuyItemModal } from '@modals/BuyItemModal';
import ManageSpellsModal from '@modals/ManageSpellsModal';
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
  IconSquareRounded,
  IconSquareRoundedFilled,
} from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AbilityBlock,
  ActionCost,
  CastingSource,
  Character,
  ContentPackage,
  Inventory,
  InventoryItem,
  Item,
  Rarity,
  Spell,
  SpellInnateEntry,
  SpellSlot,
} from '@typing/content';
import { DrawerType } from '@typing/index';
import { OperationResultPackage } from '@typing/operations';
import { JSendResponse } from '@typing/requests';
import { VariableAttr, VariableListStr, VariableNum, VariableProf } from '@typing/variables';
import { findActions } from '@utils/actions';
import { interpolateHealth } from '@utils/colors';
import { setPageTitle } from '@utils/document-change';
import { rankNumber, sign } from '@utils/numbers';
import { toLabel } from '@utils/strings';
import { hasTraitType } from '@utils/traits';
import {
  displayAttributeValue,
  displayFinalAcValue,
  displayFinalProfValue,
  getFinalAcValue,
  getFinalHealthValue,
  getFinalVariableValue,
} from '@variables/variable-display';
import {
  addVariableBonus,
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
import { useEffect, useMemo, useRef, useState } from 'react';
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
      // Set default sources
      // const character = await makeRequest<Character>('find-character', {
      //   id: characterId,
      // });
      // defineDefaultSources(character?.content_sources?.enabled);

      // Fetch content
      const content = await fetchContentPackage(undefined, true);
      interval.stop();
      return content;
    },
    refetchOnWindowFocus: false,
  });

  // Just load progress manually
  const [percentage, setPercentage] = useState(0);
  const interval = useInterval(() => setPercentage((p) => p + 2), 50);
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
      <D20Loader size={100} color={theme.colors[theme.primaryColor][5]} percentage={percentage} status='Loading...' />
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

function confirmHealth(hp: string, character: Character, setCharacter: SetterOrUpdater<Character | null>) {
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
      meta_data: {
        ...c.meta_data,
        reset_hp: false,
      },
    };
  });
  return result;
}

function confirmExperience(exp: string, character: Character, setCharacter: SetterOrUpdater<Character | null>) {
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

function CharacterSheetInner(props: { content: ContentPackage; characterId: number; onFinishLoading: () => void }) {
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
          background_image_url:
            resultCharacter.details?.background_image_url || getCachedPublicUser()?.background_image_url,
          sheet_theme: resultCharacter.details?.sheet_theme || getCachedPublicUser()?.site_theme,
        });
      } else {
        // Character not found, probably due to unauthorized access
        window.location.href = '/sheet-unauthorized';
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
      // Add the extra items to the inventory from variables
      addExtraItems(props.content.items, character, setCharacter);

      // Check bulk limits
      checkBulkLimit(character, setCharacter);

      // Apply conditions after everything else
      applyConditions('CHARACTER', character.details?.conditions ?? []);
      if (character.meta_data?.reset_hp !== false) {
        // To reset hp, we need to confirm health
        confirmHealth(`${getFinalHealthValue('CHARACTER')}`, character, setCharacter);
      } else {
        // Because of the drained condition, let's confirm health
        confirmHealth(`${character.hp_current}`, character, setCharacter);
      }

      setOperationResults(results);
      executingOperations.current = false;

      setTimeout(() => {
        props.onFinishLoading?.();
      }, 100);
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
        //queryClient.invalidateQueries([`find-character-${props.characterId}`]);
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
            isLoaded={!!operationResults}
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

    // Set spells to default
    const spellData = collectCharacterSpellcasting(newCharacter);
    newCharacter.spells = newCharacter.spells ?? {
      slots: [],
      list: [],
      rituals: [],
      focus_point_current: 0,
      innate_casts: [],
    };

    // Reset Innate Spells
    newCharacter.spells = {
      ...newCharacter.spells,
      innate_casts:
        newCharacter.spells?.innate_casts.map((casts) => {
          return {
            ...casts,
            casts_current: 0,
          };
        }) ?? [],
    };

    // Reset Focus Points
    newCharacter.spells = {
      ...newCharacter.spells,
      focus_point_current: spellData.focus_points.max,
    };

    // Reset Spell Slots
    newCharacter.spells = {
      ...newCharacter.spells,
      slots:
        newCharacter.spells?.slots.map((slot) => {
          return {
            ...slot,
            exhausted: false,
          };
        }) ?? [],
    };

    // Remove Fatigued Condition
    let newConditions = _.cloneDeep(character?.details?.conditions ?? []).filter((c) => c.name !== 'Fatigued');

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
                  Lvl. {character?.level}
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
                  <Text size='md' c='gray.4' style={{ cursor: 'default' }}>
                    /
                  </Text>
                </Box>
                <Box>
                  <Anchor
                    size='lg'
                    c='gray.3'
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      openDrawer({ type: 'stat-hp', data: {} });
                    }}
                    underline='hover'
                  >
                    {maxHealth}
                  </Anchor>
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
          <Button
            variant='subtle'
            color='gray.5'
            size='compact-xs'
            fw={400}
            onClick={() => {
              openDrawer({ type: 'stat-resist-weak', data: {} });
            }}
          >
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
                      const hasCondition = character.details?.conditions?.find((c) => c.name === condition.name);
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
                {compiledConditions(character?.details?.conditions ?? []).map((condition, index) => (
                  <ConditionPill
                    key={index}
                    text={condition.name}
                    amount={condition.value}
                    onClick={() => {
                      let source = condition.source;

                      // Check if the condition is from being over bulk limit
                      const isEncumberedFromBulk =
                        condition.name === 'Encumbered' &&
                        character?.inventory &&
                        getInvBulk(character.inventory) > getBulkLimit('CHARACTER');
                      if (isEncumberedFromBulk) {
                        source = 'Over Bulk Limit';
                      }

                      openContextModal({
                        modal: 'condition',
                        title: (
                          <Group justify='space-between'>
                            <Title order={3}>{condition.name}</Title>
                            {source ? (
                              <Text fs='italic' fz='sm' mr={15}>
                                From: <Text span>{source}</Text>
                              </Text>
                            ) : (
                              <Button
                                variant='light'
                                color='gray'
                                size='compact-xs'
                                mr={15}
                                onClick={() => {
                                  modals.closeAll();

                                  let newConditions = _.cloneDeep(character?.details?.conditions ?? []);
                                  // Remove condition
                                  newConditions = newConditions.filter((c) => c.name !== condition.name);
                                  // Add wounded condition if we're removing dying
                                  if (condition.name === 'Dying') {
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
                ))}
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
                {character && (
                  <TokenSelect
                    count={3}
                    value={character.hero_points ?? 0}
                    onChange={(v) => {
                      setCharacter((c) => {
                        if (!c) return c;
                        return {
                          ...c,
                          hero_points: v,
                        };
                      });
                    }}
                    size='xs'
                    emptySymbol={
                      <ActionIcon
                        variant='transparent'
                        color='gray.1'
                        aria-label='Hero Point, Empty'
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
                        aria-label='Hero Point, Full'
                        size='xs'
                        style={{ opacity: 0.7 }}
                      >
                        <IconJewishStarFilled size='0.8rem' />
                      </ActionIcon>
                    }
                  />
                )}
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

function ArmorSection(props: { inventory: Inventory; setInventory: React.Dispatch<React.SetStateAction<Inventory>> }) {
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

  if (bestArmor?.item.meta_data?.runes?.resilient) {
    const resilientRune = bestArmor?.item.meta_data?.runes?.resilient;
    let resilientLabel = '';
    if (resilientRune === 1) {
      resilientLabel = 'Resilient';
    } else if (resilientRune === 2) {
      resilientLabel = 'Greater Resilient';
    } else if (resilientRune === 3) {
      resilientLabel = 'Major Resilient';
    }

    addVariableBonus('CHARACTER', 'AC_BONUS', resilientRune, 'item', '', resilientLabel + ' Rune');
    for (const save of getAllSaveVariables('CHARACTER')) {
      addVariableBonus('CHARACTER', save.name, resilientRune, 'item', '', resilientLabel + ' Rune');
    }
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
        <Group wrap='nowrap' gap={5} justify='space-between'>
          <Group wrap='nowrap' gap={0} justify='center' style={{ flex: 1 }}>
            <Box
              style={{ position: 'relative', cursor: 'pointer' }}
              ref={armorRef}
              onClick={() => {
                openDrawer({
                  type: 'stat-ac',
                  data: {
                    onViewItem: (invItem: InventoryItem) => {
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
                          onItemMove: (invItem: InventoryItem, containerItem: InventoryItem | null) => {
                            handleMoveItem(props.setInventory, invItem, containerItem);
                          },
                        },
                        extra: { addToHistory: true },
                      });
                    },
                  },
                });
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
                  {displayFinalAcValue('CHARACTER', bestArmor?.item)}
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
                        onItemMove: (invItem: InventoryItem, containerItem: InventoryItem | null) => {
                          handleMoveItem(props.setInventory, invItem, containerItem);
                        },
                      },
                    });
                  }}
                >
                  <ShieldIcon size={85} color={shieldHovered ? ICON_BG_COLOR_HOVER : ICON_BG_COLOR} />
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
                              ((bestShield.item.meta_data?.hp ?? 0) / (bestShield.item.meta_data?.hp_max ?? 1)) * 100
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
                  w={55}
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

  const { hovered: perceptionHovered, ref: perceptionRef } = useHover();
  const { hovered: speedHovered, ref: speedRef } = useHover();
  const { hovered: classDcHovered, ref: classDcRef } = useHover();

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
          <Box
            ref={perceptionRef}
            style={{ position: 'relative', cursor: 'pointer' }}
            onClick={() => {
              openDrawer({
                type: 'stat-perception',
                data: {},
              });
            }}
          >
            <Box
              style={{
                position: 'absolute',
                top: '55%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
              }}
            >
              <PerceptionIcon size={80} color={perceptionHovered ? ICON_BG_COLOR_HOVER : ICON_BG_COLOR} />
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
          <Box
            ref={speedRef}
            style={{ position: 'relative', cursor: 'pointer' }}
            onClick={() => {
              openDrawer({
                type: 'stat-speed',
                data: {},
              });
            }}
          >
            <Box
              style={{
                position: 'absolute',
                top: '60%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
              }}
            >
              <SpeedIcon size={75} color={speedHovered ? ICON_BG_COLOR_HOVER : ICON_BG_COLOR} />
            </Box>
            <Stack gap={10}>
              <Text ta='center' fz='sm' fw={500} c='gray.0'>
                Speed
              </Text>
              <Text ta='center' fz='lg' c='gray.0' fw={500} lh='1.5em' pl={15}>
                {getFinalVariableValue('CHARACTER', 'SPEED').total}
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
          <Box
            ref={classDcRef}
            style={{ position: 'relative', cursor: 'pointer' }}
            onClick={() => {
              openDrawer({
                type: 'stat-prof',
                data: { variableName: 'CLASS_DC', isDC: true },
              });
            }}
          >
            <Box
              style={{
                position: 'absolute',
                top: '85%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
              }}
            >
              <BoxIcon size={50} color={classDcHovered ? ICON_BG_COLOR_HOVER : ICON_BG_COLOR} />
            </Box>
            <Stack gap={10}>
              <Text ta='center' fz='sm' fw={500} c='gray.0'>
                Class DC
              </Text>
              <Text ta='center' fz='lg' c='gray.0' fw={500} lh='1.5em'>
                {displayFinalProfValue('CHARACTER', 'CLASS_DC', true)}
              </Text>
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
  isLoaded: boolean;
}) {
  const theme = useMantineTheme();
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const { hovered: hoveredTabOptions, ref: tabOptionsRef } = useHover<HTMLButtonElement>();

  const panelHeight = 550;

  const iconStyle = { width: rem(12), height: rem(12) };
  const allSheetTabs = [
    'skills-actions',
    'inventory',
    'spells',
    'feats-features',
    'companions',
    'details',
    'notes',
    'extras',
  ];
  const primarySheetTabs = getVariable<VariableListStr>('CHARACTER', 'PRIMARY_SHEET_TABS')?.value ?? [];
  const tabOptions = allSheetTabs.filter((tab) => !primarySheetTabs.includes(tab));
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

  useEffect(() => {
    // Open first tab when finished loading
    if (props.isLoaded && activeTab === null) {
      setActiveTab('skills-actions');
    }
  }, [props.isLoaded, activeTab]);

  return (
    <BlurBox blur={10} p='sm'>
      <Tabs
        color='dark.6'
        variant='pills'
        radius='xl'
        keepMounted={false}
        value={activeTab}
        onChange={setActiveTab}
        activateTabWithKeyboard={false}
      >
        <Tabs.List pb={10} grow>
          {primarySheetTabs.includes('skills-actions') && (
            <Tabs.Tab
              value='skills-actions'
              style={{
                border: activeTab === 'skills-actions' ? `1px solid ` + theme.colors.dark[4] : `1px solid transparent`,
              }}
              leftSection={getTabIcon('skills-actions')}
            >
              Skills & Actions
            </Tabs.Tab>
          )}
          {primarySheetTabs.includes('inventory') && (
            <Tabs.Tab
              value='inventory'
              style={{
                border: activeTab === 'inventory' ? `1px solid ` + theme.colors.dark[4] : `1px solid transparent`,
              }}
              leftSection={getTabIcon('inventory')}
            >
              Inventory
            </Tabs.Tab>
          )}
          {primarySheetTabs.includes('spells') && (
            <Tabs.Tab
              value='spells'
              style={{ border: activeTab === 'spells' ? `1px solid ` + theme.colors.dark[4] : `1px solid transparent` }}
              leftSection={getTabIcon('spells')}
            >
              Spells
            </Tabs.Tab>
          )}
          {primarySheetTabs.includes('feats-features') && (
            <Tabs.Tab
              value='feats-features'
              style={{
                border: activeTab === 'feats-features' ? `1px solid ` + theme.colors.dark[4] : `1px solid transparent`,
              }}
              leftSection={getTabIcon('feats-features')}
            >
              Feats & Features
            </Tabs.Tab>
          )}
          {primarySheetTabs.includes('companions') && (
            <Tabs.Tab
              value='companions'
              style={{
                border: activeTab === 'companions' ? `1px solid ` + theme.colors.dark[4] : `1px solid transparent`,
              }}
              leftSection={getTabIcon('companions')}
            >
              Companions
            </Tabs.Tab>
          )}
          {primarySheetTabs.includes('details') && (
            <Tabs.Tab
              value='details'
              style={{
                border: activeTab === 'details' ? `1px solid ` + theme.colors.dark[4] : `1px solid transparent`,
              }}
              leftSection={getTabIcon('details')}
            >
              Details
            </Tabs.Tab>
          )}
          {primarySheetTabs.includes('notes') && (
            <Tabs.Tab
              value='notes'
              style={{ border: activeTab === 'notes' ? `1px solid ` + theme.colors.dark[4] : `1px solid transparent` }}
              leftSection={getTabIcon('notes')}
            >
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
                  backgroundColor: hoveredTabOptions || openedTabOption ? theme.colors.dark[6] : 'transparent',
                  color: openedTabOption ? theme.colors.gray[0] : undefined,
                  border: openedTabOption ? `1px solid ` + theme.colors.dark[4] : `1px solid transparent`,
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
          <PanelSkillsActions
            content={props.content}
            panelHeight={panelHeight}
            inventory={props.inventory}
            setInventory={props.setInventory}
          />
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
  drawerType: DrawerType;
  drawerData: any;
  cost: ActionCost;
  level?: number;
  traits?: number[];
  rarity?: Rarity;
  skill?: string | string[] | undefined;
  leftSection?: React.ReactNode;
}
function PanelSkillsActions(props: {
  content: ContentPackage;
  panelHeight: number;
  inventory: Inventory;
  setInventory: React.Dispatch<React.SetStateAction<Inventory>>;
}) {
  const theme = useMantineTheme();
  const character = useRecoilValue(characterState);
  const [skillsSearch, setSkillsSearch] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [_drawer, openDrawer] = useRecoilState(drawerState);

  const [actionTypeFilter, setActionTypeFilter] = useState<ActionCost | 'ALL'>('ALL');
  const [actionSectionValue, setActionSectionValue] = useState<string | null>(null);

  // This is a hack to fix a big where variables are updated on init load but the sheet state hasn't updated yet
  // const forceUpdate = useForceUpdate();
  // useEffect(() => {
  //   const timer = setTimeout(() => {
  //     forceUpdate();
  //   }, 1000);
  //   return () => clearTimeout(timer);
  // }, []);

  const actions = useMemo(() => {
    const allActions = props.content.abilityBlocks
      .filter((ab) => ab.type === 'action')
      .sort((a, b) => a.name.localeCompare(b.name));

    // Filter actions
    return searchQuery.trim() || actionTypeFilter !== 'ALL'
      ? allActions.filter((action) => {
          // Custom search, alt could be to use JsSearch here
          const query = searchQuery.trim().toLowerCase();

          const checkAction = (action: AbilityBlock) => {
            if (actionTypeFilter !== 'ALL' && action.actions !== actionTypeFilter) return false;

            if (action.name.toLowerCase().includes(query)) return true;
            //if (action.description.toLowerCase().includes(query)) return true;
            return false;
          };

          if (checkAction(action)) return true;
          return false;
        })
      : allActions;
  }, [props.content.abilityBlocks, actionTypeFilter, searchQuery]);

  const weapons = useMemo(() => {
    const weapons = props.inventory.items
      .filter((invItem) => invItem.is_equipped && isItemWeapon(invItem.item))
      .sort((a, b) => a.item.name.localeCompare(b.item.name));

    // Filter weapons
    return searchQuery.trim() || actionTypeFilter !== 'ALL'
      ? weapons.filter((invItem) => {
          // Custom search, alt could be to use JsSearch here
          const query = searchQuery.trim().toLowerCase();

          const checkInvItem = (invItem: InventoryItem) => {
            if (actionTypeFilter !== 'ALL') return false;

            if (invItem.item.name.toLowerCase().includes(query)) return true;
            return false;
          };

          if (checkInvItem(invItem)) return true;
          return false;
        })
      : weapons;
  }, [props.inventory.items, actionTypeFilter, searchQuery]);

  const weaponAttacks = useMemo(() => {
    return weapons.map((invItem) => {
      const weaponStats = getWeaponStats('CHARACTER', invItem.item);
      return {
        invItem: invItem,
        leftSection: (
          <Group wrap='nowrap' gap={10}>
            <Text c='gray.6' fz='xs' fs='italic' span>
              {sign(weaponStats.attack_bonus.total[0])}
            </Text>
            <Text c='gray.6' fz='xs' fs='italic' span>
              {weaponStats.damage.dice}
              {weaponStats.damage.die}
              {weaponStats.damage.bonus.total > 0 ? ` + ${weaponStats.damage.bonus.total}` : ``}{' '}
              {weaponStats.damage.damageType}
              {/* {weaponStats.damage.extra ? `+ ${weaponStats.damage.extra}` : ''} */}
            </Text>
          </Group>
        ),
      };
    });
  }, [weapons]);

  const basicActions = useMemo(() => {
    return actions.filter(
      (a) =>
        !a.meta_data?.skill &&
        (!a.requirements || a.requirements.trim().length === 0) &&
        !hasTraitType('EXPLORATION', a.traits) &&
        !hasTraitType('DOWNTIME', a.traits)
    );
  }, [actions]);

  const basicSpecialityActions = useMemo(() => {
    return actions.filter((a) => !a.meta_data?.skill && a.requirements && a.requirements.trim().length > 0);
  }, [actions]);

  const skillActions = useMemo(() => {
    // const skillActions: { [key: string]: AbilityBlock[] } = {};
    // for (const action of actions.filter((a) => a.meta_data?.skill)) {
    //   const skills = Array.isArray(action.meta_data!.skill!) ? action.meta_data!.skill! : [action.meta_data!.skill!];
    //   for (const sss of skills) {
    //     for (const ss of sss.split(',')) {
    //       const skill = ss.trim();
    //       if (!skillActions[skill]) {
    //         skillActions[skill] = [];
    //       }
    //       skillActions[skill].push(action);
    //     }
    //   }
    // }

    // // Sort by skill name
    // const sortedSkillActions: { [key: string]: AbilityBlock[] } = {};
    // Object.keys(skillActions)
    //   .sort()
    //   .forEach((key) => {
    //     sortedSkillActions[key] = skillActions[key];
    //   });

    // // Merge to single array
    // const mergedSkillActions: AbilityBlock[] = [];
    // for (const key in sortedSkillActions) {
    //   mergedSkillActions.push(...sortedSkillActions[key]);
    // }

    // // Remove dupes
    // const uniqueMergedSkillActions = mergedSkillActions.filter(
    //   (action, index, self) => index === self.findIndex((t) => t.id === action.id)
    // );

    return actions.filter((a) => a.meta_data?.skill);
  }, [actions]);

  const explorationActions = useMemo(() => {
    return actions.filter((a) => hasTraitType('EXPLORATION', a.traits));
  }, [actions]);

  const downtimeActions = useMemo(() => {
    return actions.filter((a) => hasTraitType('DOWNTIME', a.traits));
  }, [actions]);

  const itemsWithActions = useMemo(() => {
    const actionItems = props.inventory.items.filter((invItem) => {
      return findActions(invItem.item.description).length > 0;
    });

    // Filter items
    return searchQuery.trim() || actionTypeFilter !== 'ALL'
      ? actionItems.filter((invItem) => {
          // Custom search, alt could be to use JsSearch here
          const query = searchQuery.trim().toLowerCase();

          const checkInvItem = (invItem: InventoryItem) => {
            if (actionTypeFilter !== 'ALL') {
              const actions = findActions(invItem.item.description);
              const hasAction = actions.find((action) => action === actionTypeFilter);
              if (!hasAction) return false;
            }
            if (invItem.item.name.toLowerCase().includes(query)) return true;
            if (invItem.item.description.toLowerCase().includes(query)) return true;
            if (invItem.item.group.toLowerCase().includes(query)) return true;
            return false;
          };

          if (checkInvItem(invItem)) return true;
          if (invItem.container_contents.some((containedItem) => checkInvItem(containedItem))) return true;
          return false;
        })
      : actionItems;
  }, [props.inventory.items, actionTypeFilter, searchQuery]);

  const featsWithActions = useMemo(() => {
    if (!character) return [];
    const results = collectCharacterAbilityBlocks(character, props.content.abilityBlocks);
    const feats = _.flattenDeep(Object.values(results)).filter((ab) => ab.actions !== null);

    // Filter feats
    return searchQuery.trim() || actionTypeFilter !== 'ALL'
      ? feats.filter((feat) => {
          // Custom search, alt could be to use JsSearch here
          const query = searchQuery.trim().toLowerCase();

          const checkFeat = (feat: AbilityBlock) => {
            if (actionTypeFilter !== 'ALL' && feat.actions !== actionTypeFilter) return false;

            if (feat.name.toLowerCase().includes(query)) return true;
            return false;
          };

          if (checkFeat(feat)) return true;
          return false;
        })
      : feats;
  }, [character, props.content.abilityBlocks, actionTypeFilter, searchQuery]);

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
                borderColor: skillsSearch.trim().length > 0 ? theme.colors['guide'][8] : undefined,
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
              onChange={(event) => setSearchQuery(event.target.value)}
              styles={{
                input: {
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  borderColor: searchQuery.trim().length > 0 ? theme.colors['guide'][8] : undefined,
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
                  borderColor: actionTypeFilter === 'ALL' ? theme.colors.dark[4] : undefined,
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
                  backgroundColor: actionTypeFilter === 'ONE-ACTION' ? theme.colors.dark[6] : undefined,
                  borderColor: actionTypeFilter === 'ONE-ACTION' ? theme.colors['guide'][8] : undefined,
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
                  backgroundColor: actionTypeFilter === 'TWO-ACTIONS' ? theme.colors.dark[6] : undefined,
                  borderColor: actionTypeFilter === 'TWO-ACTIONS' ? theme.colors['guide'][8] : undefined,
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
                  backgroundColor: actionTypeFilter === 'THREE-ACTIONS' ? theme.colors.dark[6] : undefined,
                  borderColor: actionTypeFilter === 'THREE-ACTIONS' ? theme.colors['guide'][8] : undefined,
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
                  backgroundColor: actionTypeFilter === 'FREE-ACTION' ? theme.colors.dark[6] : undefined,
                  borderColor: actionTypeFilter === 'FREE-ACTION' ? theme.colors['guide'][8] : undefined,
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
                  backgroundColor: actionTypeFilter === 'REACTION' ? theme.colors.dark[6] : undefined,
                  borderColor: actionTypeFilter === 'REACTION' ? theme.colors['guide'][8] : undefined,
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
                actions={weaponAttacks.map((weapon) => {
                  return {
                    id: parseInt(weapon.invItem.id),
                    name: weapon.invItem.item.name,
                    drawerType: 'inv-item',
                    drawerData: {
                      zIndex: 100,
                      invItem: _.cloneDeep(weapon.invItem),
                      onItemUpdate: (newInvItem: InventoryItem) => {
                        handleUpdateItem(props.setInventory, newInvItem);
                      },
                      onItemDelete: (newInvItem: InventoryItem) => {
                        handleDeleteItem(props.setInventory, newInvItem);
                        openDrawer(null);
                      },
                      onItemMove: (invItem: InventoryItem, containerItem: InventoryItem | null) => {
                        handleMoveItem(props.setInventory, invItem, containerItem);
                      },
                    },
                    cost: null,
                    traits: weapon.invItem.item.traits,
                    rarity: weapon.invItem.item.rarity,
                    leftSection: weapon.leftSection,
                  };
                })}
              />
              <ActionAccordionItem
                id='feats'
                title='Feats (with Actions)'
                opened={actionSectionValue === 'feats'}
                actions={featsWithActions.map((feat) => {
                  return {
                    id: feat.id,
                    name: feat.name,
                    drawerType: feat.type,
                    drawerData: { id: feat.id },
                    cost: feat.actions,
                    traits: feat.traits,
                    rarity: feat.rarity,
                    skill: feat.meta_data?.skill,
                  };
                })}
              />
              <ActionAccordionItem
                id='items'
                title='Items (with Actions)'
                opened={actionSectionValue === 'items'}
                actions={
                  itemsWithActions
                    .map((invItem) => {
                      const actions = findActions(invItem.item.description);
                      const action = actions.length > 0 ? actions[0] : 'ONE-ACTION';

                      // if (action === 'ONE-ACTION' && isItemWeapon(invItem.item) && invItem.is_equipped) {
                      //   // It's a weapon with one action, we already have a section for weapons
                      //   return null;
                      // }

                      return {
                        id: parseInt(invItem.id),
                        name: invItem.item.name,
                        drawerType: 'inv-item',
                        drawerData: {
                          zIndex: 100,
                          invItem: _.cloneDeep(invItem),
                          onItemUpdate: (newInvItem: InventoryItem) => {
                            handleUpdateItem(props.setInventory, newInvItem);
                          },
                          onItemDelete: (newInvItem: InventoryItem) => {
                            handleDeleteItem(props.setInventory, newInvItem);
                            openDrawer(null);
                          },
                          onItemMove: (invItem: InventoryItem, containerItem: InventoryItem | null) => {
                            handleMoveItem(props.setInventory, invItem, containerItem);
                          },
                        },
                        cost: action,
                        traits: invItem.item.traits,
                        rarity: invItem.item.rarity,
                      };
                    })
                    .filter((a) => a) as ActionItem[]
                }
              />
              <ActionAccordionItem
                id='basic-actions'
                title='Basic Actions'
                opened={actionSectionValue === 'basic-actions'}
                actions={basicActions.map((action) => {
                  return {
                    id: action.id,
                    name: action.name,
                    drawerType: 'action',
                    drawerData: { id: action.id },
                    cost: action.actions,
                    traits: action.traits,
                    rarity: action.rarity,
                    skill: action.meta_data?.skill,
                  };
                })}
              />
              <ActionAccordionItem
                id='skill-actions'
                title='Skill Actions'
                opened={actionSectionValue === 'skill-actions'}
                actions={skillActions.map((action) => {
                  return {
                    id: action.id,
                    name: action.name,
                    drawerType: 'action',
                    drawerData: { id: action.id },
                    cost: action.actions,
                    traits: action.traits,
                    rarity: action.rarity,
                    skill: action.meta_data?.skill,
                  };
                })}
              />
              <ActionAccordionItem
                id='speciality-basic-actions'
                title='Speciality Basics'
                opened={actionSectionValue === 'speciality-basic-actions'}
                actions={basicSpecialityActions.map((action) => {
                  return {
                    id: action.id,
                    name: action.name,
                    drawerType: 'action',
                    drawerData: { id: action.id },
                    cost: action.actions,
                    traits: action.traits,
                    rarity: action.rarity,
                    skill: action.meta_data?.skill,
                  };
                })}
              />
              <ActionAccordionItem
                id='exploration-activities'
                title='Exploration Activities'
                opened={actionSectionValue === 'exploration-activities'}
                actions={explorationActions.map((action) => {
                  return {
                    id: action.id,
                    name: action.name,
                    drawerType: 'action',
                    drawerData: { id: action.id },
                    cost: action.actions,
                    traits: action.traits,
                    rarity: action.rarity,
                    skill: action.meta_data?.skill,
                  };
                })}
              />
              <ActionAccordionItem
                id='downtime-activities'
                title='Downtime Activities'
                opened={actionSectionValue === 'downtime-activities'}
                actions={downtimeActions.map((action) => {
                  return {
                    id: action.id,
                    name: action.name,
                    drawerType: 'action',
                    drawerData: { id: action.id },
                    cost: action.actions,
                    traits: action.traits,
                    rarity: action.rarity,
                    skill: action.meta_data?.skill,
                  };
                })}
              />
            </Accordion>
          </ScrollArea>
        </Stack>
      </Box>
    </Group>
  );
}

function ActionAccordionItem(props: { id: string; title: string; opened: boolean; actions: ActionItem[] }) {
  const theme = useMantineTheme();
  const [subSectionValue, setSubSectionValue] = useState<string | null>(null);
  const { hovered, ref } = useHover();

  if (props.actions.length === 0) return null;

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
        <Stack gap={5}>
          {props.actions.map((action, index) => (
            <ActionSelectionOption key={index} action={action} onClick={() => {}} />
          ))}
        </Stack>
      </Accordion.Panel>
    </Accordion.Item>
  );
}

function ActionSelectionOption(props: { action: ActionItem; onClick: (action: ActionItem) => void }) {
  const theme = useMantineTheme();
  const { hovered, ref } = useHover();
  const [_drawer, openDrawer] = useRecoilState(drawerState);

  return (
    <StatButton
      darkVersion
      onClick={() => {
        openDrawer({ type: props.action.drawerType, data: props.action.drawerData });
      }}
    >
      <Group
        ref={ref}
        py='sm'
        style={{
          cursor: 'pointer',
          borderBottom: '1px solid ' + theme.colors.dark[6],
          // backgroundColor: hovered ? theme.colors.dark[6] : 'transparent',
          position: 'relative',
        }}
        onClick={() => props.onClick(props.action)}
        justify='space-between'
        w='100%'
        wrap='nowrap'
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
          {props.action.leftSection && <Box>{props.action.leftSection}</Box>}
        </Group>
        <Group wrap='nowrap' justify='flex-end' style={{ marginLeft: 'auto' }}>
          <Box>
            <TraitsDisplay
              justify='flex-end'
              size='xs'
              traitIds={props.action.traits ?? []}
              rarity={props.action.rarity}
              skill={props.action.skill}
            />
          </Box>
        </Group>
      </Group>
    </StatButton>
  );
}

function PanelInventory(props: {
  content: ContentPackage;
  panelHeight: number;
  inventory: Inventory;
  setInventory: React.Dispatch<React.SetStateAction<Inventory>>;
}) {
  const theme = useMantineTheme();
  const [character, setCharacter] = useRecoilState(characterState);
  const [searchQuery, setSearchQuery] = useState('');
  const [_drawer, openDrawer] = useRecoilState(drawerState);

  const [confirmBuyItem, setConfirmBuyItem] = useState<{ item: Item }>();

  const visibleInvItems = props.inventory.items.filter(
    (invItem) => !(invItem.item.meta_data?.unselectable === true && invItem.is_equipped && isItemWeapon(invItem.item))
  );
  const invItems = searchQuery.trim()
    ? visibleInvItems.filter((invItem) => {
        // Custom search, alt could be to use JsSearch here
        const query = searchQuery.trim().toLowerCase();

        const checkInvItem = (invItem: InventoryItem) => {
          if (invItem.item.name.toLowerCase().includes(query)) return true;
          if (invItem.item.description.toLowerCase().includes(query)) return true;
          if (invItem.item.group.toLowerCase().includes(query)) return true;
          return false;
        };

        if (checkInvItem(invItem)) return true;
        if (invItem.container_contents.some((containedItem) => checkInvItem(containedItem))) return true;
        return false;
      })
    : visibleInvItems;

  const openAddItemDrawer = () => {
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
  };

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
                borderColor: searchQuery.trim().length > 0 ? theme.colors['guide'][8] : undefined,
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
            Bulk: {labelizeBulk(getInvBulk(props.inventory), true)} / {getBulkLimit('CHARACTER')}
          </Badge>
          <CurrencySection
            character={character}
            onClick={() => {
              openDrawer({
                type: 'manage-coins',
                data: {
                  coins: character?.inventory?.coins,
                  onUpdate: (coins: { cp: number; sp: number; gp: number; pp: number }) => {
                    props.setInventory((prev) => ({
                      ...prev,
                      coins: coins,
                    }));
                  },
                },
              });
            }}
          />
          <Button
            color='dark.5'
            style={{ borderColor: theme.colors.dark[4] }}
            radius='xl'
            size='sm'
            fw={500}
            rightSection={<IconPlus size='1.0rem' />}
            onClick={() => openAddItemDrawer()}
          >
            Add Item
          </Button>
        </Group>
        <ScrollArea h={props.panelHeight - 50} scrollbars='y'>
          {invItems.length !== 0 && (
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
          )}
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
                        <Box pr={5}>
                          <InvItemOption
                            hideSections
                            invItem={invItem}
                            onEquip={(invItem) => {
                              const newInvItem = _.cloneDeep(invItem);
                              newInvItem.is_equipped = !newInvItem.is_equipped;
                              handleUpdateItem(props.setInventory, newInvItem);
                            }}
                            onInvest={(invItem) => {
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
                                  onItemMove: (invItem: InventoryItem, containerItem: InventoryItem | null) => {
                                    handleMoveItem(props.setInventory, invItem, containerItem);
                                  },
                                },
                              });
                            }}
                          />
                        </Box>
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
                                    onItemMove: (invItem: InventoryItem, containerItem: InventoryItem | null) => {
                                      handleMoveItem(props.setInventory, invItem, containerItem);
                                    },
                                  },
                                });
                              }}
                            >
                              <InvItemOption
                                invItem={containedItem}
                                preventEquip
                                onEquip={(invItem) => {
                                  const newInvItem = _.cloneDeep(invItem);
                                  newInvItem.is_equipped = !newInvItem.is_equipped;
                                  handleUpdateItem(props.setInventory, newInvItem);
                                }}
                                onInvest={(invItem) => {
                                  const newInvItem = _.cloneDeep(invItem);
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
                              onItemMove: (invItem: InventoryItem, containerItem: InventoryItem | null) => {
                                handleMoveItem(props.setInventory, invItem, containerItem);
                              },
                            },
                          });
                        }}
                      >
                        <InvItemOption
                          invItem={invItem}
                          onEquip={(invItem) => {
                            const newInvItem = _.cloneDeep(invItem);
                            newInvItem.is_equipped = !newInvItem.is_equipped;
                            handleUpdateItem(props.setInventory, newInvItem);
                          }}
                          onInvest={(invItem) => {
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
                Your inventory is empty,{' '}
                <Anchor fz='sm' fs='italic' onClick={() => openAddItemDrawer()}>
                  add some items
                </Anchor>
                !
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
  const character = useRecoilValue(characterState);

  const weaponStats = isItemWeapon(props.invItem.item) ? getWeaponStats('CHARACTER', props.invItem.item) : null;

  return (
    <Grid w={'100%'}>
      <Grid.Col span='auto'>
        <Group wrap='nowrap' gap={10}>
          <ItemIcon item={props.invItem.item} size='1.0rem' color={theme.colors.gray[6]} />
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
                {weaponStats.damage.bonus.total > 0 ? ` + ${weaponStats.damage.bonus.total}` : ``}{' '}
                {weaponStats.damage.damageType}
                {/* {weaponStats.damage.extra ? `+ ${weaponStats.damage.extra}` : ''} */}
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
              color={props.invItem.is_invested ? 'gray.7' : undefined}
              disabled={!props.invItem.is_invested && reachedInvestedLimit('CHARACTER', character?.inventory)}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
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
                e.preventDefault();
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
  const theme = useMantineTheme();
  const character = useRecoilValue(characterState);
  const [searchQuery, setSearchQuery] = useState('');
  const [_drawer, openDrawer] = useRecoilState(drawerState);
  const [section, setSection] = useState<string>();
  const [manageSpells, setManageSpells] = useState<
    | {
        source: string;
        type: 'SLOTS-ONLY' | 'SLOTS-AND-LIST' | 'LIST-ONLY';
      }
    | undefined
  >();

  const { data: spells } = useQuery({
    queryKey: [`find-spells-and-data`],
    queryFn: async () => {
      if (!character) return null;

      return await fetchContentAll<Spell>('spell');
    },
  });

  const charData = useMemo(() => {
    if (!character) return null;
    return collectCharacterSpellcasting(character);
  }, [character]);

  // Filter options based on search query
  const search = useRef(new JsSearch.Search('id'));
  useEffect(() => {
    if (!spells) return;
    search.current.addIndex('name');
    search.current.addIndex('description');
    search.current.addIndex('duration');
    search.current.addIndex('targets');
    search.current.addIndex('area');
    search.current.addIndex('range');
    search.current.addIndex('requirements');
    search.current.addIndex('trigger');
    search.current.addIndex('cost');
    search.current.addIndex('defense');
    search.current.addDocuments(spells);
  }, [spells]);

  const allSpells = searchQuery.trim() ? (search.current?.search(searchQuery.trim()) as Spell[]) : spells ?? [];

  return (
    <Box h='100%'>
      <Stack gap={5}>
        <Group>
          <TextInput
            style={{ flex: 1 }}
            leftSection={<IconSearch size='0.9rem' />}
            placeholder={`Search spells`}
            onChange={(event) => setSearchQuery(event.target.value)}
            styles={{
              input: {
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                borderColor: searchQuery.trim().length > 0 ? theme.colors['guide'][8] : undefined,
              },
            }}
          />
          {/* <SegmentedControl
            value={section}
            onChange={setSection}
            disabled={!!searchQuery.trim()}
            data={[
              { label: 'Spells', value: 'NORMAL' },
              { label: 'Focus', value: 'FOCUS' },
              { label: 'Innate', value: 'INNATE' },
            ].filter((section) => {
              if (!data) return false;

              if (section.value === 'FOCUS') {
                return data.data.focus.length > 0;
              }
              if (section.value === 'INNATE') {
                return data.data.innate.length > 0;
              }
              if (section.value === 'NORMAL') {
                return data.data.slots.length > 0;
              }
            })}
          /> */}
        </Group>
        <ScrollArea h={props.panelHeight - 50} scrollbars='y'>
          {charData && (
            <Accordion
              variant='separated'
              multiple
              defaultValue={[
                ...charData.sources.map((source) => `spontaneous-${source.name}`),
                ...charData.sources.map((source) => `prepared-${source.name}`),
                ...charData.sources.map((source) => `focus-${source.name}`),
                'innate',
                // 'ritual',
              ]}
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
              {charData.sources.map((source, index) => (
                <div key={index}>
                  {source.type.startsWith('SPONTANEOUS-') ? (
                    <>
                      {charData.list.filter((d) => d.source === source.name).length > 0 && (
                        <SpellList
                          index={`spontaneous-${source.name}`}
                          source={source}
                          spellIds={charData.list.filter((d) => d.source === source.name).map((d) => d.spell_id)}
                          allSpells={allSpells}
                          type='SPONTANEOUS'
                          extra={{ slots: charData.slots }}
                          openManageSpells={(source, type) => setManageSpells({ source, type })}
                          hasFilters={!!searchQuery.trim()}
                        />
                      )}
                    </>
                  ) : (
                    <>
                      {charData.list.filter((d) => d.source === source.name).length > 0 && (
                        <SpellList
                          index={`prepared-${source.name}`}
                          source={source}
                          spellIds={charData.list.filter((d) => d.source === source.name).map((d) => d.spell_id)}
                          allSpells={allSpells}
                          type='PREPARED'
                          extra={{ slots: charData.slots }}
                          openManageSpells={(source, type) => setManageSpells({ source, type })}
                          hasFilters={!!searchQuery.trim()}
                        />
                      )}
                    </>
                  )}
                  {charData.focus.filter((d) => d.source === source.name).length > 0 && (
                    <SpellList
                      index={`focus-${source.name}`}
                      source={source}
                      spellIds={charData.focus.filter((d) => d.source === source.name).map((d) => d.spell_id)}
                      allSpells={allSpells}
                      type='FOCUS'
                      extra={{ focusPoints: charData.focus_points }}
                      hasFilters={!!searchQuery.trim()}
                    />
                  )}
                </div>
              ))}

              {charData.innate.length > 0 && (
                <SpellList
                  index={'innate'}
                  spellIds={charData.innate.map((d) => d.spell_id)}
                  allSpells={allSpells}
                  type='INNATE'
                  extra={{ innates: charData.innate }}
                  hasFilters={!!searchQuery.trim()}
                />
              )}
              {/* Always display ritual section */}
              {true && (
                <SpellList
                  index={'ritual'}
                  spellIds={charData.ritual.map((d) => d.spell_id)}
                  allSpells={allSpells}
                  type='RITUAL'
                  openManageSpells={(source, type) => setManageSpells({ source, type })}
                  hasFilters={!!searchQuery.trim()}
                />
              )}
            </Accordion>
          )}
        </ScrollArea>
      </Stack>
      {manageSpells && (
        <ManageSpellsModal
          opened={!!manageSpells}
          onClose={() => setManageSpells(undefined)}
          source={manageSpells.source}
          type={manageSpells.type}
        />
      )}
    </Box>
  );
}

function SpellList(props: {
  index: string;
  source?: CastingSource;
  spellIds: number[];
  allSpells: Spell[];
  type: 'PREPARED' | 'SPONTANEOUS' | 'FOCUS' | 'INNATE' | 'RITUAL';
  extra?: {
    slots?: SpellSlot[];
    innates?: SpellInnateEntry[];
    focusPoints?: {
      current: number;
      max: number;
    };
  };
  hasFilters: boolean;
  openManageSpells?: (source: string, type: 'SLOTS-ONLY' | 'SLOTS-AND-LIST' | 'LIST-ONLY') => void;
}) {
  const [character, setCharacter] = useRecoilState(characterState);

  const castSpell = (cast: boolean, spell: Spell) => {
    if (!character) return;

    if ((props.type === 'PREPARED' || props.type === 'SPONTANEOUS') && props.source) {
      setCharacter((c) => {
        if (!c) return c;
        let slots = c.spells?.slots ?? [];
        const newUpdatedSlots = slots.map((slot) => {
          if (slot.spell_id === spell.id && slot.rank === spell.rank && slot.source === props.source!.name) {
            return {
              ...slot,
              exhausted: cast,
            };
          }
          return slot;
        });
        return {
          ...c,
          spells: {
            ...(c.spells ?? {
              slots: [],
              list: [],
              rituals: [],
              focus_point_current: 0,
              innate_casts: [],
            }),
            slots: newUpdatedSlots,
          },
        };
      });
    }

    if (props.type === 'FOCUS') {
      setCharacter((c) => {
        if (!c) return c;
        return {
          ...c,
          spells: {
            ...(c.spells ?? {
              slots: [],
              list: [],
              rituals: [],
              focus_point_current: 0,
              innate_casts: [],
            }),
            focus_point_current: Math.max((c.spells?.focus_point_current ?? 0) + (cast ? -1 : 1), 0),
          },
        };
      });
    }

    if (props.type === 'INNATE') {
      setCharacter((c) => {
        if (!c) return c;
        let innates = c.spells?.innate_casts ?? [];
        innates = innates.map((innate) => {
          if (innate.spell_id === spell.id && innate.rank === spell.rank) {
            return {
              ...innate,
              casts_current: cast
                ? Math.min(innate.casts_current + 1, innate.casts_max)
                : Math.max(innate.casts_current - 1, 0),
            };
          }
          return innate;
        });

        return {
          ...c,
          spells: {
            ...(c.spells ?? {
              slots: [],
              list: [],
              rituals: [],
              focus_point_current: 0,
              innate_casts: [],
            }),
            innate_casts: innates,
          },
        };
      });
    }
  };

  // Display spells in an ordered list by rank
  const spells = useMemo(() => {
    const filteredSpells = props.spellIds
      .map((id) => props.allSpells.find((spell) => spell.id === id))
      .filter((spell) => spell) as Spell[];
    return _.groupBy(filteredSpells, 'rank');
  }, [props.spellIds, props.allSpells]);

  const slots = useMemo(() => {
    if (!props.extra?.slots || props.extra.slots.length === 0) return null;

    const mappedSlots = props.extra.slots.map((slot) => ({
      ...slot,
      spell: props.allSpells.find((spell) => spell.id === slot.spell_id),
    }));
    return _.groupBy(mappedSlots, 'rank');
  }, [props.extra?.slots, props.allSpells]);

  const innateSpells = useMemo(() => {
    const filteredSpells = props.extra?.innates
      ?.map((innate) => ({
        ...innate,
        spell: props.allSpells.find((spell) => spell.id === innate.spell_id),
      }))
      .filter((innate) => innate.spell);
    return _.groupBy(filteredSpells, 'rank');
  }, [props.extra?.innates, props.allSpells]);

  if (props.type === 'PREPARED' && props.source) {
    // If there are no spells to display, and there are filters, return null
    if (
      props.hasFilters &&
      slots &&
      Object.keys(slots).filter((rank) => slots[rank].find((s) => s.spell)).length === 0
    ) {
      return null;
    }

    return (
      <Accordion.Item value={props.index}>
        <Accordion.Control>
          <Group wrap='nowrap' justify='space-between' gap={0}>
            <Text c='gray.5' fw={700} fz='sm'>
              {variableNameToLabel(props.source.name)} Spells
            </Text>
            <Box mr={10}>
              <BlurButton
                size='xs'
                fw={500}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  props.openManageSpells?.(
                    props.source!.name,
                    props.source!.type === 'PREPARED-LIST' ? 'SLOTS-AND-LIST' : 'SLOTS-ONLY'
                  );
                }}
              >
                Manage
              </BlurButton>
            </Box>
          </Group>
        </Accordion.Control>
        <Accordion.Panel
          styles={{
            content: {
              padding: 0,
            },
          }}
        >
          <Stack gap={0}>
            <Divider color='dark.6' />
            <Accordion
              px={10}
              variant='separated'
              multiple
              defaultValue={[]}
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
              {slots &&
                Object.keys(slots)
                  .filter((rank) =>
                    slots[rank].length > 0 && props.hasFilters ? slots[rank].find((s) => s.spell) : true
                  )
                  .map((rank, index) => (
                    <Accordion.Item key={index} value={`rank-group-${index}`}>
                      <Accordion.Control>
                        <Group wrap='nowrap' justify='space-between' gap={0}>
                          <Text c='gray.5' fw={700} fz='sm'>
                            {rank === '0' ? 'Cantrips' : `${rankNumber(parseInt(rank))}`}
                          </Text>
                          <Badge mr='sm' variant='outline' color='gray.5' size='xs'>
                            <Text fz='sm' c='gray.5' span>
                              {props.hasFilters ? slots[rank].filter((s) => s.spell).length : slots[rank].length}
                            </Text>
                          </Badge>
                        </Group>
                      </Accordion.Control>
                      <Accordion.Panel>
                        <Stack gap={5}>
                          {slots[rank].map((slot, index) => (
                            <SpellListEntry
                              key={index}
                              spell={slot.spell}
                              exhausted={!!slot.exhausted}
                              onCastSpell={(cast: boolean) => {
                                if (slot.spell) castSpell(cast, slot.spell);
                              }}
                              onOpenManageSpells={() => {
                                props.openManageSpells?.(
                                  props.source!.name,
                                  props.source!.type === 'PREPARED-LIST' ? 'SLOTS-AND-LIST' : 'SLOTS-ONLY'
                                );
                              }}
                              hasFilters={props.hasFilters}
                            />
                          ))}
                        </Stack>
                      </Accordion.Panel>
                    </Accordion.Item>
                  ))}
            </Accordion>
          </Stack>
        </Accordion.Panel>
      </Accordion.Item>
    );
  }

  if (props.type === 'SPONTANEOUS' && props.source) {
    // If there are no spells to display, and there are filters, return null
    if (
      props.hasFilters &&
      slots &&
      Object.keys(slots).filter((rank) => slots[rank].find((s) => s.spell)).length === 0
    ) {
      return null;
    }

    return (
      <Accordion.Item value={props.index}>
        <Accordion.Control>
          <Group wrap='nowrap' justify='space-between' gap={0}>
            <Text c='gray.5' fw={700} fz='sm'>
              {variableNameToLabel(props.source.name)} Spells
            </Text>
            <Box mr={10}>
              <BlurButton
                size='xs'
                fw={500}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  props.openManageSpells?.(props.source!.name, 'LIST-ONLY');
                }}
              >
                Manage
              </BlurButton>
            </Box>
          </Group>
        </Accordion.Control>
        <Accordion.Panel
          styles={{
            content: {
              padding: 0,
            },
          }}
        >
          <Stack gap={0}>
            <Divider color='dark.6' />
            <Accordion
              px={10}
              variant='separated'
              multiple
              defaultValue={[]}
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
              {slots &&
                Object.keys(slots)
                  .filter((rank) => slots[rank].length > 0)
                  .map((rank, index) => (
                    <Accordion.Item value={`rank-group-${index}`}>
                      <Accordion.Control>
                        <Group wrap='nowrap' justify='space-between' gap={0}>
                          <Box>
                            <Text c='gray.5' fw={700} fz='sm' w={100}>
                              {rank === '0' ? 'Cantrips' : `${rankNumber(parseInt(rank))}`}
                            </Text>
                            <SpellSlotSelect
                              count={slots[rank]?.filter((slot) => `${slot.rank}` === rank).length}
                              onChange={(v) => {}}
                            />
                          </Box>
                          <Badge mr='sm' variant='outline' color='gray.5' size='xs'>
                            <Text fz='sm' c='gray.5' span>
                              {spells[rank].length}
                            </Text>
                          </Badge>
                        </Group>
                      </Accordion.Control>
                      <Accordion.Panel>
                        <Stack gap={5}>
                          {spells[rank].map((spell, index) => (
                            <SpellListEntry
                              key={index}
                              spell={spell}
                              exhausted={!!slots[rank].find((s) => !s.exhausted)}
                              onCastSpell={(cast: boolean) => {
                                castSpell(cast, spell);
                              }}
                              onOpenManageSpells={() => {
                                props.openManageSpells?.(
                                  props.source!.name,
                                  props.source!.type === 'PREPARED-LIST' ? 'SLOTS-AND-LIST' : 'SLOTS-ONLY'
                                );
                              }}
                              hasFilters={props.hasFilters}
                            />
                          ))}
                        </Stack>
                      </Accordion.Panel>
                    </Accordion.Item>
                  ))}
            </Accordion>
          </Stack>
        </Accordion.Panel>
      </Accordion.Item>
    );
  }

  if (props.type === 'FOCUS' && props.source && props.extra?.focusPoints) {
    // If there are no spells to display, and there are filters, return null
    if (props.hasFilters && spells && !Object.keys(spells).find((rank) => spells[rank].length > 0)) {
      return null;
    }

    return (
      <Accordion.Item value={props.index}>
        <Accordion.Control>
          <Group wrap='nowrap' justify='space-between' gap={0}>
            <Text c='gray.5' fw={700} fz='sm'>
              {variableNameToLabel(props.source.name)} Focus Spells
            </Text>
            <Box mr={10}>
              <SpellSlotSelect count={props.extra?.focusPoints.max} onChange={(v) => {}} />
            </Box>
          </Group>
        </Accordion.Control>
        <Accordion.Panel
          styles={{
            content: {
              padding: 0,
            },
          }}
        >
          <Stack gap={0}>
            <Divider color='dark.6' />
            <Accordion
              px={10}
              variant='separated'
              multiple
              defaultValue={[]}
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
              {spells &&
                Object.keys(spells)
                  .filter((rank) => spells[rank].length > 0)
                  .map((rank, index) => (
                    <Accordion.Item value={`rank-group-${index}`}>
                      <Accordion.Control>
                        <Group wrap='nowrap' justify='space-between' gap={0}>
                          <Text c='gray.5' fw={700} fz='sm'>
                            {rank === '0' ? 'Cantrips' : `${rankNumber(parseInt(rank))}`}
                          </Text>
                          <Badge mr='sm' variant='outline' color='gray.5' size='xs'>
                            <Text fz='sm' c='gray.5' span>
                              {spells[rank].length}
                            </Text>
                          </Badge>
                        </Group>
                      </Accordion.Control>
                      <Accordion.Panel>
                        <Stack gap={5}>
                          {spells[rank].map((spell, index) => (
                            <SpellListEntry
                              key={index}
                              spell={spell}
                              exhausted={!character?.spells?.focus_point_current}
                              onCastSpell={(cast: boolean) => {
                                castSpell(cast, spell);
                              }}
                              onOpenManageSpells={() => {
                                props.openManageSpells?.(
                                  props.source!.name,
                                  props.source!.type === 'PREPARED-LIST' ? 'SLOTS-AND-LIST' : 'SLOTS-ONLY'
                                );
                              }}
                              hasFilters={props.hasFilters}
                            />
                          ))}
                        </Stack>
                      </Accordion.Panel>
                    </Accordion.Item>
                  ))}
            </Accordion>
          </Stack>
        </Accordion.Panel>
      </Accordion.Item>
    );
  }

  if (props.type === 'INNATE' && props.extra?.innates) {
    // If there are no spells to display, and there are filters, return null
    if (
      props.hasFilters &&
      innateSpells &&
      Object.keys(innateSpells).filter((rank) => innateSpells[rank].find((s) => s.spell)).length === 0
    ) {
      return null;
    }

    return (
      <Accordion.Item value={props.index}>
        <Accordion.Control>
          <Group wrap='nowrap' justify='space-between' gap={0}>
            <Text c='gray.5' fw={700} fz='sm'>
              Innate Spells
            </Text>
          </Group>
        </Accordion.Control>
        <Accordion.Panel
          styles={{
            content: {
              padding: 0,
            },
          }}
        >
          <Stack gap={0}>
            <Divider color='dark.6' />
            <Accordion
              px={10}
              variant='separated'
              multiple
              defaultValue={[]}
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
              {innateSpells &&
                Object.keys(innateSpells)
                  .filter((rank) =>
                    innateSpells[rank].length > 0 && props.hasFilters ? innateSpells[rank].find((s) => s.spell) : true
                  )
                  .map((rank, index) => (
                    <Accordion.Item value={`rank-group-${index}`}>
                      <Accordion.Control>
                        <Group wrap='nowrap' justify='space-between' gap={0}>
                          <Text c='gray.5' fw={700} fz='sm'>
                            {rank === '0' ? 'Cantrips' : `${rankNumber(parseInt(rank))}`}
                          </Text>
                          <Badge mr='sm' variant='outline' color='gray.5' size='xs'>
                            <Text fz='sm' c='gray.5' span>
                              {props.hasFilters
                                ? innateSpells[rank].filter((s) => s.spell).length
                                : innateSpells[rank].length}
                            </Text>
                          </Badge>
                        </Group>
                      </Accordion.Control>
                      <Accordion.Panel>
                        <Stack gap={5}>
                          {innateSpells[rank].map((innate, index) => (
                            <SpellListEntry
                              key={index}
                              spell={innate.spell}
                              exhausted={innate.casts_current >= innate.casts_max}
                              onCastSpell={(cast: boolean) => {
                                if (innate.spell) castSpell(cast, innate.spell);
                              }}
                              onOpenManageSpells={() => {
                                props.openManageSpells?.(
                                  props.source!.name,
                                  props.source!.type === 'PREPARED-LIST' ? 'SLOTS-AND-LIST' : 'SLOTS-ONLY'
                                );
                              }}
                              hasFilters={props.hasFilters}
                            />
                          ))}
                        </Stack>
                      </Accordion.Panel>
                    </Accordion.Item>
                  ))}
            </Accordion>
          </Stack>
        </Accordion.Panel>
      </Accordion.Item>
    );
  }

  if (props.type === 'RITUAL') {
    // If there are no spells to display, and there are filters, return null
    if (props.hasFilters && spells && !Object.keys(spells).find((rank) => spells[rank].length > 0)) {
      return null;
    }

    return (
      <Accordion.Item value={props.index}>
        <Accordion.Control>
          <Group wrap='nowrap' justify='space-between' gap={0}>
            <Group gap={10}>
              <Text c='gray.5' fw={700} fz='sm'>
                Rituals
              </Text>
              <Badge variant='outline' color='gray.5' size='xs'>
                <Text fz='sm' c='gray.5' span>
                  {props.spellIds.length}
                </Text>
              </Badge>
            </Group>

            <Box mr={10}>
              <BlurButton
                size='xs'
                fw={500}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();

                  props.openManageSpells?.('rituals', 'LIST-ONLY');
                }}
              >
                Manage
              </BlurButton>
            </Box>
          </Group>
        </Accordion.Control>
        <Accordion.Panel
          styles={{
            content: {
              padding: 0,
            },
          }}
        >
          <Stack gap={5}>
            <Divider color='dark.6' />
            {spells &&
              Object.keys(spells)
                .reduce((acc, rank) => acc.concat(spells[rank]), [] as Spell[])
                .map((spell, index) => (
                  <SpellListEntry
                    key={index}
                    spell={spell}
                    exhausted={false}
                    onCastSpell={(cast: boolean) => {
                      castSpell(cast, spell);
                    }}
                    onOpenManageSpells={() => {
                      props.openManageSpells?.(
                        props.source!.name,
                        props.source!.type === 'PREPARED-LIST' ? 'SLOTS-AND-LIST' : 'SLOTS-ONLY'
                      );
                    }}
                    hasFilters={props.hasFilters}
                  />
                ))}

            {props.spellIds.length === 0 && (
              <Text c='gray.6' fz='sm' fs='italic' ta='center' py={5}>
                No rituals known
              </Text>
            )}
          </Stack>
        </Accordion.Panel>
      </Accordion.Item>
    );
  }

  return null;
}

function SpellListEntry(props: {
  spell?: Spell;
  exhausted: boolean;
  onCastSpell: (cast: boolean) => void;
  onOpenManageSpells?: () => void;
  hasFilters: boolean;
}) {
  const [_drawer, openDrawer] = useRecoilState(drawerState);

  if (props.spell) {
    return (
      <StatButton
        onClick={() => {
          if (!props.spell) return;
          openDrawer({
            type: 'cast-spell',
            data: {
              id: props.spell.id,
              spell: props.spell,
              exhausted: props.exhausted,
              onCastSpell: (cast: boolean) => {
                props.onCastSpell(cast);
              },
            },
            extra: { addToHistory: true },
          });
        }}
      >
        <SpellSelectionOption
          noBackground
          hideRank
          exhausted={props.exhausted}
          spell={props.spell}
          onClick={() => {}}
          px={0}
        />
      </StatButton>
    );
  }

  if (props.hasFilters) {
    return null;
  }

  return (
    <StatButton
      onClick={() => {
        props.onOpenManageSpells?.();
      }}
    >
      <Text fz='xs' fs='italic' c='dimmed' fw={500} pl={7}>
        No Spell Prepared
      </Text>
    </StatButton>
  );
}

function SpellSlotSelect(props: { count: number; onChange: (v: number) => void }) {
  return (
    <TokenSelect
      count={props.count}
      onChange={props.onChange}
      size='xs'
      emptySymbol={
        <ActionIcon
          variant='transparent'
          color='gray.1'
          aria-label='Spell Slot, Unused'
          size='xs'
          style={{ opacity: 0.7 }}
        >
          <IconSquareRounded size='0.8rem' />
        </ActionIcon>
      }
      fullSymbol={
        <ActionIcon
          variant='transparent'
          color='gray.1'
          aria-label='Spell Slot, Exhuasted'
          size='xs'
          style={{ opacity: 0.7 }}
        >
          <IconSquareRoundedFilled size='0.8rem' />
        </ActionIcon>
      }
    />
  );
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

  const data = searchQuery.trim() ? constructData(search.current.search(searchQuery.trim())) : rawData;

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
                borderColor: searchQuery.trim().length > 0 ? theme.colors['guide'][8] : undefined,
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
          {data &&
            data.ancestryFeats.length === 0 &&
            data.classFeats.length === 0 &&
            data.generalAndSkillFeats.length === 0 &&
            data.otherFeats.length === 0 &&
            data.classFeatures.length === 0 &&
            data.heritages.length === 0 &&
            data.physicalFeatures.length === 0 && (
              <Text c='gray.5' fz='sm' ta='center' fs='italic' py={20}>
                No feats or features found.
              </Text>
            )}

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
  return (
    <Box h={props.panelHeight}>
      <Center pt={50}>
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
      </Center>
    </Box>
  );
}

function PanelDetails(props: { content: ContentPackage; panelHeight: number }) {
  const theme = useMantineTheme();
  const [_drawer, openDrawer] = useRecoilState(drawerState);

  const [character, setCharacter] = useRecoilState(characterState);

  const languages = (getVariable<VariableListStr>('CHARACTER', 'LANGUAGE_IDS')?.value ?? []).map((langId) => {
    const lang = props.content.languages.find((lang) => `${lang.id}` === langId);
    return lang;
  });

  const weaponGroupProfs = getAllWeaponGroupVariables('CHARACTER').filter((prof) => prof.value.value !== 'U');
  const weaponProfs = getAllWeaponVariables('CHARACTER').filter((prof) => prof.value.value !== 'U');

  const armorGroupProfs = getAllArmorGroupVariables('CHARACTER').filter((prof) => prof.value.value !== 'U');
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
                      root: {
                        border: `1px solid ${theme.colors.dark[4]}`,
                        backgroundColor: theme.colors.dark[6],
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
                            {getVariable<VariableProf>('CHARACTER', 'ADVANCED_WEAPONS')?.value.value}
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
                            {getVariable<VariableProf>('CHARACTER', 'UNARMORED_DEFENSE')?.value.value}
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
                          <Text c='gray.0'>{displayFinalProfValue('CHARACTER', 'SPELL_ATTACK')}</Text>
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
                    <Badge variant='default'>{getVariable<VariableProf>('CHARACTER', 'CLASS_DC')?.value.value}</Badge>
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
              <ActionIcon variant='transparent' aria-label={`${page.name}`} color={page.color} size='xs'>
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
              minHeight={props.panelHeight}
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
  return (
    <Box h={props.panelHeight}>
      <Center pt={50}>
        <Stack>
          <Title ta='center' fs='italic' order={2}>
            More to come!
          </Title>
          <Text c='dimmed' ta='center' fz='sm' maw={500}>
            This miscellaneous section will be updated with more features in the future. You can expect to see support
            for vehicles, snares, and whatever other awesome stuff Paizo comes up with! 🔥
          </Text>
        </Stack>
      </Center>
    </Box>
  );
}
