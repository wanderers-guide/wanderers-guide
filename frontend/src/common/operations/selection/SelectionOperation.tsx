import { SelectContentButton } from '@common/select/SelectContent';
import { AbilityBlock, AbilityBlockType, Language, Rarity, Spell } from '@typing/content';
import { OperationWrapper } from '../Operations';
import {
  OperationSelectOptionType,
  OperationSelectOption,
  OperationSelectFilters,
  OperationSelectFiltersAbilityBlock,
  OperationSelectFiltersSpell,
  OperationSelectFiltersLanguage,
  OperationSelectOptionAbilityBlock,
  OperationGiveAbilityBlock,
  OperationSelectOptionSpell,
  OperationGiveSpell,
  OperationSelectOptionLanguage,
  OperationGiveLanguage,
  OperationSelectOptionAdjValue,
  OperationAdjValue,
  OperationSelectFiltersAdjValue,
} from '@typing/operations';
import {
  ActionIcon,
  Box,
  Divider,
  Group,
  NumberInput,
  SegmentedControl,
  Select,
  Stack,
  TagsInput,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { useState } from 'react';
import { useDidUpdate } from '@mantine/hooks';
import { isString, set } from 'lodash';
import { createDefaultOperation } from '@operations/operation-utils';
import { IconCircleMinus, IconCirclePlus } from '@tabler/icons-react';
import { setOption } from 'showdown';
import VariableSelect from '@common/VariableSelect';
import { AttributeValue, VariableType, VariableValue } from '@typing/variables';
import { AdjustValueInput } from '../variables/AdjValOperation';
import { getVariable } from '@variables/variable-manager';

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
  const [optionType, setOptionType] = useState<OperationSelectOptionType | null>(
    props.data.optionType
  );

  const [title, setTitle] = useState<string | undefined>(props.data.title);
  const [modeType, setModeType] = useState(props.data.modeType);

  const [filters, setFilters] = useState<OperationSelectFilters | undefined>(
    props.data.optionsFilters
  );
  const [options, setOptions] = useState<OperationSelectOption[] | undefined>(
    props.data.optionsPredefined
  );

  useDidUpdate(() => {
    props.onChange({
      title: title,
      modeType: modeType,
      optionType: optionType ?? 'ABILITY_BLOCK',
      optionsPredefined: options,
      optionsFilters: filters,
    });
  }, [title, modeType, optionType, filters, options]);

  return (
    <OperationWrapper onRemove={props.onRemove} title='Selection'>
      <Stack w='100%'>
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
              { label: 'Custom', value: 'CUSTOM' },
            ] satisfies { label: string; value: OperationSelectOptionType }[]
          }
          value={optionType}
          onChange={(value) => setOptionType(value as OperationSelectOptionType | null)}
        />
        <Stack gap={10}>
          <Box>
            <TextInput
              label='Selection Title'
              placeholder='"Select an Option"'
              value={title}
              size='xs'
              onChange={(e) => setTitle(e.target.value)}
            />
          </Box>

          <Box>
            <Divider
              label={
                <>
                  {['ABILITY_BLOCK', 'SPELL', 'LANGUAGE', 'ADJ_VALUE'].includes(
                    optionType ?? ''
                  ) && (
                    <SegmentedControl
                      size='xs'
                      value={modeType}
                      onChange={(value) => setModeType(value as 'PREDEFINED' | 'FILTERED')}
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
            {modeType === 'PREDEFINED' && (
              <SelectionPredefined
                optionType={optionType}
                options={options}
                onChange={(options) => setOptions(options)}
              />
            )}
            {modeType === 'FILTERED' && (
              <SelectionFiltered
                optionType={optionType}
                filters={filters}
                onChange={(filters) => setFilters(filters)}
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
  const [minLevel, setMinLevel] = useState<number | undefined>(
    props.filters?.level.min ?? undefined
  );
  const [maxLevel, setMaxLevel] = useState<number | undefined>(
    props.filters?.level.max ?? undefined
  );
  const [traits, setTraits] = useState<string[]>((props.filters?.traits as string[]) ?? []);

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
    });
  }, [minLevel, maxLevel, traits, type]);

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
    </Stack>
  );
}

