import { Group, rgba, Text, UnstyledButton, useMantineTheme } from '@mantine/core';
import { useFocusWithin, useHover, useOs } from '@mantine/hooks';
import { spotlight } from '@mantine/spotlight';
import { IconSearch } from '@tabler/icons-react';

export function SearchBar({ isSmall }: { isSmall?: boolean }) {
  const os = useOs();
  const theme = useMantineTheme();
  const { hovered, ref } = useHover<HTMLButtonElement>();

  return (
    <UnstyledButton
      ref={ref}
      onClick={spotlight.open}
      style={{
        width: isSmall ? '100%' : 275,
        height: 32,
        paddingLeft: theme.spacing.sm,
        paddingRight: 5,
        borderRadius: theme.radius.md,
        color: theme.colors.gray[4],
        fontWeight: 500,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        backgroundColor: hovered ? theme.colors.dark[7] : theme.colors.dark[8],
      }}
    >
      <Group gap='xs' wrap='nowrap' justify='space-between'>
        <Group gap='xs' wrap='nowrap'>
          <IconSearch size={14} stroke={2} />
          <Text fz='sm' style={{ textWrap: 'nowrap' }}>
            Search everything
          </Text>
        </Group>
        {!isSmall && (
          <Text
            fw={700}
            style={{
              fontSize: 8,
              lineHeight: 1,
              padding: 6,
              borderRadius: theme.radius.sm,
              color: theme.colors.dark[0],
              backgroundColor: theme.colors.dark[7] + '80',
            }}
          >
            {os === 'undetermined' || os === 'macos' ? '⌘' : 'Ctrl'} + K
          </Text>
        )}
      </Group>
    </UnstyledButton>
  );
}
