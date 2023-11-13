import { drawerState } from '@atoms/navAtoms';
import { ActionIcon, Box, Divider, Drawer, Group, ScrollArea } from '@mantine/core';
import { useRecoilState, useRecoilValue } from 'recoil';
import { IconArrowLeft, IconX } from '@tabler/icons-react';
import _ from 'lodash';
import { FeatDrawerContent, FeatDrawerTitle } from './types/FeatDrawer';
import { ActionDrawerContent, ActionDrawerTitle } from './types/ActionDrawer';
import { useElementSize } from '@mantine/hooks';
import React from 'react';

export default function DrawerBase() {
  /* Use this syntax as the standard API for opening drawers:

    const [_drawer, openDrawer] = useRecoilState(drawerState);
    openDrawer({ type: 'feat', data: { id: 1 } });
  */

  const [_drawer, openDrawer] = useRecoilState(drawerState);
  const { ref, height: titleHeight } = useElementSize();

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
      title={
        <Box ref={ref}>
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
        </Box>
      }
      withCloseButton={false}
      position='right'
      zIndex={1000}
      styles={{
        title: {
          width: '100%',
        },
        header: {
          paddingBottom: 0,
        },
        body: {
          paddingRight: 2,
        },
      }}
    >
      {/* TODO: There's a weird bug here where the titleHeight=0 on the first open of this drawer */}
      {/* This "fix" will still have the bug on titles that are multiline */}
      <ScrollArea h={`calc(100vh - (${titleHeight || 30}px + 40px))`} pr={18}>
        <Box
          pt={8}
          style={{
            overflowX: 'hidden',
          }}
        >
          <DrawerContent />
        </Box>
      </ScrollArea>
    </Drawer>
  );
}


const DrawerTitle = React.forwardRef((props: {}, ref: React.LegacyRef<HTMLDivElement>) => {
  const _drawer = useRecoilValue(drawerState);
  return (
    <div ref={ref}>
      {_drawer?.type === 'feat' && <FeatDrawerTitle data={_drawer.data} />}
      {_drawer?.type === 'action' && <ActionDrawerTitle data={_drawer.data} />}
    </div>
  );
});

function DrawerContent() {
  const _drawer = useRecoilValue(drawerState);
  return (
    <>
      {_drawer?.type === 'feat' && <FeatDrawerContent data={_drawer.data} />}
      {_drawer?.type === 'action' && <ActionDrawerContent data={_drawer.data} />}
    </>
  );
}
