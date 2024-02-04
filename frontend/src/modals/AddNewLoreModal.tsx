import { Text, TextInput, Stack, Button, Group } from "@mantine/core";
import { ContextModalProps } from "@mantine/modals";
import { Character } from "@typing/content";
import * as _ from "lodash-es";
import { isValidImage } from "@utils/images";
import { useState } from "react";
import {
  labelToVariable,
  variableNameToLabel,
} from "@variables/variable-utils";
import { getHotkeyHandler } from "@mantine/hooks";

export function AddNewLoreModal({
  context,
  id,
  innerProps,
}: ContextModalProps<{
  onConfirm: (loreName: string) => void;
}>) {
  const [loreName, setLoreName] = useState("");

  const handleSubmit = () => {
    innerProps.onConfirm(labelToVariable(loreName));
    context.closeModal(id);
  };

  return (
    <Stack style={{ position: "relative" }}>
      <Text>You become trained in the following lore of your choice.</Text>
      <TextInput
        placeholder="Name of Lore"
        onChange={async (e) => {
          setLoreName(e.target.value);
        }}
        onKeyDown={getHotkeyHandler([
          ["mod+Enter", handleSubmit],
          ["Enter", handleSubmit],
        ])}
      />
      {loreName &&
        variableNameToLabel(labelToVariable(loreName)) !== loreName.trim() && (
          <Text>
            Resulting Name: {variableNameToLabel(labelToVariable(loreName))}
          </Text>
        )}
      <Group justify="flex-end">
        <Button variant="default" onClick={() => context.closeModal(id)}>
          Cancel
        </Button>
        <Button disabled={!loreName} onClick={handleSubmit}>
          Train in Lore
        </Button>
      </Group>
    </Stack>
  );
}
