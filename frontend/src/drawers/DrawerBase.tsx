import { drawerState } from "@atoms/navAtoms";
import { convertToContentType } from "@content/content-utils";
import {
  ActionIcon,
  Box,
  Divider,
  Drawer,
  Group,
  HoverCard,
  ScrollArea,
  Text,
  Title,
} from "@mantine/core";
import { useElementSize, useLocalStorage } from "@mantine/hooks";
import { openContextModal } from "@mantine/modals";
import {
  IconArrowLeft,
  IconHelpTriangleFilled,
  IconX,
} from "@tabler/icons-react";
import { AbilityBlockType, ContentType } from "@typing/content";
import { lazy, useRef } from "react";
import { useRecoilState } from "recoil";
import { PrevMetadata } from "./drawer-utils";

// Use lazy imports here to prevent a huge amount of js on initial load
const DrawerContent = lazy(() => import("./DrawerContent"));
const DrawerTitle = lazy(() => import("./DrawerTitle"));

export default function DrawerBase() {
  /* Use this syntax as the standard API for opening drawers:

    const [_drawer, openDrawer] = useRecoilState(drawerState);
    openDrawer({ type: 'feat', data: { id: 1 } });
  */

  const [_drawer, openDrawer] = useRecoilState(drawerState);

  const { ref, height: titleHeight } = useElementSize();

  const viewport = useRef<HTMLDivElement>(null);
  const [value, setValue] = useLocalStorage<PrevMetadata>({
    key: "prev-drawer-metadata",
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

  return (
    <Drawer
      opened={!!_drawer}
      onClose={handleDrawerClose}
      title={
        <Box ref={ref}>
          <Group gap={12} justify="space-between">
            <Box style={{ flex: 1 }}>
              <DrawerTitle />
              <Divider />
            </Box>
            {!!_drawer?.extra?.history?.length ? (
              <ActionIcon
                variant="light"
                color="gray.4"
                radius="xl"
                size="md"
                onClick={handleDrawerGoBack}
                aria-label="Go back to previous drawer"
              >
                <IconArrowLeft size="1.2rem" stroke={1.5} />
              </ActionIcon>
            ) : (
              <ActionIcon
                variant="light"
                color="gray.4"
                radius="xl"
                size="md"
                onClick={handleDrawerClose}
                aria-label="Close drawer"
              >
                <IconX size="1.2rem" stroke={1.5} />
              </ActionIcon>
            )}
          </Group>
        </Box>
      }
      withCloseButton={false}
      position="right"
      zIndex={1000}
      styles={{
        title: {
          width: "100%",
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
      <ScrollArea
        viewportRef={viewport}
        h={`calc(100vh - (${titleHeight || 30}px + 40px))`}
        pr={18}
      >
        <Box
          pt={8}
          style={{
            overflowX: "hidden",
          }}
        >
          <DrawerContent
            onMetadataChange={(openedDict) => {
              saveMetadata(openedDict);
            }}
          />
        </Box>
      </ScrollArea>

      {_drawer &&
        ![
          "character",
          "stat-prof",
          "stat-attr",
          "stat-hp",
          "stat-resist-weak",
          "add-item",
          "add-spell",
          "inv-item",
        ].includes(_drawer.type) && (
          <HoverCard
            shadow="md"
            openDelay={500}
            zIndex={1000}
            withArrow
            withinPortal
          >
            <HoverCard.Target>
              <ActionIcon
                variant="subtle"
                aria-label="Help and Feedback"
                radius="xl"
                color="dark.3"
                style={{
                  position: "absolute",
                  bottom: 5,
                  right: 5,
                }}
                onClick={() => {
                  handleDrawerClose();
                  openContextModal({
                    modal: "contentFeedback",
                    title: <Title order={3}>Content Details</Title>,
                    innerProps: {
                      type: convertToContentType(
                        _drawer.type as ContentType | AbilityBlockType
                      ),
                      data: _drawer.data,
                    },
                  });
                }}
              >
                <IconHelpTriangleFilled
                  style={{ width: "70%", height: "70%" }}
                  stroke={1.5}
                />
              </ActionIcon>
            </HoverCard.Target>
            <HoverCard.Dropdown py={0} px={10}>
              <Text size="sm">Something wrong?</Text>
            </HoverCard.Dropdown>
          </HoverCard>
        )}
    </Drawer>
  );
}
