import { Button, Menu, Group, ActionIcon, rem, useMantineTheme } from '@mantine/core';
import {
  IconTrash,
  IconBookmark,
  IconCalendar,
  IconChevronDown,
  IconCoin,
} from '@tabler/icons-react';
import classes from '@css/SplitButton.module.css';

export function BuyItemButton(props: {
  onBuy: () => void;
  onGive: () => void;
  onFormula: () => void;
}) {
  const theme = useMantineTheme();

  return (
    <Group
      wrap='nowrap'
      gap={0}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
    >
      <Button className={classes.button} onClick={props.onBuy} size='compact-xs'>
        Buy
      </Button>
      <Menu transitionProps={{ transition: 'pop' }} position='bottom-end' withinPortal>
        <Menu.Target>
          <ActionIcon
            variant='filled'
            color={theme.primaryColor}
            size={22}
            className={classes.menuControl}
          >
            <IconChevronDown style={{ width: rem(16), height: rem(16) }} stroke={1.5} />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown style={{ zIndex: 10000 }}>
          <Menu.Item
            onClick={props.onGive}
            // leftSection={
            //   <IconBookmark
            //     style={{ width: rem(16), height: rem(16) }}
            //     stroke={1.5}
            //     color={theme.colors.blue[5]}
            //   />
            // }
          >
            Give
          </Menu.Item>
          <Menu.Item
            onClick={props.onFormula}
            // leftSection={
            //   <IconTrash
            //     style={{ width: rem(16), height: rem(16) }}
            //     stroke={1.5}
            //     color={theme.colors.blue[5]}
            //   />
            // }
          >
            Formula
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </Group>
  );
}
