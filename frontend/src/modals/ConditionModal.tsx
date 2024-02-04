import {
  Text,
  TextInput,
  Stack,
  Button,
  Group,
  Loader,
  Avatar,
  ActionIcon,
  Badge,
  ScrollArea,
} from "@mantine/core";
import { ContextModalProps } from "@mantine/modals";
import {
  Character,
  Condition,
  ContentSource,
  ContentType,
} from "@typing/content";
import * as _ from "lodash-es";
import { isValidImage } from "@utils/images";
import { useState } from "react";
import { DrawerType } from "@typing/index";
import { useQuery } from "@tanstack/react-query";
import {
  IconAdjustments,
  IconBook2,
  IconHash,
  IconMinus,
  IconPlus,
  IconStar,
} from "@tabler/icons-react";
import { getIconFromContentType } from "@content/content-utils";
import { fetchContentById } from "@content/content-store";
import RichText from "@common/RichText";

export function ConditionModal({
  context,
  id,
  innerProps,
}: ContextModalProps<{
  condition: Condition;
  // onRemove: (condition: Condition) => void;
  onValueChange?: (condition: Condition, value: number) => void;
}>) {
  const [value, setValue] = useState<number>(innerProps.condition.value ?? 0);

  return (
    <Stack style={{ position: "relative" }}>
      <div>
        <ScrollArea h={400} pr={16}>
          <Group wrap="nowrap">
            <RichText ta="justify">{innerProps.condition.description}</RichText>
          </Group>
        </ScrollArea>
      </div>
      {innerProps.condition.value !== undefined && (
        <Group justify="center">
          <ActionIcon
            variant="subtle"
            aria-label="Decrease Value"
            color="gray"
            radius="xl"
            onClick={() => {
              if (value <= 1) return;

              innerProps.onValueChange?.(innerProps.condition, value - 1);
              setValue((v) => v - 1);
            }}
          >
            <IconMinus style={{ width: "70%", height: "70%" }} stroke={1.5} />
          </ActionIcon>
          <Badge variant="light" color="gray" size="xl" w={45}>
            {value}
          </Badge>
          <ActionIcon
            variant="subtle"
            aria-label="Increase Value"
            color="gray"
            radius="xl"
            onClick={() => {
              if (value >= 9) return;

              innerProps.onValueChange?.(innerProps.condition, value + 1);
              setValue((v) => v + 1);
            }}
          >
            <IconPlus style={{ width: "70%", height: "70%" }} stroke={1.5} />
          </ActionIcon>
        </Group>
      )}
    </Stack>
  );
}
