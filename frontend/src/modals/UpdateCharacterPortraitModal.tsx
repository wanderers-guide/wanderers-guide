import { Button, Group, Stack, Text, TextInput } from "@mantine/core";
import { ContextModalProps } from "@mantine/modals";
import { Character } from "@typing/content";
import { isValidImage } from "@utils/images";
import { useState } from "react";

export default function UpdateCharacterPortraitModal({
  context,
  id,
  innerProps,
}: ContextModalProps<{
  character?: Character;
  updatePortrait: (imageURL: string) => void;
}>) {
  const [isValid, setIsValid] = useState(true);
  const [imageURL, setImageURL] = useState(
    innerProps.character?.details?.image_url
  );

  return (
    <Stack style={{ position: "relative" }}>
      <Text>Paste in a URL for the character's portrait artwork.</Text>
      <TextInput
        defaultValue={imageURL}
        placeholder="Portrait Image URL"
        onChange={async (e) => {
          setIsValid(
            !e.target?.value ? true : await isValidImage(e.target?.value)
          );
          setImageURL(e.target.value);
        }}
        error={isValid ? false : "Invalid URL"}
      />
      <Group justify="flex-end">
        <Button variant="default" onClick={() => context.closeModal(id)}>
          Cancel
        </Button>
        <Button
          disabled={!isValid}
          onClick={() => {
            innerProps.updatePortrait(imageURL ?? "");
            context.closeModal(id);
          }}
        >
          Update
        </Button>
      </Group>
    </Stack>
  );
}
