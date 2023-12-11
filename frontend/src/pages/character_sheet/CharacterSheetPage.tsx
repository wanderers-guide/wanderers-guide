import { useEffect, useRef, useState } from 'react';
import {
  Avatar,
  Text,
  Group,
  Stack,
  Button,
  Stepper,
  Box,
  Center,
  TextInput,
  NumberInput,
  Select,
  PasswordInput,
  Tabs,
  rem,
  Switch,
  ScrollArea,
  ActionIcon,
  useMantineTheme,
  LoadingOverlay,
  Title,
  Menu,
  Paper,
  Badge,
  SegmentedControl,
  Accordion,
  Pill,
  Divider,
  Textarea,
  SimpleGrid,
} from '@mantine/core';
import BlurBox from '@common/BlurBox';
import {
  IconPhoto,
  IconMessageCircle,
  IconSettings,
  IconBooks,
  IconAsset,
  IconVocabulary,
  IconWorld,
  IconBook2,
  IconBrandSafari,
  IconMap,
  IconNotebook,
  IconDots,
  IconUsers,
  IconArrowRight,
  IconArrowLeft,
  IconTools,
  IconHome,
  IconUser,
  IconHammer,
  IconPhotoPlus,
  IconUserCircle,
  IconUserScan,
  IconPhotoUp,
  IconUserPlus,
  IconRefresh,
  IconRefreshDot,
  IconAdjustments,
  IconListDetails,
  IconPaw,
  IconCaretLeftRight,
  IconBadgesFilled,
  IconSword,
  IconBackpack,
  IconFlare,
  IconNotes,
  IconSearch,
  IconPlus,
  IconExternalLink,
} from '@tabler/icons-react';
import { LinksGroup } from '@common/LinksGroup';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AbilityBlock,
  ActionCost,
  Character,
  ContentPackage,
  ContentSource,
  Rarity,
} from '@typing/content';
import { makeRequest } from '@requests/request-manager';
import { useLoaderData, useNavigate } from 'react-router-dom';
import { useDebouncedValue, useDidUpdate, useHover, useInterval } from '@mantine/hooks';
import { modals, openContextModal } from '@mantine/modals';
import { useRecoilState, useRecoilValue } from 'recoil';
import { characterState } from '@atoms/characterAtoms';
import { setPageTitle } from '@utils/document-change';
import { isPlayable } from '@utils/character';
import { JSendResponse } from '@typing/requests';
import _, { set } from 'lodash';
import { defineDefaultSources, fetchContentPackage } from '@content/content-store';
import { isCharacterSheetMobile } from '@utils/screen-sizes';
import {
  getAllArmorVariables,
  getAllSkillVariables,
  getAllWeaponVariables,
  getVariable,
  getVariables,
} from '@variables/variable-manager';
import { VariableListStr, VariableProf } from '@typing/variables';
import { toLabel } from '@utils/strings';
import { StatButton } from '@pages/character_builder/CharBuilderCreation';
import { variableNameToLabel, variableToLabel } from '@variables/variable-utils';
import { displayFinalProfValue } from '@variables/variable-display';
import { drawerState } from '@atoms/navAtoms';
import { ActionSymbol } from '@common/Actions';
import TraitsDisplay from '@common/TraitsDisplay';
import D20Loader from '@assets/images/D20Loader';
import { executeCharacterOperations } from '@operations/operation-controller';
import { OperationResultPackage } from '@typing/operations';
import { Icon } from '@common/Icon';
import RichTextInput from '@common/rich_text_input/RichTextInput';
import { GUIDE_BLUE } from '@constants/data';
import classes from '@css/FaqSimple.module.css';
import { CharacterInfo } from '@common/CharacterInfo';

