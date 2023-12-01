import { CharacterInfo } from '@common/CharacterInfo';
import {
  Accordion,
  Badge,
  Box,
  Button,
  Divider,
  Group,
  Indicator,
  ScrollArea,
  SegmentedControl,
  Stack,
  Text,
  UnstyledButton,
  useMantineTheme,
} from '@mantine/core';
import {
  Ancestry,
  Background,
  Character,
  Class,
  ContentPackage,
  ContentSource,
} from '@typing/content';
import classes from '@css/FaqSimple.module.css';
import { useElementSize, useHover, useInterval, useMergedRef, useTimeout } from '@mantine/hooks';
import { useEffect, useRef, useState } from 'react';
import { SelectContentButton, selectContent } from '@common/select/SelectContent';
import { characterState } from '@atoms/characterAtoms';
import { useRecoilState, useRecoilValue } from 'recoil';
import { useQuery } from '@tanstack/react-query';
import D20Loader from '@assets/images/D20Loader';
import { getIconFromContentType } from '@content/content-utils';
import { executeCharacterOperations } from '@operations/operation-controller';
import ResultWrapper from '@common/operations/results/ResultWrapper';
import { IconPuzzle } from '@tabler/icons-react';
import { OperationResult } from '@operations/operation-runner';
import { ClassInitialOverview, convertClassOperationsIntoUI } from '@drawers/types/ClassDrawer';
import { fetchContentPackage } from '@content/content-store';
import { ObjectWithUUID } from '@operations/operation-utils';
import { OperationSelect } from '@typing/operations';
import { getChoiceCounts } from '@operations/choice-count-tracker';
import useRefresh from '@utils/use-refresh';
import { set } from 'lodash';
import _ from 'lodash';
import { AncestryInitialOverview, convertAncestryOperationsIntoUI } from '@drawers/types/AncestryDrawer';
import { drawerState } from '@atoms/navAtoms';

