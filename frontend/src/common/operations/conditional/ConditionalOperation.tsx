import {
  Stack,
  Group,
  Autocomplete,
  Select,
  MultiSelect,
  ScrollArea,
  NumberInput,
  SegmentedControl,
  Text,
  TextInput,
  JsonInput,
  Badge,
  ActionIcon,
  Divider,
  Tooltip,
} from '@mantine/core';
import { Variable, VariableType } from '@schemas/variables';
import { useEffect, useRef, useState } from 'react';
import { OperationSection, OperationWrapper } from '../Operations';
import VariableSelect from '@common/VariableSelect';
import { IconCaretRightFilled, IconCircleMinus, IconCirclePlus } from '@tabler/icons-react';
import {
  ConditionCheckData,
  ConditionOperator,
  ContributionCheck,
  getContributionCheck,
  Operation,
} from '@schemas/operations';

const CONTRIBUTION_CATEGORY_OPTIONS: { value: ContributionCheck['categories'][number]; label: string }[] = [
  { value: 'heritage', label: 'Heritage' },
  { value: 'ancestry-feat', label: 'Ancestry feat' },
  { value: 'class-feat', label: 'Class feat' },
  { value: 'archetype-feat', label: 'Archetype feat' },
];

type ConditionalEditorData = {
  checks: ConditionCheckData[];
  trueOperations: Operation[];
  falseOperations: Operation[];
  contributionChecks?: Record<string, ContributionCheck>;
};

