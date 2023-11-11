import { drawerState } from '@atoms/navAtoms';
import { ActionIcon, Box, Divider, Drawer, Group, ScrollArea } from '@mantine/core';
import { useRecoilState, useRecoilValue } from 'recoil';
import { IconArrowLeft, IconX } from '@tabler/icons-react';
import _ from 'lodash';
import { FeatDrawerContent, FeatDrawerTitle } from './types/FeatDrawer';
import { ActionDrawerContent, ActionDrawerTitle } from './types/ActionDrawer';

export default function DrawerBase() {
  /* Use this syntax as the standard API for opening drawers:

    const [_drawer, openDrawer] = useRecoilState(drawerState);
    openDrawer({ type: 'feat', data: { id: 1 } });
  */

  const [_drawer, openDrawer] = useRecoilState(drawerState);

  const handleDrawerClose = () => {
    openDrawer(null);
  };

  const handleDrawerGoBack = () => {
    let history = [...(_drawer?.extra?.history ?? [])];
    const newDrawer = history.pop();
    if (!newDrawer) return handleDrawerClose();

    openDrawer({
      type: newDrawer.type,
      data: newDrawer.data,
      extra: {
        history,
      },
    });
  };

  return (
    <Drawer
      opened={!!_drawer}
      onClose={handleDrawerClose}
      keepMounted={false}
      title={
        <>
          <Group gap={12} justify='space-between'>
            <Box style={{ flex: 1 }}>
              <DrawerTitle />
              <Divider />
            </Box>
            {!!_drawer?.extra?.history?.length ? (
              <ActionIcon
                variant='light'
                color='gray.4'
                radius='xl'
                size='md'
                onClick={handleDrawerGoBack}
                aria-label='Go back to previous drawer'
              >
                <IconArrowLeft size='1.2rem' stroke={1.5} />
              </ActionIcon>
            ) : (
              <ActionIcon
                variant='light'
                color='gray.4'
                radius='xl'
                size='md'
                onClick={handleDrawerClose}
                aria-label='Close drawer'
              >
                <IconX size='1.2rem' stroke={1.5} />
              </ActionIcon>
            )}
          </Group>
        </>
      }
      withCloseButton={false}
      position='right'
      zIndex={1000}
      styles={{
        title: {
          width: '100%',
        },
        header: {
          paddingBottom: 8,
        },
      }}
    >
      <ScrollArea>
        <DrawerContent />
      </ScrollArea>
    </Drawer>
  );
}


function DrawerTitle() {
  const _drawer = useRecoilValue(drawerState);
  return (
    <>
      {_drawer?.type === 'feat' && <FeatDrawerTitle data={_drawer.data} />}
      {_drawer?.type === 'action' && <ActionDrawerTitle data={_drawer.data} />}
    </>
  );
}

function DrawerContent() {
  const _drawer = useRecoilValue(drawerState);
  return (
    <>
      {_drawer?.type === 'feat' && <FeatDrawerContent data={_drawer.data} />}
      {_drawer?.type === 'action' && <ActionDrawerContent data={_drawer.data} />}
    </>
  );
}