export default function CharacterSheetPage(props: {}) {
  setPageTitle(`Sheet`);

  const { characterId } = useLoaderData() as {
    characterId: number;
  };

  const theme = useMantineTheme();
  const [doneLoading, setDoneLoading] = useState(false);

  const { data: content, isFetching } = useQuery({
    queryKey: [`find-content-${characterId}`],
    queryFn: async () => {
      const content = await fetchContentPackage(undefined, true);
      interval.stop();
      return content;
    },
    refetchOnWindowFocus: false,
  });

  // Just load progress manually
  const [percentage, setPercentage] = useState(0);
  const interval = useInterval(() => setPercentage((p) => p + 2), 30);
  useEffect(() => {
    interval.start();
    return interval.stop;
  }, []);

  const loader = (
    <Box
      style={{
        width: '100%',
        height: '300px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <D20Loader size={100} color={theme.colors[theme.primaryColor][5]} percentage={percentage} />
    </Box>
  );

  if (isFetching || !content) {
    return loader;
  } else {
    return (
      <>
        <div style={{ display: doneLoading ? 'none' : undefined }}>{loader}</div>
        <div style={{ display: doneLoading ? undefined : 'none' }}>
          <CharacterSheetInner
            content={content}
            characterId={characterId}
            onFinishLoading={() => {
              setDoneLoading(true);
            }}
          />
        </div>
      </>
    );
  }
}

function CharacterSheetInner(props: {
  content: ContentPackage;
  characterId: number;
  onFinishLoading: () => void;
}) {
  setPageTitle(`Sheet`);

  const queryClient = useQueryClient();

  const [character, setCharacter] = useRecoilState(characterState);

  // Fetch character from db
  const {
    data: resultCharacter,
    isLoading,
    isInitialLoading,
  } = useQuery({
    queryKey: [`find-character-${props.characterId}`],
    queryFn: async () => {
      const resultCharacter = await makeRequest<Character>('find-character', {
        id: props.characterId,
      });

      if (resultCharacter) {
        // Make sure we sync the enabled content sources
        defineDefaultSources(resultCharacter.content_sources?.enabled ?? []);
      } else {
        // Character not found, redirect to characters
        window.location.href = '/characters';
      }

      return resultCharacter;
    },
    refetchOnWindowFocus: false,
  });

  // Execute operations
  const [operationResults, setOperationResults] = useState<OperationResultPackage>();
  const executingOperations = useRef(false);
  useEffect(() => {
    if (!character || executingOperations.current) return;
    executingOperations.current = true;
    executeCharacterOperations(character, props.content).then((results) => {
      setOperationResults(results);
      executingOperations.current = false;
      props.onFinishLoading?.();
    });
  }, [character]);

  //

  useEffect(() => {
    if (!resultCharacter) return;
    // Update character nav state
    setCharacter(resultCharacter);
  }, [resultCharacter]);

  // Update character in db when state changed
  const [debouncedCharacter] = useDebouncedValue(character, 200);
  useDidUpdate(() => {
    if (!debouncedCharacter) return;
    console.log(debouncedCharacter.notes);
    mutateCharacter({
      level: debouncedCharacter.level,
      name: debouncedCharacter.name,
      details: debouncedCharacter.details,
      content_sources: debouncedCharacter.content_sources,
      operation_data: debouncedCharacter.operation_data,
      notes: debouncedCharacter.notes,
    });
  }, [debouncedCharacter]);

  // Update character stats
  const { mutate: mutateCharacter } = useMutation(
    async (data: {
      name?: string;
      level?: number;
      details?: any;
      content_sources?: any;
      operation_data?: any;
      notes?: any;
    }) => {
      const response = await makeRequest<JSendResponse>('update-character', {
        id: props.characterId,
        ...data,
      });
      return response ? response.status === 'success' : false;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries([`find-character-${props.characterId}`]);
      },
    }
  );

  return (
    <Center>
      <Box maw={1000} w='100%'>
        <Stack gap='xs' style={{ position: 'relative' }}>
          <SimpleGrid cols={3} spacing='xs' verticalSpacing='xs'>
            <CharacterInfoSection />
            <CharacterInfoSection />
            <CharacterInfoSection />
            <CharacterInfoSection />
            <CharacterInfoSection />
            <CharacterInfoSection />
          </SimpleGrid>
          <SectionPanels content={props.content} />
        </Stack>
      </Box>
    </Center>
  );
}

function CharacterInfoSection() {
  const navigate = useNavigate();
  const theme = useMantineTheme();
  const [character, setCharacter] = useRecoilState(characterState);

  const { hovered: hoveredEdit, ref: refEdit } = useHover<HTMLAnchorElement>();

  return (
    <BlurBox blur={10}>
      <Box
        pt='xs'
        pb={5}
        px='xs'
        style={{
          borderTopLeftRadius: theme.radius.md,
          borderTopRightRadius: theme.radius.md,
          position: 'relative',
        }}
      >
        <CharacterInfo character={character} />
      </Box>
      <Group gap='xs' pb='xs' px='xs'>
        <Button
          size='xs'
          variant='light'
          color='gray'
          radius='xl'
          ref={refEdit}
          style={{ flex: 1, backgroundColor: hoveredEdit ? 'rgba(0, 0, 0, 0.1)' : undefined }}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            navigate(`/builder/${character?.id}`);
          }}
          component='a'
          href={`/builder/${character?.id}`}
        >
          {'Edit'}
        </Button>
      </Group>
    </BlurBox>
  );
}

