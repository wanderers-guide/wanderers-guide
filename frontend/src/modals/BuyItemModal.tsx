import { Text, TextInput, Stack, Button, Group, Modal, Title } from '@mantine/core';
import { ContextModalProps } from '@mantine/modals';
import { Character, Inventory, Item } from '@typing/content';
import * as _ from 'lodash-es';
import { isValidImage } from '@utils/images';
import { useState } from 'react';
import { labelToVariable, variableNameToLabel } from '@variables/variable-utils';
import { getHotkeyHandler } from '@mantine/hooks';
import { CoinSection } from '@pages/character_sheet/CharacterSheetPage';
import { convertToCp, purchase } from '@items/currency-handler';

export function BuyItemModal(props: {
  open: boolean;
  inventory: Inventory;
  item: Item;
  onConfirm: (coins: { cp: number; sp: number; gp: number; pp: number }) => void;
  onClose: () => void;
}) {
  const resultingCoins = purchase(props.item.price ?? {}, props.inventory.coins);

  return (
    <Modal
      opened={props.open}
      onClose={() => props.onClose()}
      title={<Title order={3}>Buy {props.item.name}</Title>}
      zIndex={1000}
    >
      <Stack style={{ position: 'relative' }} gap={10}>
        <Stack gap={0}>
          {convertToCp(props.item.price) > 0 && (
            <Group wrap='nowrap' gap={10}>
              <Text>This item costs</Text>
              <CoinSection
                cp={props.item.price?.cp}
                sp={props.item.price?.sp}
                gp={props.item.price?.gp}
                pp={props.item.price?.pp}
                justify='center'
              />
            </Group>
          )}
          {resultingCoins ? (
            <>
              {convertToCp(props.item.price) > 0 && (
                <Group gap={5}>
                  <Text>Your resulting balance would be: </Text>
                  <CoinSection
                    cp={resultingCoins?.cp}
                    sp={resultingCoins?.sp}
                    gp={resultingCoins?.gp}
                    pp={resultingCoins?.pp}
                    justify='center'
                  />
                </Group>
              )}
              <Text>Are you sure you want to purchase this item?</Text>
            </>
          ) : (
            <Text>You do not have the funds to purchase this item.</Text>
          )}
        </Stack>
        <Group justify='flex-end'>
          <Button variant='default' onClick={props.onClose}>
            Cancel
          </Button>
          <Button
            disabled={!resultingCoins}
            onClick={() => {
              if (!resultingCoins) return;
              props.onConfirm(resultingCoins);
              props.onClose();
            }}
          >
            Buy
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