/** Edit ordinary checks and optional source-qualified matches without changing check identities. */
export default function ConditionalOperation(props: {
  conditions?: ConditionCheckData[];
  contributionChecks?: Record<string, ContributionCheck>;
  trueOperations?: Operation[];
  falseOperations?: Operation[];
  onChange: (
    conditions: ConditionCheckData[],
    trueOperations: Operation[],
    falseOperations: Operation[],
    contributionChecks?: Record<string, ContributionCheck>
  ) => void;
  onRemove: () => void;
}) {
  const getDefaultCondition = (): ConditionCheckData => {
    return {
      id: crypto.randomUUID(),
      name: '',
      data: undefined,
      operator: '',
      value: '',
    } satisfies ConditionCheckData;
  };

  const [fallbackCheck] = useState(getDefaultCondition);
  const checks = props.conditions && props.conditions.length > 0 ? props.conditions : [fallbackCheck];
  const latestData = useRef<ConditionalEditorData>({ checks, trueOperations: [], falseOperations: [] });
  latestData.current = {
    checks,
    trueOperations: props.trueOperations ?? [],
    falseOperations: props.falseOperations ?? [],
    contributionChecks: props.contributionChecks,
  };

  const routeChange = (data: Partial<ConditionalEditorData>) => {
    // Sibling mount effects share this draft, so later callbacks cannot restore stale checks or qualifiers.
    const nextData = { ...latestData.current, ...data };
    const contributionChecks = Object.fromEntries(
      Object.entries(nextData.contributionChecks ?? {}).filter(([id, qualifier]) => {
        const attachedChecks = nextData.checks.filter((check) => check.id === id);
        return (
          id !== '__proto__' &&
          attachedChecks.length === 1 &&
          attachedChecks[0].type === 'list-str' &&
          attachedChecks[0].operator === 'INCLUDES' &&
          qualifier.categories.length > 0
        );
      })
    );
    nextData.contributionChecks = Object.keys(contributionChecks).length > 0 ? contributionChecks : undefined;
    latestData.current = nextData;
    props.onChange(nextData.checks, nextData.trueOperations, nextData.falseOperations, nextData.contributionChecks);
  };

  return (
    <OperationWrapper onRemove={props.onRemove} title='Conditional'>
      <Stack w='100%'>
        <>
          {checks.map((check, index) => (
            <ConditionalCheck
              key={check.id}
              id={check.id}
              defaultName={check.name}
              defaultData={check.data}
              defaultType={check.type}
              defaultOperator={check.operator}
              defaultValue={String(check.value ?? '')}
              contributionCheck={getContributionCheck(props.contributionChecks, check.id)}
              onContributionChange={(qualifier) => {
                const contributionChecks = {
                  ...latestData.current.contributionChecks,
                  ...(qualifier ? { [check.id]: qualifier } : {}),
                };
                if (!qualifier) delete contributionChecks[check.id];
                routeChange({ contributionChecks });
              }}
              onChange={(data) => {
                routeChange({
                  // Retain the existing single-row edit behavior even for legacy duplicate IDs.
                  checks: latestData.current.checks.map((existingCheck, checkIndex) =>
                    checkIndex === index ? data : existingCheck
                  ),
                });
              }}
              includeAnd={index !== 0}
              includeAdd={index === checks.length - 1}
              onAdd={() => {
                routeChange({
                  checks: [...latestData.current.checks, getDefaultCondition()],
                });
              }}
              onRemove={(id) => {
                routeChange({
                  checks: latestData.current.checks.filter((existingCheck) => existingCheck.id !== id),
                });
              }}
            />
          ))}
        </>
        <Divider />
        <>
          {
            <ScrollArea scrollbars='y'>
              <Stack>
                <OperationSection
                  title={
                    <Group gap={8} wrap='nowrap'>
                      <IconCaretRightFilled size='1.1rem' />
                      <Text fz='sm' c='text.0'>
                        If
                      </Text>
                      <Badge
                        variant='dot'
                        size='sm'
                        styles={{
                          root: {
                            // @ts-ignore
                            '--badge-dot-size': 0,
                            textTransform: 'initial',
                          },
                        }}
                      >
                        True
                      </Badge>
                    </Group>
                  }
                  operations={props.trueOperations ?? []}
                  onChange={(operations) => {
                    routeChange({
                      trueOperations: operations,
                    });
                  }}
                  /* Don't allow nested conditionals and allowing creating new variables 
                      under a condition would be a mess to support 
                  */
                  blacklist={['conditional', 'createValue']}
                />
                <OperationSection
                  title={
                    <Group gap={8} wrap='nowrap'>
                      <IconCaretRightFilled size='1.1rem' />
                      <Text fz='sm' c='text.0'>
                        If
                      </Text>
                      <Badge
                        variant='dot'
                        size='sm'
                        styles={{
                          root: {
                            // @ts-ignore
                            '--badge-dot-size': 0,
                            textTransform: 'initial',
                          },
                        }}
                      >
                        False
                      </Badge>
                    </Group>
                  }
                  operations={props.falseOperations ?? []}
                  onChange={(operations) => {
                    routeChange({
                      falseOperations: operations,
                    });
                  }}
                  /* Don't allow nested conditionals and allowing creating new variables 
                      under a condition would be a mess to support 
                  */
                  blacklist={['conditional', 'createValue']}
                />
              </Stack>
            </ScrollArea>
          }
        </>
      </Stack>
    </OperationWrapper>
  );
}

