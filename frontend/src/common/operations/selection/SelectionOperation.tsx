import VariableSelect from '@common/VariableSelect';
import RichTextInput from '@common/rich_text_input/RichTextInput';
import { SelectContentButton } from '@common/select/SelectContent';
import { toHTML } from '@content/content-utils';
import {
  ActionIcon,
  Anchor,
  Badge,
  Box,
  Button,
  Collapse,
  Divider,
  Group,
  HoverCard,
  NumberInput,
  SegmentedControl,
  Select,
  Stack,
  Switch,
  TagsInput,
  Text,
  TextInput,
  Title,
  Tooltip,
  useMantineTheme,
} from '@mantine/core';
import { useDidUpdate, useDisclosure } from '@mantine/hooks';
import { createDefaultOperation } from '@operations/operation-utils';
import { IconCircleMinus, IconCirclePlus } from '@tabler/icons-react';
import { JSONContent } from '@tiptap/react';
import { AbilityBlock, AbilityBlockType, Language, Rarity, Spell } from '@typing/content';
import {
  Operation,
  OperationAdjValue,
  OperationGiveAbilityBlock,
  OperationGiveLanguage,
  OperationGiveSpell,
  OperationSelectFilters,
  OperationSelectFiltersAbilityBlock,
  OperationSelectFiltersAdjValue,
  OperationSelectFiltersLanguage,
  OperationSelectFiltersSpell,
  OperationSelectFiltersTrait,
  OperationSelectOption,
  OperationSelectOptionAbilityBlock,
  OperationSelectOptionAdjValue,
  OperationSelectOptionCustom,
  OperationSelectOptionLanguage,
  OperationSelectOptionSpell,
  OperationSelectOptionType,
} from '@typing/operations';
import { ExtendedProficiencyValue, ExtendedVariableValue, VariableType, VariableValue } from '@typing/variables';
import useRefresh from '@utils/use-refresh';
import { getVariable } from '@variables/variable-manager';
import { useEffect, useState } from 'react';
import { OperationSection, OperationWrapper } from '../Operations';
import { AdjustValueInput } from '../variables/AdjValOperation';
import { labelToVariable } from '@variables/variable-utils';
import { DISCORD_URL } from '@constants/data';
import { modals } from '@mantine/modals';

export function SelectionOperation(props: {
  data: {
    title?: string;
    description?: string;
    modeType: 'PREDEFINED' | 'FILTERED';
    optionType: OperationSelectOptionType;
    optionsPredefined?: OperationSelectOption[];
    optionsFilters?: OperationSelectFilters;
  };
  onChange: (option: {
    title?: string;
    description?: string;
    modeType: 'PREDEFINED' | 'FILTERED';
    optionType: OperationSelectOptionType;
    optionsPredefined?: OperationSelectOption[];
    optionsFilters?: OperationSelectFilters;
  }) => void;
  onRemove: () => void;
}) {
  // const [optionType, setOptionType] = useState<OperationSelectOptionType | null>(props.data.optionType);

  // const [title, setTitle] = useState<string | undefined>(props.data.title);
  // const [modeType, setModeType] = useState(props.data.modeType);

  // const [filters, setFilters] = useState<OperationSelectFilters | undefined>(props.data.optionsFilters);
  // const [options, setOptions] = useState<OperationSelectOption[] | undefined>(props.data.optionsPredefined);

  // useDidUpdate(() => {
  //   props.onChange({
  //     title: title,
  //     modeType: modeType,
  //     optionType: optionType ?? 'ABILITY_BLOCK',
  //     optionsPredefined: options,
  //     optionsFilters: filters,
  //   });
  // }, [title, modeType, optionType, filters, options]);

  // useDidUpdate(() => {
  //   setOptionType(props.data.optionType);
  //   setTitle(props.data.title);
  //   setModeType(props.data.modeType);
  //   setFilters(props.data.optionsFilters);
  //   setOptions(props.data.optionsPredefined);
  // }, [props.data]);

  const routeChange = (data: {
    title?: string;
    description?: string;
    modeType?: 'PREDEFINED' | 'FILTERED';
    optionType?: OperationSelectOptionType;
    optionsPredefined?: OperationSelectOption[];
    optionsFilters?: OperationSelectFilters;
  }) => {
    props.onChange({
      title: data.title ?? props.data.title,
      modeType: data.modeType ?? props.data.modeType,
      optionType: data.optionType ?? props.data.optionType,
      optionsPredefined: data.optionsPredefined ?? props.data.optionsPredefined,
      optionsFilters: data.optionsFilters ?? props.data.optionsFilters,
    });
  };

  return (
    <OperationWrapper onRemove={props.onRemove} title='Selection'>
      <Select
        placeholder='Type'
        size='xs'
        w={130}
        data={
          [
            { label: 'Ability Block', value: 'ABILITY_BLOCK' },
            { label: 'Spell', value: 'SPELL' },
            { label: 'Adjust Value', value: 'ADJ_VALUE' },
            { label: 'Language', value: 'LANGUAGE' },
            { label: 'Trait', value: 'TRAIT' },
            { label: 'Custom', value: 'CUSTOM' },
          ] satisfies { label: string; value: OperationSelectOptionType }[]
        }
        value={props.data.optionType}
        onChange={(value) => routeChange({ optionType: value as OperationSelectOptionType | undefined })}
      />
      <Stack w='100%'>
        <Stack gap={10}>
          <Box>
            <TextInput
              label='Selection Title'
              placeholder='"Select an Option"'
              value={props.data.title}
              size='xs'
              onChange={(e) => routeChange({ title: e.target.value })}
            />
          </Box>

          <Box>
            <Divider
              label={
                <>
                  {['ABILITY_BLOCK', 'SPELL', 'LANGUAGE', 'ADJ_VALUE', 'TRAIT'].includes(
                    props.data.optionType ?? ''
                  ) && (
                    <SegmentedControl
                      size='xs'
                      value={props.data.modeType}
                      onChange={(value) => routeChange({ modeType: value as 'PREDEFINED' | 'FILTERED' })}
                      data={[
                        { label: 'Predefined', value: 'PREDEFINED' },
                        { label: 'Filtered', value: 'FILTERED' },
                      ]}
                    />
                  )}
                </>
              }
              labelPosition='left'
            />
          </Box>

          <Box py='sm'>
            {props.data.modeType === 'PREDEFINED' && (
              <SelectionPredefined
                optionType={props.data.optionType}
                options={props.data.optionsPredefined}
                onChange={(options) => routeChange({ optionsPredefined: options })}
              />
            )}
            {props.data.modeType === 'FILTERED' && (
              <SelectionFiltered
                optionType={props.data.optionType}
                filters={props.data.optionsFilters}
                onChange={(filters) => routeChange({ optionsFilters: filters })}
              />
            )}
          </Box>
        </Stack>
      </Stack>
    </OperationWrapper>
  );
}