export default function CharBuilderCreation(props: { pageHeight: number }) {
  const theme = useMantineTheme();
  const character = useRecoilValue(characterState);

  const { data: content, isFetching } = useQuery({
    queryKey: [`find-content-${character?.id}`],
    queryFn: async () => {
      const content = await fetchContentPackage(undefined, true);
      interval.stop();
      return content;
    },
    refetchOnWindowFocus: false,
  });

  // Just load progress manually
  const [percentage, setPercentage] = useState(0);
  const interval = useInterval(() => setPercentage((p) => p + 2), 20);
  useEffect(() => {
    interval.start();
    return interval.stop;
  }, []);

  if (isFetching || !content) {
    return (
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
  } else {
    return <CharBuilderCreationInner content={content} pageHeight={props.pageHeight} />;
  }
}

export function CharBuilderCreationInner(props: { content: ContentPackage; pageHeight: number }) {
  const { ref, height } = useElementSize();

  const [character, setCharacter] = useRecoilState(characterState);

  const [levelItemValue, setLevelItemValue] = useState<string | null>(null);

  const [operationResults, setOperationResults] = useState<any>();

  const executingOperations = useRef(false);
  useEffect(() => {
    if (!character || executingOperations.current) return;
    executingOperations.current = true;
    executeCharacterOperations(character, props.content).then((results) => {
      setOperationResults(results);
      executingOperations.current = false;
    });
  }, [character]);

  const levelItems = Array.from({ length: (character?.level ?? 0) + 1 }, (_, i) => i).map(
    (level) => {
      return (
        <LevelSection
          key={level}
          level={level}
          opened={levelItemValue === `${level}`}
          content={props.content}
          operationResults={operationResults}
        />
      );
    }
  );

  return (
    <Group gap={0}>
      <Box style={{ flexBasis: '35%' }}>
        <Stack gap={5}>
          <Box pb={5}>
            <CharacterInfo
              ref={ref}
              character={character}
              onClickAncestry={() => {
                selectContent<Ancestry>(
                  'ancestry',
                  (option) => {
                    setCharacter((prev) => {
                      if (!prev) return prev;
                      return {
                        ...prev,
                        details: {
                          ...prev.details,
                          ancestry: option,
                        },
                      };
                    });
                  },
                  {
                    groupBySource: true,
                    selectedId: character?.details?.ancestry?.id,
                  }
                );
              }}
              onClickBackground={() => {
                selectContent<Background>(
                  'background',
                  (option) => {
                    setCharacter((prev) => {
                      if (!prev) return prev;
                      return {
                        ...prev,
                        details: {
                          ...prev.details,
                          background: option,
                        },
                      };
                    });
                  },
                  {
                    groupBySource: true,
                    selectedId: character?.details?.background?.id,
                  }
                );
              }}
              onClickClass={() => {
                selectContent<Class>(
                  'class',
                  (option) => {
                    setCharacter((prev) => {
                      if (!prev) return prev;
                      return {
                        ...prev,
                        details: {
                          ...prev.details,
                          class: option,
                        },
                      };
                    });
                  },
                  {
                    groupBySource: true,
                    selectedId: character?.details?.class?.id,
                  }
                );
              }}
            />
          </Box>
          <ScrollArea h={props.pageHeight - height - 20} pr={12}>
            <Stack gap={5}>
              <Box>
                <Button variant='default' size='lg' fullWidth>
                  <Group>
                    <AttributeModPart attribute='Str' value={-1} marked={false} />
                    <AttributeModPart attribute='Dex' value={0} marked={false} />
                    <AttributeModPart attribute='Con' value={3} marked={false} />
                    <AttributeModPart attribute='Int' value={4} marked={true} />
                    <AttributeModPart attribute='Wis' value={3} marked={false} />
                    <AttributeModPart attribute='Cha' value={3} marked={false} />
                  </Group>
                </Button>
              </Box>
              <StatButton>
                <Box>
                  <Text c='gray.0' fz='sm'>
                    Hit Points
                  </Text>
                </Box>
                <Box>
                  <Text c='gray.0'>67</Text>
                </Box>
              </StatButton>
              <StatButton>
                <Box>
                  <Text c='gray.0' fz='sm'>
                    Class DC
                  </Text>
                </Box>
                <Group>
                  <Text c='gray.0'>14</Text>
                  <Badge variant='default'>U</Badge>
                </Group>
              </StatButton>
              <StatButton>
                <Box>
                  <Text c='gray.0' fz='sm'>
                    Perception
                  </Text>
                </Box>
                <Group>
                  <Text c='gray.0'>+4</Text>
                  <Badge variant='default'>E</Badge>
                </Group>
              </StatButton>
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
                <Accordion.Item className={classes.item} value={'skills'}>
                  <Accordion.Control>
                    <Text c='white' fz='sm'>
                      Skills
                    </Text>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <Stack gap={5}>
                      <StatButton>
                        <Box>
                          <Text fz='sm'>Acrobatics</Text>
                        </Box>
                        <Group>
                          <Text>+4</Text>
                          <Badge variant='default'>E</Badge>
                        </Group>
                      </StatButton>
                      <StatButton>
                        <Box>
                          <Text fz='sm'>Arcana</Text>
                        </Box>
                        <Group>
                          <Text>+4</Text>
                          <Badge variant='default'>E</Badge>
                        </Group>
                      </StatButton>
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>
                <Accordion.Item className={classes.item} value={'saves'}>
                  <Accordion.Control>
                    <Text c='white' fz='sm'>
                      Saves
                    </Text>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <Stack gap={5}>
                      <StatButton>
                        <Box>
                          <Text fz='sm'>Fortitude</Text>
                        </Box>
                        <Group>
                          <Text>+4</Text>
                          <Badge variant='default'>E</Badge>
                        </Group>
                      </StatButton>
                      <StatButton>
                        <Box>
                          <Text fz='sm'>Reflex</Text>
                        </Box>
                        <Group>
                          <Text>+4</Text>
                          <Badge variant='default'>E</Badge>
                        </Group>
                      </StatButton>
                      <StatButton>
                        <Box>
                          <Text fz='sm'>Will</Text>
                        </Box>
                        <Group>
                          <Text>+4</Text>
                          <Badge variant='default'>E</Badge>
                        </Group>
                      </StatButton>
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>
                <Accordion.Item className={classes.item} value={'attacks'}>
                  <Accordion.Control>
                    <Text c='white' fz='sm'>
                      Attacks
                    </Text>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <Stack gap={5}>
                      <StatButton>
                        <Box>
                          <Text fz='sm'>Fortitude</Text>
                        </Box>
                        <Group>
                          <Text>+4</Text>
                          <Badge variant='default'>E</Badge>
                        </Group>
                      </StatButton>
                      <StatButton>
                        <Box>
                          <Text fz='sm'>Reflex</Text>
                        </Box>
                        <Group>
                          <Text>+4</Text>
                          <Badge variant='default'>E</Badge>
                        </Group>
                      </StatButton>
                      <StatButton>
                        <Box>
                          <Text fz='sm'>Will</Text>
                        </Box>
                        <Group>
                          <Text>+4</Text>
                          <Badge variant='default'>E</Badge>
                        </Group>
                      </StatButton>
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>
                <Accordion.Item className={classes.item} value={'saving-throws'}>
                  <Accordion.Control>
                    <Text c='white' fz='sm'>
                      Saving Throws
                    </Text>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <Stack gap={5}>
                      <StatButton>
                        <Box>
                          <Text fz='sm'>Fortitude</Text>
                        </Box>
                        <Group>
                          <Text>+4</Text>
                          <Badge variant='default'>E</Badge>
                        </Group>
                      </StatButton>
                      <StatButton>
                        <Box>
                          <Text fz='sm'>Reflex</Text>
                        </Box>
                        <Group>
                          <Text>+4</Text>
                          <Badge variant='default'>E</Badge>
                        </Group>
                      </StatButton>
                      <StatButton>
                        <Box>
                          <Text fz='sm'>Will</Text>
                        </Box>
                        <Group>
                          <Text>+4</Text>
                          <Badge variant='default'>E</Badge>
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
                      <StatButton>
                        <Box>
                          <Text fz='sm'>Fortitude</Text>
                        </Box>
                        <Group>
                          <Text>+4</Text>
                          <Badge variant='default'>E</Badge>
                        </Group>
                      </StatButton>
                      <StatButton>
                        <Box>
                          <Text fz='sm'>Reflex</Text>
                        </Box>
                        <Group>
                          <Text>+4</Text>
                          <Badge variant='default'>E</Badge>
                        </Group>
                      </StatButton>
                      <StatButton>
                        <Box>
                          <Text fz='sm'>Will</Text>
                        </Box>
                        <Group>
                          <Text>+4</Text>
                          <Badge variant='default'>E</Badge>
                        </Group>
                      </StatButton>
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>
                <Accordion.Item className={classes.item} value={'languages'}>
                  <Accordion.Control>
                    <Text c='white' fz='sm'>
                      Languages
                    </Text>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <Stack gap={5}>
                      <StatButton>
                        <Box>
                          <Text fz='sm'>Fortitude</Text>
                        </Box>
                        <Group>
                          <Text>+4</Text>
                          <Badge variant='default'>E</Badge>
                        </Group>
                      </StatButton>
                      <StatButton>
                        <Box>
                          <Text fz='sm'>Reflex</Text>
                        </Box>
                        <Group>
                          <Text>+4</Text>
                          <Badge variant='default'>E</Badge>
                        </Group>
                      </StatButton>
                      <StatButton>
                        <Box>
                          <Text fz='sm'>Will</Text>
                        </Box>
                        <Group>
                          <Text>+4</Text>
                          <Badge variant='default'>E</Badge>
                        </Group>
                      </StatButton>
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>
                <Accordion.Item className={classes.item} value={'resist-weaks'}>
                  <Accordion.Control>
                    <Text c='white' fz='sm'>
                      Resist & Weaks
                    </Text>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <Stack gap={5}>
                      <StatButton>
                        <Box>
                          <Text fz='sm'>Fortitude</Text>
                        </Box>
                        <Group>
                          <Text>+4</Text>
                          <Badge variant='default'>E</Badge>
                        </Group>
                      </StatButton>
                      <StatButton>
                        <Box>
                          <Text fz='sm'>Reflex</Text>
                        </Box>
                        <Group>
                          <Text>+4</Text>
                          <Badge variant='default'>E</Badge>
                        </Group>
                      </StatButton>
                      <StatButton>
                        <Box>
                          <Text fz='sm'>Will</Text>
                        </Box>
                        <Group>
                          <Text>+4</Text>
                          <Badge variant='default'>E</Badge>
                        </Group>
                      </StatButton>
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>
              </Accordion>
            </Stack>
          </ScrollArea>
        </Stack>
      </Box>
      <Box style={{ flexBasis: '65%' }}>
        <ScrollArea h={props.pageHeight} pr={12}>
          <Accordion
            value={levelItemValue}
            onChange={setLevelItemValue}
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
            {levelItems}
          </Accordion>
        </ScrollArea>
      </Box>
    </Group>
  );
}

function AttributeModPart(props: { attribute: string; value: number; marked: boolean }) {
  return (
    <Box>
      <Text c='gray.0' ta='center' fz={11}>
        {props.attribute}
      </Text>
      <Text c='gray.0' ta='center'>
        <Text c='gray.0' span>
          {props.value < 0 ? '-' : '+'}
        </Text>

        <Text c='gray.0' td={props.marked ? 'underline' : undefined} span>
          {Math.abs(props.value)}
        </Text>
      </Text>
    </Box>
  );
}

function StatButton(props: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <Box>
      <Button
        variant='default'
        size='compact-lg'
        styles={{
          inner: {
            width: '100%',
          },
          label: {
            width: '100%',
          },
        }}
        fullWidth
        onClick={props.onClick}
      >
        <Group w='100%' justify='space-between'>
          {props.children}
        </Group>
      </Button>
    </Box>
  );
}

