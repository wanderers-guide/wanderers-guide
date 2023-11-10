import { drawerState } from '@atoms/navAtoms';
import { ActionIcon, Box, Drawer, Group } from '@mantine/core';
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

  console.log(_drawer);

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
        addToHistory: false,
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
        <Group gap={5} justify='space-between'>
          <Box style={{ flex: 1 }}>
            <DrawerTitle />
          </Box>
          {!!_drawer?.extra?.history?.length ? (
            <ActionIcon
              variant='subtle'
              color='gray.4'
              radius='xl'
              onClick={handleDrawerGoBack}
              aria-label='Go back to previous drawer'
            >
              <IconArrowLeft size='1.3rem' stroke={1.5} />
            </ActionIcon>
          ) : (
            <ActionIcon
              variant='subtle'
              color='gray.4'
              radius='xl'
              onClick={handleDrawerClose}
              aria-label='Close drawer'
            >
              <IconX size='1.3rem' stroke={1.5} />
            </ActionIcon>
          )}
        </Group>
      }
      withCloseButton={false}
      position='right'
      zIndex={1000}
      styles={{
        title: {
          width: '100%',
        },
      }}
    >
      <DrawerContent />
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
