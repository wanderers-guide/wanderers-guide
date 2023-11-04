import { Autocomplete } from "@mantine/core";
import { Variable } from "@typing/variables";
import { getVariables } from "@variables/variable-manager";

export default function VariableSelect(props: { value: string; onChange: (value: string, variable?: Variable) => void }) {
  return (
    <Autocomplete
      ff='Ubuntu Mono, monospace'
      size='xs'
      placeholder='Value'
      w={190}
      value={props.value}
      onChange={(value) => {
        const variable = value.toUpperCase().replace(/\s/g, '_');
        props.onChange(value, getVariables()[variable]);
      }}
      data={Object.keys(getVariables())}
    />
  );
}
