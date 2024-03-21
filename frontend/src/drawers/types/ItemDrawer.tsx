import { ActionSymbol } from '@common/Actions';
import IndentedText from '@common/IndentedText';
import RichText from '@common/RichText';
import TraitsDisplay from '@common/TraitsDisplay';
import { TEXT_INDENT_AMOUNT } from '@constants/data';
import { fetchContentById } from '@content/content-store';
import { isActionCost } from '@content/content-utils';
import { priceToString } from '@items/currency-handler';
import { labelizeBulk } from '@items/inv-utils';
import { Title, Text, Image, Loader, Group, Divider, Stack, Box, Flex } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { Item } from '@typing/content';

export function ItemDrawerTitle(props: { data: { id?: number; item?: Item } }) {
  const id = props.data.id;

  const { data: _item } = useQuery({
    queryKey: [`find-item-${id}`, { id }],
    queryFn: async ({ queryKey }) => {
      // @ts-ignore
      // eslint-disable-next-line
      const [_key, { id }] = queryKey;
      return await fetchContentById<Item>('item', id);
    },
    enabled: !!id,
  });
  const item = props.data.item ?? _item;

  return (
    <>
      {item && (
        <Group justify='space-between' wrap='nowrap'>
          <Group wrap='nowrap' gap={10}>
            <Box>
              <Title order={3}>{item.name}</Title>
            </Box>
          </Group>
          <Text style={{ textWrap: 'nowrap' }}>Item {item.level}</Text>
        </Group>
      )}
    </>
  );
}

export function ItemDrawerContent(props: { data: { id?: number; item?: Item } }) {
  const id = props.data.id;

  const { data: _item } = useQuery({
    queryKey: [`find-item-${id}`, { id }],
    queryFn: async ({ queryKey }) => {
      // @ts-ignore
      // eslint-disable-next-line
      const [_key, { id }] = queryKey;
      return await fetchContentById<Item>('item', id);
    },
    enabled: !!id,
  });
  const item = props.data.item ?? _item;

  if (!item) {
    return (
      <Loader
        type='bars'
        style={{
          position: 'absolute',
          top: '35%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />
    );
  }

  let price = null;
  if (item.price) {
    price = (
      <>
        <Text key={1} fw={600} c='gray.5' span>
          Price
        </Text>{' '}
        {priceToString(item.price)}
      </>
    );
  }

  const UBH = [];
  if (item.usage) {
    UBH.push(
      <>
        <Text key={0} fw={600} c='gray.5' span>
          Usage
        </Text>{' '}
        {item.usage.replace(/-/g, ' ')}
      </>
    );
  }
  if (item.bulk !== undefined) {
    UBH.push(
      <>
        <Text key={1} fw={600} c='gray.5' span>
          Bulk
        </Text>{' '}
        {labelizeBulk(item.bulk)}
      </>
    );
  }
  if (item.hands) {
    UBH.push(
      <>
        <Text key={1} fw={600} c='gray.5' span>
          Hands
        </Text>{' '}
        {item.hands}
      </>
    );
  }

  let craftReq = null;
  if (item.craft_requirements) {
    craftReq = (
      <>
        <Text key={1} fw={600} c='gray.5' span>
          Craft Requirements
        </Text>{' '}
        {item.craft_requirements}
      </>
    );
  }

  return (
    <Box>
      {item.meta_data?.image_url && (
        <Image
          style={{
            float: 'right',
            maxWidth: 150,
            height: 'auto',
          }}
          ml='sm'
          radius='md'
          fit='contain'
          src={item.meta_data?.image_url}
        />
      )}
      <Box>
        {/* Note: Can't use a Stack here as it breaks the floating image */}
        <Box pb={2}>
          <TraitsDisplay traitIds={item.traits ?? []} rarity={item.rarity} interactable />
        </Box>
        {price && <IndentedText ta='justify'>{price}</IndentedText>}
        {UBH.length > 0 && (
          <IndentedText ta='justify'>
            {UBH.flatMap((node, index) => (index < UBH.length - 1 ? [node, '; '] : [node]))}
          </IndentedText>
        )}
        {true && <Divider />}
        <RichText ta='justify' py={5}>
          {item.description}
        </RichText>

        {craftReq && (
          <>
            <Divider />
            <IndentedText ta='justify'>{craftReq}</IndentedText>
          </>
        )}
      </Box>
    </Box>
  );
}
