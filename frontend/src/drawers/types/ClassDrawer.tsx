import { drawerState } from '@atoms/navAtoms';
import { ActionSymbol } from '@common/Actions';
import IndentedText from '@common/IndentedText';
import RichText from '@common/RichText';
import TraitsDisplay from '@common/TraitsDisplay';
import { TEXT_INDENT_AMOUNT } from '@constants/data';
import { getContent, getContentStore } from '@content/content-controller';
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
  Spoiler,
  Anchor,
  Paper,
  useMantineTheme,
  ActionIcon,
  HoverCard,
  Table,
} from '@mantine/core';
import { IconHelpCircle } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { AbilityBlock, Class } from '@typing/content';
import { DrawerType } from '@typing/index';
import _ from 'lodash';
import { get } from 'lodash';
import { useState } from 'react';
import { useRecoilState } from 'recoil';

export function ClassDrawerTitle(props: { data: { id: number } }) {
  const id = props.data.id;

  const { data: class_ } = useQuery({
    queryKey: [`find-class-${id}`, { id }],
    queryFn: async ({ queryKey }) => {
      // @ts-ignore
      // eslint-disable-next-line
      const [_key, { id }] = queryKey;
      return await getContent<Class>('class', id);
    },
  });

  return (
    <>
      {class_ && (
        <Group justify='space-between' wrap='nowrap'>
          <Group wrap='nowrap' gap={10}>
            <Box>
              <Title order={3}>{class_.name}</Title>
            </Box>
          </Group>
          <TraitsDisplay traitIds={[]} rarity={class_.rarity} />
        </Group>
      )}
    </>
  );
}