function SelectionFiltered(props: {
  optionType: OperationSelectOptionType | null;
  filters?: OperationSelectFilters;
  onChange: (filters: OperationSelectFilters) => void;
}) {
  if (props.optionType === 'ABILITY_BLOCK') {
    return (
      <SelectionFilteredAbilityBlock
        optionType={props.optionType}
        filters={props.filters as OperationSelectFiltersAbilityBlock}
        onChange={props.onChange}
      />
    );
  }
  if (props.optionType === 'SPELL') {
    return (
      <SelectionFilteredSpell
        optionType={props.optionType}
        filters={props.filters as OperationSelectFiltersSpell}
        onChange={props.onChange}
      />
    );
  }
  if (props.optionType === 'LANGUAGE') {
    return (
      <SelectionFilteredLanguage
        optionType={props.optionType}
        filters={props.filters as OperationSelectFiltersLanguage}
        onChange={props.onChange}
      />
    );
  }
  if (props.optionType === 'TRAIT') {
    return (
      <SelectionFilteredTrait
        optionType={props.optionType}
        filters={props.filters as OperationSelectFiltersTrait}
        onChange={props.onChange}
      />
    );
  }
  if (props.optionType === 'ADJ_VALUE') {
    return (
      <SelectionFilteredAdjValue
        optionType={props.optionType}
        filters={props.filters as OperationSelectFiltersAdjValue}
        onChange={props.onChange}
      />
    );
  }

  return null;
}

function SelectionFilteredAbilityBlock(props: {
  optionType: OperationSelectOptionType;
  filters?: OperationSelectFiltersAbilityBlock;
  onChange: (filters: OperationSelectFiltersAbilityBlock) => void;
}) {
  const [type, setType] = useState<AbilityBlockType | undefined>(props.filters?.abilityBlockType);
  const [minLevel, setMinLevel] = useState<number | undefined>(props.filters?.level.min ?? undefined);
  const [maxLevel, setMaxLevel] = useState<number | undefined>(props.filters?.level.max ?? undefined);
  const [traits, setTraits] = useState<string[]>((props.filters?.traits as string[]) ?? []);
  const [isFromClass, setIsFromClass] = useState<boolean | undefined>(props.filters?.isFromClass);
  const [isFromAncestry, setIsFromAncestry] = useState<boolean | undefined>(props.filters?.isFromAncestry);
  const [isFromArchetype, setIsFromArchetype] = useState<boolean | undefined>(props.filters?.isFromArchetype);

  useDidUpdate(() => {
    props.onChange({
      id: props.filters?.id ?? crypto.randomUUID(),
      type: 'ABILITY_BLOCK',
      level: {
        min: minLevel,
        max: maxLevel,
      },
      traits: traits,
      abilityBlockType: type,
      isFromClass: isFromClass,
      isFromAncestry: isFromAncestry,
      isFromArchetype: isFromArchetype,
    });
  }, [minLevel, maxLevel, traits, type, isFromClass, isFromAncestry, isFromArchetype]);

  return (
    <Stack gap={10}>
      <Select
        data={
          [
            { label: 'Action', value: 'action' },
            { label: 'Feat', value: 'feat' },
            { label: 'Physical Feature', value: 'physical-feature' },
            { label: 'Sense', value: 'sense' },
            { label: 'Class Feature', value: 'class-feature' },
            { label: 'Heritage', value: 'heritage' },
          ] satisfies { label: string; value: AbilityBlockType }[]
        }
        value={type}
        onChange={(value) => setType(value ? (value as AbilityBlockType) : undefined)}
      />

      <Box>
        <Text c='gray.4' fz='xs'>
          Levels
        </Text>
        <Group>
          <NumberInput
            placeholder='Min'
            value={minLevel}
            onChange={(value) => setMinLevel(parseInt(`${value}`))}
            size='xs'
            min={-1}
            max={20}
          />
          -
          <NumberInput
            placeholder='Max'
            value={maxLevel}
            onChange={(value) => setMaxLevel(parseInt(`${value}`))}
            size='xs'
            min={-1}
            max={20}
          />
        </Group>
      </Box>

      <TagsInput
        label='Has Traits'
        placeholder='Enter trait'
        size='xs'
        splitChars={[',', ';', '|']}
        data={[]}
        value={traits}
        onChange={setTraits}
      />

      <Switch
        size='xs'
        checked={isFromAncestry}
        onChange={(e) => setIsFromAncestry(e.target.checked)}
        label='Only from your ancestry (unreliable)'
      />

      <Switch
        size='xs'
        checked={isFromClass}
        onChange={(e) => setIsFromClass(e.target.checked)}
        label='Only from your class (unreliable)'
      />

      <Switch
        size='xs'
        checked={isFromArchetype}
        onChange={(e) => setIsFromArchetype(e.target.checked)}
        label='Only from your archetypes (unreliable)'
      />
    </Stack>
  );
}