function SectionPanels(props: { content: ContentPackage }) {
  const theme = useMantineTheme();
  const [activeTab, setActiveTab] = useState<string | null>('skills-actions');
  const { hovered: hoveredTabOptions, ref: tabOptionsRef } = useHover<HTMLButtonElement>();

  const panelHeight = 550;

  const iconStyle = { width: rem(12), height: rem(12) };
  const allBuilderTabs = [
    'skills-actions',
    'inventory',
    'spells',
    'feats-features',
    'companions',
    'details',
    'notes',
    'extras',
  ];
  const primaryBuilderTabs = getVariable<VariableListStr>('PRIMARY_BUILDER_TABS')?.value ?? [];
  const tabOptions = allBuilderTabs.filter((tab) => !primaryBuilderTabs.includes(tab));
  const openedTabOption = tabOptions.find((tab) => tab === activeTab);
  const getTabIcon = (tab: string) => {
    switch (tab) {
      case 'skills-actions':
        return <IconBadgesFilled style={iconStyle} />;
      case 'inventory':
        return <IconBackpack style={iconStyle} />;
      case 'spells':
        return <IconFlare style={iconStyle} />;
      case 'feats-features':
        return <IconCaretLeftRight style={iconStyle} />;
      case 'companions':
        return <IconPaw style={iconStyle} />;
      case 'details':
        return <IconListDetails style={iconStyle} />;
      case 'notes':
        return <IconNotebook style={iconStyle} />;
      case 'extras':
        return <IconNotes style={iconStyle} />;
      default:
        return null;
    }
  };

  return (
    <BlurBox blur={10} p='sm'>
      <Tabs
        color='dark.6'
        variant='pills'
        radius='xl'
        keepMounted={false}
        value={activeTab}
        onChange={setActiveTab}
      >
        <Tabs.List pb={10} grow>
          {primaryBuilderTabs.includes('skills-actions') && (
            <Tabs.Tab value='skills-actions' leftSection={getTabIcon('skills-actions')}>
              Skills & Actions
            </Tabs.Tab>
          )}
          {primaryBuilderTabs.includes('inventory') && (
            <Tabs.Tab value='inventory' leftSection={getTabIcon('inventory')}>
              Inventory
            </Tabs.Tab>
          )}
          {primaryBuilderTabs.includes('spells') && (
            <Tabs.Tab value='spells' leftSection={getTabIcon('spells')}>
              Spells
            </Tabs.Tab>
          )}
          {primaryBuilderTabs.includes('feats-features') && (
            <Tabs.Tab value='feats-features' leftSection={getTabIcon('feats-features')}>
              Feats & Features
            </Tabs.Tab>
          )}
          {primaryBuilderTabs.includes('companions') && (
            <Tabs.Tab value='companions' leftSection={getTabIcon('companions')}>
              Companions
            </Tabs.Tab>
          )}
          {primaryBuilderTabs.includes('details') && (
            <Tabs.Tab value='details' leftSection={getTabIcon('details')}>
              Details
            </Tabs.Tab>
          )}
          {primaryBuilderTabs.includes('notes') && (
            <Tabs.Tab value='notes' leftSection={getTabIcon('notes')}>
              Notes
            </Tabs.Tab>
          )}
          <Menu shadow='md' width={160} trigger='hover' openDelay={100} closeDelay={100}>
            <Menu.Target>
              <ActionIcon
                variant='subtle'
                color='gray.4'
                size='lg'
                radius='xl'
                aria-label='Tab Options'
                ref={tabOptionsRef}
                style={{
                  backgroundColor:
                    hoveredTabOptions || openedTabOption ? theme.colors.dark[6] : 'transparent',
                  color: openedTabOption ? theme.colors.gray[0] : undefined,
                }}
              >
                <IconDots style={{ width: '70%', height: '70%' }} stroke={1.5} />
              </ActionIcon>
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Label>Other sections</Menu.Label>
              {tabOptions.map((tab) => (
                <Menu.Item
                  leftSection={getTabIcon(tab)}
                  onClick={() => {
                    setActiveTab(tab);
                  }}
                  style={{
                    backgroundColor: activeTab === tab ? theme.colors.dark[4] : undefined,
                    color: activeTab === tab ? theme.colors.gray[0] : undefined,
                  }}
                >
                  {toLabel(tab)}
                </Menu.Item>
              ))}
            </Menu.Dropdown>
          </Menu>
        </Tabs.List>

        <Tabs.Panel value='skills-actions'>
          <PanelSkillsActions content={props.content} panelHeight={panelHeight} />
        </Tabs.Panel>

        <Tabs.Panel value='inventory'>
          <PanelInventory panelHeight={panelHeight} />
        </Tabs.Panel>

        <Tabs.Panel value='spells'>
          <PanelSpells panelHeight={panelHeight} />
        </Tabs.Panel>

        <Tabs.Panel value='feats-features'>
          <PanelFeatsFeatures panelHeight={panelHeight} />
        </Tabs.Panel>

        <Tabs.Panel value='companions'>
          <PanelCompanions panelHeight={panelHeight} />
        </Tabs.Panel>

        <Tabs.Panel value='details'>
          <PanelDetails content={props.content} panelHeight={panelHeight} />
        </Tabs.Panel>

        <Tabs.Panel value='notes'>
          <PanelNotes panelHeight={panelHeight} />
        </Tabs.Panel>

        <Tabs.Panel value='extras'>
          <PanelExtras panelHeight={panelHeight} />
        </Tabs.Panel>
      </Tabs>
    </BlurBox>
  );
}

