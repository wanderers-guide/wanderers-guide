import { generateNPC, generateSessionIdea } from '@ai/open-ai-handler';
import { characterState } from '@atoms/characterAtoms';
import { drawerState } from '@atoms/navAtoms';
import { ActionSymbol } from '@common/Actions';
import BlurBox from '@common/BlurBox';
import RichText from '@common/RichText';
import TraitsDisplay from '@common/TraitsDisplay';
import { ICON_BG_COLOR_HOVER } from '@constants/data';
import { collectCharacterAbilityBlocks } from '@content/collect-content';
import { isAbilityBlockVisible } from '@content/content-hidden';
import { importFromFTC } from '@import/ftc/import-from-ftc';
import { isItemWeapon, handleUpdateItem, handleDeleteItem, handleMoveItem } from '@items/inv-utils';
import {
  useMantineTheme,
  Group,
  Stack,
  TextInput,
  ScrollArea,
  Badge,
  ActionIcon,
  Accordion,
  Box,
  Text,
  Tabs,
  Button,
  Textarea,
  Title,
  Modal,
  Chip,
  Checkbox,
  Menu,
  rem,
  Center,
  Loader,
  Divider,
  Spoiler,
} from '@mantine/core';
import { useHover, useMediaQuery } from '@mantine/hooks';
import { hideNotification, showNotification } from '@mantine/notifications';
import { StatButton } from '@pages/character_builder/CharBuilderCreation';
import {
  IconBulbFilled,
  IconChevronDown,
  IconPlus,
  IconSearch,
  IconSwords,
  IconUser,
  IconUsers,
} from '@tabler/icons-react';
import {
  ActionCost,
  Rarity,
  ContentPackage,
  Inventory,
  AbilityBlock,
  InventoryItem,
  Campaign,
  CampaignSessionIdea,
  Character,
  CampaignNPC,
} from '@typing/content';
import { DrawerType } from '@typing/index';
import { findActions } from '@utils/actions';
import { isPhoneSized, mobileQuery } from '@utils/mobile-responsive';
import { sign } from '@utils/numbers';
import { toLabel } from '@utils/strings';
import { hasTraitType } from '@utils/traits';
import { displayFinalProfValue } from '@variables/variable-display';
import { getAllSkillVariables } from '@variables/variable-manager';
import { variableToLabel } from '@variables/variable-utils';
import _ from 'lodash-es';
import { useState, useMemo, useEffect } from 'react';
import { useRecoilValue, useRecoilState } from 'recoil';

