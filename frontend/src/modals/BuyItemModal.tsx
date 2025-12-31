import { Text, Stack, Button, Group, Modal, Title, Box } from '@mantine/core';
import { Inventory, Item } from '@typing/content';
import { CoinSection } from '@pages/character_sheet/panels/InventoryPanel';
import { convertToCp, purchase } from '@items/currency-handler';
import { ContextModalProps } from '@mantine/modals';

export default function BuyItemModal({
  context,
  id,
  innerProps,
}: ContextModalProps<{
  inventory: Inventory | undefined;
  item: Item;
  onConfirm: (coins: { cp: number; sp: number; gp: number; pp: number }) => void;
}>) {
  const resultingCoins = innerProps.inventory
    ? purchase(innerProps.item.price ?? {}, innerProps.inventory.coins)
    : null;

  return (
    <Stack style={{ position: 'relative' }} gap={10}>
      <Stack gap={0}>
        {convertToCp(innerProps.item.price) > 0 && (
          <Group wrap='nowrap' gap={10}>
            <Text>This item costs: </Text>
            <CoinSection
              cp={innerProps.item.price?.cp}
              sp={innerProps.item.price?.sp}
              gp={innerProps.item.price?.gp}
              pp={innerProps.item.price?.pp}
              justify='center'
            />
          </Group>
        )}
        {resultingCoins ? (
          <>
            {convertToCp(innerProps.item.price) > 0 && (
              <Group gap={10}>
                <Text>Your balance will be: </Text>
                <Box>
                  <CoinSection
                    cp={resultingCoins?.cp}
                    sp={resultingCoins?.sp}
                    gp={resultingCoins?.gp}
                    pp={resultingCoins?.pp}
                    justify='center'
                  />
                </Box>
              </Group>
            )}
            <Text pt={10}>Are you sure you want to purchase this item?</Text>
          </>
        ) : (
          <Text>You do not have the funds to purchase this item.</Text>
        )}
      </Stack>
      <Group justify='flex-end'>
        <Button variant='default' onClick={() => context.closeModal(id)}>
          Cancel
        </Button>
        <Button
          disabled={!resultingCoins}
          onClick={() => {
            if (!resultingCoins) return;
            innerProps.onConfirm(resultingCoins);
            context.closeModal(id);
          }}
        >
          Buy
        </Button>
      </Group>
    </Stack>
  );
}
