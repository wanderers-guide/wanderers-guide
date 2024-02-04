import {
  Stack,
  Group,
  Autocomplete,
  Select,
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
} from "@mantine/core";
import { Variable, VariableType } from "@typing/variables";
import { useEffect, useState } from "react";
import { OperationSection, OperationWrapper } from "../Operations";
import VariableSelect from "@common/VariableSelect";
import * as _ from "lodash-es";
import {
  IconCaretRightFilled,
  IconCircleMinus,
  IconCirclePlus,
} from "@tabler/icons-react";
import {
  ConditionCheckData,
  ConditionOperator,
  Operation,
} from "@typing/operations";
import { useDidUpdate } from "@mantine/hooks";

export default function ConditionalOperation(props: {
  conditions?: ConditionCheckData[];
  trueOperations?: Operation[];
  falseOperations?: Operation[];
  onChange: (
    conditions: ConditionCheckData[],
    trueOperations: Operation[],
    falseOperations: Operation[]
  ) => void;
  onRemove: () => void;
}) {
  const getDefaultCondition = (): ConditionCheckData => {
    return {
      id: crypto.randomUUID(),
      name: "",
      data: undefined,
      operator: "",
      value: "",
    } satisfies ConditionCheckData;
  };

  const [checks, setChecks] = useState<ConditionCheckData[]>(
    props.conditions && props.conditions.length > 0
      ? props.conditions
      : [getDefaultCondition()]
  );

  const [trueOperations, setTrueOperations] = useState<Operation[]>(
    props.trueOperations ?? []
  );
  const [falseOperations, setFalseOperations] = useState<Operation[]>(
    props.falseOperations ?? []
  );

  useDidUpdate(() => {
    props.onChange(checks, trueOperations, falseOperations);
  }, [checks, trueOperations, falseOperations]);

  return (
    <OperationWrapper onRemove={props.onRemove} title="Conditional">
      <Stack w="100%">
        <>
          {checks.map((check, index) => (
            <ConditionalCheck
              key={index}
              id={check.id}
              defaultName={check.name}
              defaultData={check.data}
              defaultOperator={check.operator}
              defaultValue={check.value}
              onChange={(data) => {
                setChecks((prev) => {
                  prev[index] = data;
                  return _.cloneDeep(prev);
                });
              }}
              includeAnd={index !== 0}
              includeAdd={index === checks.length - 1}
              onAdd={() => {
                setChecks((prev) => {
                  return [...prev, getDefaultCondition()];
                });
              }}
              onRemove={(id) => {
                setChecks((prev) => {
                  return prev.filter((p_op) => p_op.id !== id);
                });
              }}
            />
          ))}
        </>
        <Divider />
        <>
          {true && (
            <ScrollArea mah={400}>
              <Stack>
                <OperationSection
                  title={
                    <Group gap={8} wrap="nowrap">
                      <IconCaretRightFilled size="1.1rem" />
                      <Text fz="sm" c="gray.0">
                        If
                      </Text>
                      <Badge
                        variant="dot"
                        size="sm"
                        styles={{
                          root: {
                            // @ts-ignore
                            "--badge-dot-size": 0,
                            textTransform: "initial",
                          },
                        }}
                      >
                        True
                      </Badge>
                    </Group>
                  }
                  value={trueOperations}
                  onChange={(operations) => setTrueOperations(operations)}
                  /* Don't allow nested conditionals and allowing creating new variables 
                      under a condition would be a mess to support 
                  */
                  blacklist={["conditional", "createValue"]}
                />
                <OperationSection
                  title={
                    <Group gap={8} wrap="nowrap">
                      <IconCaretRightFilled size="1.1rem" />
                      <Text fz="sm" c="gray.0">
                        If
                      </Text>
                      <Badge
                        variant="dot"
                        size="sm"
                        styles={{
                          root: {
                            // @ts-ignore
                            "--badge-dot-size": 0,
                            textTransform: "initial",
                          },
                        }}
                      >
                        False
                      </Badge>
                    </Group>
                  }
                  value={falseOperations}
                  onChange={(operations) => setFalseOperations(operations)}
                  /* Don't allow nested conditionals and allowing creating new variables 
                      under a condition would be a mess to support 
                  */
                  blacklist={["conditional", "createValue"]}
                />
              </Stack>
            </ScrollArea>
          )}
        </>
      </Stack>
    </OperationWrapper>
  );
}