export function ClassDrawerContent(props: { data: { id: number } }) {
  const id = props.data.id;

  const { data } = useQuery({
    queryKey: [`find-class-details-${id}`, { id }],
    queryFn: async ({ queryKey }) => {
      // @ts-ignore
      // eslint-disable-next-line
      const [_key, { id }] = queryKey;
      const class_ = await getContent<Class>('class', id);
      const abilityBlocks = [...(await getContentStore<AbilityBlock>('ability-block')).values()];
      return { 
        class_,
        abilityBlocks,
       };
    },
  });

  const classFeatures = _.groupBy((data?.abilityBlocks ?? []).filter(
    (block) =>
      block.type === 'class-feature' && block.traits?.includes(data?.class_?.trait_id ?? -1)
  ), 'level');
  const feats = _.groupBy((data?.abilityBlocks ?? []).filter(
    (block) => block.type === 'feat' && block.traits?.includes(data?.class_?.trait_id ?? -1)
  ), 'level');

  console.log(classFeatures);
  console.log(feats);

  const theme = useMantineTheme();
  const [_drawer, openDrawer] = useRecoilState(drawerState);
  const [descHidden, setDescHidden] = useState(true);

  if (!data || !data.class_ || !data.abilityBlocks) {
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

  return (
    <Stack>
      <Box
        style={{
          position: 'relative',
        }}
      >
        <Box
          mah={descHidden ? 400 : undefined}
          style={{
            '-webkit-mask-image': descHidden
              ? 'linear-gradient(to bottom, black 60%, transparent 100%)'
              : undefined,
            maskImage: descHidden
              ? 'linear-gradient(to bottom, black 60%, transparent 100%)'
              : undefined,
            overflowY: descHidden ? 'hidden' : undefined,
          }}
        >
          {data.class_.artwork_url && (
            <Image
              style={{
                float: 'right',
                maxWidth: 150,
                height: 'auto',
              }}
              ml='sm'
              radius='md'
              fit='contain'
              src={data.class_.artwork_url}
            />
          )}
          <RichText ta='justify'>{data.class_.description}</RichText>
        </Box>
        <Anchor
          size='sm'
          style={{
            position: 'absolute',
            bottom: 5,
            right: 20,
          }}
          onClick={() => setDescHidden(!descHidden)}
        >
          {descHidden ? 'Show more' : 'Show less'}
        </Anchor>
      </Box>
      <Group align='flex-start' grow>
        <Paper
          shadow='xs'
          p='sm'
          radius='md'
          style={{ backgroundColor: theme.colors.dark[8], position: 'relative' }}
        >
          <HoverCard
            shadow='md'
            openDelay={250}
            width={200}
            zIndex={1000}
            position='top'
            withinPortal
          >
            <HoverCard.Target>
              <ActionIcon
                variant='subtle'
                aria-label='Help'
                radius='xl'
                size='sm'
                style={{
                  position: 'absolute',
                  top: 5,
                  right: 5,
                }}
              >
                <IconHelpCircle style={{ width: '80%', height: '80%' }} stroke={1.5} />
              </ActionIcon>
            </HoverCard.Target>
            <HoverCard.Dropdown py={5} px={10}>
              <Text fz='xs'>
                At 1st level, your class gives you an attribute boost in the key attribute.
              </Text>
            </HoverCard.Dropdown>
          </HoverCard>
          <Text c='gray.5' ta='center'>
            Key Attribute
          </Text>
          <Text c='gray.4' fw={700} ta='center'>
            {data.class_.key_attribute}
          </Text>
        </Paper>
        <Paper
          shadow='xs'
          p='sm'
          radius='md'
          style={{ backgroundColor: theme.colors.dark[8], position: 'relative' }}
        >
          <HoverCard
            shadow='md'
            openDelay={250}
            width={200}
            zIndex={1000}
            position='top'
            withinPortal
          >
            <HoverCard.Target>
              <ActionIcon
                variant='subtle'
                aria-label='Help'
                radius='xl'
                size='sm'
                style={{
                  position: 'absolute',
                  top: 5,
                  right: 5,
                }}
              >
                <IconHelpCircle style={{ width: '80%', height: '80%' }} stroke={1.5} />
              </ActionIcon>
            </HoverCard.Target>
            <HoverCard.Dropdown py={5} px={10}>
              <Text fz='xs'>
                You increase your maximum number of HP by this number at 1st level and every level
                thereafter.
              </Text>
            </HoverCard.Dropdown>
          </HoverCard>
          <Text c='gray.5' ta='center'>
            Hit Points
          </Text>
          <Text c='gray.4' fw={700} ta='center'>
            {data.class_.hp}
          </Text>
        </Paper>
      </Group>
      <Box>
        <Divider px='xs' label='Perception' labelPosition='left' />
        <IndentedText px='xs' c='gray.5' fz='sm'>
          Expert in Perception
        </IndentedText>
      </Box>
      <Box>
        <Divider px='xs' label='Skills' labelPosition='left' />
        <IndentedText px='xs' c='gray.5' fz='sm'>
          Trained in your choice of Acrobatics or Athletics
        </IndentedText>
        <IndentedText px='xs' c='gray.5' fz='sm'>
          Trained in a number of additional skills equal to 3 plus your Intelligence modifier
        </IndentedText>
      </Box>
      <Box>
        <Divider px='xs' label='Saving Throws' labelPosition='left' />
        <IndentedText px='xs' c='gray.5' fz='sm'>
          Expert in Fortitude
        </IndentedText>
        <IndentedText px='xs' c='gray.5' fz='sm'>
          Expert in Reflex
        </IndentedText>
        <IndentedText px='xs' c='gray.5' fz='sm'>
          Trained in Will
        </IndentedText>
      </Box>
      <Box>
        <Divider px='xs' label='Attacks' labelPosition='left' />
        <IndentedText px='xs' c='gray.5' fz='sm'>
          Expert in simple weapons
        </IndentedText>
        <IndentedText px='xs' c='gray.5' fz='sm'>
          Expert in martial weapons
        </IndentedText>
        <IndentedText px='xs' c='gray.5' fz='sm'>
          Trained in advanced weapons
        </IndentedText>
        <IndentedText px='xs' c='gray.5' fz='sm'>
          Expert in unarmed attacks
        </IndentedText>
      </Box>
      <Box>
        <Divider px='xs' label='Defenses' labelPosition='left' />
        <IndentedText px='xs' c='gray.5' fz='sm'>
          Trained in all armor
        </IndentedText>
        <IndentedText px='xs' c='gray.5' fz='sm'>
          Trained in unarmored defense
        </IndentedText>
      </Box>
      <Box>
        <Divider px='xs' label='Class DC' labelPosition='left' />
        <IndentedText px='xs' c='gray.5' fz='sm'>
          Trained in fighter class DC
        </IndentedText>
      </Box>

      <Box>
        <Title order={3}>Class Features</Title>
        <Divider />
        <Table striped withColumnBorders withRowBorders={false}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th ta='center'>Level</Table.Th>
              <Table.Th>Class Features</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {Array.from({ length: 20 }, (_, i) => i + 1).map((level, index) => (
              <Table.Tr key={index}>
                <Table.Td ta='center'>{level}</Table.Td>
                <Table.Td>
                  {classFeatures[`${level}`] && classFeatures[`${level}`].length > 0 && (
                    <>
                      {classFeatures[`${level}`].flatMap((feature, index) =>
                        index < classFeatures[`${level}`].length - 1
                          ? [
                              <Anchor
                                fz='sm'
                                onClick={() => {
                                  openDrawer({ type: 'class-feature', data: { id: feature.id } });
                                }}
                              >
                                {feature.name}
                              </Anchor>,
                              ', ',
                            ]
                          : [
                              <Anchor
                                fz='sm'
                                onClick={() => {
                                  openDrawer({ type: 'class-feature', data: { id: feature.id } });
                                }}
                              >
                                {feature.name}
                              </Anchor>,
                            ]
                      )}
                    </>
                  )}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Box>

      <Box>
        <Title order={3}>Feats</Title>
        <Divider />
      </Box>
    </Stack>
  );
}
