import { Autocomplete } from '@mantine/core';
import { Variable, VariableType } from '@typing/variables';
import { getVariables } from '@variables/variable-manager';

export default function VariableSelect(props: {
  value: string;
  variableType?: VariableType;
  onChange: (value: string, variable?: Variable) => void;
}) {
  return (
    <Autocomplete
      ff='Ubuntu Mono, monospace'
      size='xs'
      placeholder='Value'
      w={190}
      value={props.value}
      onChange={(value) => {
        const variable = value.toUpperCase().replace(/\s/g, '_');
        props.onChange(value, getVariables('CHARACTER')[variable]);
      }}
      data={Object.keys(getVariables('CHARACTER'))
        .filter(
          (variable) =>
            !variable.endsWith('____') &&
            !variable.endsWith('_IDS') &&
            !variable.endsWith('_NAMES') &&
            !variable.endsWith('_TOTAL')
        )
        .filter((variable) => {
          if (props.variableType) {
            return getVariables('CHARACTER')[variable].type === props.variableType;
          }
          return true;
        })}
    />
  );
}
