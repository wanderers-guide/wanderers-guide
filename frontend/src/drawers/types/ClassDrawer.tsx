import { characterState } from '@atoms/characterAtoms';
import { drawerState } from '@atoms/navAtoms';
import IndentedText from '@common/IndentedText';
import RichText from '@common/RichText';
import TraitsDisplay from '@common/TraitsDisplay';
import { FeatSelectionOption } from '@common/select/SelectContent';
import { isAbilityBlockVisible } from '@content/content-hidden';
import { fetchContentAll, fetchContentById, getDefaultSources } from '@content/content-store';
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
  Table,
  Text,
  Title,
  useMantineTheme,
} from '@mantine/core';
import { addedClassSkillTrainings } from '@operations/operation-controller';
import { OperationResult } from '@operations/operation-runner';
import {
  IconBadgesFilled,
  IconEyeFilled,
  IconFlare,
  IconHeartHandshake,
  IconHelpCircle,
  IconShieldCheckeredFilled,
  IconSword,
  IconVocabulary,
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { AbilityBlock, Character, Class } from '@typing/content';
import { OperationSelect } from '@typing/operations';
import { getDisplay, getStatBlockDisplay, getStatDisplay } from '@variables/initial-stats-display';
import { getAllAttributeVariables, getAllSaveVariables, getAllSkillVariables } from '@variables/variable-manager';
import { groupBy } from 'lodash-es';
import { useState } from 'react';
import { SetterOrUpdater, useRecoilState } from 'recoil';

export function ClassDrawerTitle(props: { data: { id?: number; class_?: Class; onSelect?: () => void } }) {
  const id = props.data.id;

  const [_drawer, openDrawer] = useRecoilState(drawerState);

  const { data: _class_ } = useQuery({
    queryKey: [`find-class-${id}`, { id }],
    queryFn: async ({ queryKey }) => {
      // @ts-ignore
      // eslint-disable-next-line
      const [_key, { id }] = queryKey;
      return await fetchContentById<Class>('class', id);
    },
    enabled: !!id,
  });
  const class_ = props.data.class_ ?? _class_;

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
              Select Class
            </Button>
          )}
        </Group>
      )}
    </>
  );
}