function LevelSection(props: {
  level: number;
  opened: boolean;
  content: ContentPackage;
  operationResults: any;
}) {
  const theme = useMantineTheme();
  const { hovered, ref } = useHover();
  const choiceCountRef = useRef<HTMLDivElement>(null);
  const mergedRef = useMergedRef(ref, choiceCountRef);

  const [choiceCounts, setChoiceCounts] = useState<{ current: number; max: number }>({
    current: 0,
    max: 0,
  });

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (choiceCountRef.current) {
        const newChoiceCounts = getChoiceCounts(choiceCountRef.current);
        if (
          newChoiceCounts.current !== choiceCounts.current ||
          newChoiceCounts.max !== choiceCounts.max
        )
          setChoiceCounts(newChoiceCounts);
      }
    }, 2500);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <Accordion.Item
      ref={mergedRef}
      value={`${props.level}`}
      style={{
        backgroundColor: hovered && !props.opened ? 'rgba(0, 0, 0, 0.1)' : undefined,
      }}
    >
      <Accordion.Control>
        <Group wrap='nowrap' justify='space-between' gap={0}>
          <Text c='gray.5' fw={700} fz='sm'>
            {props.level === 0 ? (
              <>
                Initial Stats{' '}
                <Text fs='italic' c='dimmed' fz='sm' span>
                  (Level 1)
                </Text>
              </>
            ) : (
              `Level ${props.level}`
            )}
          </Text>
          {choiceCounts.max > 0 && (
            <Badge mr='sm' variant='outline' color='gray.5' size='xs'>
              <Text
                fz='sm'
                c={
                  choiceCounts.current === choiceCounts.max
                    ? 'gray.5'
                    : theme.colors[theme.primaryColor][5]
                }
                span
              >
                {choiceCounts.current}
              </Text>
              <Text fz='sm' c='gray.5' span>
                /{choiceCounts.max}
              </Text>
            </Badge>
          )}
        </Group>
      </Accordion.Control>
      <Accordion.Panel>
        {props.level === 0 ? (
          <InitialStatsLevelSection
            content={props.content}
            operationResults={props.operationResults}
          />
        ) : (
          <></>
        )}
      </Accordion.Panel>
    </Accordion.Item>
  );
}

