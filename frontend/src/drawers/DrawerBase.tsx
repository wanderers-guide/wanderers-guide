import { drawerState, drawerZIndexState, feedbackState } from '@atoms/navAtoms';
import { convertToContentType, isAbilityBlockType } from '@content/content-utils';
import { ActionIcon, Box, Divider, Drawer, Group, HoverCard, Loader, ScrollArea, Text, Title } from '@mantine/core';
import { useDidUpdate, useElementSize, useLocalStorage, useMediaQuery } from '@mantine/hooks';
import { IconArrowLeft, IconHelpTriangleFilled, IconX } from '@tabler/icons-react';
import { AbilityBlockType, ContentType } from '@typing/content';
import { Suspense, lazy, useRef, useState } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import { PrevMetadata } from './drawer-utils';
import ContentFeedbackModal from '@modals/ContentFeedbackModal';
import useRefresh from '@utils/use-refresh';
import { modals } from '@mantine/modals';
import { phoneQuery, wideDesktopQuery } from '@utils/mobile-responsive';
import { cloneDeep } from 'lodash-es';

// Use lazy imports here to prevent a huge amount of js on initial load
const DrawerContent = lazy(() => import('./DrawerContent'));
const DrawerTitle = lazy(() => import('./DrawerTitle'));

// No feedback drawers
const NO_FEEDBACK_DRAWERS = [
  'generic',
  'character',
  'condition',
  'manage-coins',
  'stat-prof',
  'stat-attr',
  'stat-hp',
  'stat-ac',
  'stat-speed',
  'stat-perception',
  'stat-resist-weak',
  'stat-weapon',
  'add-spell',
  'inv-item',
  // 'creature',
];

export default function DrawerBase() {
  /* Use this syntax as the standard API for opening drawers:

    const [_drawer, openDrawer] = useRecoilState(drawerState);
    openDrawer({ type: 'feat', data: { id: 1 } });
  */

  const isPhone = useMediaQuery(phoneQuery());
  const isWideDesktop = useMediaQuery(wideDesktopQuery());

  const [_drawer, openDrawer] = useRecoilState(drawerState);

  // Overrides the zIndex of the drawer
  const [drawerZIndex, setDrawerZIndex] = useRecoilState(drawerZIndexState);

  const { ref, height: titleHeight } = useElementSize();
  const [displayTitle, refreshTitle] = useRefresh();
  const [feedbackData, setFeedbackData] = useRecoilState(feedbackState);

  const viewport = useRef<HTMLDivElement>(null);
  const [value, setValue] = useLocalStorage<PrevMetadata>({
    key: 'prev-drawer-metadata',
    defaultValue: {
      scrollTop: 0,
      openedDict: {},
    },
  });

  const saveMetadata = (openedDict?: Record<string, string>) => {
    if (viewport.current === null) return;
    const newMetadata = {
      scrollTop: viewport.current.scrollTop ?? 0,
      openedDict: openedDict ?? value.openedDict,
    };
    setValue(newMetadata);
  };

  const handleDrawerClose = () => {
    openDrawer(null);
    setDrawerZIndex(null);
    // Clear metadata
    saveMetadata({});
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
    setDrawerZIndex(null);

    setTimeout(() => {
      if (!viewport.current) return;
      viewport.current.scrollTo({ top: value.scrollTop });
    }, 1);
  };

  useDidUpdate(() => {
    refreshTitle();
  }, [_drawer]);

  const opened = !!_drawer;
  return (
    <>
      <Drawer
        opened={opened}
        onClose={handleDrawerClose}
        title={
          <>
            {displayTitle && (
              <Box ref={ref}>
                <Group gap={12} justify='space-between'>
                  <Box style={{ flex: 1 }}>
                    {opened && (
                      <Suspense
                        fallback={
                          <Group wrap='nowrap' gap={10}>
                            <Loader size='sm' />
                            <Title order={3}>Loading...</Title>
                          </Group>
                        }
                      >
                        <DrawerTitle />
                      </Suspense>
                    )}
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
            )}
          </>
        }
        withCloseButton={false}
        lockScroll={false}
        closeOnClickOutside={!isWideDesktop}
        withOverlay={!isWideDesktop}
        position='right'
        zIndex={drawerZIndex ?? _drawer?.data.zIndex ?? 1000}
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
        transitionProps={{ duration: 200 }}
        style={{
          overflow: 'hidden',
        }}
      >
        <ScrollArea
          viewportRef={viewport}
          h={isPhone ? undefined : `calc(100dvh - (${titleHeight || 30}px + 48px))`}
          pr={16}
          scrollbars='y'
        >
          <Box
            pt={2}
            style={{
              overflowX: 'hidden',
            }}
          >
            {opened && (
              <Suspense fallback={<div></div>}>
                <DrawerContent
                  onMetadataChange={(openedDict) => {
                    saveMetadata(openedDict);
                  }}
                />
              </Suspense>
            )}
          </Box>
        </ScrollArea>

        {_drawer && !NO_FEEDBACK_DRAWERS.includes(_drawer.type) && _drawer.data?.noFeedback !== true && (
          <>
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
                    const type = isAbilityBlockType(_drawer.type)
                      ? _drawer.type
                      : convertToContentType(_drawer.type as ContentType);
                    const data = cloneDeep(_drawer.data);

                    // Use creature id from .creature to allow edited creatures to get content updates on original
                    if (type === 'creature' && data.creature?.id) {
                      data.id = data.creature.id;
                      data.content_source_id = data.creature.content_source_id;
                    }

                    console.log('Opening feedback for drawer type:', type, 'data:', data);

                    setFeedbackData({
                      type: type,
                      data: data,
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
          </>
        )}
      </Drawer>
      {feedbackData && (
        <ContentFeedbackModal
          opened={true}
          onCancel={() => {
            setFeedbackData(null);
          }}
          onStartFeedback={() => {
            modals.closeAll();
            openDrawer(null);
          }}
          onCompleteFeedback={() => {
            handleDrawerClose();
            setFeedbackData(null);
          }}
          type={feedbackData.type}
          data={feedbackData.data}
        />
      )}
    </>
  );
}
