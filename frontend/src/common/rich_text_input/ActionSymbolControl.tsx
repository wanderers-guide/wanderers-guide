import { useEffect, useState } from 'react';
import {
  Menu,
  ScrollArea,
  Box,
  Text,
  Title,
} from '@mantine/core';
import { useDisclosure, useWindowEvent } from '@mantine/hooks';
import { IconLink } from '@tabler/icons-react';
import { RichTextEditor, useRichTextEditorContext } from '@mantine/tiptap';
import { selectContent } from '@common/select/SelectContent';
import { AbilityBlockType, ActionCost, ContentType } from '@typing/content';
import { getContent } from '@content/content-controller';
import _ from 'lodash';
import { ActionSymbol } from '@common/Actions';

export default function ActionSymbolControl() {
  const { editor } = useRichTextEditorContext();

  const [opened, { open, close }] = useDisclosure(false);

  const handleOpen = () => {
    open();
    //const linkData = editor?.getAttributes('actionSymbol');
  };

  const handleClose = () => {
    close();
  };

  const setActionSymbol = (cost: ActionCost) => {
    handleClose();
    editor?.commands.setActionSymbol(cost);
  };

  useWindowEvent('edit-actionSymbol', handleOpen, false);


  return (
    <Menu
      shadow='md'
      position='top'
      width={65}
      withinPortal
      withArrow
      opened={opened}
      onClose={handleClose}
    >
      <Menu.Target>
        <RichTextEditor.Control
          onClick={handleOpen}
          active={editor?.isActive('actionSymbol')}
          aria-label='Link Content'
        >
          <ActionSymbol cost='ONE-ACTION' size='20px' />
        </RichTextEditor.Control>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Item onClick={() => setActionSymbol('ONE-ACTION')}>
          <Box py={5}>
            <ActionSymbol cost='ONE-ACTION' />
          </Box>
        </Menu.Item>
        <Menu.Item onClick={() => setActionSymbol('TWO-ACTIONS')}>
          <Box py={5}>
            <ActionSymbol cost='TWO-ACTIONS' />
          </Box>
        </Menu.Item>
        <Menu.Item onClick={() => setActionSymbol('THREE-ACTIONS')}>
          <Box py={5}>
            <ActionSymbol cost='THREE-ACTIONS' />
          </Box>
        </Menu.Item>
        <Menu.Item onClick={() => setActionSymbol('FREE-ACTION')}>
          <Box py={5}>
            <ActionSymbol cost='FREE-ACTION' />
          </Box>
        </Menu.Item>
        <Menu.Item onClick={() => setActionSymbol('REACTION')}>
          <Box py={5}>
            <ActionSymbol cost='REACTION' />
          </Box>
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