interface ActionItem {
  id: number;
  name: string;
  type: string;
  cost: ActionCost;
  level?: number;
  traits?: number[];
  rarity?: Rarity;
}
function PanelSkillsActions(props: { content: ContentPackage; panelHeight: number }) {
  const theme = useMantineTheme();
  const [skillsSearch, setSkillsSearch] = useState<string>('');
  const [_drawer, openDrawer] = useRecoilState(drawerState);

  const [actionTypeFilter, setActionTypeFilter] = useState<ActionCost | 'ALL'>('ALL');
  const [actionSectionValue, setActionSectionValue] = useState<string | null>(null);

  return (
    <Group gap={10} align='flex-start'>
      <Box style={{ flexBasis: 'calc(30% - 10px)' }} h='100%'>
        {/* <Paper
          shadow='sm'
          h='100%'
          p={10}
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.13)',
          }}
        ></Paper> */}
        <Stack gap={5}>
          <TextInput
            style={{ flex: 1 }}
            leftSection={<IconSearch size='0.9rem' />}
            placeholder={`Search skills`}
            onChange={(event) => setSkillsSearch(event.target.value)}
            styles={{
              input: {
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
              },
            }}
          />
          <ScrollArea h={props.panelHeight}>
            <Stack gap={5}>
              {getAllSkillVariables()
                .filter((skill) => skill.name !== 'SKILL_LORE____')
                .filter(
                  (skill) =>
                    variableToLabel(skill) // Normal filter by query
                      .toLowerCase()
                      .includes(skillsSearch.toLowerCase().trim()) || // If it starts with "Strength" find those skills
                    variableNameToLabel(skill.value.attribute ?? '')
                      .toLowerCase()
                      .endsWith(skillsSearch.toLowerCase().trim()) || // If it starrts with "Str" find those skills
                    skill.value.attribute?.toLowerCase().endsWith(skillsSearch.toLowerCase().trim())
                )
                .map((skill, index) => (
                  <StatButton
                    key={index}
                    onClick={() => {
                      openDrawer({
                        type: 'stat-prof',
                        data: { variableName: skill.name },
                      });
                    }}
                  >
                    <Box>
                      <Text c='gray.0' fz='sm'>
                        {variableToLabel(skill)}
                      </Text>
                    </Box>
                    <Group>
                      <Text c='gray.0'>{displayFinalProfValue(skill.name)}</Text>
                      <Badge variant='default'>{skill?.value.value}</Badge>
                    </Group>
                  </StatButton>
                ))}
            </Stack>
          </ScrollArea>
        </Stack>
      </Box>
      <Box style={{ flexBasis: '70%' }} h='100%'>
        <Stack gap={5}>
          <Group>
            <TextInput
              style={{ flex: 1 }}
              leftSection={<IconSearch size='0.9rem' />}
              placeholder={`Search actions & activities`}
              onChange={(event) => setSkillsSearch(event.target.value)}
              styles={{
                input: {
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                },
              }}
            />
            <Group gap={5}>
              <ActionIcon
                variant='subtle'
                color='dark'
                radius='xl'
                size='lg'
                aria-label='Filter One Action'
                style={{
                  backgroundColor: actionTypeFilter === 'ALL' ? theme.colors.dark[6] : undefined,
                }}
                onClick={() => {
                  setActionTypeFilter('ALL');
                }}
              >
                <Text c='gray.3'>All</Text>
              </ActionIcon>
              <ActionIcon
                variant='subtle'
                color='dark'
                radius='xl'
                size='lg'
                aria-label='Filter One Action'
                style={{
                  backgroundColor:
                    actionTypeFilter === 'ONE-ACTION' ? theme.colors.dark[6] : undefined,
                }}
                onClick={() => {
                  setActionTypeFilter('ONE-ACTION');
                }}
              >
                <ActionSymbol cost={'ONE-ACTION'} size={'1.9rem'} />
              </ActionIcon>
              <ActionIcon
                variant='subtle'
                color='dark'
                radius='xl'
                size='lg'
                aria-label='Filter Two Actions'
                style={{
                  backgroundColor:
                    actionTypeFilter === 'TWO-ACTIONS' ? theme.colors.dark[6] : undefined,
                }}
                onClick={() => {
                  setActionTypeFilter('TWO-ACTIONS');
                }}
              >
                <ActionSymbol cost={'TWO-ACTIONS'} size={'1.9rem'} />
              </ActionIcon>
              <ActionIcon
                variant='subtle'
                color='dark'
                radius='xl'
                size='lg'
                aria-label='Filter Three Actions'
                style={{
                  backgroundColor:
                    actionTypeFilter === 'THREE-ACTIONS' ? theme.colors.dark[6] : undefined,
                }}
                onClick={() => {
                  setActionTypeFilter('THREE-ACTIONS');
                }}
              >
                <ActionSymbol cost={'THREE-ACTIONS'} size={'1.9rem'} />
              </ActionIcon>
              <ActionIcon
                variant='subtle'
                color='dark'
                radius='xl'
                size='lg'
                aria-label='Filter Free Action'
                style={{
                  backgroundColor:
                    actionTypeFilter === 'FREE-ACTION' ? theme.colors.dark[6] : undefined,
                }}
                onClick={() => {
                  setActionTypeFilter('FREE-ACTION');
                }}
              >
                <ActionSymbol cost={'FREE-ACTION'} size={'1.9rem'} />
              </ActionIcon>
              <ActionIcon
                variant='subtle'
                color='dark'
                radius='xl'
                size='lg'
                aria-label='Filter Reaction'
                style={{
                  backgroundColor:
                    actionTypeFilter === 'REACTION' ? theme.colors.dark[6] : undefined,
                }}
                onClick={() => {
                  setActionTypeFilter('REACTION');
                }}
              >
                <ActionSymbol cost={'REACTION'} size={'1.9rem'} />
              </ActionIcon>
            </Group>
          </Group>
          <ScrollArea h={props.panelHeight}>
            <Accordion
              value={actionSectionValue}
              onChange={setActionSectionValue}
              variant='filled'
              styles={{
                label: {
                  paddingTop: 5,
                  paddingBottom: 5,
                },
                control: {
                  paddingLeft: 13,
                  paddingRight: 13,
                },
                item: {
                  marginTop: 0,
                  marginBottom: 5,
                },
              }}
            >
              <ActionAccordionItem
                id='weapon-attacks'
                title='Weapon Attacks'
                opened={actionSectionValue === 'weapon-attacks'}
                actions={[]}
              />
              <ActionAccordionItem
                id='feats'
                title='Feats (with Actions)'
                opened={actionSectionValue === 'feats'}
                actions={[]}
              />
              <ActionAccordionItem
                id='items'
                title='Items (with Actions)'
                opened={actionSectionValue === 'items'}
                actions={[]}
              />
              <ActionAccordionItem
                id='basic-actions'
                title='Basic Actions'
                opened={actionSectionValue === 'basic-actions'}
                actions={[]}
              />
              <ActionAccordionItem
                id='skill-actions'
                title='Skill Actions'
                opened={actionSectionValue === 'skill-actions'}
                actions={[]}
              />
              <ActionAccordionItem
                id='speciality-basic-actions'
                title='Speciality Basics'
                opened={actionSectionValue === 'speciality-basic-actions'}
                actions={[]}
              />
              <ActionAccordionItem
                id='exploration-activities'
                title='Exploration Activities'
                opened={actionSectionValue === 'exploration-activities'}
                actions={[]}
              />
              <ActionAccordionItem
                id='downtime-activities'
                title='Downtime Activities'
                opened={actionSectionValue === 'downtime-activities'}
                actions={[]}
              />
            </Accordion>
          </ScrollArea>
        </Stack>
      </Box>
    </Group>
  );
}

