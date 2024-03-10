import { Select, SelectProps } from "@mantine/core";

interface ActionsInputProps extends SelectProps {}

export default function ActionsInput(props: ActionsInputProps) {
  return (
    <Select
      {...props}
      data={[
        { value: "ONE-ACTION", label: "1" },
        { value: "TWO-ACTIONS", label: "2" },
        { value: "THREE-ACTIONS", label: "3" },
        { value: "FREE-ACTION", label: "4" },
        { value: "REACTION", label: "5" },
        { value: "ONE-TO-TWO-ACTIONS", label: "1 - 2" },
        { value: "ONE-TO-THREE-ACTIONS", label: "1 - 3" },
        { value: "TWO-TO-THREE-ACTIONS", label: "2 - 3" },
      ]}
      styles={{
        dropdown: {
          fontFamily: "ActionIcons, sans-serif",
          fontSize: 16,
        },
        input: {
          fontFamily: "ActionIcons, sans-serif",
          fontSize: 16,
        },
      }}
    />
  );
}