function SelectionFilteredSpell(props: {
  optionType: OperationSelectOptionType;
  filters?: OperationSelectFiltersSpell;
  onChange: (filters: OperationSelectFiltersSpell) => void;
}) {
  const [minLevel, setMinLevel] = useState<number | undefined>(props.filters?.level.min ?? undefined);
  const [maxLevel, setMaxLevel] = useState<number | undefined>(props.filters?.level.max ?? undefined);
  const [traits, setTraits] = useState<string[]>(props.filters?.traits ?? []);
  const [traditions, setTraditions] = useState<string[]>(props.filters?.traditions ?? []);

  // Spell Data
  const [type, setType] = useState(props.filters?.spellData?.type ?? 'NORMAL');
  const [castingSource, setCastingSource] = useState(props.filters?.spellData?.castingSource);
  const [rank, setRank] = useState(props.filters?.spellData?.rank);
  const [tradition, setTradition] = useState(props.filters?.spellData?.tradition);
  const [casts, setCasts] = useState(props.filters?.spellData?.casts);

  useDidUpdate(() => {
    props.onChange({
      id: props.filters?.id ?? crypto.randomUUID(),
      type: 'SPELL',
      level: {
        min: minLevel,
        max: maxLevel,
      },
      traits: traits,
      traditions: traditions,
      spellData: {
        type: type ?? 'NORMAL',
        castingSource: castingSource,
        rank: rank,
        tradition: tradition,
        casts: casts,
      },
    });
  }, [minLevel, maxLevel, traits, traditions, type, castingSource, rank, tradition, casts]);

  return (
    <Stack gap={10}>
      <Divider label={<Text fz='sm'>Spell Data</Text>} labelPosition='left' />

      <Stack gap={10}>
        <Box>
          <SegmentedControl
            value={type}
            size='xs'
            onChange={(v) => setType(v as 'NORMAL' | 'FOCUS' | 'INNATE')}
            data={[
              { label: 'Normal', value: 'NORMAL' },
              { label: 'Focus', value: 'FOCUS' },
              { label: 'Innate', value: 'INNATE' },
            ]}
          />
        </Box>

        {type === 'NORMAL' && (
          <Group>
            <TextInput
              ff='Ubuntu Mono, monospace'
              size='xs'
              placeholder='Casting Source'
              w={190}
              value={castingSource}
              onChange={(e) => {
                setCastingSource(labelToVariable(e.target.value, false));
              }}
            />
            <NumberInput
              size='xs'
              placeholder='Rank'
              min={0}
              max={10}
              w={70}
              value={rank}
              onChange={(val) => setRank(parseInt(`${val}`))}
              allowDecimal={false}
            />
          </Group>
        )}
        {type === 'FOCUS' && (
          <Group>
            <TextInput
              ff='Ubuntu Mono, monospace'
              size='xs'
              placeholder='Casting Source'
              w={190}
              value={castingSource}
              onChange={(e) => {
                setCastingSource(labelToVariable(e.target.value, false));
              }}
            />
          </Group>
        )}
        {type === 'INNATE' && (
          <Group>
            <SegmentedControl
              value={tradition}
              size='xs'
              onChange={(v) => setTradition(v as 'ARCANE' | 'OCCULT' | 'PRIMAL' | 'DIVINE')}
              data={[
                { label: 'Arcane', value: 'ARCANE' },
                { label: 'Divine', value: 'DIVINE' },
                { label: 'Occult', value: 'OCCULT' },
                { label: 'Primal', value: 'PRIMAL' },
              ]}
            />
            <NumberInput
              size='xs'
              placeholder='Rank'
              min={0}
              max={10}
              w={70}
              value={rank}
              onChange={(val) => setRank(parseInt(`${val}`))}
              allowDecimal={false}
            />
            <NumberInput
              size='xs'
              placeholder='Casts'
              rightSection={<Text fz='xs'>/day</Text>}
              min={0}
              max={10}
              w={90}
              value={casts}
              onChange={(val) => setCasts(parseInt(`${val}`))}
              allowDecimal={false}
            />
          </Group>
        )}
      </Stack>

      <Divider label={<Text fz='sm'>List Filters</Text>} labelPosition='left' />

      <Box>
        <Text c='gray.4' fz='xs'>
          Levels
        </Text>
        <Group>
          <NumberInput
            placeholder='Min'
            value={minLevel}
            onChange={(value) => setMinLevel(parseInt(`${value}`))}
            size='xs'
            min={-1}
            max={20}
          />
          -
          <NumberInput
            placeholder='Max'
            value={maxLevel}
            onChange={(value) => setMaxLevel(parseInt(`${value}`))}
            size='xs'
            min={-1}
            max={20}
          />
        </Group>
      </Box>

      <Group>
        <TagsInput
          label='Has Traits'
          placeholder='Enter trait'
          size='xs'
          splitChars={[',', ';', '|']}
          data={[]}
          value={traits}
          onChange={setTraits}
        />

        <TagsInput
          label='Has Traditions'
          placeholder='Enter tradition'
          size='xs'
          splitChars={[',', ';', '|']}
          data={['Arcane', 'Divine', 'Occult', 'Primal']}
          value={traditions}
          onChange={setTraditions}
        />
      </Group>
    </Stack>
  );
}