export default function InspirationPanel(props: {
  panelHeight: number;
  panelWidth: number;
  campaign: Campaign;
  players: Character[];
  setCampaign: (campaign: Campaign) => void;
}) {
  const isPhone = isPhoneSized(props.panelWidth);

  const theme = useMantineTheme();

  const [generatingMoreSessions, setGeneratingMoreSessions] = useState(false);
  const [generatingMoreNPCs, setGeneratingMoreNPCs] = useState(false);

  const [genDetails, setGenDetails] = useState<{
    type: 'generate-sessions' | 'generate-npcs';
    title: string;
    onGenerate: (usePlayers: boolean, usePages: number[], context: string) => void;
  } | null>(null);

  const [sessionIdeas, setSessionIdeas] = useState<CampaignSessionIdea[]>([]);
  const [npcs, setNPCs] = useState<CampaignNPC[]>([]);

  const generateSessions = async (usePlayers: boolean, usePages: number[], context: string) => {
    const session = await generateSessionIdea(props.campaign, usePlayers ? props.players : [], usePages, context);
    if (session) {
      setSessionIdeas((prev) => [...prev, session]);
    }

    // Close modal
    setGenDetails(null);

    // Continue to generate more ideas in the background...
    setGeneratingMoreSessions(true);
    for (let i = 0; i < 3; i++) {
      const session = await generateSessionIdea(props.campaign, usePlayers ? props.players : [], usePages, context);
      if (session) {
        setSessionIdeas((prev) => [...prev, session]);
      }
    }
    setGeneratingMoreSessions(false);
  };

  const generateNPCs = async (usePlayers: boolean, usePages: number[], context: string) => {
    const npc = await generateNPC(props.campaign, usePlayers ? props.players : [], usePages, context);
    if (npc) {
      setNPCs((prev) => [...prev, npc]);
    }

    // Close modal
    setGenDetails(null);

    // Continue to generate more ideas in the background...
    setGeneratingMoreNPCs(true);
    for (let i = 0; i < 3; i++) {
      const npc = await generateNPC(props.campaign, usePlayers ? props.players : [], usePages, context);
      if (npc) {
        setNPCs((prev) => [...prev, npc]);
      }
    }
    setGeneratingMoreNPCs(false);
  };

  const getIdeasSection = () => (
    <Box>
      <Stack gap={15}>
        <Stack gap={10}>
          <Button
            variant='gradient'
            gradient={{ from: 'guide', to: 'teal' }}
            rightSection={<IconBulbFilled size='0.9rem' />}
            fullWidth
            onClick={() => {
              setGenDetails({
                type: 'generate-sessions',
                title: 'Generate Session Ideas',
                onGenerate: (usePlayers, usePages, context) => generateSessions(usePlayers, usePages, context),
              });
            }}
          >
            Generate Session Ideas
          </Button>
        </Stack>
        <ScrollArea h={props.panelHeight - 50} scrollbars='y'>
          <Stack>
            {sessionIdeas.map((idea, index) => (
              <SessionIdeaCard key={index} idea={idea} />
            ))}
            {sessionIdeas.length === 0 && (
              <BlurBox px='sm' pb='sm' h={props.panelHeight - 50}>
                <Text w='100%' pt='xl' fz='sm' c='gray.7' ta='center' fs='italic'>
                  No session ideas found, try generating some!
                </Text>
              </BlurBox>
            )}
            {generatingMoreSessions && (
              <Center>
                <Loader size='lg' type='dots' />
              </Center>
            )}
          </Stack>
        </ScrollArea>
      </Stack>
    </Box>
  );

  const getNPCsSection = () => (
    <Box>
      <Stack gap={5}>
        <Stack gap={10}>
          <Button
            variant='gradient'
            gradient={{ from: 'teal', to: 'guide' }}
            rightSection={<IconUsers size='0.9rem' />}
            fullWidth
            onClick={() => {
              setGenDetails({
                type: 'generate-npcs',
                title: 'Generate NPCs',
                onGenerate: (usePlayers, usePages, context) => generateNPCs(usePlayers, usePages, context),
              });
            }}
          >
            Generate NPCs
          </Button>
        </Stack>
        <ScrollArea h={props.panelHeight - 50} scrollbars='y'>
          <Stack>
            {npcs.map((npc, index) => (
              <NPCCard key={index} npc={npc} />
            ))}
            {npcs.length === 0 && (
              <BlurBox px='sm' pb='sm' h={props.panelHeight - 50}>
                <Text w='100%' pt='xl' fz='sm' c='gray.7' ta='center' fs='italic'>
                  No NPCs found, try generating some!
                </Text>
              </BlurBox>
            )}
            {generatingMoreNPCs && (
              <Center>
                <Loader size='lg' type='dots' />
              </Center>
            )}
          </Stack>
        </ScrollArea>
      </Stack>
    </Box>
  );

  if (isPhone) {
    return (
      <>
        {genDetails && (
          <GenModal
            campaign={props.campaign}
            title={genDetails.title}
            opened
            onClose={() => setGenDetails(null)}
            onGenerate={genDetails.onGenerate}
          />
        )}
        <Tabs defaultValue='ideas' style={{ minHeight: props.panelHeight }}>
          <Tabs.List style={{ flexWrap: 'nowrap' }} grow>
            <Tabs.Tab value='ideas'>Session Ideas</Tabs.Tab>
            <Tabs.Tab value='npcs'>NPCs</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value='ideas' pt={5}>
            {getIdeasSection()}
          </Tabs.Panel>

          <Tabs.Panel value='npcs' pt={5}>
            {getNPCsSection()}
          </Tabs.Panel>
        </Tabs>
      </>
    );
  } else {
    return (
      <Group gap={10} align='flex-start' justify='center' style={{ minHeight: props.panelHeight }}>
        {genDetails && (
          <GenModal
            campaign={props.campaign}
            title={genDetails.title}
            opened
            onClose={() => setGenDetails(null)}
            onGenerate={genDetails.onGenerate}
          />
        )}
        <Box style={{ flexBasis: '65%' }} h='100%'>
          {getIdeasSection()}
        </Box>
        <Box style={{ flexBasis: 'calc(35% - 10px)' }} h='100%'>
          {getNPCsSection()}
        </Box>
      </Group>
    );
  }
}

