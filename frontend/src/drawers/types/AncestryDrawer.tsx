import { characterState } from '@atoms/characterAtoms';
import { drawerState } from '@atoms/navAtoms';
import IndentedText from '@common/IndentedText';
import RichText from '@common/RichText';
import TraitsDisplay from '@common/TraitsDisplay';
import { FeatSelectionOption, HeritageSelectionOption } from '@common/select/SelectContent';
import { fetchContentAll, fetchContentById } from '@content/content-store';
import { getIconFromContentType } from '@content/content-utils';
import ShowOperationsButton from '@drawers/ShowOperationsButton';
import { getMetadataOpenedDict } from '@drawers/drawer-utils';
import {
  Accordion,
  ActionIcon,
  Anchor,
  Badge,
  Box,
  Button,
  Divider,
  Group,
  HoverCard,
  Image,
  Loader,
  Paper,
  Stack,
  Text,
  Title,
  useMantineTheme,
} from '@mantine/core';
import { addedAncestryLanguages, getAdjustedAncestryOperations } from '@operations/operation-controller';
import { OperationResult } from '@operations/operation-runner';
import { IconChevronsDown, IconChevronsUp, IconHelpCircle } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { AbilityBlock, Ancestry, Character, Language } from '@typing/content';
import { DrawerType } from '@typing/index';
import { getDisplay, getStatBlockDisplay, getStatDisplay } from '@variables/initial-stats-display';
import { getAllAttributeVariables } from '@variables/variable-manager';
import * as _ from 'lodash-es';
import { useState } from 'react';
import { SetterOrUpdater, useRecoilState } from 'recoil';

export function AncestryDrawerTitle(props: { data: { id?: number; ancestry?: Ancestry; onSelect?: () => void } }) {
  const id = props.data.id;

  const [_drawer, openDrawer] = useRecoilState(drawerState);

  const { data: _ancestry } = useQuery({
    queryKey: [`find-ancestry-${id}`, { id }],
    queryFn: async ({ queryKey }) => {
      // @ts-ignore
      // eslint-disable-next-line
      const [_key, { id }] = queryKey;
      return await fetchContentById<Ancestry>('ancestry', id);
    },
    enabled: !!id,
  });
  const ancestry = props.data.ancestry ?? _ancestry;

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
          {props.data.onSelect && (
            <Button
              variant='filled'
              radius='xl'
              mb={5}
              size='compact-sm'
              onClick={() => {
                props.data.onSelect?.();
                openDrawer(null);
              }}
            >
              Select Ancestry
            </Button>
          )}
        </Group>
      )}
    </>
  );
}