function SelectionFilteredLanguage(props: {
  optionType: OperationSelectOptionType;
  filters?: OperationSelectFiltersLanguage;
  onChange: (filters: OperationSelectFiltersLanguage) => void;
}) {
  const [rarity, setRarity] = useState<Rarity | undefined>(props.filters?.rarity ?? undefined);
  const [core, setCore] = useState<boolean | 'ANY'>(props.filters?.core ?? 'ANY');

  useEffect(() => {
    props.onChange({
      id: props.filters?.id ?? crypto.randomUUID(),
      type: 'LANGUAGE',
      rarity: rarity,
      core: core === 'ANY' ? undefined : core,
    });
  }, [rarity, core]);

  return (
    <Stack gap={10}>
      <Box>
        <Select
          label='Rarity'
          placeholder='Select rarity'
          data={
            [
              { label: 'Common', value: 'COMMON' },
              { label: 'Uncommon', value: 'UNCOMMON' },
              { label: 'Rare', value: 'RARE' },
              { label: 'Unique', value: 'UNIQUE' },
            ] satisfies { label: string; value: Rarity }[]
          }
          value={rarity}
          onChange={(value) => {
            if (value === null) {
              setRarity(undefined);
            } else {
              setRarity(value as Rarity);
            }
          }}
          size='xs'
        />
      </Box>

      <Box>
        <SegmentedControl
          size='xs'
          value={core === 'ANY' ? 'ANY' : core ? 'CORE' : 'NON-CORE'}
          onChange={(value) => {
            if (value === 'ANY') {
              setCore('ANY');
            } else {
              setCore(value === 'CORE');
            }
          }}
          data={[
            { label: 'Any', value: 'ANY' },
            { label: 'Core Only', value: 'CORE' },
            { label: 'Non-Core Only', value: 'NON-CORE' },
          ]}
        />
      </Box>
    </Stack>
  );
}

function SelectionFilteredTrait(props: {
  optionType: OperationSelectOptionType;
  filters?: OperationSelectFiltersTrait;
  onChange: (filters: OperationSelectFiltersTrait) => void;
}) {
  const [isCreature, setIsCreature] = useState<boolean | undefined>(props.filters?.isCreature ?? undefined);
  const [isAncestry, setIsAncestry] = useState<boolean | undefined>(props.filters?.isAncestry ?? undefined);
  const [isClass, setIsClass] = useState<boolean | undefined>(props.filters?.isClass ?? undefined);

  useDidUpdate(() => {
    props.onChange({
      id: props.filters?.id ?? crypto.randomUUID(),
      type: 'TRAIT',
      isCreature: isCreature,
      isAncestry: isAncestry,
      isClass: isClass,
    });
  }, [isCreature, isAncestry, isClass]);

  return (
    <Stack gap={10}>
      <Box>
        <Switch size='xs' checked={isClass} onChange={(e) => setIsClass(e.target.checked)} label='Class Traits' />
      </Box>
      <Box>
        <Switch
          size='xs'
          checked={isAncestry}
          onChange={(e) => setIsAncestry(e.target.checked)}
          label='Ancestry Traits'
        />
      </Box>
      <Box>
        <Switch
          size='xs'
          checked={isCreature}
          onChange={(e) => setIsCreature(e.target.checked)}
          label='Creature Traits'
        />
      </Box>
    </Stack>
  );
}

function SelectionFilteredAdjValue(props: {
  optionType: OperationSelectOptionType;
  filters?: OperationSelectFiltersAdjValue;
  onChange: (filters: OperationSelectFiltersAdjValue) => void;
}) {
  const [group, setGroup] = useState<string>(props.filters?.group ?? 'SKILL');
  const [value, setValue] = useState<VariableValue | ExtendedProficiencyValue>(props.filters?.value ?? { value: 'U' });

  useDidUpdate(() => {
    props.onChange({
      id: props.filters?.id ?? crypto.randomUUID(),
      type: 'ADJ_VALUE',
      group: (group ?? 'SKILL') as OperationSelectFiltersAdjValue['group'],
      value: value ?? '',
    });
  }, [group, value]);

  return (
    <Stack gap={10}>
      <Box>
        <SegmentedControl
          size='xs'
          value={group}
          onChange={(value) => {
            setGroup(value);
          }}
          data={[
            { label: 'Skill', value: 'SKILL' },
            { label: 'Add Lore', value: 'ADD-LORE' },
            { label: 'Attribute', value: 'ATTRIBUTE' },
            { label: 'Weapon Group', value: 'WEAPON-GROUP' },
            { label: 'Weapon', value: 'WEAPON' },
            { label: 'Armor Group', value: 'ARMOR-GROUP' },
            { label: 'Armor', value: 'ARMOR' },
          ]}
        />
      </Box>

      <Box>
        {group && (
          <AdjustValueInput
            variableType={group === 'ATTRIBUTE' ? 'attr' : 'prof'}
            value={value ?? ''}
            onChange={(value) => {
              setValue(value);
            }}
            options={{
              profExtended: group === 'SKILL' || group === 'ADD-LORE',
            }}
          />
        )}
      </Box>
    </Stack>
  );
}

function SelectionPredefined(props: {
  optionType: OperationSelectOptionType | null;
  options?: OperationSelectOption[];
  onChange: (options: OperationSelectOption[]) => void;
}) {
  if (props.optionType === 'ABILITY_BLOCK') {
    return (
      <SelectionPredefinedAbilityBlock
        optionType={props.optionType}
        options={props.options as OperationSelectOptionAbilityBlock[]}
        onChange={props.onChange}
        type='feat'
      />
    );
  }
  if (props.optionType === 'SPELL') {
    return (
      <SelectionPredefinedSpell
        optionType={props.optionType}
        options={props.options as OperationSelectOptionSpell[]}
        onChange={props.onChange}
      />
    );
  }
  if (props.optionType === 'LANGUAGE') {
    return (
      <SelectionPredefinedLanguage
        optionType={props.optionType}
        options={props.options as OperationSelectOptionLanguage[]}
        onChange={props.onChange}
      />
    );
  }
  if (props.optionType === 'ADJ_VALUE') {
    return (
      <SelectionPredefinedAdjValue
        optionType={props.optionType}
        options={props.options as OperationSelectOptionAdjValue[]}
        onChange={props.onChange}
      />
    );
  }
  if (props.optionType === 'CUSTOM') {
    return (
      <SelectionPredefinedCustom
        optionType={props.optionType}
        options={props.options as OperationSelectOptionCustom[]}
        onChange={props.onChange}
      />
    );
  }

  return null;
}

