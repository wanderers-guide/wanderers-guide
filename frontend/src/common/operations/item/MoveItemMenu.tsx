import { Box, Button, Menu, rem } from '@mantine/core';
import { IconArrowsExchange } from '@tabler/icons-react';
import { InventoryItem } from '@typing/content';

export function MoveItemMenu(props: {
  invItem: InventoryItem;
  containerItems: InventoryItem[];
  showUnstore?: boolean;
  showOnlyIcon?: boolean;
  onItemMove: (invItem: InventoryItem, containerItem: InventoryItem | null) => void;
}) {
  const { invItem, containerItems, onItemMove, showOnlyIcon, showUnstore = true } = props;

  return (
    <Menu transitionProps={{ transition: 'pop-top-right' }} position='top-end' withinPortal zIndex={10000}>
      <Menu.Target>
        <Button
          variant='light'
          color='teal'
          size='compact-sm'
          radius='xl'
          rightSection={
            <IconArrowsExchange
              style={{ width: rem(18), height: rem(18) }}
              stroke={1.5}
              aria-label={showOnlyIcon ? 'Move Item' : ''}
            />
          }
          onClick={(e) => {
            e.stopPropagation();
          }}
          styles={{
            section: {
              marginLeft: showOnlyIcon ? 0 : rem(5),
            },
          }}
          style={{
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
          pr={showOnlyIcon ? 3 : 5}
          pl={showOnlyIcon ? 3 : undefined}
        >
          <Box hidden={showOnlyIcon}> Move Item</Box>
        </Button>
      </Menu.Target>
      <Menu.Dropdown>
        {showUnstore && (
          <>
            <Menu.Item
              onClick={(e) => {
                e.stopPropagation();
                onItemMove(invItem, null);
              }}
            >
              Unstored
            </Menu.Item>
            <Menu.Divider />
          </>
        )}

        {containerItems.map((containerItem, index) => (
          <Menu.Item
            key={index}
            onClick={(e) => {
              e.stopPropagation();
              onItemMove(invItem, containerItem);
            }}
          >
            {containerItem.item.name}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}
