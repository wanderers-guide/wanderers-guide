import { Icon, getAllIcons } from '@common/Icon';
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

const fetchIcons = (offset: number, limit: number) => {
  return getAllIcons().slice(offset, offset + limit);
};

export function SelectIconModalContents(props: {
  color?: string;
  onSelect: (option: string) => void;
  onClose: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const theme = useMantineTheme();

  // Infinite scroll
  const { ref, inViewport } = useInViewport();
  const [icons, setIcons] = useState(fetchIcons(0, 30));
  useEffect(() => {
    if (inViewport) {
      const newIcons = fetchIcons(icons.length, 30);
      setIcons((prev) => [...prev, ...newIcons]);
    }
  }, [inViewport]);

  // Display icons
  const isSearching = searchQuery.trim().length > 0;
  const displayIcons = (
    isSearching
      ? getAllIcons()
          .filter((name) => name.toLowerCase().includes(searchQuery.toLowerCase()))
          .slice(0, 30)
      : icons
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
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
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
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          borderColor: theme.colors['dark'][8],
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
