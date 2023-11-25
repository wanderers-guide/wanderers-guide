import { drawerState } from '@atoms/navAtoms';
import { ActionSymbol } from '@common/Actions';
import IndentedText from '@common/IndentedText';
import RichText from '@common/RichText';
import TraitsDisplay from '@common/TraitsDisplay';
import { FeatSelectionOption, HeritageSelectionOption } from '@common/select/SelectContent';
import { TEXT_INDENT_AMOUNT } from '@constants/data';
import { getContent, getContentStore } from '@content/content-controller';
import { getMetadataOpenedDict } from '@drawers/drawer-utils';
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
  Accordion,
} from '@mantine/core';
import {
  IconBadges,
  IconBadgesFilled,
  IconEye,
  IconEyeFilled,
  IconHeart,
  IconHeartHandshake,
  IconHelpCircle,
  IconShield,
  IconShieldCheckeredFilled,
  IconShieldFilled,
  IconSword,
  IconVocabulary,
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { AbilityBlock, Ancestry, Class } from '@typing/content';
import { DrawerType } from '@typing/index';
import { getStatBlockDisplay, getStatDisplay } from '@variables/initial-stats-display';
import { getAllAttributeVariables, getAllSaveVariables, getAllSkillVariables } from '@variables/variable-manager';
import _ from 'lodash';
import { get } from 'lodash';
import { useState } from 'react';
import { useRecoilState } from 'recoil';

export function AncestryDrawerTitle(props: { data: { id: number } }) {
  const id = props.data.id;

  const { data: ancestry } = useQuery({
    queryKey: [`find-ancestry-${id}`, { id }],
    queryFn: async ({ queryKey }) => {
      // @ts-ignore
      // eslint-disable-next-line
      const [_key, { id }] = queryKey;
      return await getContent<Ancestry>('ancestry', id);
    },
  });

  return (
    <>
      {ancestry && (
        <Group justify='space-between' wrap='nowrap'>
          <Group wrap='nowrap' gap={10}>
            <Box>
              <Title order={3}>{ancestry.name}</Title>
            </Box>
          </Group>
          <TraitsDisplay traitIds={[]} rarity={ancestry.rarity} />
        </Group>
      )}
    </>
  );
}

export function AncestryDrawerContent(props: {
  data: { id: number };
  onMetadataChange?: (openedDict?: Record<string, string>) => void;
}) {
  const id = props.data.id;

  const { data } = useQuery({
    queryKey: [`find-ancestry-details-${id}`, { id }],
    queryFn: async ({ queryKey }) => {
      // @ts-ignore
      // eslint-disable-next-line
      const [_key, { id }] = queryKey;
      const ancestry = await getContent<Ancestry>('ancestry', id);
      const abilityBlocks = [...(await getContentStore<AbilityBlock>('ability-block')).values()];
      return {
        ancestry,
        abilityBlocks,
      };
    },
  });

  const [_drawer, openDrawer] = useRecoilState(drawerState);

  const heritages = (data?.abilityBlocks ?? []).filter(
    (block) => block.type === 'heritage' && block.traits?.includes(data?.ancestry?.trait_id ?? -1)
  );
  const feats = _.groupBy(
    (data?.abilityBlocks ?? []).filter(
      (block) => block.type === 'feat' && block.traits?.includes(data?.ancestry?.trait_id ?? -1)
    ),
    'level'
  );

  const featSections = Object.keys(feats).map((level) => (
    <Accordion.Item key={level} value={level}>
      <Accordion.Control>Level {level}</Accordion.Control>
      <Accordion.Panel
        styles={{
          content: {
            padding: 0,
          },
        }}
      >
        <Stack gap={0}>
          <Divider color='dark.6' />
          {feats[level].map((feat, index) => (
            <FeatSelectionOption
              key={index}
              feat={feat}
              onClick={() => {
                props.onMetadataChange?.();
                openDrawer({
                  type: 'feat',
                  data: { id: feat.id },
                  extra: { addToHistory: true },
                });
              }}
            />
          ))}
        </Stack>
      </Accordion.Panel>
    </Accordion.Item>
  ));

  if (!data || !data.ancestry || !data.abilityBlocks) {
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
      <AncestryInitialOverview ancestry={data.ancestry} mode='READ' />
      <Box>
        <Title order={3}>Heritages</Title>

        {heritages.map((heritage, index) => (
          <HeritageSelectionOption
            key={index}
            heritage={heritage}
            onClick={() => {
              props.onMetadataChange?.();
              openDrawer({
                type: 'heritage',
                data: { id: heritage.id },
                extra: { addToHistory: true },
              });
            }}
          />
        ))}
      </Box>

      <Box>
        <Title order={3}>Feats</Title>

        <Accordion
          variant='separated'
          // Save opened state in drawer metadata (so it persists when opening links and going back)
          defaultValue={getMetadataOpenedDict().feat_section}
          onChange={(value) => {
            props.onMetadataChange?.({
              feat_section: value ?? '',
            });
          }}
        >
          {featSections}
        </Accordion>
      </Box>
    </Stack>
  );
}

export function AncestryInitialOverview(props: { ancestry: Ancestry; mode: 'READ' | 'READ/WRITE' }) {
  const theme = useMantineTheme();
  const [descHidden, setDescHidden] = useState(true);

  // Reading thru operations to get display UI
  const ancestryOperations = props.ancestry.operations ?? [];
  const MODE = props.mode;

  const attributes = getAllAttributeVariables().map((v) =>
    getStatDisplay(v.name, ancestryOperations, MODE)
  );
  console.log(attributes);

  const ancestryHp = getStatDisplay('MAX_HEALTH_ANCESTRY', ancestryOperations, MODE);
  const size = getStatDisplay('SIZE', ancestryOperations, MODE);
  const speed = getStatDisplay('SPEED', ancestryOperations, MODE);



  return (
    <>
      <Box
        style={{
          position: 'relative',
        }}
      >
        <Box
          mah={descHidden ? 400 : undefined}
          style={{
            WebkitMaskImage: descHidden
              ? 'linear-gradient(to bottom, black 60%, transparent 100%)'
              : undefined,
            maskImage: descHidden
              ? 'linear-gradient(to bottom, black 60%, transparent 100%)'
              : undefined,
            overflowY: descHidden ? 'hidden' : undefined,
          }}
        >
          {props.ancestry.artwork_url && (
            <Image
              style={{
                float: 'right',
                maxWidth: 150,
                height: 'auto',
              }}
              ml='sm'
              radius='md'
              fit='contain'
              src={props.ancestry.artwork_url}
            />
          )}
          <RichText ta='justify'>{props.ancestry.description}</RichText>
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
            {/* {props.ancestry.key_attribute} */}
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
          {/* <Text c='gray.4' fw={700} ta='center'>
            {props.ancestry.hp}
          </Text> */}
        </Paper>
      </Group>
      <Box>
        <Divider
          px='xs'
          label={
            <Group gap={5}>
              <IconEyeFilled size='0.8rem' />
              <Box>Perception</Box>
            </Group>
          }
          labelPosition='left'
        />
        <IndentedText px='xs' c='gray.5' fz='sm'>
          {/* {perception.ui} */}
        </IndentedText>
      </Box>
      <Box>
        <Divider
          px='xs'
          label={
            <Group gap={5}>
              <IconBadgesFilled size='0.8rem' />
              <Box>Skills</Box>
            </Group>
          }
          labelPosition='left'
        />
        {/* {languages.map((language, index) => (
          <IndentedText key={index} px='xs' c='gray.5' fz='sm'>
            {language.ui}
          </IndentedText>
        ))} */}
        {/* <IndentedText px='xs' c='gray.5' fz='sm'> TODO: Add this
          Trained in a number of additional skills equal to 3 plus your Intelligence modifier
        </IndentedText> */}
      </Box>
      <Box>
        <Divider
          px='xs'
          label={
            <Group gap={5}>
              <IconSword size='0.8rem' />
              <Box>Attacks</Box>
            </Group>
          }
          labelPosition='left'
        />
      </Box>
      <Box>
        <Divider
          px='xs'
          label={
            <Group gap={5}>
              <IconShieldCheckeredFilled size='0.8rem' />
              <Box>Defenses</Box>
            </Group>
          }
          labelPosition='left'
        />
      </Box>
      <Box>
        <Divider
          px='xs'
          label={
            <Group gap={5}>
              <IconVocabulary size='0.8rem' />
              <Box>Class DC</Box>
            </Group>
          }
          labelPosition='left'
        />
      </Box>
    </>
  );
}