function ActionAccordionItem(props: {
  id: string;
  title: string;
  opened: boolean;
  actions: ActionItem[];
}) {
  const theme = useMantineTheme();
  const [subSectionValue, setSubSectionValue] = useState<string | null>(null);
  const { hovered, ref } = useHover();

  return (
    <Accordion.Item
      ref={ref}
      value={props.id}
      style={{
        backgroundColor: hovered && !props.opened ? 'rgba(0, 0, 0, 0.1)' : undefined,
      }}
    >
      <Accordion.Control>
        <Group wrap='nowrap' justify='space-between' gap={0}>
          <Text c='gray.5' fw={700} fz='sm'>
            {props.title}
          </Text>
          <Badge mr='sm' variant='outline' color='gray.5' size='xs'>
            <Text fz='sm' c='gray.5' span>
              {props.actions.length}
            </Text>
          </Badge>
        </Group>
      </Accordion.Control>
      <Accordion.Panel>
        {props.actions.map((action, index) => (
          <ActionSelectionOption key={index} action={action} onClick={() => {}} />
        ))}
      </Accordion.Panel>
    </Accordion.Item>
  );
}

function ActionSelectionOption(props: {
  action: ActionItem;
  onClick: (action: ActionItem) => void;
}) {
  const theme = useMantineTheme();
  const { hovered, ref } = useHover();
  const [_drawer, openDrawer] = useRecoilState(drawerState);

  return (
    <Group
      ref={ref}
      p='sm'
      style={{
        cursor: 'pointer',
        borderBottom: '1px solid ' + theme.colors.dark[6],
        backgroundColor: hovered ? theme.colors.dark[6] : 'transparent',
        position: 'relative',
      }}
      onClick={() => props.onClick(props.action)}
      justify='space-between'
    >
      {props.action.level && (
        <Text
          fz={10}
          c='dimmed'
          ta='right'
          w={14}
          style={{
            position: 'absolute',
            top: 15,
            left: 1,
          }}
        >
          {props.action.level}.
        </Text>
      )}
      <Group wrap='nowrap' gap={5}>
        <Box pl={8}>
          <Text fz='sm'>{props.action.name}</Text>
        </Box>
        <Box>
          <ActionSymbol cost={props.action.cost} />
        </Box>
      </Group>
      <Group wrap='nowrap' justify='flex-end' style={{ marginLeft: 'auto' }}>
        <Box>
          <TraitsDisplay
            justify='flex-end'
            size='xs'
            traitIds={props.action.traits ?? []}
            rarity={props.action.rarity}
          />
        </Box>
        {true && <Box w={50}></Box>}
      </Group>
      {true && (
        <Button
          size='compact-xs'
          variant='subtle'
          style={{
            position: 'absolute',
            top: 12,
            right: 10,
          }}
          onClick={(e) => {
            e.stopPropagation();
            openDrawer({ type: 'feat', data: { id: props.action.id } });
          }}
        >
          Details
        </Button>
      )}
    </Group>
  );
}

function PanelInventory(props: { panelHeight: number }) {
  return null;
}

function PanelSpells(props: { panelHeight: number }) {
  return null;
}

function PanelFeatsFeatures(props: { panelHeight: number }) {
  return null;
}

function PanelCompanions(props: { panelHeight: number }) {
  return null;
}