/** Preserve ordinary check inputs while exposing controlled qualifiers only for list inclusion checks. */
export function ConditionalCheck(props: {
  id: string;
  defaultName: string;
  defaultData?: Variable;
  defaultType?: VariableType;
  defaultOperator: ConditionOperator;
  defaultValue: string;
  contributionCheck?: ContributionCheck;
  onContributionChange?: (qualifier?: ContributionCheck) => void;
  onChange: (data: ConditionCheckData) => void;
  includeAnd?: boolean;
  includeAdd?: boolean;
  onAdd?: () => void;
  onRemove?: (id: string) => void;
}) {
  const [variableName, setVariableName] = useState(props.defaultName);
  const [variableData, setVariableData] = useState<Variable | undefined>(props.defaultData);
  const [variableType, setVariableType] = useState<VariableType | undefined>(props.defaultType);

  const [operator, setOperator] = useState(props.defaultOperator);
  const [value, setValue] = useState(
    props.defaultValue === '' && (props.defaultData?.type ?? props.defaultType) === 'prof' ? 'U' : props.defaultValue
  );

  useEffect(() => {
    props.onChange({
      id: props.id,
      name: variableName,
      data: variableData,
      type: variableType,
      operator: operator,
      value: value,
    });
  }, [variableName, variableData, variableType, operator, value]);

  let operatorOptions: { value: ConditionOperator; label: string }[] = [];
  const varType = variableData?.type || variableType;
  if (varType === 'attr' || varType === 'num' || varType === 'prof') {
    operatorOptions = [
      { value: 'LESS_THAN', label: '<' },
      { value: 'LESS_THAN_OR_EQUALS', label: '≤' },
      { value: 'GREATER_THAN', label: '>' },
      { value: 'GREATER_THAN_OR_EQUALS', label: '≥' },
      { value: 'EQUALS', label: '=' },
      { value: 'NOT_EQUALS', label: '≠' },
    ];
  }
  if (varType === 'bool') {
    operatorOptions = [
      { value: 'EQUALS', label: '=' },
      { value: 'NOT_EQUALS', label: '≠' },
    ];
  }
  if (varType === 'str' || varType === 'list-str') {
    operatorOptions = [
      { value: 'INCLUDES', label: 'includes' },
      { value: 'NOT_INCLUDES', label: 'not includes' },
      { value: 'EQUALS', label: '=' },
      { value: 'NOT_EQUALS', label: '≠' },
    ];
  }
  if (!varType) {
    operatorOptions = [
      { value: 'INCLUDES', label: 'includes' },
      { value: 'NOT_INCLUDES', label: 'not includes' },
      { value: 'LESS_THAN', label: '<' },
      { value: 'LESS_THAN_OR_EQUALS', label: '≤' },
      { value: 'GREATER_THAN', label: '>' },
      { value: 'GREATER_THAN_OR_EQUALS', label: '≥' },
      { value: 'EQUALS', label: '=' },
      { value: 'NOT_EQUALS', label: '≠' },
    ];
  }

  return (
    <Group wrap='wrap' style={{ position: 'relative' }} align='flex-start'>
      {props.includeAnd && (
        <>
          <Text
            style={{
              position: 'absolute',
              top: 6,
              left: -35,
            }}
            c='dimmed'
            fs='italic'
            fz='sm'
          >
            &&
          </Text>
          {props.includeAdd && (
            <Tooltip label='Remove Condition' position='right' withArrow withinPortal>
              <ActionIcon
                style={{
                  position: 'absolute',
                  top: 0,
                  right: -28,
                }}
                size='sm'
                variant='subtle'
                color='gray'
                onClick={() => props.onRemove?.(props.id)}
              >
                <IconCircleMinus size='0.9rem' />
              </ActionIcon>
            </Tooltip>
          )}
        </>
      )}
      {props.includeAdd && (
        <Tooltip label='Add Condition' position='right' withArrow withinPortal>
          <ActionIcon
            style={{
              position: 'absolute',
              top: 23,
              right: -28,
            }}
            size='sm'
            variant='subtle'
            color='gray'
            onClick={props.onAdd}
          >
            <IconCirclePlus size='0.9rem' />
          </ActionIcon>
        </Tooltip>
      )}
      <VariableSelect
        value={variableName}
        onChange={(value, variable) => {
          setVariableName(value);
          setVariableData(variable);
          setVariableType(variable?.type);
          setOperator('');
          setValue(variable?.type === 'prof' ? 'U' : variable?.type === 'bool' ? 'TRUE' : '');
        }}
      />
      {!variableData && (
        <Select
          size='xs'
          placeholder='Value Type'
          w={100}
          value={varType}
          onChange={(value) => {
            if (!value) return;
            setVariableType(value as VariableType);
            if (value === 'prof') setValue('U');
            if (value === 'bool') setValue('TRUE');
          }}
          data={[
            { value: 'attr', label: 'Attr' },
            { value: 'num', label: 'Number' },
            { value: 'bool', label: 'Bool' },
            { value: 'str', label: 'Text' },
            { value: 'list-str', label: 'Text Array' },
            { value: 'prof', label: 'Prof' },
          ]}
        />
      )}
      {variableName && (
        <Select
          size='xs'
          placeholder='Operator'
          w={100}
          value={operator}
          searchValue={operatorOptions.find((op) => op.value === operator)?.label || ''}
          onChange={(value) => {
            if (!value) return;
            setOperator(value as ConditionOperator);
          }}
          data={operatorOptions}
        />
      )}
      {variableName && operator && varType && (
        <ConditionalValueSelect variableType={varType} operationType={operator} value={value} onChange={setValue} />
      )}
      {variableType === 'list-str' && operator === 'INCLUDES' && props.id !== '__proto__' && (
        <Group w='100%' gap='xs' align='flex-start' wrap='wrap'>
          <Select
            size='xs'
            label='Match'
            w={150}
            allowDeselect={false}
            value={props.contributionCheck ? 'typed-amount' : 'text'}
            data={[
              { value: 'text', label: 'Text' },
              { value: 'typed-amount', label: 'Type and amount' },
            ]}
            onChange={(match) => {
              if (match === 'text') props.onContributionChange?.(undefined);
              else if (match === 'typed-amount' && !props.contributionCheck) {
                props.onContributionChange?.({
                  categories: CONTRIBUTION_CATEGORY_OPTIONS.map((option) => option.value),
                  match: 'typed-amount',
                  excludeCurrentContent: true,
                });
              }
            }}
          />
          {props.contributionCheck && (
            <MultiSelect
              size='xs'
              label='Source categories'
              flex={1}
              miw={190}
              data={CONTRIBUTION_CATEGORY_OPTIONS}
              value={props.contributionCheck.categories}
              onChange={(values) => {
                const categories = CONTRIBUTION_CATEGORY_OPTIONS.filter((option) => values.includes(option.value)).map(
                  (option) => option.value
                );
                // Keep the last category selected instead of emitting a schema-invalid empty qualifier.
                if (categories.length === 0) return;
                props.onContributionChange?.({ categories, match: 'typed-amount', excludeCurrentContent: true });
              }}
            />
          )}
        </Group>
      )}
    </Group>
  );
}

