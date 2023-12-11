import {
  Text,
  Group,
  Anchor,
  Card,
  SimpleGrid,
  UnstyledButton,
  Avatar,
  MantineRadius,
  FileButton,
  LoadingOverlay,
  HoverCard,
  ScrollArea,
  ActionIcon,
  Modal,
} from '@mantine/core';
import { ContextModalProps } from '@mantine/modals';
import _, { set } from 'lodash';
import { ImageOption } from '@typing/index';
import classes from '@css/ActionsGrid.module.css';
import { IconBrush, IconUpload } from '@tabler/icons-react';
import { uploadImage } from '@upload/image-upload';
import { useState } from 'react';
import { Icon, iconComponents } from '@common/Icon';

export function SelectIconModal({
  context,
  id,
  innerProps,
}: ContextModalProps<{
  onSelect: (option: string) => void;
}>) {
  return (
    <SelectIconModalContents
      onSelect={innerProps.onSelect}
      onClose={() => context.closeModal(id)}
    />
  );
}

export function SelectIconModalContents(props: {
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
        <ActionIcon variant='transparent' aria-label={`${name} Icon`}>
          <Icon name={name} style={{ width: '70%', height: '70%' }} stroke={1.5} />
        </ActionIcon>
      </UnstyledButton>
    ));

  return (
    <Card withBorder radius='md' className={classes.card} pl={15} py={15} pr={5}>
      <ScrollArea h={315}>
        <SimpleGrid cols={3} pl={5} py={5} pr={15}>
          {items}
        </SimpleGrid>
      </ScrollArea>
    </Card>
  );
}