function PanelDetails(props: { content: ContentPackage; panelHeight: number }) {
  const [_drawer, openDrawer] = useRecoilState(drawerState);

  const [character, setCharacter] = useRecoilState(characterState);

  const languages = (getVariable<VariableListStr>('LANGUAGE_IDS')?.value ?? []).map((langId) => {
    const lang = props.content.languages.find((lang) => `${lang.id}` === langId);
    return lang;
  });

  const weaponProfs = getAllWeaponVariables();
  const armorProfs = getAllArmorVariables();

  return (
    <Group align='flex-start'>
      <Paper
        shadow='sm'
        p='sm'
        h='100%'
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.13)',
          flex: 1,
        }}
      >
        <Stack gap={10}>
          <Title order={3}>Information</Title>
          <ScrollArea h={props.panelHeight - 60}>
            <Box w={280}>
              <Stack gap={5}>
                <TextInput
                  label='Organized Play ID'
                  placeholder='Organized Play ID'
                  defaultValue={character?.details?.info?.organized_play_id}
                  onChange={(e) => {
                    if (!character) return;
                    setCharacter({
                      ...character,
                      details: {
                        ...character.details,
                        info: {
                          ...character.details?.info,
                          organized_play_id: e.target.value,
                        },
                      },
                    });
                  }}
                  rightSection={
                    <ActionIcon
                      variant='subtle'
                      radius='xl'
                      color='gray.5'
                      aria-label='Organized Play Website'
                      component='a'
                      href='https://paizo.com/organizedplay'
                      target='_blank'
                    >
                      <IconExternalLink style={{ width: '70%', height: '70%' }} stroke={1.5} />
                    </ActionIcon>
                  }
                />
                <Divider mt='sm' />
                <Textarea
                  label='Appearance'
                  placeholder='Appearance'
                  autosize
                  defaultValue={character?.details?.info?.appearance}
                  onChange={(e) => {
                    if (!character) return;
                    setCharacter({
                      ...character,
                      details: {
                        ...character.details,
                        info: {
                          ...character.details?.info,
                          appearance: e.target.value,
                        },
                      },
                    });
                  }}
                />
                <Textarea
                  label='Personality'
                  placeholder='Personality'
                  autosize
                  defaultValue={character?.details?.info?.personality}
                  onChange={(e) => {
                    if (!character) return;
                    setCharacter({
                      ...character,
                      details: {
                        ...character.details,
                        info: {
                          ...character.details?.info,
                          personality: e.target.value,
                        },
                      },
                    });
                  }}
                />
                <Textarea
                  label='Alignment'
                  placeholder='Alignment'
                  autosize
                  defaultValue={character?.details?.info?.alignment}
                  onChange={(e) => {
                    if (!character) return;
                    setCharacter({
                      ...character,
                      details: {
                        ...character.details,
                        info: {
                          ...character.details?.info,
                          alignment: e.target.value,
                        },
                      },
                    });
                  }}
                />
                <Textarea
                  label='Beliefs'
                  placeholder='Beliefs'
                  autosize
                  defaultValue={character?.details?.info?.beliefs}
                  onChange={(e) => {
                    if (!character) return;
                    setCharacter({
                      ...character,
                      details: {
                        ...character.details,
                        info: {
                          ...character.details?.info,
                          beliefs: e.target.value,
                        },
                      },
                    });
                  }}
                />
                <Divider mt='sm' />
                <TextInput
                  label='Age'
                  placeholder='Age'
                  defaultValue={character?.details?.info?.age}
                  onChange={(e) => {
                    if (!character) return;
                    setCharacter({
                      ...character,
                      details: {
                        ...character.details,
                        info: {
                          ...character.details?.info,
                          age: e.target.value,
                        },
                      },
                    });
                  }}
                />
                <TextInput
                  label='Height'
                  placeholder='Height'
                  defaultValue={character?.details?.info?.height}
                  onChange={(e) => {
                    if (!character) return;
                    setCharacter({
                      ...character,
                      details: {
                        ...character.details,
                        info: {
                          ...character.details?.info,
                          height: e.target.value,
                        },
                      },
                    });
                  }}
                />
                <TextInput
                  label='Weight'
                  placeholder='Weight'
                  defaultValue={character?.details?.info?.weight}
                  onChange={(e) => {
                    if (!character) return;
                    setCharacter({
                      ...character,
                      details: {
                        ...character.details,
                        info: {
                          ...character.details?.info,
                          weight: e.target.value,
                        },
                      },
                    });
                  }}
                />
                <TextInput
                  label='Gender'
                  placeholder='Gender'
                  defaultValue={character?.details?.info?.gender}
                  onChange={(e) => {
                    if (!character) return;
                    setCharacter({
                      ...character,
                      details: {
                        ...character.details,
                        info: {
                          ...character.details?.info,
                          gender: e.target.value,
                        },
                      },
                    });
                  }}
                />
                <TextInput
                  label='Pronouns'
                  placeholder='Pronouns'
                  defaultValue={character?.details?.info?.pronouns}
                  onChange={(e) => {
                    if (!character) return;
                    setCharacter({
                      ...character,
                      details: {
                        ...character.details,
                        info: {
                          ...character.details?.info,
                          pronouns: e.target.value,
                        },
                      },
                    });
                  }}
                />
                <Divider mt='sm' />
                <TextInput
                  label='Faction'
                  placeholder='Faction'
                  defaultValue={character?.details?.info?.faction}
                  onChange={(e) => {
                    if (!character) return;
                    setCharacter({
                      ...character,
                      details: {
                        ...character.details,
                        info: {
                          ...character.details?.info,
                          faction: e.target.value,
                        },
                      },
                    });
                  }}
                />
                <TextInput
                  label='Ethnicity'
                  placeholder='Ethnicity'
                  defaultValue={character?.details?.info?.ethnicity}
                  onChange={(e) => {
                    if (!character) return;
                    setCharacter({
                      ...character,
                      details: {
                        ...character.details,
                        info: {
                          ...character.details?.info,
                          ethnicity: e.target.value,
                        },
                      },
                    });
                  }}
                />
                <TextInput
                  label='Nationality'
                  placeholder='Nationality'
                  defaultValue={character?.details?.info?.nationality}
                  onChange={(e) => {
                    if (!character) return;
                    setCharacter({
                      ...character,
                      details: {
                        ...character.details,
                        info: {
                          ...character.details?.info,
                          nationality: e.target.value,
                        },
                      },
                    });
                  }}
                />
                <TextInput
                  label='Birthplace'
                  placeholder='Birthplace'
                  defaultValue={character?.details?.info?.birthplace}
                  onChange={(e) => {
                    if (!character) return;
                    setCharacter({
                      ...character,
                      details: {
                        ...character.details,
                        info: {
                          ...character.details?.info,
                          birthplace: e.target.value,
                        },
                      },
                    });
                  }}
                />
              </Stack>
            </Box>
          </ScrollArea>
        </Stack>
      </Paper>
      <Paper
        shadow='sm'
        p='sm'
        h='100%'
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.13)',
        }}
      >
        <Stack gap={10}>
          <Title order={3}>Languages</Title>
          <ScrollArea h={props.panelHeight - 60}>
            <Box w={280}>
              <Pill.Group>
                {languages.map((language, index) => (
                  <Pill
                    key={index}
                    size='md'
                    styles={{
                      label: {
                        cursor: 'pointer',
                      },
                    }}
                    onClick={() => {
                      openDrawer({ type: 'language', data: { id: language?.id } });
                    }}
                  >
                    {language?.name ?? 'Unknown'}
                  </Pill>
                ))}
              </Pill.Group>
            </Box>
          </ScrollArea>
        </Stack>
      </Paper>
      <Paper
        shadow='sm'
        p='sm'
        h='100%'
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.13)',
        }}
      >
        <Stack gap={10}>
          <Title order={3}>Proficiencies</Title>
          <ScrollArea h={props.panelHeight - 60}>
            <Box w={280}>
              <Accordion
                variant='separated'
                styles={{
                  label: {
                    paddingTop: 5,
                    paddingBottom: 5,
                  },
                  control: {
                    paddingLeft: 13,
                    paddingRight: 13,
                  },
                  item: {
                    marginTop: 0,
                    marginBottom: 5,
                  },
                }}
              >
                <Accordion.Item className={classes.item} value={'attacks'} w='100%'>
                  <Accordion.Control>
                    <Text c='white' fz='sm'>
                      Attacks
                    </Text>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <Stack gap={5}>
                      <StatButton
                        onClick={() => {
                          openDrawer({
                            type: 'stat-prof',
                            data: { variableName: 'SIMPLE_WEAPONS' },
                          });
                        }}
                      >
                        <Box>
                          <Text c='gray.0' fz='sm'>
                            Simple Weapons
                          </Text>
                        </Box>
                        <Group>
                          <Badge variant='default'>
                            {getVariable<VariableProf>('SIMPLE_WEAPONS')?.value.value}
                          </Badge>
                        </Group>
                      </StatButton>
                      <StatButton
                        onClick={() => {
                          openDrawer({
                            type: 'stat-prof',
                            data: { variableName: 'MARTIAL_WEAPONS' },
                          });
                        }}
                      >
                        <Box>
                          <Text c='gray.0' fz='sm'>
                            Martial Weapons
                          </Text>
                        </Box>
                        <Group>
                          <Badge variant='default'>
                            {getVariable<VariableProf>('MARTIAL_WEAPONS')?.value.value}
                          </Badge>
                        </Group>
                      </StatButton>
                      <StatButton
                        onClick={() => {
                          openDrawer({
                            type: 'stat-prof',
                            data: { variableName: 'ADVANCED_WEAPONS' },
                          });
                        }}
                      >
                        <Box>
                          <Text c='gray.0' fz='sm'>
                            Advanced Weapons
                          </Text>
                        </Box>
                        <Group>
                          <Badge variant='default'>
                            {getVariable<VariableProf>('ADVANCED_WEAPONS')?.value.value}
                          </Badge>
                        </Group>
                      </StatButton>
                      <StatButton
                        onClick={() => {
                          openDrawer({
                            type: 'stat-prof',
                            data: { variableName: 'UNARMED_ATTACKS' },
                          });
                        }}
                      >
                        <Box>
                          <Text c='gray.0' fz='sm'>
                            Unarmed Attacks
                          </Text>
                        </Box>
                        <Group>
                          <Badge variant='default'>
                            {getVariable<VariableProf>('UNARMED_ATTACKS')?.value.value}
                          </Badge>
                        </Group>
                      </StatButton>
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>
                <Accordion.Item className={classes.item} value={'defenses'}>
                  <Accordion.Control>
                    <Text c='white' fz='sm'>
                      Defenses
                    </Text>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <Stack gap={5}>
                      <StatButton
                        onClick={() => {
                          openDrawer({
                            type: 'stat-prof',
                            data: { variableName: 'LIGHT_ARMOR' },
                          });
                        }}
                      >
                        <Box>
                          <Text c='gray.0' fz='sm'>
                            Light Armor
                          </Text>
                        </Box>
                        <Group>
                          <Badge variant='default'>
                            {getVariable<VariableProf>('LIGHT_ARMOR')?.value.value}
                          </Badge>
                        </Group>
                      </StatButton>
                      <StatButton
                        onClick={() => {
                          openDrawer({
                            type: 'stat-prof',
                            data: { variableName: 'MEDIUM_ARMOR' },
                          });
                        }}
                      >
                        <Box>
                          <Text c='gray.0' fz='sm'>
                            Medium Armor
                          </Text>
                        </Box>
                        <Group>
                          <Badge variant='default'>
                            {getVariable<VariableProf>('MEDIUM_ARMOR')?.value.value}
                          </Badge>
                        </Group>
                      </StatButton>
                      <StatButton
                        onClick={() => {
                          openDrawer({
                            type: 'stat-prof',
                            data: { variableName: 'HEAVY_ARMOR' },
                          });
                        }}
                      >
                        <Box>
                          <Text c='gray.0' fz='sm'>
                            Heavy Armor
                          </Text>
                        </Box>
                        <Group>
                          <Badge variant='default'>
                            {getVariable<VariableProf>('HEAVY_ARMOR')?.value.value}
                          </Badge>
                        </Group>
                      </StatButton>
                      <StatButton
                        onClick={() => {
                          openDrawer({
                            type: 'stat-prof',
                            data: { variableName: 'UNARMORED_DEFENSE' },
                          });
                        }}
                      >
                        <Box>
                          <Text c='gray.0' fz='sm'>
                            Unarmored Defense
                          </Text>
                        </Box>
                        <Group>
                          <Badge variant='default'>
                            {getVariable<VariableProf>('UNARMORED_DEFENSE')?.value.value}
                          </Badge>
                        </Group>
                      </StatButton>
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>
                <Accordion.Item className={classes.item} value={'spellcasting'}>
                  <Accordion.Control>
                    <Text c='white' fz='sm'>
                      Spellcasting
                    </Text>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <Stack gap={5}>
                      <StatButton
                        onClick={() => {
                          openDrawer({
                            type: 'stat-prof',
                            data: { variableName: 'SPELL_ATTACK' },
                          });
                        }}
                      >
                        <Box>
                          <Text c='gray.0' fz='sm'>
                            Spell Attack
                          </Text>
                        </Box>
                        <Group>
                          <Text c='gray.0'>{displayFinalProfValue('SPELL_ATTACK')}</Text>
                          <Badge variant='default'>
                            {getVariable<VariableProf>('SPELL_ATTACK')?.value.value}
                          </Badge>
                        </Group>
                      </StatButton>
                      <StatButton
                        onClick={() => {
                          openDrawer({
                            type: 'stat-prof',
                            data: { variableName: 'SPELL_DC' },
                          });
                        }}
                      >
                        <Box>
                          <Text c='gray.0' fz='sm'>
                            Spell DC
                          </Text>
                        </Box>
                        <Group>
                          <Text c='gray.0'>{displayFinalProfValue('SPELL_DC')}</Text>
                          <Badge variant='default'>
                            {getVariable<VariableProf>('SPELL_DC')?.value.value}
                          </Badge>
                        </Group>
                      </StatButton>
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>
                {weaponProfs.length > 0 && (
                  <Accordion.Item className={classes.item} value={'weapons'}>
                    <Accordion.Control>
                      <Text c='white' fz='sm'>
                        Weapons
                      </Text>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Stack gap={5}>
                        {weaponProfs.map((weapon, index) => (
                          <StatButton
                            key={index}
                            onClick={() => {
                              openDrawer({
                                type: 'stat-prof',
                                data: { variableName: weapon.name },
                              });
                            }}
                          >
                            <Box>
                              <Text c='gray.0' fz='sm'>
                                {variableToLabel(weapon)}
                              </Text>
                            </Box>
                            <Group>
                              <Badge variant='default'>{weapon.value.value}</Badge>
                            </Group>
                          </StatButton>
                        ))}
                      </Stack>
                    </Accordion.Panel>
                  </Accordion.Item>
                )}
                {armorProfs.length > 0 && (
                  <Accordion.Item className={classes.item} value={'armor'}>
                    <Accordion.Control>
                      <Text c='white' fz='sm'>
                        Armor
                      </Text>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Stack gap={5}>
                        {armorProfs.map((armor, index) => (
                          <StatButton
                            key={index}
                            onClick={() => {
                              openDrawer({
                                type: 'stat-prof',
                                data: { variableName: armor.name },
                              });
                            }}
                          >
                            <Box>
                              <Text c='gray.0' fz='sm'>
                                {variableToLabel(armor)}
                              </Text>
                            </Box>
                            <Group>
                              <Badge variant='default'>{armor.value.value}</Badge>
                            </Group>
                          </StatButton>
                        ))}
                      </Stack>
                    </Accordion.Panel>
                  </Accordion.Item>
                )}
              </Accordion>
            </Box>
          </ScrollArea>
        </Stack>
      </Paper>
    </Group>
  );
}