function SelectionPredefinedAbilityBlock(props: {
  optionType: OperationSelectOptionType;
  options?: OperationSelectOptionAbilityBlock[];
  onChange: (options: OperationSelectOptionAbilityBlock[]) => void;
  type: AbilityBlockType;
}) {
  const [options, setOptions] = useState<OperationSelectOptionAbilityBlock[]>(props.options ?? []);

  useDidUpdate(() => {
    props.onChange(options);
  }, [options]);

  const optionsForUI =
    options.length === 0
      ? ([
          {
            id: crypto.randomUUID(),
            type: 'ABILITY_BLOCK',
            operation: createDefaultOperation('giveAbilityBlock') as OperationGiveAbilityBlock,
          },
        ] satisfies OperationSelectOptionAbilityBlock[])
      : options;

  return (
    <Stack gap={10}>
      {optionsForUI.map((option, index) => (
        <Group key={index} wrap='nowrap' style={{ position: 'relative' }}>
          <SelectContentButton<AbilityBlock>
            type='ability-block'
            onClick={(selected) => {
              setOptions((prev) => {
                const ops = [...prev].filter((op) => op.id !== option.id);
                ops.push({
                  id: option.id,
                  type: 'ABILITY_BLOCK',
                  operation: {
                    ...option.operation,
                    data: {
                      ...option.operation.data,
                      abilityBlockId: selected.id,
                    },
                  },
                });
                return ops;
              });
            }}
            selectedId={option.operation.data.abilityBlockId}
            options={{
              abilityBlockType: props.type,
              showButton: false,
            }}
          />
          {optionsForUI[optionsForUI.length - 1].id === option.id && index !== 0 && (
            <Tooltip label='Remove Option' position='right' withArrow withinPortal>
              <ActionIcon
                style={{
                  position: 'absolute',
                  top: -5,
                  left: -30,
                }}
                size='sm'
                variant='subtle'
                color='gray'
                onClick={() => {
                  modals.openConfirmModal({
                    id: 'remove-option',
                    title: <Title order={4}>Remove Option</Title>,
                    children: (
                      <Text size='sm'>Are you sure you want to remove this option? This action cannot be undone.</Text>
                    ),
                    labels: { confirm: 'Confirm', cancel: 'Cancel' },
                    onCancel: () => {},
                    onConfirm: () => {
                      setOptions((prev) => {
                        const ops = [...prev].filter((op) => op.id !== option.id);
                        return ops;
                      });
                    },
                  });
                }}
              >
                <IconCircleMinus size='0.9rem' />
              </ActionIcon>
            </Tooltip>
          )}
          {optionsForUI[optionsForUI.length - 1].id === option.id && (
            <Tooltip label='Add Option' position='right' withArrow withinPortal>
              <ActionIcon
                style={{
                  position: 'absolute',
                  top: 18,
                  left: -30,
                }}
                size='sm'
                variant='subtle'
                color='gray'
                onClick={() => {
                  setOptions((prev) => {
                    const ops = [...optionsForUI];
                    ops.push({
                      id: crypto.randomUUID(),
                      type: 'ABILITY_BLOCK',
                      operation: createDefaultOperation('giveAbilityBlock') as OperationGiveAbilityBlock,
                    });
                    return ops;
                  });
                }}
              >
                <IconCirclePlus size='0.9rem' />
              </ActionIcon>
            </Tooltip>
          )}
        </Group>
      ))}
    </Stack>
  );
}