function SelectionFilteredSpell(props: {
  optionType: OperationSelectOptionType;
  filters?: OperationSelectFiltersSpell;
  onChange: (filters: OperationSelectFiltersSpell) => void;
}) {
  const [minLevel, setMinLevel] = useState<number | undefined>(
    props.filters?.level.min ?? undefined
  );
  const [maxLevel, setMaxLevel] = useState<number | undefined>(
    props.filters?.level.max ?? undefined
  );
  const [traits, setTraits] = useState<string[]>(props.filters?.traits ?? []);
  const [traditions, setTraditions] = useState<string[]>(props.filters?.traditions ?? []);

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
    });
  }, [minLevel, maxLevel, traits, traditions]);

  return (
    <Stack gap={10}>
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

      <TagsInput
        label='Has Traditions'
        placeholder='Enter tradition'
        size='xs'
        splitChars={[',', ';', '|']}
        data={['Arcane', 'Divine', 'Occult', 'Primal']}
        value={traditions}
        onChange={setTraditions}
      />
    </Stack>
  );
}

function SelectionFilteredLanguage(props: {
  optionType: OperationSelectOptionType;
  filters?: OperationSelectFiltersLanguage;
  onChange: (filters: OperationSelectFiltersLanguage) => void;
}) {
  const [rarity, setRarity] = useState<Rarity | undefined>(props.filters?.rarity ?? undefined);
  const [core, setCore] = useState<boolean | undefined>(props.filters?.core ?? undefined);

  useDidUpdate(() => {
    props.onChange({
      id: props.filters?.id ?? crypto.randomUUID(),
      type: 'LANGUAGE',
      rarity: rarity,
      core: core,
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
          value={core === undefined ? 'ANY' : core ? 'CORE' : 'NON-CORE'}
          onChange={(value) => {
            if (value === 'ANY') {
              setCore(undefined);
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

function SelectionFilteredAdjValue(props: {
  optionType: OperationSelectOptionType;
  filters?: OperationSelectFiltersAdjValue;
  onChange: (filters: OperationSelectFiltersAdjValue) => void;
}) {
  const [group, setGroup] = useState<string | undefined>(props.filters?.group ?? undefined);
  const [value, setValue] = useState<VariableValue | undefined>(props.filters?.value ?? undefined);

  useDidUpdate(() => {
    props.onChange({
      id: props.filters?.id ?? crypto.randomUUID(),
      type: 'ADJ_VALUE',
      group: (group ?? 'SKILL') as 'ATTRIBUTE' | 'SKILL' | 'ADD-LORE',
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
              profExtended: true,
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
            }}
          />
          {optionsForUI[optionsForUI.length - 1].id === option.id && index !== 0 && (
            <Tooltip label='Remove Option' position='right' withArrow withinPortal>
              <ActionIcon
                style={{
                  position: 'absolute',
                  top: -5,
                  left: -40,
                }}
                size='sm'
                variant='subtle'
                color='gray'
                onClick={() => {
                  setOptions((prev) => {
                    const ops = [...prev].filter((op) => op.id !== option.id);
                    return ops;
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
                  left: -40,
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
                      operation: createDefaultOperation(
                        'giveAbilityBlock'
                      ) as OperationGiveAbilityBlock,
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
          />
          {optionsForUI[optionsForUI.length - 1].id === option.id && index !== 0 && (
            <Tooltip label='Remove Option' position='right' withArrow withinPortal>
              <ActionIcon
                style={{
                  position: 'absolute',
                  top: -5,
                  left: -40,
                }}
                size='sm'
                variant='subtle'
                color='gray'
                onClick={() => {
                  setOptions((prev) => {
                    const ops = [...prev].filter((op) => op.id !== option.id);
                    return ops;
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
                  left: -40,
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
          />
          {optionsForUI[optionsForUI.length - 1].id === option.id && index !== 0 && (
            <Tooltip label='Remove Option' position='right' withArrow withinPortal>
              <ActionIcon
                style={{
                  position: 'absolute',
                  top: -5,
                  left: -40,
                }}
                size='sm'
                variant='subtle'
                color='gray'
                onClick={() => {
                  setOptions((prev) => {
                    const ops = [...prev].filter((op) => op.id !== option.id);
                    return ops;
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
                  left: -40,
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
      ? getVariable(props.options![0].operation.data.variable)?.type ?? 'prof'
      : 'prof'
  );
  const [options, setOptions] = useState<OperationSelectOptionAdjValue[]>(props.options ?? []);
  const [adjustment, setAdjustment] = useState<VariableValue | undefined>(
    (props.options ?? []).length > 0 ? props.options![0].operation.data.value : undefined
  );

  useDidUpdate(() => {
    props.onChange(options);
  }, [options]);

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
                  left: -40,
                }}
                size='sm'
                variant='subtle'
                color='gray'
                onClick={() => {
                  setOptions((prev) => {
                    const ops = [...prev].filter((op) => op.id !== option.id);
                    return ops;
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
                  left: -40,
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