function InitialStatsLevelSection(props: { content: ContentPackage; operationResults: any }) {
  const [character, setCharacter] = useRecoilState(characterState);
  const [_drawer, openDrawer] = useRecoilState(drawerState);

  const class_ = props.content.classes.find(
    (class_) => class_.id === character?.details?.class?.id
  );
  const ancestry = props.content.ancestries.find(
    (ancestry) => ancestry.id === character?.details?.ancestry?.id
  );
  const background = props.content.backgrounds.find(
    (background) => background.id === character?.details?.background?.id
  );
  const heritage = props.content.abilityBlocks.find(
    (ab) => ab.id === character?.details?.heritage?.id && ab.type === 'heritage'
  );

  // Choice count tracking
  const classChoiceCountRef = useRef<HTMLDivElement>(null);
  const [classChoiceCounts, setClassChoiceCounts] = useState<{ current: number; max: number }>({
    current: 0,
    max: 0,
  });

  const backgroundChoiceCountRef = useRef<HTMLDivElement>(null);
  const [backgroundChoiceCounts, setBackgroundChoiceCounts] = useState<{
    current: number;
    max: number;
  }>({
    current: 0,
    max: 0,
  });

  const ancestryChoiceCountRef = useRef<HTMLDivElement>(null);
  const [ancestryChoiceCounts, setAncestryChoiceCounts] = useState<{
    current: number;
    max: number;
  }>({
    current: 0,
    max: 0,
  });

  const itemsChoiceCountRef = useRef<HTMLDivElement>(null);
  const [itemsChoiceCounts, setItemsChoiceCounts] = useState<{
    current: number;
    max: number;
  }>({
    current: 0,
    max: 0,
  });

  const booksChoiceCountRef = useRef<HTMLDivElement>(null);
  const [booksChoiceCounts, setBooksChoiceCounts] = useState<{
    current: number;
    max: number;
  }>({
    current: 0,
    max: 0,
  });

  const customChoiceCountRef = useRef<HTMLDivElement>(null);
  const [customChoiceCounts, setCustomChoiceCounts] = useState<{
    current: number;
    max: number;
  }>({
    current: 0,
    max: 0,
  });

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (classChoiceCountRef.current) {
        const choiceCounts = getChoiceCounts(classChoiceCountRef.current);
        if (!_.isEqual(choiceCounts, classChoiceCounts)) setClassChoiceCounts(choiceCounts);
      }
      if (backgroundChoiceCountRef.current) {
        const choiceCounts = getChoiceCounts(backgroundChoiceCountRef.current);
        if (
          choiceCounts.current !== backgroundChoiceCounts.current ||
          choiceCounts.max !== backgroundChoiceCounts.max
        )
          setBackgroundChoiceCounts(choiceCounts);
      }
      if (ancestryChoiceCountRef.current) {
        const choiceCounts = getChoiceCounts(ancestryChoiceCountRef.current);
        if (
          choiceCounts.current !== ancestryChoiceCounts.current ||
          choiceCounts.max !== ancestryChoiceCounts.max
        )
          setAncestryChoiceCounts(choiceCounts);
      }
      if (itemsChoiceCountRef.current) {
        const choiceCounts = getChoiceCounts(itemsChoiceCountRef.current);
        if (
          choiceCounts.current !== itemsChoiceCounts.current ||
          choiceCounts.max !== itemsChoiceCounts.max
        )
          setItemsChoiceCounts(choiceCounts);
      }
      if (booksChoiceCountRef.current) {
        const choiceCounts = getChoiceCounts(booksChoiceCountRef.current);
        if (
          choiceCounts.current !== booksChoiceCounts.current ||
          choiceCounts.max !== booksChoiceCounts.max
        )
          setBooksChoiceCounts(choiceCounts);
      }
      if (customChoiceCountRef.current) {
        const choiceCounts = getChoiceCounts(customChoiceCountRef.current);
        if (
          choiceCounts.current !== customChoiceCounts.current ||
          choiceCounts.max !== customChoiceCounts.max
        )
          setCustomChoiceCounts(choiceCounts);
      }
    }, 2500);
    return () => clearInterval(intervalId);
  }, []);

  //

  const saveSelectionChange = (path: string, value: string) => {
    setCharacter((prev) => {
      if (!prev) return prev;
      const newSelections = { ...prev.operation_data?.selections };
      if (!value) {
        delete newSelections[path];
      } else {
        newSelections[path] = value;
      }
      return {
        ...prev,
        operation_data: {
          ...prev.operation_data,
          selections: newSelections,
        },
      };
    });
  };

  if (!props.operationResults) return null;

  // Only display the operation results that aren't already displayed in the class overview
  let classOperationResults = props.operationResults?.classResults ?? [];
  const classInitialOverviewDisplay = class_
    ? convertClassOperationsIntoUI(
        class_,
        'READ/WRITE',
        props.operationResults?.classResults ?? [],
        [character, setCharacter]
      )
    : null;
  if (classInitialOverviewDisplay) {
    // Filter out operation results that are already displayed in the class overview
    let displayRecords: {
      ui: React.ReactNode;
      operation: OperationSelect | null;
    }[] = [];
    for (const value of Object.values(classInitialOverviewDisplay)) {
      if (Array.isArray(value)) {
        displayRecords = [...displayRecords, ...value];
      } else {
        displayRecords.push(value);
      }
    }

    console.log(classOperationResults, displayRecords);

    // Filter operation results
    classOperationResults = classOperationResults.filter((result: OperationResult) => {
      return !displayRecords.find(
        (record) =>
          result?.selection?.id !== undefined && record.operation?.id === result?.selection?.id
      );
    });
  }

  // Only display the operation results that aren't already displayed in the ancestry overview
  const physicalFeatures = (props.content.abilityBlocks ?? []).filter(
    (block) => block.type === 'physical-feature'
  );
  const senses = (props.content.abilityBlocks ?? []).filter((block) => block.type === 'sense');
  const languages = (props.content.languages ?? []).sort((a, b) => a.name.localeCompare(b.name));
  const heritages = (props.content.abilityBlocks ?? []).filter(
    (block) => block.type === 'heritage' && block.traits?.includes(ancestry?.trait_id ?? -1)
  );
  let ancestryOperationResults = props.operationResults?.ancestryResults ?? [];
  console.log(ancestryOperationResults);
  const ancestryInitialOverviewDisplay = ancestry
    ? convertAncestryOperationsIntoUI(
        ancestry,
        physicalFeatures,
        senses,
        languages,
        'READ/WRITE',
        props.operationResults?.ancestryResults ?? [],
        [character, setCharacter],
        openDrawer,
      )
    : null;
  if (ancestryInitialOverviewDisplay) {
    // Filter out operation results that are already displayed in the ancestry overview
    let displayRecords: {
      ui: React.ReactNode;
      operation: OperationSelect | null;
    }[] = [];
    for (const value of Object.values(ancestryInitialOverviewDisplay)) {
      if (Array.isArray(value)) {
        displayRecords = [...displayRecords, ...value];
      } else {
        displayRecords.push(value);
      }
    }

    // Filter operation results
    ancestryOperationResults = ancestryOperationResults.filter((result: OperationResult) => {
      return !displayRecords.find(
        (record) =>
          result?.selection?.id !== undefined && record.operation?.id === result?.selection?.id
      );
    });
  }

  return (
    <>
      <Divider />
      <Accordion
        variant='contained'
        defaultValue=''
        styles={{
          label: { paddingTop: 5, paddingBottom: 5 },
        }}
      >
        <Accordion.Item value='ancestry'>
          <Accordion.Control disabled={!ancestry} icon={getIconFromContentType('ancestry', '1rem')}>
            <Group gap={5}>
              <Box>Ancestry</Box>
              {ancestryChoiceCounts.max - ancestryChoiceCounts.current > 0 && (
                <Badge variant='light'>
                  {ancestryChoiceCounts.max - ancestryChoiceCounts.current}
                </Badge>
              )}
            </Group>
          </Accordion.Control>
          <Accordion.Panel ref={ancestryChoiceCountRef}>
            <Stack>
              <Box>
                {ancestry && (
                  <AncestryInitialOverview
                    ancestry={ancestry}
                    physicalFeatures={physicalFeatures}
                    senses={senses}
                    languages={languages}
                    heritages={heritages}
                    mode='READ/WRITE'
                    operationResults={props.operationResults.ancestryResults}
                  />
                )}
              </Box>

              <Box>
                <DisplayOperationResult
                  source={undefined}
                  results={ancestryOperationResults}
                  onChange={(path, value) => {
                    saveSelectionChange(`ancestry_${path}`, value);
                  }}
                />
              </Box>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
        <Accordion.Item value='background'>
          <Accordion.Control
            disabled={!background}
            icon={getIconFromContentType('background', '1rem')}
          >
            <Group gap={5}>
              <Box>Background</Box>
              {backgroundChoiceCounts.max - backgroundChoiceCounts.current > 0 && (
                <Badge variant='light'>
                  {backgroundChoiceCounts.max - backgroundChoiceCounts.current}
                </Badge>
              )}
            </Group>
          </Accordion.Control>
          <Accordion.Panel ref={backgroundChoiceCountRef}>
            <DisplayOperationResult
              source={undefined}
              results={props.operationResults.backgroundResults}
              onChange={(path, value) => {
                console.log(path, value);
              }}
            />
          </Accordion.Panel>
        </Accordion.Item>
        <Accordion.Item value='class'>
          <Accordion.Control disabled={!class_} icon={getIconFromContentType('class', '1rem')}>
            <Group gap={5}>
              <Box>Class</Box>
              {classChoiceCounts.max - classChoiceCounts.current > 0 && (
                <Badge variant='light'>{classChoiceCounts.max - classChoiceCounts.current}</Badge>
              )}
            </Group>
          </Accordion.Control>
          <Accordion.Panel ref={classChoiceCountRef}>
            <Stack>
              <Box>
                {class_ && (
                  <ClassInitialOverview
                    class_={class_}
                    mode='READ/WRITE'
                    operationResults={props.operationResults.classResults}
                  />
                )}
              </Box>

              <Box>
                <DisplayOperationResult
                  source={undefined}
                  results={classOperationResults}
                  onChange={(path, value) => {
                    saveSelectionChange(`class_${path}`, value);
                  }}
                />
              </Box>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
        {props.operationResults.contentSourceResults.length > 0 && (
          <Accordion.Item value='books'>
            <Accordion.Control icon={getIconFromContentType('content-source', '1rem')}>
              <Group gap={5}>
                <Box>Books</Box>
                {booksChoiceCounts.max - booksChoiceCounts.current > 0 && (
                  <Badge variant='light'>{booksChoiceCounts.max - booksChoiceCounts.current}</Badge>
                )}
              </Group>
            </Accordion.Control>
            <Accordion.Panel ref={booksChoiceCountRef}>
              {props.operationResults.contentSourceResults.map((s: any, index: number) => (
                <DisplayOperationResult
                  key={index}
                  source={s.baseSource}
                  results={s.baseResults}
                  onChange={(path, value) => {
                    console.log(path, value);
                  }}
                />
              ))}
            </Accordion.Panel>
          </Accordion.Item>
        )}
        {props.operationResults.itemResults.length > 0 && (
          <Accordion.Item value='items'>
            <Accordion.Control icon={getIconFromContentType('item', '1rem')}>
              <Group gap={5}>
                <Box>Items</Box>
                {itemsChoiceCounts.max - itemsChoiceCounts.current > 0 && (
                  <Badge variant='light'>{itemsChoiceCounts.max - itemsChoiceCounts.current}</Badge>
                )}
              </Group>
            </Accordion.Control>
            <Accordion.Panel ref={itemsChoiceCountRef}></Accordion.Panel>
          </Accordion.Item>
        )}
        {props.operationResults.characterResults.length > 0 && (
          <Accordion.Item value='custom'>
            <Accordion.Control icon={<IconPuzzle size='1rem' />}>
              <Group gap={5}>
                <Box>Custom</Box>
                {customChoiceCounts.max - customChoiceCounts.current > 0 && (
                  <Badge variant='light'>
                    {customChoiceCounts.max - customChoiceCounts.current}
                  </Badge>
                )}
              </Group>
            </Accordion.Control>
            <Accordion.Panel ref={customChoiceCountRef}>
              <DisplayOperationResult
                source={undefined}
                results={props.operationResults.characterResults}
                onChange={(path, value) => {
                  console.log(path, value);
                }}
              />
            </Accordion.Panel>
          </Accordion.Item>
        )}
      </Accordion>
    </>
  );
}