function SelectionPredefinedSpell(props: {
  optionType: OperationSelectOptionType;
  options?: OperationSelectOptionSpell[];
  onChange: (options: OperationSelectOptionSpell[]) => void;
}) {
  const [options, setOptions] = useState<OperationSelectOptionSpell[]>(props.options ?? []);

  // Spell Data
  const firstOption = props.options && (props.options.length > 0 ? props.options[0] : undefined);
  const [type, setType] = useState(firstOption?.operation.data.type ?? 'NORMAL');
  const [castingSource, setCastingSource] = useState(firstOption?.operation.data.castingSource);
  const [rank, setRank] = useState(firstOption?.operation.data.rank);
  const [tradition, setTradition] = useState(firstOption?.operation.data.tradition);
  const [casts, setCasts] = useState(firstOption?.operation.data.casts);

  useDidUpdate(() => {
    const ops = [...options];
    if (ops.length > 0) {
      // Update the first option's spell data
      ops[0] = {
        id: ops[0].id,
        type: 'SPELL',
        operation: {
          ...ops[0].operation,
          data: {
            ...ops[0].operation.data,
            type: type,
            castingSource: castingSource,
            rank: rank,
            tradition: tradition,
            casts: casts,
          },
        },
      };
    }
    props.onChange(ops);
  }, [type, castingSource, rank, tradition, casts]);

  useDidUpdate(() => {
    props.onChange(options);
  }, [options]);

  const optionsForUI =
    options.length === 0
      ? ([
          {
            id: crypto.randomUUID(),
            type: 'SPELL',
            operation: createDefaultOperation('giveSpell') as OperationGiveSpell,
          },
        ] satisfies OperationSelectOptionSpell[])
      : options;

  return (
    <Stack gap={10}>
      <Divider label={<Text fz='sm'>Spell Data</Text>} labelPosition='left' />

      <Stack gap={10}>
        <Box>
          <SegmentedControl
            value={type}
            size='xs'
            onChange={(v) => setType(v as 'NORMAL' | 'FOCUS' | 'INNATE')}
            data={[
              { label: 'Normal', value: 'NORMAL' },
              { label: 'Focus', value: 'FOCUS' },
              { label: 'Innate', value: 'INNATE' },
            ]}
          />
        </Box>

        {type === 'NORMAL' && (
          <Group>
            <TextInput
              ff='Ubuntu Mono, monospace'
              size='xs'
              placeholder='Casting Source'
              w={190}
              value={castingSource}
              onChange={(e) => {
                setCastingSource(labelToVariable(e.target.value, false));
              }}
            />
            <NumberInput
              size='xs'
              placeholder='Rank'
              min={0}
              max={10}
              w={70}
              value={rank}
              onChange={(val) => setRank(parseInt(`${val}`))}
              allowDecimal={false}
            />
          </Group>
        )}
        {type === 'FOCUS' && (
          <Group>
            <TextInput
              ff='Ubuntu Mono, monospace'
              size='xs'
              placeholder='Casting Source'
              w={190}
              value={castingSource}
              onChange={(e) => {
                setCastingSource(labelToVariable(e.target.value, false));
              }}
            />
          </Group>
        )}
        {type === 'INNATE' && (
          <Group>
            <SegmentedControl
              value={tradition}
              size='xs'
              onChange={(v) => setTradition(v as 'ARCANE' | 'OCCULT' | 'PRIMAL' | 'DIVINE')}
              data={[
                { label: 'Arcane', value: 'ARCANE' },
                { label: 'Divine', value: 'DIVINE' },
                { label: 'Occult', value: 'OCCULT' },
                { label: 'Primal', value: 'PRIMAL' },
              ]}
            />
            <NumberInput
              size='xs'
              placeholder='Rank'
              min={0}
              max={10}
              w={70}
              value={rank}
              onChange={(val) => setRank(parseInt(`${val}`))}
              allowDecimal={false}
            />
            <NumberInput
              size='xs'
              placeholder='Casts'
              rightSection={<Text fz='xs'>/day</Text>}
              min={0}
              max={10}
              w={90}
              value={casts}
              onChange={(val) => setCasts(parseInt(`${val}`))}
              allowDecimal={false}
            />
          </Group>
        )}
      </Stack>

      <Divider label={<Text fz='sm'>List Options</Text>} labelPosition='left' />

      {optionsForUI.map((option, index) => (
        <Group key={index} wrap='nowrap' style={{ position: 'relative' }}>
          <SelectContentButton<Spell>
            type='spell'
            onClick={(selected) => {
              setOptions((prev) => {
                const ops = [...prev].filter((op) => op.id !== option.id);
                ops.push({
                  id: option.id,
                  type: 'SPELL',
                  operation: {
                    ...option.operation,
                    data: {
                      ...option.operation.data,
                      spellId: selected.id,
                    },
                  },
                });
                return ops;
              });
            }}
            selectedId={option.operation.data.spellId}
            options={{
              showButton: false,
            }}
          />
          {optionsForUI[optionsForUI.length - 1].id === option.id && index !== 0 && (
            <Tooltip label='Remove Option' position='right' withArrow withinPortal>
              <ActionIcon
                style={{
                  position: 'absolute',
                  top: -5,
                  left: -30,
                }}
                size='sm'
                variant='subtle'
                color='gray'
                onClick={() => {
                  modals.openConfirmModal({
                    id: 'remove-option',
                    title: <Title order={4}>Remove Option</Title>,
                    children: (
                      <Text size='sm'>Are you sure you want to remove this option? This action cannot be undone.</Text>
                    ),
                    labels: { confirm: 'Confirm', cancel: 'Cancel' },
                    onCancel: () => {},
                    onConfirm: () => {
                      setOptions((prev) => {
                        const ops = [...prev].filter((op) => op.id !== option.id);
                        return ops;
                      });
                    },
                  });
                }}
              >
                <IconCircleMinus size='0.9rem' />
              </ActionIcon>
            </Tooltip>
          )}
          {optionsForUI[optionsForUI.length - 1].id === option.id && (
            <Tooltip label='Add Option' position='right' withArrow withinPortal>
              <ActionIcon
                style={{
                  position: 'absolute',
                  top: 18,
                  left: -30,
                }}
                size='sm'
                variant='subtle'
                color='gray'
                onClick={() => {
                  setOptions((prev) => {
                    const ops = [...optionsForUI];
                    ops.push({
                      id: crypto.randomUUID(),
                      type: 'SPELL',
                      operation: createDefaultOperation('giveSpell') as OperationGiveSpell,
                    });
                    return ops;
                  });
                }}
              >
                <IconCirclePlus size='0.9rem' />
              </ActionIcon>
            </Tooltip>
          )}
        </Group>
      ))}
    </Stack>
  );
}

function SelectionPredefinedLanguage(props: {
  optionType: OperationSelectOptionType;
  options?: OperationSelectOptionLanguage[];
  onChange: (options: OperationSelectOptionLanguage[]) => void;
}) {
  const [options, setOptions] = useState<OperationSelectOptionLanguage[]>(props.options ?? []);

  useDidUpdate(() => {
    props.onChange(options);
  }, [options]);

  const optionsForUI =
    options.length === 0
      ? ([
          {
            id: crypto.randomUUID(),
            type: 'LANGUAGE',
            operation: createDefaultOperation('giveLanguage') as OperationGiveLanguage,
          },
        ] satisfies OperationSelectOptionLanguage[])
      : options;

  return (
    <Stack gap={10}>
      {optionsForUI.map((option, index) => (
        <Group key={index} wrap='nowrap' style={{ position: 'relative' }}>
          <SelectContentButton<Language>
            type='language'
            onClick={(selected) => {
              setOptions((prev) => {
                const ops = [...prev].filter((op) => op.id !== option.id);
                ops.push({
                  id: option.id,
                  type: 'LANGUAGE',
                  operation: {
                    ...option.operation,
                    data: {
                      ...option.operation.data,
                      languageId: selected.id,
                    },
                  },
                });
                return ops;
              });
            }}
            selectedId={option.operation.data.languageId}
            options={{
              showButton: false,
            }}
          />
          {optionsForUI[optionsForUI.length - 1].id === option.id && index !== 0 && (
            <Tooltip label='Remove Option' position='right' withArrow withinPortal>
              <ActionIcon
                style={{
                  position: 'absolute',
                  top: -5,
                  left: -30,
                }}
                size='sm'
                variant='subtle'
                color='gray'
                onClick={() => {
                  modals.openConfirmModal({
                    id: 'remove-option',
                    title: <Title order={4}>Remove Option</Title>,
                    children: (
                      <Text size='sm'>Are you sure you want to remove this option? This action cannot be undone.</Text>
                    ),
                    labels: { confirm: 'Confirm', cancel: 'Cancel' },
                    onCancel: () => {},
                    onConfirm: () => {
                      setOptions((prev) => {
                        const ops = [...prev].filter((op) => op.id !== option.id);
                        return ops;
                      });
                    },
                  });
                }}
              >
                <IconCircleMinus size='0.9rem' />
              </ActionIcon>
            </Tooltip>
          )}
          {optionsForUI[optionsForUI.length - 1].id === option.id && (
            <Tooltip label='Add Option' position='right' withArrow withinPortal>
              <ActionIcon
                style={{
                  position: 'absolute',
                  top: 18,
                  left: -30,
                }}
                size='sm'
                variant='subtle'
                color='gray'
                onClick={() => {
                  setOptions((prev) => {
                    const ops = [...optionsForUI];
                    ops.push({
                      id: crypto.randomUUID(),
                      type: 'LANGUAGE',
                      operation: createDefaultOperation('giveLanguage') as OperationGiveLanguage,
                    });
                    return ops;
                  });
                }}
              >
                <IconCirclePlus size='0.9rem' />
              </ActionIcon>
            </Tooltip>
          )}
        </Group>
      ))}
    </Stack>
  );
}

