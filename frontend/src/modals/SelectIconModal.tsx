import { Icon, iconComponents } from '@common/Icon';
import classes from '@css/ActionsGrid.module.css';
import { ActionIcon, Card, ScrollArea, SimpleGrid, UnstyledButton } from '@mantine/core';
import { ContextModalProps } from '@mantine/modals';

export default function SelectIconModal({
  context,
  id,
  innerProps,
}: ContextModalProps<{
  color?: string;
  onSelect: (option: string) => void;
}>) {
  return (
    <SelectIconModalContents
      color={innerProps.color}
      onSelect={innerProps.onSelect}
      onClose={() => context.closeModal(id)}
    />
  );
}

export function SelectIconModalContents(props: {
  color?: string;
  onSelect: (option: string) => void;
  onClose: () => void;
}) {
  const items = Object.keys(iconComponents)
    .sort()
    .map((name, index) => (
      <UnstyledButton
        className={classes.item}
        onClick={() => {
          props.onSelect(name);
          props.onClose();
        }}
      >
        <ActionIcon variant='transparent' aria-label={`${name} Icon`} color={props.color}>
          <Icon name={name} style={{ width: '70%', height: '70%' }} stroke={1.5} />
        </ActionIcon>
      </UnstyledButton>
    ));

  return (
    <Card withBorder radius='md' className={classes.card} pl={15} py={15} pr={5}>
      <ScrollArea h={315} scrollbars='y'>
        <SimpleGrid cols={3} pl={5} py={5} pr={15}>
          {items}
        </SimpleGrid>
      </ScrollArea>
    </Card>
  );
}
