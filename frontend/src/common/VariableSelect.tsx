import { Autocomplete } from '@mantine/core';
import { StoreID, Variable, VariableType } from '@schemas/variables';
import { HIDDEN_VARIABLES, getVariables } from '@variables/variable-manager';

/** Suggest variables from the selected store while allowing custom variable names. */
export default function VariableSelect(props: {
  value: string;
  variableType?: VariableType;
  storeId?: StoreID;
  onChange: (value: string, variable?: Variable) => void;
}) {
  const variables = getVariables(props.storeId ?? 'CHARACTER');
  return (
    <Autocomplete
      ff='Ubuntu Mono, monospace'
      size='xs'
      placeholder='Value'
      w={190}
      value={props.value}
      onChange={(value) => {
        const variable = value.toUpperCase().replace(/\s/g, '_');
        props.onChange(variable, variables[variable]);
      }}
      data={Object.keys(variables)
        .filter(
          (variable) =>
            !variable.startsWith('CS:') &&
            !variable.endsWith('____') &&
            !variable.endsWith('_IDS') &&
            // !variable.endsWith('_NAMES') &&
            !HIDDEN_VARIABLES.includes(variable)
        )
        .filter((variable) => {
          if (props.variableType) {
            return variables[variable].type === props.variableType;
          }
          return true;
        })}
    />
  );
}