export function ClassDrawerContent(props: {
  data: { id?: number; class_?: Class; showOperations?: boolean };
  onMetadataChange?: (openedDict?: Record<string, string>) => void;
}) {
  const id = props.data.id;

  const { data } = useQuery({
    queryKey: [`find-class-details-${id}`, { id }],
    queryFn: async ({ queryKey }) => {
      // @ts-ignore
      // eslint-disable-next-line
      const [_key, { id }] = queryKey;
      const class_ = await fetchContentById<Class>('class', id);
      const abilityBlocks = await fetchContentAll<AbilityBlock>('ability-block', getDefaultSources('INFO'));
      return {
        class_: props.data.class_ ?? class_,
        abilityBlocks,
      };
    },
  });

  const [_drawer, openDrawer] = useRecoilState(drawerState);

  const classFeatures = groupBy(
    (data?.abilityBlocks ?? []).filter(
      (block) => block.type === 'class-feature' && block.traits?.includes(data?.class_?.trait_id ?? -1)
    ),
    'level'
  );
  const feats = groupBy(
    (data?.abilityBlocks ?? []).filter(
      (block) => block.type === 'feat' && block.traits?.includes(data?.class_?.trait_id ?? -1)
    ),
    'level'
  );

  const featSections = Object.keys(feats).map((level) => (
    <Accordion.Item key={level} value={level}>
      <Accordion.Control>
        <Group wrap='nowrap' justify='space-between' gap={0}>
          <Text c='gray.5' fw={700} fz='md'>
            Level {level}
          </Text>
          <Badge mr='sm' variant='outline' color='gray.5' size='xs'>
            <Text fz='sm' c='gray.5' span>
              {feats[level].filter((feat) => isAbilityBlockVisible('CHARACTER', feat)).length}
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
            .filter((feat) => isAbilityBlockVisible('CHARACTER', feat))
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
      <ClassInitialOverview class_={data.class_} mode='READ' />
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
                      {classFeatures[`${level}`]
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .flatMap((feature, index) =>
                          index < classFeatures[`${level}`].length - 1
                            ? [
                                <Anchor
                                  fz='sm'
                                  onClick={() => {
                                    props.onMetadataChange?.();
                                    openDrawer({
                                      type: 'class-feature',
                                      data: { id: feature.id },
                                      extra: { addToHistory: true },
                                    });
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
                                    props.onMetadataChange?.();
                                    openDrawer({
                                      type: 'class-feature',
                                      data: { id: feature.id },
                                      extra: { addToHistory: true },
                                    });
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
        <ShowOperationsButton name={data.class_.name} operations={data.class_.operations} />
      )}
    </Stack>
  );
}

export function ClassInitialOverview(props: {
  class_: Class;
  mode: 'READ' | 'READ/WRITE';
  operationResults?: OperationResult[];
  isClass2?: boolean;
}) {
  const theme = useMantineTheme();
  const [descHidden, setDescHidden] = useState(true);
  const charState = useRecoilState(characterState);

  // Reading thru operations to get display UI
  const MODE = props.mode;
  const display = convertClassOperationsIntoUI(
    props.class_,
    props.mode,
    props.operationResults ?? [],
    charState,
    props.isClass2
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
          {props.class_.artwork_url && (
            <Image
              style={{
                float: 'right',
                maxWidth: 150,
                height: 'auto',
              }}
              ml='sm'
              radius='md'
              fit='contain'
              src={props.class_.artwork_url}
            />
          )}
          <RichText ta='justify'>{props.class_.description}</RichText>
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
              <Text fz='xs'>At 1st level, your class gives you an attribute boost in the key attribute.</Text>
            </HoverCard.Dropdown>
          </HoverCard>
          <Text c='gray.5' ta='center'>
            Key Attribute
          </Text>
          <Text c='gray.4' fw={700} ta='center' style={{ display: 'flex', justifyContent: 'center' }}>
            {display.keyAttribute.ui ?? 'Varies'}
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
                You increase your maximum number of HP by this number at 1st level and every level thereafter.
              </Text>
            </HoverCard.Dropdown>
          </HoverCard>
          <Text c='gray.5' ta='center'>
            Hit Points
          </Text>
          <Text c='gray.4' fw={700} ta='center'>
            {display.classHp.ui ?? 'Varies'}
          </Text>
        </Paper>
      </Group>
      <Box>
        <Divider
          px='xs'
          label={
            <Text fz='xs' c='gray.6'>
              <Group gap={5}>
                <IconEyeFilled size='0.8rem' />
                <Box>Perception</Box>
              </Group>
            </Text>
          }
          labelPosition='left'
        />
        <IndentedText disabled={MODE !== 'READ'} px='xs' c='gray.5' fz='sm'>
          {display.perception.ui}
        </IndentedText>
      </Box>
      <Box>
        <Divider
          px='xs'
          label={
            <Text fz='xs' c='gray.6'>
              <Group gap={5}>
                <IconBadgesFilled size='0.8rem' />
                <Box>Skills</Box>
              </Group>
            </Text>
          }
          labelPosition='left'
        />
        {display.skills.map((skill, index) => (
          <IndentedText key={index} disabled={MODE !== 'READ'} px='xs' c='gray.5' fz='sm'>
            {skill.ui}
          </IndentedText>
        ))}
        {display.additionalSkillTrainings.map((record, index) => (
          <IndentedText key={index} disabled={MODE !== 'READ'} px='xs' c='gray.5' fz='sm'>
            {record.ui}
          </IndentedText>
        ))}
      </Box>
      <Box>
        <Divider
          px='xs'
          label={
            <Text fz='xs' c='gray.6'>
              <Group gap={5}>
                <IconHeartHandshake size='0.8rem' />
                <Box>Saving Throws</Box>
              </Group>
            </Text>
          }
          labelPosition='left'
        />
        {display.saves.map((save, index) => (
          <IndentedText key={index} disabled={MODE !== 'READ'} px='xs' c='gray.5' fz='sm'>
            {save.ui}
          </IndentedText>
        ))}
      </Box>
      <Box>
        <Divider
          px='xs'
          label={
            <Text fz='xs' c='gray.6'>
              <Group gap={5}>
                <IconSword size='0.8rem' />
                <Box>Attacks</Box>
              </Group>
            </Text>
          }
          labelPosition='left'
        />
        <IndentedText disabled={MODE !== 'READ'} px='xs' c='gray.5' fz='sm'>
          {display.simpleWeapons.ui}
        </IndentedText>
        <IndentedText disabled={MODE !== 'READ'} px='xs' c='gray.5' fz='sm'>
          {display.martialWeapons.ui}
        </IndentedText>
        <IndentedText disabled={MODE !== 'READ'} px='xs' c='gray.5' fz='sm'>
          {display.advancedWeapons.ui}
        </IndentedText>
        <IndentedText disabled={MODE !== 'READ'} px='xs' c='gray.5' fz='sm'>
          {display.unarmedAttacks.ui}
        </IndentedText>
      </Box>
      <Box>
        <Divider
          px='xs'
          label={
            <Text fz='xs' c='gray.6'>
              <Group gap={5}>
                <IconShieldCheckeredFilled size='0.8rem' />
                <Box>Defenses</Box>
              </Group>
            </Text>
          }
          labelPosition='left'
        />
        <IndentedText disabled={MODE !== 'READ'} px='xs' c='gray.5' fz='sm'>
          {display.lightArmor.ui}
        </IndentedText>
        <IndentedText disabled={MODE !== 'READ'} px='xs' c='gray.5' fz='sm'>
          {display.mediumArmor.ui}
        </IndentedText>
        <IndentedText disabled={MODE !== 'READ'} px='xs' c='gray.5' fz='sm'>
          {display.heavyArmor.ui}
        </IndentedText>
        <IndentedText disabled={MODE !== 'READ'} px='xs' c='gray.5' fz='sm'>
          {display.unarmoredDefense.ui}
        </IndentedText>
      </Box>
      {(display.spellAttack.ui || display.spellDC.ui) && (
        <Box>
          <Divider
            px='xs'
            label={
              <Text fz='xs' c='gray.6'>
                <Group gap={5}>
                  <IconFlare size='0.8rem' />
                  <Box>Spells</Box>
                </Group>
              </Text>
            }
            labelPosition='left'
          />
          <IndentedText disabled={MODE !== 'READ'} px='xs' c='gray.5' fz='sm'>
            {display.spellAttack.ui}
          </IndentedText>
          <IndentedText disabled={MODE !== 'READ'} px='xs' c='gray.5' fz='sm'>
            {display.spellDC.ui}
          </IndentedText>
        </Box>
      )}
      <Box>
        <Divider
          px='xs'
          label={
            <Text fz='xs' c='gray.6'>
              <Group gap={5}>
                <IconVocabulary size='0.8rem' />
                <Box>Class DC</Box>
              </Group>
            </Text>
          }
          labelPosition='left'
        />
        <IndentedText disabled={MODE !== 'READ'} px='xs' c='gray.5' fz='sm'>
          {display.classDC.ui}
        </IndentedText>
      </Box>
    </>
  );
}

export function convertClassOperationsIntoUI(
  class_: Class,
  mode: 'READ' | 'READ/WRITE',
  operationResults: OperationResult[],
  charState: [Character | null, SetterOrUpdater<Character | null>],
  isClass2?: boolean
) {
  const classOperations = class_.operations ?? [];
  const MODE = mode;
  const writeDetails =
    MODE === 'READ/WRITE'
      ? {
          operationResults: operationResults,
          characterState: charState,
          primarySource: isClass2 ? 'class-2' : 'class',
        }
      : undefined;

  const attributes = getStatBlockDisplay(
    'CHARACTER',
    getAllAttributeVariables('CHARACTER').map((v) => v.name),
    classOperations,
    MODE,
    writeDetails,
    { fullNames: true }
  );
  const keyAttribute =
    attributes.length > 0
      ? attributes[0]
      : {
          ui: null,
          operation: null,
        };

  const classHp = getStatDisplay('CHARACTER', 'MAX_HEALTH_CLASS_PER_LEVEL', classOperations, MODE, writeDetails);

  const perception = getStatDisplay('CHARACTER', 'PERCEPTION', classOperations, MODE, writeDetails);
  const skills = getStatBlockDisplay(
    'CHARACTER',
    getAllSkillVariables('CHARACTER').map((v) => v.name),
    classOperations,
    MODE,
    writeDetails
  );

  let additionalSkillTrainings: { ui: React.ReactNode; operation: OperationSelect | null }[] = [];
  if (!isClass2) {
    if (MODE === 'READ') {
      additionalSkillTrainings = [
        {
          ui: (
            <>
              Trained in a number of additional skills equal to {class_.skill_training_base} plus your Intelligence
              modifier
            </>
          ),
          operation: null,
        },
      ];
    } else if (MODE === 'READ/WRITE') {
      const skillTrainingOps = addedClassSkillTrainings('CHARACTER', class_.skill_training_base);
      for (const op of skillTrainingOps) {
        const result = getDisplay('CHARACTER', { value: 'T', increases: 0 }, op, undefined, 'READ/WRITE', writeDetails);
        additionalSkillTrainings.push({
          ui: result,
          operation: op,
        });
      }
    }
  }

  const saves = getStatBlockDisplay(
    'CHARACTER',
    getAllSaveVariables('CHARACTER').map((v) => v.name),
    classOperations,
    MODE,
    writeDetails
  );
  const simpleWeapons = getStatDisplay('CHARACTER', 'SIMPLE_WEAPONS', classOperations, MODE, writeDetails);
  const martialWeapons = getStatDisplay('CHARACTER', 'MARTIAL_WEAPONS', classOperations, MODE, writeDetails);
  const advancedWeapons = getStatDisplay('CHARACTER', 'ADVANCED_WEAPONS', classOperations, MODE, writeDetails);
  const unarmedAttacks = getStatDisplay('CHARACTER', 'UNARMED_ATTACKS', classOperations, MODE, writeDetails);
  const lightArmor = getStatDisplay('CHARACTER', 'LIGHT_ARMOR', classOperations, MODE, writeDetails);
  const mediumArmor = getStatDisplay('CHARACTER', 'MEDIUM_ARMOR', classOperations, MODE, writeDetails);
  const heavyArmor = getStatDisplay('CHARACTER', 'HEAVY_ARMOR', classOperations, MODE, writeDetails);
  const unarmoredDefense = getStatDisplay('CHARACTER', 'UNARMORED_DEFENSE', classOperations, MODE, writeDetails);
  const classDC = getStatDisplay('CHARACTER', 'CLASS_DC', classOperations, 'READ', writeDetails);
  const spellAttack = getStatDisplay('CHARACTER', 'SPELL_ATTACK', classOperations, 'READ', writeDetails);
  const spellDC = getStatDisplay('CHARACTER', 'SPELL_DC', classOperations, 'READ', writeDetails);

  return {
    keyAttribute,
    classHp,
    perception,
    skills,
    additionalSkillTrainings,
    saves,
    simpleWeapons,
    martialWeapons,
    advancedWeapons,
    unarmedAttacks,
    lightArmor,
    mediumArmor,
    heavyArmor,
    unarmoredDefense,
    classDC,
    spellAttack,
    spellDC,
  };
}
