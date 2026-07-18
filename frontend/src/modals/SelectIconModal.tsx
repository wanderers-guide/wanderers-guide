import { Icon, getAllIconsAsync } from '@common/Icon';
import { IMPRINT_BG_COLOR, IMPRINT_BORDER_COLOR } from '@constants/data';
import classes from '@css/ActionsGrid.module.css';
import {
  ActionIcon,
  Box,
  Card,
  Group,
  Loader,
  ScrollArea,
  SimpleGrid,
  Stack,
  TextInput,
  UnstyledButton,
  useMantineTheme,
  useMantineColorScheme,
} from '@mantine/core';
import { useInViewport } from '@mantine/hooks';
import { ContextModalProps } from '@mantine/modals';
import { IconSearch } from '@tabler/icons-react';
import { useEffect, useState } from 'react';

export default function SelectIconModal({
  context,
  id,
  innerProps,
}: ContextModalProps<{
  color?: string;
  onSelect: (option: string) => void;
}>) {
  return (
    <SelectIconModalContents
      color={innerProps.color}
      onSelect={innerProps.onSelect}
      onClose={() => context.closeModal(id)}
    />
  );
}

export function SelectIconModalContents(props: {
  color?: string;
  onSelect: (option: string) => void;
  onClose: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();

  // The game-icon set loads lazily (it's ~6.6 MB). Fetch the full name list once the
  // picker opens; until then, show the loader.
  const [allIconNames, setAllIconNames] = useState<string[] | null>(null);
  useEffect(() => {
    let active = true;
    getAllIconsAsync().then((names) => {
      if (active) setAllIconNames(names);
    });
    return () => {
      active = false;
    };
  }, []);

  // Infinite scroll — how many of the (non-search) list to show, grown as the sentinel
  // scrolls into view.
  const { ref, inViewport } = useInViewport();
  const [visibleCount, setVisibleCount] = useState(30);
  useEffect(() => {
    if (inViewport && allIconNames) {
      setVisibleCount((prev) => prev + 30);
    }
  }, [inViewport, allIconNames]);

  // Display icons
  const isSearching = searchQuery.trim().length > 0;
  const displayIcons = (
    !allIconNames
      ? []
      : isSearching
        ? allIconNames.filter((name) => name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 30)
        : allIconNames.slice(0, visibleCount)
  ).map((name, index) => (
    <UnstyledButton
      key={index}
      className={classes.item}
      onClick={() => {
        props.onSelect(name);
        props.onClose();
      }}
    >
      <ActionIcon variant='transparent' aria-label={`${name} Icon`} color={props.color}>
        <Icon name={name} style={{ width: '70%', height: '70%' }} stroke={1.5} />
      </ActionIcon>
    </UnstyledButton>
  ));

  return (
    <Stack gap={10}>
      <TextInput
        style={{ flex: 1 }}
        variant='filled'
        leftSection={<IconSearch size='0.9rem' />}
        placeholder={`Search icons`}
        onChange={(event) => setSearchQuery(event.target.value)}
        styles={{
          input: {
            backgroundColor: IMPRINT_BG_COLOR,
            borderColor: isSearching ? theme.colors['guide'][8] : undefined,
          },
        }}
      />
      <Card
        withBorder
        radius='md'
        pl={15}
        py={15}
        pr={5}
        style={{
          backgroundColor: IMPRINT_BG_COLOR,
          borderColor: IMPRINT_BORDER_COLOR,
        }}
      >
        <ScrollArea h={315} scrollbars='y'>
          <SimpleGrid cols={3} pl={5} py={5} pr={15}>
            {displayIcons}
          </SimpleGrid>
          {!isSearching && (
            <Group ref={ref} justify='center' align='center'>
              <Loader color={props.color} type='dots' />
            </Group>
          )}
        </ScrollArea>
      </Card>
    </Stack>
  );
}