function GenModal(props: {
  campaign: Campaign;
  title: string;
  opened: boolean;
  onClose: () => void;
  onGenerate: (usePlayers: boolean, usePages: number[], context: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [usePlayers, setUsePlayers] = useState(true);
  const [pages, setPages] = useState<number[]>([0]);
  const [context, setContext] = useState('');

  return (
    <Modal
      closeOnClickOutside={false}
      opened={props.opened}
      onClose={props.onClose}
      title={<Title order={3}>Generation Options</Title>}
      overlayProps={{
        backgroundOpacity: 0.55,
        blur: 3,
      }}
    >
      <Stack gap={15}>
        <Stack gap={5}>
          <Text size='sm'>Use Note Pages</Text>
          <Group gap={10}>
            {props.campaign.notes?.pages.map((page, index) => (
              <Chip
                size='xs'
                checked={pages.includes(index)}
                onChange={() => {
                  if (pages.includes(index)) {
                    setPages(pages.filter((i) => i !== index));
                  } else {
                    setPages([...pages, index]);
                  }
                }}
              >
                {page.name}
              </Chip>
            ))}
          </Group>
        </Stack>
        <Checkbox
          checked={usePlayers}
          onChange={(e) => setUsePlayers(e.currentTarget.checked)}
          label='Use Player Information'
        />
        <Textarea placeholder='Additional context' value={context} onChange={(e) => setContext(e.target.value)} />
        <Button
          variant='gradient'
          gradient={{ from: 'guide', to: 'teal' }}
          fullWidth
          loading={loading}
          onClick={() => {
            setLoading(true);
            props.onGenerate(usePlayers, pages, context);
          }}
        >
          {props.title}
        </Button>
      </Stack>
    </Modal>
  );
}

function SessionIdeaCard(props: { idea: CampaignSessionIdea }) {
  return (
    <BlurBox px='sm' pb='sm'>
      <Stack>
        <Box>
          <Title order={2}>{props.idea.name}</Title>
          <Spoiler maxHeight={350} showLabel='Show more' hideLabel='Hide'>
            <RichText ta='justify'>{props.idea.outline}</RichText>
          </Spoiler>
        </Box>
        <Group justify='space-between'>
          <Menu shadow='md' position='bottom-start'>
            <Menu.Target>
              <Button
                size='xs'
                rightSection={<IconChevronDown style={{ width: rem(20), height: rem(20) }} stroke={1.5} />}
              >
                Generate ...
              </Button>
            </Menu.Target>

            <Menu.Dropdown>
              {props.idea.actions.map((action, index) => (
                <Menu.Item
                  key={index}
                  leftSection={
                    action.type === 'NPC' ? (
                      <IconUser style={{ width: rem(14), height: rem(14) }} />
                    ) : (
                      <IconSwords style={{ width: rem(14), height: rem(14) }} />
                    )
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  {action.name}
                </Menu.Item>
              ))}
            </Menu.Dropdown>
          </Menu>
          <Button size='xs' rightSection={<IconPlus style={{ width: rem(20), height: rem(20) }} stroke={1.5} />}>
            Add to Notes
          </Button>
        </Group>
      </Stack>
    </BlurBox>
  );
}

function NPCCard(props: { npc: CampaignNPC }) {
  return (
    <BlurBox px='sm' pb='sm'>
      <Stack>
        <Box>
          <Title order={3}>
            {props.npc.name}{' '}
            <Text fz='md' fs='italic' fw={600} span>
              (lvl. {props.npc.level})
            </Text>
          </Title>
          <Text ta='justify'>
            <b>Ancestry</b> {props.npc.ancestry}
          </Text>
          <Text ta='justify'>
            <b>Background</b> {props.npc.background}
          </Text>
          <Text ta='justify'>
            <b>Class</b> {props.npc.class}
          </Text>
          <Divider />
          <Spoiler maxHeight={120} showLabel='Show more' hideLabel='Hide'>
            <RichText ta='justify'>{props.npc.description}</RichText>
          </Spoiler>
        </Box>
        <Group justify='space-between'>
          <Button
            size='xs'
            rightSection={<IconPlus style={{ width: rem(20), height: rem(20) }} stroke={1.5} />}
            onClick={async () => {
              showNotification({
                id: `create-character`,
                title: `Creating character`,
                message: `This may take a minute...`,
                autoClose: false,
                withCloseButton: false,
                loading: true,
              });
              const character = await importFromFTC({
                version: '1.0',
                data: {
                  name: props.npc.name,
                  class: props.npc.class,
                  background: props.npc.background,
                  ancestry: props.npc.ancestry,
                  level: parseInt(`${props.npc.level}`),
                  content_sources: 'ALL',
                  selections: 'RANDOM',
                  items: [],
                  spells: [],
                  conditions: [],
                },
              });
              hideNotification(`create-character`);

              window.open(`/sheet/${character?.id}`, '_blank');
            }}
          >
            Create Character
          </Button>
        </Group>
      </Stack>
    </BlurBox>
  );
}