function PanelNotes(props: { panelHeight: number }) {
  const [activeTab, setActiveTab] = useState<string | null>('0');
  const [character, setCharacter] = useRecoilState(characterState);

  const defaultPage = {
    name: 'Notes',
    icon: 'notebook',
    color: character?.details?.sheet_theme?.color || GUIDE_BLUE,
    contents: null,
  };

  const pages = character?.notes?.pages ?? [_.cloneDeep(defaultPage)];

  return (
    <Tabs orientation='vertical' value={activeTab} onChange={setActiveTab}>
      <Tabs.List w={180} h={props.panelHeight}>
        {pages.map((page, index) => (
          <Tabs.Tab
            key={index}
            value={`${index}`}
            leftSection={
              <ActionIcon
                variant='transparent'
                aria-label={`${page.name}`}
                color={page.color}
                size='xs'
              >
                <Icon name={page.icon} size='1rem' />
              </ActionIcon>
            }
            color={page.color}
          >
            {_.truncate(page.name, { length: 16 })}
          </Tabs.Tab>
        ))}
        <Tabs.Tab
          value='add_page'
          mt='auto'
          leftSection={
            <ActionIcon variant='transparent' size='xs' color='gray.5'>
              <IconPlus size='1rem' />
            </ActionIcon>
          }
          onClick={(e) => {
            if (!character) return;
            e.stopPropagation();
            e.preventDefault();
            const newPages = _.cloneDeep(pages);
            newPages.push(_.cloneDeep(defaultPage));
            setCharacter({
              ...character,
              notes: {
                ...character.notes,
                pages: newPages,
              },
            });
            setActiveTab(`${newPages.length - 1}`);
          }}
        >
          Add Page
        </Tabs.Tab>
      </Tabs.List>

      {pages.map((page, index) => (
        <Tabs.Panel key={index} value={`${index}`} style={{ position: 'relative' }}>
          <ScrollArea h={props.panelHeight}>
            <RichTextInput
              placeholder='Your notes...'
              value={page.contents}
              onChange={(text, json) => {
                if (!character) return;
                const newPages = _.cloneDeep(pages);
                newPages[index].contents = json;
                setCharacter({
                  ...character,
                  notes: {
                    ...character.notes,
                    pages: newPages,
                  },
                });
              }}
            />
            <ActionIcon
              variant='subtle'
              aria-label={`Page Settings`}
              size='md'
              radius='xl'
              color='gray.5'
              style={{
                position: 'absolute',
                top: 10,
                right: 10,
              }}
              onClick={() => {
                openContextModal({
                  modal: 'updateNotePage',
                  title: <Title order={3}>Update Page</Title>,
                  innerProps: {
                    page: page,
                    onUpdate: (name, icon, color) => {
                      if (!character) return;
                      const newPages = _.cloneDeep(pages);
                      newPages[index] = {
                        ...newPages[index],
                        name: name,
                        icon: icon,
                        color: color,
                      };
                      setCharacter({
                        ...character,
                        notes: {
                          ...character.notes,
                          pages: newPages,
                        },
                      });
                    },
                    onDelete: () => {
                      if (!character) return;
                      const newPages = _.cloneDeep(pages);
                      newPages.splice(index, 1);
                      setCharacter({
                        ...character,
                        notes: {
                          ...character.notes,
                          pages: newPages,
                        },
                      });
                      setActiveTab(`0`);
                    },
                  },
                });
              }}
            >
              <IconSettings size='1.2rem' />
            </ActionIcon>
          </ScrollArea>
        </Tabs.Panel>
      ))}
    </Tabs>
  );
}

function PanelExtras(props: { panelHeight: number }) {
  return null;
}