function SelectionPredefinedAdjValue(props: {
  optionType: OperationSelectOptionType;
  options?: OperationSelectOptionAdjValue[];
  onChange: (options: OperationSelectOptionAdjValue[]) => void;
}) {
  const [variableType, setVariableType] = useState<VariableType>(
    (props.options ?? []).length > 0
      ? getVariable('CHARACTER', props.options![0].operation.data.variable)?.type ?? 'prof'
      : 'prof'
  );
  const [options, setOptions] = useState<OperationSelectOptionAdjValue[]>(props.options ?? []);
  const [adjustment, setAdjustment] = useState<ExtendedVariableValue | undefined>(
    (props.options ?? []).length > 0 ? props.options![0].operation.data.value : undefined
  );

  useDidUpdate(() => {
    props.onChange(options);
  }, [options]);

  useDidUpdate(() => {
    setOptions((prev) => {
      return prev.map((op) => {
        return {
          ...op,
          operation: {
            ...op.operation,
            data: {
              ...op.operation.data,
              value: adjustment === undefined ? 0 : adjustment,
            },
          },
        };
      });
    });
  }, [adjustment]);

  const optionsForUI =
    options.length === 0
      ? ([
          {
            id: crypto.randomUUID(),
            type: 'ADJ_VALUE',
            operation: createDefaultOperation('adjValue') as OperationAdjValue,
          },
        ] satisfies OperationSelectOptionAdjValue[])
      : options;

  return (
    <Stack gap={10}>
      <Group>
        <Select
          size='xs'
          placeholder='Value Type'
          data={
            [
              { label: 'String', value: 'str' },
              { label: 'Number', value: 'num' },
              { label: 'Boolean', value: 'bool' },
              { label: 'Proficiency', value: 'prof' },
              { label: 'Attribute', value: 'attr' },
              { label: 'List', value: 'list-str' },
            ] satisfies { label: string; value: VariableType }[]
          }
          value={variableType}
          onChange={(value) => {
            if (value === null) {
              setVariableType('prof');
            }
            setVariableType(value as VariableType);
            setOptions([]);
            setAdjustment(undefined);
          }}
        />
        <AdjustValueInput
          variableType={variableType}
          value={adjustment ?? ''}
          onChange={(value) => {
            setAdjustment(value);
          }}
        />
      </Group>

      {optionsForUI.map((option, index) => (
        <Group key={index} wrap='nowrap' style={{ position: 'relative' }}>
          <VariableSelect
            value={option.operation.data.variable}
            onChange={(variableName, variable) => {
              setOptions((prev) => {
                const ops = [...prev].filter((op) => op.id !== option.id);
                ops.push({
                  id: option.id,
                  type: 'ADJ_VALUE',
                  operation: {
                    ...option.operation,
                    data: {
                      ...option.operation.data,
                      variable: variableName,
                      value: adjustment === undefined ? 0 : adjustment,
                    },
                  },
                });
                return ops;
              });
            }}
            variableType={variableType}
          />
          {optionsForUI[optionsForUI.length - 1].id === option.id && index !== 0 && (
            <Tooltip label='Remove Option' position='right' withArrow withinPortal>
              <ActionIcon
                style={{
                  position: 'absolute',
                  top: -5,
                  left: -30,
                }}
                size='sm'
                variant='subtle'
                color='gray'
                onClick={() => {
                  modals.openConfirmModal({
                    id: 'remove-option',
                    title: <Title order={4}>Remove Option</Title>,
                    children: (
                      <Text size='sm'>Are you sure you want to remove this option? This action cannot be undone.</Text>
                    ),
                    labels: { confirm: 'Confirm', cancel: 'Cancel' },
                    onCancel: () => {},
                    onConfirm: () => {
                      setOptions((prev) => {
                        const ops = [...prev].filter((op) => op.id !== option.id);
                        return ops;
                      });
                    },
                  });
                }}
              >
                <IconCircleMinus size='0.9rem' />
              </ActionIcon>
            </Tooltip>
          )}
          {optionsForUI[optionsForUI.length - 1].id === option.id && (
            <Tooltip label='Add Option' position='right' withArrow withinPortal>
              <ActionIcon
                style={{
                  position: 'absolute',
                  top: 18,
                  left: -30,
                }}
                size='sm'
                variant='subtle'
                color='gray'
                onClick={() => {
                  setOptions((prev) => {
                    const ops = [...optionsForUI];
                    ops.push({
                      id: crypto.randomUUID(),
                      type: 'ADJ_VALUE',
                      operation: createDefaultOperation('adjValue') as OperationAdjValue,
                    });
                    return ops;
                  });
                }}
              >
                <IconCirclePlus size='0.9rem' />
              </ActionIcon>
            </Tooltip>
          )}
        </Group>
      ))}
    </Stack>
  );
}

