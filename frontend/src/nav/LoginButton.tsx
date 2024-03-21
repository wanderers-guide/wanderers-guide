import { ActionIcon, Group, Text, UnstyledButton, useMantineTheme } from '@mantine/core';
import { useFocusWithin, useHover, useOs } from '@mantine/hooks';
import { spotlight } from '@mantine/spotlight';
import { IconLogin2, IconSearch, IconUsers } from '@tabler/icons-react';

export function LoginButton(props: { onClick: () => void }) {
  const os = useOs();
  const theme = useMantineTheme();
  const { hovered, ref } = useHover<HTMLButtonElement>();

  return (
    <UnstyledButton
      ref={ref}
      onClick={props.onClick}
      style={{
        height: 32,
        paddingLeft: theme.spacing.sm,
        paddingRight: theme.spacing.sm,
        borderRadius: theme.radius.md,
        color: theme.colors.gray[4],
        fontWeight: 500,
        backdropFilter: 'blur(8px)',
        backgroundColor: hovered ? theme.colors.dark[8] + '20' : theme.colors.dark[8] + '00',
      }}
    >
      <Group gap={2} wrap='nowrap'>
        <Text fz='sm' c='gray.3' fw={500} style={{ textWrap: 'nowrap' }}>
          Sign in{' '}
          <Text fz='sm' c='dimmed' span>
            |
          </Text>{' '}
          Register
        </Text>
        <ActionIcon size='sm' color='gray.4' variant='transparent'>
          <IconLogin2 size={18} stroke={2} />
        </ActionIcon>
      </Group>
    </UnstyledButton>
  );
}
