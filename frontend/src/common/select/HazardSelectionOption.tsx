import { BaseSelectionOption } from './SelectContent';
import { Group, Text } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import { Hazard } from '@schemas/content';

/** Read-only source-book row for opening a hazard stat block. */
export function HazardSelectionOption(props: { hazard: Hazard; onClick: (hazard: Hazard) => void }) {
  if (props.hazard.deprecated) return null;

  return (
    <BaseSelectionOption
      level={props.hazard.level}
      showButton={false}
      leftSection={
        <Group ml='xs' wrap='nowrap' gap='sm'>
          <IconAlertTriangle size='1.5rem' stroke={1.5} />
          <Text size='sm' fw={500}>
            {props.hazard.name}
          </Text>
        </Group>
      }
      onClick={() => props.onClick(props.hazard)}
    />
  );
}