function SelectionPredefinedCustom(props: {
  optionType: OperationSelectOptionType;
  options?: OperationSelectOptionCustom[];
  onChange: (options: OperationSelectOptionCustom[]) => void;
}) {
  const [options, setOptions] = useState<OperationSelectOptionCustom[]>(
    props.options && props.options.length > 0
      ? props.options
      : ([
          {
            id: crypto.randomUUID(),
            type: 'CUSTOM',
            title: '',
            description: '',
            operations: [],
          },
        ] satisfies OperationSelectOptionCustom[])
  );

  useDidUpdate(() => {
    props.onChange(options);
  }, [options]);

  const optionsForUI =
    options.length === 0
      ? ([
          {
            id: crypto.randomUUID(),
            type: 'CUSTOM',
            title: '',
            description: '',
            operations: [],
          },
        ] satisfies OperationSelectOptionCustom[])
      : options;

  return (
    <Stack gap={10}>
      {optionsForUI.map((option, index) => (
        <Group key={index} wrap='nowrap' style={{ position: 'relative' }}>
          <SelectionPredefinedCustomOption
            option={option}
            onChange={(newOption) => {
              setOptions((prev) => {
                return prev.map((op) => {
                  if (op.id === newOption.id) {
                    return newOption;
                  }
                  return op;
                });
              });
            }}
          />
          {optionsForUI[optionsForUI.length - 1].id === option.id && index !== 0 && (
            <Tooltip label='Remove Option' position='right' withArrow withinPortal>
              <ActionIcon
                style={{
                  position: 'absolute',
                  top: -5,
                  left: -30,
                }}
                size='sm'
                variant='subtle'
                color='gray'
                onClick={() => {
                  modals.openConfirmModal({
                    id: 'remove-option',
                    title: <Title order={4}>Remove Option</Title>,
                    children: (
                      <Text size='sm'>Are you sure you want to remove this option? This action cannot be undone.</Text>
                    ),
                    labels: { confirm: 'Confirm', cancel: 'Cancel' },
                    onCancel: () => {},
                    onConfirm: () => {
                      setOptions((prev) => {
                        const ops = [...prev].filter((op) => op.id !== option.id);
                        return ops;
                      });
                    },
                  });
                }}
              >
                <IconCircleMinus size='0.9rem' />
              </ActionIcon>
            </Tooltip>
          )}
          {optionsForUI[optionsForUI.length - 1].id === option.id && (
            <Tooltip label='Add Option' position='right' withArrow withinPortal>
              <ActionIcon
                style={{
                  position: 'absolute',
                  top: 18,
                  left: -30,
                }}
                size='sm'
                variant='subtle'
                color='gray'
                onClick={() => {
                  setOptions((prev) => {
                    const ops = [...optionsForUI];
                    ops.push({
                      id: crypto.randomUUID(),
                      type: 'CUSTOM',
                      title: '',
                      description: '',
                      operations: [],
                    });
                    return ops;
                  });
                }}
              >
                <IconCirclePlus size='0.9rem' />
              </ActionIcon>
            </Tooltip>
          )}
        </Group>
      ))}
    </Stack>
  );
}

export function SelectionPredefinedCustomOption(props: {
  option: OperationSelectOptionCustom;
  onChange: (option: OperationSelectOptionCustom) => void;
}) {
  const [displayDescription, refreshDisplayDescription] = useRefresh();
  const [openedOperations, { toggle: toggleOperations }] = useDisclosure(false);
  const theme = useMantineTheme();

  const [name, setName] = useState(props.option.title);
  const [description, setDescription] = useState<JSONContent>();
  const [descriptionText, setDescriptionText] = useState<string>(props.option.description);
  const [operations, setOperations] = useState<Operation[]>(props.option.operations ?? []);

  useDidUpdate(() => {
    props.onChange({
      ...props.option,
      title: name,
      description: descriptionText,
      operations: operations,
    });
  }, [name, description, operations]);

  return (
    <Stack>
      <TextInput
        label='Name'
        required
        defaultValue={props.option.title}
        onChange={(event) => {
          setName(event.target.value);
        }}
      />
      {displayDescription && (
        <RichTextInput
          label='Description'
          required
          value={description ?? toHTML(props.option.description)}
          onChange={(text, json) => {
            setDescription(json);
            setDescriptionText(text);
          }}
        />
      )}

      <Divider
        my='xs'
        label={
          <Group gap={3} wrap='nowrap'>
            <Button variant={openedOperations ? 'light' : 'subtle'} size='compact-sm' color='gray.6'>
              Operations
            </Button>
            {props.option.operations && props.option.operations.length > 0 && (
              <Badge variant='light' color={theme.primaryColor} size='xs'>
                {props.option.operations.length}
              </Badge>
            )}
          </Group>
        }
        labelPosition='left'
        onClick={toggleOperations}
      />
      <Collapse in={openedOperations}>
        <Stack gap={10}>
          <OperationSection
            title={
              <HoverCard openDelay={250} width={260} shadow='md' withinPortal>
                <HoverCard.Target>
                  <Anchor target='_blank' underline='hover' fz='sm' fs='italic'>
                    How to Use Operations
                  </Anchor>
                </HoverCard.Target>
                <HoverCard.Dropdown>
                  <Text size='sm'>
                    Operations are used to make changes to a character. They can give feats, spells, and more, as well
                    as change stats, skills, and other values.
                  </Text>
                  <Text size='sm'>
                    Use conditionals to apply operations only when certain conditions are met and selections whenever a
                    choice needs to be made.
                  </Text>
                  <Text size='xs' fs='italic'>
                    For more help, see{' '}
                    <Anchor href={DISCORD_URL} target='_blank' underline='hover'>
                      our Discord server
                    </Anchor>
                    .
                  </Text>
                </HoverCard.Dropdown>
              </HoverCard>
            }
            operations={operations}
            onChange={(operations) => {
              setOperations(operations);
            }}
          />
          <Divider />
        </Stack>
      </Collapse>
    </Stack>
  );
}
