import { drawerState } from '@atoms/navAtoms';
import { convertToContentType, isAbilityBlockType } from '@content/content-utils';
import { ActionIcon, Box, Divider, Drawer, Group, HoverCard, Loader, ScrollArea, Text, Title } from '@mantine/core';
import { useDidUpdate, useElementSize, useLocalStorage, useMediaQuery } from '@mantine/hooks';
import { IconArrowLeft, IconHelpTriangleFilled, IconX } from '@tabler/icons-react';
import { AbilityBlockType, ContentType } from '@typing/content';
import { Suspense, lazy, useRef, useState } from 'react';
import { useRecoilState } from 'recoil';
import { PrevMetadata } from './drawer-utils';
import ContentFeedbackModal from '@modals/ContentFeedbackModal';
import useRefresh from '@utils/use-refresh';
import { modals } from '@mantine/modals';
import { phoneQuery } from '@utils/mobile-responsive';

// Use lazy imports here to prevent a huge amount of js on initial load
const DrawerContent = lazy(() => import('./DrawerContent'));
const DrawerTitle = lazy(() => import('./DrawerTitle'));

// No feedback drawers
const NO_FEEDBACK_DRAWERS = [
  'generic',
  'character',
  'condition',
  'content-source',
  'manage-coins',
  'stat-prof',
  'stat-attr',
  'stat-hp',
  'stat-ac',
  'stat-speed',
  'stat-perception',
  'stat-resist-weak',
  'add-spell',
  'inv-item',
];

export default function DrawerBase() {
  /* Use this syntax as the standard API for opening drawers:

    const [_drawer, openDrawer] = useRecoilState(drawerState);
    openDrawer({ type: 'feat', data: { id: 1 } });
  */

  const isPhone = useMediaQuery(phoneQuery());

  const [_drawer, openDrawer] = useRecoilState(drawerState);

  const { ref, height: titleHeight } = useElementSize();
  const [displayTitle, refreshTitle] = useRefresh();
  const [feedbackData, setFeedbackData] = useState<{
    type: ContentType | AbilityBlockType;
    data: { id?: number };
  } | null>(null);

  const viewport = useRef<HTMLDivElement>(null);
  const [value, setValue] = useLocalStorage<PrevMetadata>({
    key: 'prev-drawer-metadata',
    defaultValue: {
      scrollTop: 0,
      openedDict: {},
    },
  });

  const saveMetadata = (openedDict?: Record<string, string>) => {
    const newMetadata = {
      scrollTop: viewport.current!.scrollTop ?? 0,
      openedDict: openedDict ?? value.openedDict,
    };
    setValue(newMetadata);
  };

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

    setTimeout(() => {
      viewport.current!.scrollTo({ top: value.scrollTop });
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
        position='right'
        zIndex={_drawer?.data.zIndex ?? 1000}
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
      >
        <ScrollArea
          viewportRef={viewport}
          h={isPhone ? '50dvh' : `calc(100dvh - (${titleHeight || 30}px + 48px))`}
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
                    setFeedbackData({
                      type: isAbilityBlockType(_drawer.type)
                        ? _drawer.type
                        : convertToContentType(_drawer.type as ContentType),
                      data: _drawer.data,
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
