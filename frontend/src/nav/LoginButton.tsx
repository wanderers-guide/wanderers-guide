import { glassStyle } from '@utils/colors';
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
        color: theme.colors.gray[4],
        fontWeight: 500,
        borderRadius: theme.radius.md,
        ...glassStyle(),
      }}
    >
      <Group gap={2} wrap='nowrap'>
        <Text fz='sm' c='gray.2' fw={500} style={{ textWrap: 'nowrap' }}>
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
