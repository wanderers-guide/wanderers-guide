import { drawerState } from '@atoms/navAtoms';
import {
  ActionIcon,
  Box,
  Text,
  Divider,
  Drawer,
  Group,
  HoverCard,
  ScrollArea,
  Title,
} from '@mantine/core';
import { useRecoilState, useRecoilValue } from 'recoil';
import { IconArrowLeft, IconHelpTriangleFilled, IconX } from '@tabler/icons-react';
import _ from 'lodash';
import { FeatDrawerContent, FeatDrawerTitle } from './types/FeatDrawer';
import { ActionDrawerContent, ActionDrawerTitle } from './types/ActionDrawer';
import { useElementSize } from '@mantine/hooks';
import React from 'react';
import { SpellDrawerContent, SpellDrawerTitle } from './types/SpellDrawer';
import { openContextModal } from '@mantine/modals';
import { ContentType, AbilityBlockType } from '@typing/content';
import { convertToContentType } from '@content/content-utils';
import { ClassDrawerTitle, ClassDrawerContent } from './types/ClassDrawer';

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

      {_drawer && !['character'].includes(_drawer.type) && (
        <HoverCard shadow='md' openDelay={500} zIndex={1000} withArrow withinPortal>
          <HoverCard.Target>
            <ActionIcon
              variant='subtle'
              aria-label='Help and Feedback'
              radius='xl'
              color='dark.3'
              style={{
                position: 'absolute',
                bottom: 5,
                right: 5,
              }}
              onClick={() => {
                handleDrawerClose();
                openContextModal({
                  modal: 'contentFeedback',
                  title: <Title order={3}>Content Details</Title>,
                  innerProps: {
                    type: convertToContentType(_drawer.type as ContentType | AbilityBlockType),
                    data: _drawer.data,
                  },
                });
              }}
            >
              <IconHelpTriangleFilled style={{ width: '70%', height: '70%' }} stroke={1.5} />
            </ActionIcon>
          </HoverCard.Target>
          <HoverCard.Dropdown py={0} px={10}>
            <Text size='sm'>Something wrong?</Text>
          </HoverCard.Dropdown>
        </HoverCard>
      )}
    </Drawer>
  );
}

const DrawerTitle = React.forwardRef((props: {}, ref: React.LegacyRef<HTMLDivElement>) => {
  const _drawer = useRecoilValue(drawerState);
  return (
    <div ref={ref}>
      {_drawer?.type === 'feat' && <FeatDrawerTitle data={_drawer.data} />}
      {_drawer?.type === 'action' && <ActionDrawerTitle data={_drawer.data} />}
      {_drawer?.type === 'spell' && <SpellDrawerTitle data={_drawer.data} />}
      {_drawer?.type === 'class' && <ClassDrawerTitle data={_drawer.data} />}
    </div>
  );
});

function DrawerContent() {
  const _drawer = useRecoilValue(drawerState);
  return (
    <>
      {_drawer?.type === 'feat' && <FeatDrawerContent data={_drawer.data} />}
      {_drawer?.type === 'action' && <ActionDrawerContent data={_drawer.data} />}
      {_drawer?.type === 'spell' && <SpellDrawerContent data={_drawer.data} />}
      {_drawer?.type === 'class' && <ClassDrawerContent data={_drawer.data} />}
    </>
  );
}