function DisplayOperationResult(props: {
  source?: ObjectWithUUID;
  results: OperationResult[];
  onChange: (path: string, value: string) => void;
}) {
  const hasSelection = (result: OperationResult) => {
    if (result?.selection) return true;
    for (const subResult of result?.result?.results ?? []) {
      if (hasSelection(subResult)) return true;
    }
    return false;
  };

  return (
    <ResultWrapper label={`From ${props.source?.name ?? 'Unknown'}`} disabled={!props.source}>
      <Stack gap={10}>
        {props.results
          .filter((result) => hasSelection(result))
          .map((result, i) => (
            <Stack key={i} gap={10}>
              {result?.selection && (
                <SelectContentButton
                  type={
                    (result?.selection?.options ?? []).length > 0
                      ? result?.selection?.options[0]._content_type
                      : 'ability-block'
                  }
                  onClick={(option) => {
                    props.onChange(result.selection?.id ?? '', option._select_uuid);
                  }}
                  onClear={() => {
                    props.onChange(result.selection?.id ?? '', '');
                  }}
                  selectedId={result.result?.source?.id}
                  options={{
                    overrideOptions: result?.selection?.options,
                    overrideLabel: result?.selection?.title || 'Select an Option',
                    abilityBlockType:
                      (result?.selection?.options ?? []).length > 0
                        ? result?.selection?.options[0].type
                        : undefined,
                    skillAdjustment: result?.selection?.skillAdjustment,
                  }}
                />
              )}
              {result?.result?.results && result.result.results.length > 0 && (
                <DisplayOperationResult
                  source={result.result.source}
                  results={result.result.results}
                  onChange={(path, value) => {
                    let selectionUUID = result.selection?.id ?? '';
                    let resultUUID = result.result?.source?._select_uuid ?? '';

                    let newPath = path;
                    if (resultUUID) newPath = `${resultUUID}_${newPath}`;
                    if (selectionUUID) newPath = `${selectionUUID}_${newPath}`;
                    props.onChange(newPath, value);
                  }}
                />
              )}
            </Stack>
          ))}
      </Stack>
    </ResultWrapper>
  );
}