function ConditionalValueSelect(props: {
  variableType: VariableType;
  operationType: string;
  value: any;
  onChange: (value: any) => void;
}) {
  if (props.variableType === 'attr' || props.variableType === 'num') {
    return (
      <NumberInput
        size='xs'
        placeholder='Number'
        value={props.value}
        onChange={(value) => props.onChange(parseInt(`${value}`))}
        allowDecimal={false}
      />
    );
  } else if (props.variableType === 'bool') {
    return (
      <SegmentedControl
        size='xs'
        // Match the engine's existing interpretation without changing saved conditions.
        value={props.value === 'TRUE' ? 'TRUE' : 'FALSE'}
        onChange={props.onChange}
        data={[
          { label: 'True', value: 'TRUE' },
          { label: 'False', value: 'FALSE' },
        ]}
      />
    );
  } else if (
    props.variableType === 'str' ||
    (props.variableType === 'list-str' &&
      (props.operationType === 'INCLUDES' || props.operationType === 'NOT_INCLUDES'))
  ) {
    return (
      <TextInput
        size='xs'
        placeholder='Text (case insensitive)'
        value={props.value}
        onChange={(event) => props.onChange(event.target.value.toLowerCase())}
      />
    );
  } else if (props.variableType === 'prof') {
    return (
      <SegmentedControl
        size='xs'
        value={props.value || 'U'}
        onChange={props.onChange}
        data={[
          { label: 'U', value: 'U' },
          { label: 'T', value: 'T' },
          { label: 'E', value: 'E' },
          { label: 'M', value: 'M' },
          { label: 'L', value: 'L' },
        ]}
      />
    );
  } else if (props.variableType === 'list-str' && props.operationType === 'EQUALS') {
    return (
      <JsonInput
        size='xs'
        value={props.value}
        onChange={props.onChange}
        placeholder='Array contents as JSON'
        validationError={undefined}
        formatOnBlur
        autosize
        minRows={4}
      />
    );
  }
  return null;
}
