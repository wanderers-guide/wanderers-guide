import { characterState } from '@atoms/characterAtoms';
import { ActionSymbol } from '@common/Actions';
import IndentedText from '@common/IndentedText';
import RichText from '@common/RichText';
import TraitsDisplay from '@common/TraitsDisplay';
import { TEXT_INDENT_AMOUNT } from '@constants/data';
import { fetchContentById } from '@content/content-store';
import { isActionCost } from '@content/content-utils';
import { priceToString } from '@items/currency-handler';
import {
  Title,
  Text,
  Image,
  Loader,
  Group,
  Divider,
  Stack,
  Box,
  Flex,
  Button,
  Menu,
  rem,
  ActionIcon,
  Paper,
  NumberInput,
} from '@mantine/core';
import {
  IconCalendar,
  IconChevronDown,
  IconEdit,
  IconPackage,
  IconPhoto,
  IconSquareCheck,
  IconTrashXFilled,
  IconUsers,
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { InventoryItem, Item } from '@typing/content';
import { hasTraitType } from '@utils/traits';
import { useRecoilValue } from 'recoil';

export function InvItemDrawerTitle(props: { data: { invItem: InventoryItem } }) {
  return (
    <>
      <Group justify='space-between' wrap='nowrap'>
        <Group wrap='nowrap' gap={10}>
          <Box>
            <Title order={3}>{props.data.invItem.item.name}</Title>
          </Box>
        </Group>
        <Text style={{ textWrap: 'nowrap' }}>Item {props.data.invItem.item.level}</Text>
      </Group>
    </>
  );
}

export function InvItemDrawerContent(props: { data: { invItem: InventoryItem } }) {
  const invItem = props.data.invItem;

  const character = useRecoilValue(characterState);
  const containerItems = character?.inventory?.items.filter((item) => item.is_container) ?? [];

  let price = null;
  if (invItem.item.price) {
    price = (
      <>
        <Text key={1} fw={600} c='gray.5' span>
          Price
        </Text>{' '}
        {priceToString(invItem.item.price)}
      </>
    );
  }

  const UBH = [];
  if (invItem.item.usage) {
    UBH.push(
      <>
        <Text key={0} fw={600} c='gray.5' span>
          Usage
        </Text>{' '}
        {invItem.item.usage.replace(/-/g, ' ')}
      </>
    );
  }
  if (invItem.item.bulk?.trim() && parseInt(invItem.item.bulk) !== 0) {
    UBH.push(
      <>
        <Text key={1} fw={600} c='gray.5' span>
          Bulk
        </Text>{' '}
        {invItem.item.bulk}
      </>
    );
  }
  if (invItem.item.hands) {
    UBH.push(
      <>
        <Text key={1} fw={600} c='gray.5' span>
          Hands
        </Text>{' '}
        {invItem.item.hands}
      </>
    );
  }

  let craftReq = null;
  if (invItem.item.craft_requirements) {
    craftReq = (
      <>
        <Text key={1} fw={600} c='gray.5' span>
          Craft Requirements
        </Text>{' '}
        {invItem.item.craft_requirements}
      </>
    );
  }

  return (
    <Box>
      {invItem.item.meta_data?.image_url && (
        <Image
          style={{
            float: 'right',
            maxWidth: 150,
            height: 'auto',
          }}
          ml='sm'
          radius='md'
          fit='contain'
          src={invItem.item.meta_data?.image_url}
        />
      )}
      <Box>
        {/* Note: Can't use a Stack here as it breaks the floating image */}
        <Box pb={2}>
          <TraitsDisplay
            traitIds={invItem.item.traits ?? []}
            rarity={invItem.item.rarity}
            interactable
          />
        </Box>

        <InvItemSections invItem={props.data.invItem} />

        {price && <IndentedText ta='justify'>{price}</IndentedText>}
        {UBH.length > 0 && (
          <IndentedText ta='justify'>
            {UBH.flatMap((node, index) => (index < UBH.length - 1 ? [node, '; '] : [node]))}
          </IndentedText>
        )}

        <Divider />
        <RichText ta='justify' py={5}>
          {invItem.item.description}
        </RichText>

        {craftReq && (
          <>
            <Divider />
            <IndentedText ta='justify'>{craftReq}</IndentedText>
          </>
        )}
      </Box>
      <Box
        style={{
          position: 'absolute',
          bottom: 0,
          width: '100%',
        }}
      >
        {/* <Divider mr={15} mb={10} /> */}
        <Group justify='flex-end' wrap='nowrap' mr={15} gap={15}>
          {containerItems.length > 0 && (
            <Menu
              transitionProps={{ transition: 'pop-top-right' }}
              position='top-end'
              width={220}
              withinPortal
              zIndex={10000}
            >
              <Menu.Target>
                <Button
                  variant='light'
                  color='teal'
                  size='compact-sm'
                  radius='xl'
                  rightSection={
                    <IconChevronDown style={{ width: rem(18), height: rem(18) }} stroke={1.5} />
                  }
                  styles={{
                    section: {
                      marginLeft: 5,
                    },
                  }}
                  pr={5}
                >
                  Move Item
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                {containerItems.map((containerItem) => (
                  <Menu.Item
                    leftSection={
                      <IconSquareCheck style={{ width: rem(16), height: rem(16) }} stroke={1.5} />
                    }
                    rightSection={
                      <Text size='xs' tt='uppercase' fw={700} c='dimmed'>
                        Ctrl + T
                      </Text>
                    }
                  >
                    {containerItem.item.name}
                  </Menu.Item>
                ))}
              </Menu.Dropdown>
            </Menu>
          )}
          <ActionIcon variant='light' color='cyan' radius='xl' aria-label='Edit Item'>
            <IconEdit style={{ width: '70%', height: '70%' }} stroke={1.5} />
          </ActionIcon>
          <ActionIcon variant='light' color='red' radius='xl' aria-label='Remove Item'>
            <IconTrashXFilled style={{ width: '70%', height: '70%' }} stroke={1.5} />
          </ActionIcon>
        </Group>
      </Box>
    </Box>
  );
}

function InvItemSections(props: { invItem: InventoryItem }) {
  const hasQuantity = hasTraitType('CONSUMABLE', props.invItem.item.traits);
  const hasHealth = !!props.invItem.item.meta_data?.hp_max;
  const hasAttackAndDamage = !!props.invItem.item.meta_data?.damage;
  const hasArmor = false;

  let quantitySection = null;
  if (hasQuantity) {
    quantitySection = (
      <Paper shadow='xs' my={5} p={5} bg='dark.6' radius='md'>
        <Group wrap='nowrap'>
          <Text key={1} fw={600} c='gray.5' span>
            Quantity
          </Text>{' '}
          <NumberInput placeholder='Amount' size='xs' min={1} />
        </Group>
      </Paper>
    );
  }

  let healthSection = null;
  if (hasHealth) {
    healthSection = (
      <Paper shadow='xs' p='xl' bg='dark.6'>
        <Text>Health</Text>
        <Text>{props.invItem.quantity}</Text>
      </Paper>
    );
  }

  return (
    <>
      <Stack gap={5}>
        <>{quantitySection}</>
        <>{healthSection}</>
      </Stack>
    </>
  );
}