export function AncestryDrawerContent(props: {
  data: { id?: number; ancestry?: Ancestry; showOperations?: boolean };
  onMetadataChange?: (openedDict?: Record<string, string>) => void;
}) {
  const id = props.data.id;

  const { data } = useQuery({
    queryKey: [`find-ancestry-details-${id}`, { id }],
    queryFn: async ({ queryKey }) => {
      // @ts-ignore
      // eslint-disable-next-line
      const [_key, { id }] = queryKey;
      const ancestry = await fetchContentById<Ancestry>('ancestry', id);
      const abilityBlocks = await fetchContentAll<AbilityBlock>('ability-block');
      const languages = await fetchContentAll<Language>('language');
      return {
        ancestry: props.data.ancestry ?? ancestry,
        abilityBlocks,
        languages,
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
  const physicalFeatures = (data?.abilityBlocks ?? []).filter((block) => block.type === 'physical-feature');
  const senses = (data?.abilityBlocks ?? []).filter((block) => block.type === 'sense');
  const languages = (data?.languages ?? []).sort((a, b) => a.name.localeCompare(b.name));

  const featSections = Object.keys(feats).map((level) => (
    <Accordion.Item key={level} value={level}>
      <Accordion.Control>
        <Group wrap='nowrap' justify='space-between' gap={0}>
          <Text c='gray.5' fw={700} fz='md'>
            Level {level}
          </Text>
          <Badge mr='sm' variant='outline' color='gray.5' size='xs'>
            <Text fz='sm' c='gray.5' span>
              {feats[level].filter((feat) => feat.meta_data?.unselectable !== true).length}
            </Text>
          </Badge>
        </Group>
      </Accordion.Control>
      <Accordion.Panel
        styles={{
          content: {
            padding: 0,
          },
        }}
      >
        <Stack gap={0}>
          <Divider color='dark.6' />
          {feats[level]
            .filter((feat) => feat.meta_data?.unselectable !== true)
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((feat, index) => (
              <FeatSelectionOption
                key={index}
                feat={feat}
                showButton={false}
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
      <AncestryInitialOverview
        ancestry={data.ancestry}
        mode='READ'
        physicalFeatures={physicalFeatures}
        senses={senses}
        heritages={heritages}
        languages={languages}
      />
      <Box>
        <Title order={3}>Heritages</Title>
        <Accordion
          variant='separated'
          // Save opened state in drawer metadata (so it persists when opening links and going back)
          defaultValue={getMetadataOpenedDict().heritages_opened}
          onChange={(value) => {
            props.onMetadataChange?.({
              heritages_opened: value ?? '',
            });
          }}
        >
          <Accordion.Item value={'heritages'}>
            <Accordion.Control>
              <Group wrap='nowrap' justify='space-between' gap={0}>
                <Text c='gray.5' fw={700} fz='md'>
                  View Options
                </Text>
                <Badge mr='sm' variant='outline' color='gray.5' size='xs'>
                  <Text fz='sm' c='gray.5' span>
                    {heritages.length}
                  </Text>
                </Badge>
              </Group>
            </Accordion.Control>
            <Accordion.Panel
              styles={{
                content: {
                  padding: 0,
                },
              }}
            >
              <Stack gap={0}>
                <Divider color='dark.6' />
                {heritages.map((heritage, index) => (
                  <HeritageSelectionOption
                    key={index}
                    heritage={heritage}
                    showButton={false}
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
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
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
      {props.data.showOperations && (
        <ShowOperationsButton name={data.ancestry.name} operations={data.ancestry.operations} />
      )}
    </Stack>
  );
}

export function AncestryInitialOverview(props: {
  ancestry: Ancestry;
  physicalFeatures: AbilityBlock[];
  senses: AbilityBlock[];
  heritages: AbilityBlock[];
  languages: Language[];
  mode: 'READ' | 'READ/WRITE';
  operationResults?: OperationResult[];
}) {
  const theme = useMantineTheme();
  const [descHidden, setDescHidden] = useState(true);
  const charState = useRecoilState(characterState);
  const [_drawer, openDrawer] = useRecoilState(drawerState);

  // Reading thru operations to get display UI
  const MODE = props.mode;
  const display = convertAncestryOperationsIntoUI(
    props.ancestry,
    props.physicalFeatures,
    props.senses,
    props.languages,
    props.mode,
    props.operationResults ?? [],
    charState,
    openDrawer
  );

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
            WebkitMaskImage: descHidden ? 'linear-gradient(to bottom, black 60%, transparent 100%)' : undefined,
            maskImage: descHidden ? 'linear-gradient(to bottom, black 60%, transparent 100%)' : undefined,
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
          style={{
            backgroundColor: theme.colors.dark[8],
            position: 'relative',
          }}
        >
          <HoverCard shadow='md' openDelay={250} width={200} zIndex={1000} position='top' withinPortal>
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
              <Text fz='xs'>You increase your maximum number of HP by this number at 1st level.</Text>
            </HoverCard.Dropdown>
          </HoverCard>
          <Text c='gray.5' ta='center'>
            Hit Points
          </Text>
          <Text c='gray.4' fw={700} ta='center'>
            {display.ancestryHp.ui ?? 'Varies'}
          </Text>
        </Paper>
        <Paper
          shadow='xs'
          p='sm'
          radius='md'
          style={{
            backgroundColor: theme.colors.dark[8],
            position: 'relative',
          }}
        >
          <HoverCard shadow='md' openDelay={250} width={200} zIndex={1000} position='top' withinPortal>
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
                This tells you the physical size of members of your ancestry. Medium corresponds roughly to the height
                and weight of a human adult, and Small is roughly half that.
              </Text>
            </HoverCard.Dropdown>
          </HoverCard>
          <Text c='gray.5' ta='center'>
            Size
          </Text>
          <Text
            c='gray.4'
            fw={700}
            ta='center'
            style={{ display: 'flex', justifyContent: 'center', textWrap: 'nowrap' }}
          >
            {display.size.ui ?? 'Varies'}
          </Text>
        </Paper>
        <Paper
          shadow='xs'
          p='sm'
          radius='md'
          style={{
            backgroundColor: theme.colors.dark[8],
            position: 'relative',
          }}
        >
          <HoverCard shadow='md' openDelay={250} width={200} zIndex={1000} position='top' withinPortal>
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
                This is your base speed, it determines how far you can move each time you spend an action (such as
                Stride) to do so.
              </Text>
            </HoverCard.Dropdown>
          </HoverCard>
          <Text c='gray.5' ta='center'>
            Speed
          </Text>
          <Text c='gray.4' fw={700} ta='center' style={{ display: 'flex', justifyContent: 'center' }}>
            {display.speed.ui ?? 'Varies'}
          </Text>
        </Paper>
      </Group>
      {display.boostAttributes.length > 0 && (
        <Box>
          <Divider
            px='xs'
            label={
              <Text fz='xs' c='gray.6'>
                <Group gap={5}>
                  <IconChevronsUp size='0.8rem' />
                  <Box>Attribute Boosts</Box>
                </Group>
              </Text>
            }
            labelPosition='left'
          />
          {display.boostAttributes.map((attribute, index) => (
            <IndentedText key={index} disabled={MODE !== 'READ'} px='xs' c='gray.5' fz='sm'>
              {attribute.ui}
            </IndentedText>
          ))}
        </Box>
      )}
      {display.flawAttributes.length > 0 && (
        <Box>
          <Divider
            px='xs'
            label={
              <Text fz='xs' c='gray.6'>
                <Group gap={5}>
                  <IconChevronsDown size='0.8rem' />
                  <Box>Attribute Flaws</Box>
                </Group>
              </Text>
            }
            labelPosition='left'
          />
          {display.flawAttributes.map((skill, index) => (
            <IndentedText key={index} disabled={MODE !== 'READ'} px='xs' c='gray.5' fz='sm'>
              {skill.ui}
            </IndentedText>
          ))}
        </Box>
      )}
      <Box>
        <Divider
          px='xs'
          label={
            <Text fz='xs' c='gray.6'>
              <Group gap={5}>
                {getIconFromContentType('language', '0.8rem')}
                <Box>Languages</Box>
              </Group>
            </Text>
          }
          labelPosition='left'
        />
        {display.languages.map((language, index) => (
          <IndentedText key={index} disabled={MODE !== 'READ'} px='xs' c='gray.5' fz='sm'>
            {language.ui}
          </IndentedText>
        ))}
        {display.additionalLanguages.map((record, index) => (
          <IndentedText key={index} disabled={MODE !== 'READ'} px='xs' c='gray.5' fz='sm'>
            {record.ui}
          </IndentedText>
        ))}
      </Box>
      {(display.senses.length > 0 || display.physicalFeatures.length > 0) && (
        <Box>
          <Divider
            px='xs'
            label={
              <Text fz='xs' c='gray.6'>
                <Group gap={5}>
                  {getIconFromContentType('ability-block', '0.8rem')}
                  <Box>Special Abilities</Box>
                </Group>
              </Text>
            }
            labelPosition='left'
          />
          {display.senses.map((sense, index) => (
            <IndentedText key={index} disabled={MODE !== 'READ'} px='xs' c='gray.5' fz='sm'>
              {sense.ui}
            </IndentedText>
          ))}
          {display.physicalFeatures.map((physicalFeature, index) => (
            <IndentedText key={index} disabled={MODE !== 'READ'} px='xs' c='gray.5' fz='sm'>
              {physicalFeature.ui}
            </IndentedText>
          ))}
        </Box>
      )}
    </>
  );
}

export function convertAncestryOperationsIntoUI(
  ancestry: Ancestry,
  allPhysicalFeatures: AbilityBlock[],
  allSenses: AbilityBlock[],
  allLanguages: Language[],
  mode: 'READ' | 'READ/WRITE',
  operationResults: OperationResult[],
  charState: [Character | null, SetterOrUpdater<Character | null>],
  openDrawer: SetterOrUpdater<{
    type: DrawerType;
    data: any;
    extra?: any;
  } | null>
) {
  const ancestryOperations = charState[0]
    ? getAdjustedAncestryOperations('CHARACTER', charState[0], ancestry.operations ?? [])
    : ancestry.operations ?? [];
  const MODE = mode;
  const writeDetails =
    MODE === 'READ/WRITE'
      ? {
          operationResults: operationResults,
          characterState: charState,
          primarySource: 'ancestry',
        }
      : undefined;

  const boostAttributes = getStatBlockDisplay(
    'CHARACTER',
    getAllAttributeVariables('CHARACTER').map((v) => v.name),
    ancestryOperations,
    MODE,
    writeDetails,
    { fullNames: true }
  );

  const flawAttributes = getStatBlockDisplay(
    'CHARACTER',
    getAllAttributeVariables('CHARACTER').map((v) => v.name),
    ancestryOperations,
    MODE,
    writeDetails,
    { onlyNegatives: true, fullNames: true }
  );

  const ancestryHp = getStatDisplay('CHARACTER', 'MAX_HEALTH_ANCESTRY', ancestryOperations, MODE, writeDetails);

  const size = getStatDisplay('CHARACTER', 'SIZE', ancestryOperations, MODE, writeDetails);
  const speed = getStatDisplay('CHARACTER', 'SPEED', ancestryOperations, MODE, writeDetails);

  let coreLanguages = [];
  for (const op of ancestryOperations) {
    if (op.type === 'setValue') {
      try {
        coreLanguages = JSON.parse(op.data.value as string);
      } catch (e) {}
    }
  }

  let additionalLanguages = [];
  if (MODE === 'READ') {
    additionalLanguages = [
      {
        ui: (
          <>
            Additional languages equal to your Intelligence modifier (if it's positive). Choose from{' '}
            {coreLanguages.join(', ')}, and any other languages to which you have access (such as the languages
            prevalent in your region).
          </>
        ),
        operation: null,
      },
    ];
  } else if (MODE === 'READ/WRITE') {
    const languageOps = addedAncestryLanguages('CHARACTER', ancestry);
    for (const op of languageOps) {
      const result = getDisplay('CHARACTER', { value: 'T' }, op, undefined, 'READ/WRITE', writeDetails);
      additionalLanguages.push({
        ui: result,
        operation: op,
      });
    }
  }

  const languages = [];
  for (const op of ancestryOperations) {
    if (op.type === 'giveLanguage') {
      const lang = allLanguages.find((l) => l.id === op.data.languageId);
      if (lang) {
        languages.push({
          ui: (
            <Anchor
              fz='sm'
              onClick={() => {
                openDrawer({
                  type: 'language',
                  data: { id: lang.id },
                  extra: { addToHistory: true },
                });
              }}
            >
              {lang.name}
            </Anchor>
          ),
          operation: null,
        });
      }
    }
  }

  const physicalFeatures = [];
  for (const op of ancestryOperations) {
    if (op.type === 'giveAbilityBlock') {
      const feature = allPhysicalFeatures.find((l) => l.id === op.data.abilityBlockId);
      if (feature) {
        physicalFeatures.push({
          ui: (
            <Anchor
              fz='sm'
              onClick={() => {
                openDrawer({
                  type: 'physical-feature',
                  data: { id: feature.id },
                  extra: { addToHistory: true },
                });
              }}
            >
              {feature.name}
            </Anchor>
          ),
          operation: null,
        });
      }
    }
  }

  const senses = [];
  for (const op of ancestryOperations) {
    if (op.type === 'giveAbilityBlock') {
      const sense = allSenses.find((l) => l.id === op.data.abilityBlockId);
      if (sense) {
        senses.push({
          ui: (
            <Anchor
              fz='sm'
              onClick={() => {
                openDrawer({
                  type: 'sense',
                  data: { id: sense.id },
                  extra: { addToHistory: true },
                });
              }}
            >
              {sense.name}
            </Anchor>
          ),
          operation: null,
        });
      }
    }
  }

  return {
    boostAttributes,
    flawAttributes,
    ancestryHp,
    size,
    speed,
    physicalFeatures,
    senses,
    languages,
    additionalLanguages,
  };
}
