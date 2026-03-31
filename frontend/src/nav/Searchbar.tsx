import { glassStyle } from '@utils/colors';
import { Group, rgba, Text, UnstyledButton, useMantineColorScheme, useMantineTheme } from '@mantine/core';
import { useFocusWithin, useHover, useOs } from '@mantine/hooks';
import { spotlight } from '@mantine/spotlight';
import { IconSearch } from '@tabler/icons-react';

export function SearchBar({ isSmall }: { isSmall?: boolean }) {
  const os = useOs();
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const { hovered, ref } = useHover<HTMLButtonElement>();

  const isDark = colorScheme === 'dark';
  const textColor = isDark ? theme.colors.gray[4] : theme.colors.gray[6];
  const kbdBg = isDark ? theme.colors.dark[7] + '80' : theme.colors.gray[3] + '80';
  const kbdColor = isDark ? theme.colors.dark[0] : theme.colors.dark[9];

  return (
    <UnstyledButton
      ref={ref}
      onClick={spotlight.open}
      style={{
        width: isSmall ? '100%' : 275,
        height: 32,
        paddingLeft: theme.spacing.sm,
        paddingRight: 5,
        color: textColor,
        fontWeight: 500,
        borderRadius: theme.radius.lg,
        ...glassStyle(),
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
              color: kbdColor,
              backgroundColor: kbdBg,
            }}
          >
            {os === 'undetermined' || os === 'macos' ? '⌘' : 'Ctrl'} + K
          </Text>
        )}
      </Group>
    </UnstyledButton>
  );
}
