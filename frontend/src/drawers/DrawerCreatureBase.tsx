import { creatureDrawerState, feedbackState } from '@atoms/navAtoms';
import { Text, ActionIcon, Box, Divider, Drawer, Group, HoverCard, Loader, ScrollArea, Title } from '@mantine/core';
import { useDidUpdate, useMediaQuery } from '@mantine/hooks';
import { IconHelpTriangleFilled, IconX } from '@tabler/icons-react';
import { Suspense, useRef } from 'react';
import { useRecoilState } from 'recoil';
import useRefresh from '@utils/use-refresh';
import { wideDesktopQuery } from '@utils/mobile-responsive';
import { DRAWER_STYLES } from './DrawerBase';
import { CreatureDrawerContent, CreatureDrawerTitle } from './types/CreatureDrawer';
import { getAnchorStyles } from '@utils/anchor';
import ContentFeedbackModal from '@modals/ContentFeedbackModal';
import { modals } from '@mantine/modals';

export default function DrawerCreatureBase() {
  const isWideDesktop = useMediaQuery(wideDesktopQuery());

  const [_drawer, openDrawer] = useRecoilState(creatureDrawerState);

  const [displayTitle, refreshTitle] = useRefresh();
  const [feedbackData, setFeedbackData] = useRecoilState(feedbackState);

  const viewport = useRef<HTMLDivElement>(null);

  const handleDrawerClose = () => {
    openDrawer(null);
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
              <Box>
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
                        <CreatureDrawerTitle data={_drawer.data} />
                      </Suspense>
                    )}
                    <Divider />
                  </Box>

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
                </Group>
              </Box>
            )}
          </>
        }
        withCloseButton={false}
        lockScroll={!isWideDesktop}
        closeOnClickOutside={!isWideDesktop}
        withOverlay={!isWideDesktop}
        position='right'
        zIndex={99} // Creatures drawer is below other drawers
        styles={DRAWER_STYLES}
        transitionProps={{ duration: 200 }}
        style={{
          overflow: 'hidden',
        }}
      >
        <ScrollArea viewportRef={viewport} h='100%' pr={16} scrollbars='y'>
          {opened && (
            <Suspense fallback={<div></div>}>
              <CreatureDrawerContent data={_drawer.data} />
            </Suspense>
          )}
        </ScrollArea>

        {_drawer && _drawer.data.id && (
          <HoverCard shadow='md' openDelay={500} zIndex={1000} withArrow withinPortal>
            <HoverCard.Target>
              <ActionIcon
                variant='subtle'
                aria-label='Help and Feedback'
                radius='xl'
                color='dark.3'
                style={getAnchorStyles({ r: 5, b: 5 })}
                onClick={() => {
                  setFeedbackData({
                    type: 'creature',
                    data: {
                      id: _drawer.data.id,
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
          zIndex={200}
        />
      )}
    </>
  );
}