export function ConditionalCheck(props: {
  id: string;
  defaultName: string;
  defaultData?: Variable;
  defaultOperator: ConditionOperator;
  defaultValue: string;
  onChange: (data: ConditionCheckData) => void;
  includeAnd?: boolean;
  includeAdd?: boolean;
  onAdd?: () => void;
  onRemove?: (id: string) => void;
}) {
  const [variableName, setVariableName] = useState(props.defaultName);
  const [variableData, setVariableData] = useState<Variable | undefined>(
    props.defaultData
  );

  const [operator, setOperator] = useState(props.defaultOperator);
  const [value, setValue] = useState(props.defaultValue);

  useEffect(() => {
    props.onChange({
      id: props.id,
      name: variableName,
      data: variableData,
      operator: operator,
      value: value,
    });
  }, [variableName, variableData, operator, value]);

  let operatorOptions: { value: ConditionOperator; label: string }[] = [];
  if (
    variableData?.type === "attr" ||
    variableData?.type === "num" ||
    variableData?.type === "prof"
  ) {
    operatorOptions = [
      { value: "EQUALS", label: "equals" },
      { value: "LESS_THAN", label: "less than" },
      { value: "GREATER_THAN", label: "greater than" },
      { value: "NOT_EQUALS", label: "not equals" },
    ];
  }
  if (variableData?.type === "bool") {
    operatorOptions = [
      { value: "EQUALS", label: "equals" },
      { value: "NOT_EQUALS", label: "not equals" },
    ];
  }
  if (variableData?.type === "str" || variableData?.type === "list-str") {
    operatorOptions = [
      { value: "INCLUDES", label: "includes" },
      { value: "EQUALS", label: "equals" },
      { value: "NOT_EQUALS", label: "not equals" },
    ];
  }
  if (!variableData) {
    operatorOptions = [
      { value: "INCLUDES", label: "includes" },
      { value: "EQUALS", label: "equals" },
      { value: "NOT_EQUALS", label: "not equals" },
      { value: "LESS_THAN", label: "less than" },
      { value: "GREATER_THAN", label: "greater than" },
    ];
  }

  return (
    <Group wrap="nowrap" style={{ position: "relative" }}>
      {props.includeAnd && (
        <>
          <Text
            style={{
              position: "absolute",
              top: 6,
              left: -35,
            }}
            c="dimmed"
            fs="italic"
            fz="sm"
          >
            &&
          </Text>
          {props.includeAdd && (
            <Tooltip
              label="Remove Condition"
              position="right"
              withArrow
              withinPortal
            >
              <ActionIcon
                style={{
                  position: "absolute",
                  top: 0,
                  right: -28,
                }}
                size="sm"
                variant="subtle"
                color="gray"
                onClick={() => props.onRemove?.(props.id)}
              >
                <IconCircleMinus size="0.9rem" />
              </ActionIcon>
            </Tooltip>
          )}
        </>
      )}
      {props.includeAdd && (
        <Tooltip label="Add Condition" position="right" withArrow withinPortal>
          <ActionIcon
            style={{
              position: "absolute",
              top: 23,
              right: -28,
            }}
            size="sm"
            variant="subtle"
            color="gray"
            onClick={props.onAdd}
          >
            <IconCirclePlus size="0.9rem" />
          </ActionIcon>
        </Tooltip>
      )}
      <VariableSelect
        value={variableName}
        onChange={(value, variable) => {
          setVariableName(value);
          setVariableData(variable);
          setOperator("");
          setValue("");
        }}
      />
      {variableName && (
        <Select
          size="xs"
          placeholder="Operator"
          w={100}
          value={operator}
          searchValue={
            operatorOptions.find((op) => op.value === operator)?.label || ""
          }
          onChange={(value) => {
            if (!value) return;
            setOperator(value as ConditionOperator);
          }}
          data={operatorOptions}
        />
      )}
      {variableName && operator && (
        <ConditionalValueSelect
          variableType={variableData?.type || "str"}
          operationType={operator}
          value={value}
          onChange={setValue}
        />
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
  if (props.variableType === "attr" || props.variableType === "num") {
    return (
      <NumberInput
        size="xs"
        placeholder="Number"
        value={props.value}
        onChange={(value) => props.onChange(parseInt(`${value}`))}
        allowDecimal={false}
      />
    );
  } else if (props.variableType === "bool") {
    return (
      <SegmentedControl
        size="xs"
        value={props.value || undefined}
        onChange={props.onChange}
        defaultValue="TRUE"
        data={[
          { label: "True", value: "TRUE" },
          { label: "False", value: "FALSE" },
        ]}
      />
    );
  } else if (
    props.variableType === "str" ||
    (props.variableType === "list-str" && props.operationType === "INCLUDES")
  ) {
    return (
      <TextInput
        size="xs"
        placeholder="Text (case insensitive)"
        value={props.value}
        onChange={(event) => props.onChange(event.target.value.toLowerCase())}
      />
    );
  } else if (props.variableType === "prof") {
    return (
      <SegmentedControl
        size="xs"
        value={props.value || undefined}
        onChange={props.onChange}
        data={[
          { label: "U", value: "U" },
          { label: "T", value: "T" },
          { label: "E", value: "E" },
          { label: "M", value: "M" },
          { label: "L", value: "L" },
        ]}
      />
    );
  } else if (
    props.variableType === "list-str" &&
    props.operationType === "EQUALS"
  ) {
    return (
      <JsonInput
        size="xs"
        value={props.value}
        onChange={props.onChange}
        placeholder="Array contents as JSON"
        validationError={undefined}
        formatOnBlur
        autosize
        minRows={4}
      />
    );
  }
  return null;
}
