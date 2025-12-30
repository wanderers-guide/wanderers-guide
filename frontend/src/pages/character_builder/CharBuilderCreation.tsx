import D20Loader from '@assets/images/D20Loader';
import { characterState } from '@atoms/characterAtoms';
import { drawerState } from '@atoms/navAtoms';
import { CharacterInfo } from '@common/CharacterInfo';
import RichText from '@common/RichText';
import ResultWrapper from '@common/operations/results/ResultWrapper';
import { SelectContentButton, selectContent } from '@common/select/SelectContent';
import { ICON_BG_COLOR_HOVER } from '@constants/data';
import { fetchContent, fetchContentPackage, fetchContentSources, getDefaultSources } from '@content/content-store';
import { getIconFromContentType } from '@content/content-utils';
import classes from '@css/FaqSimple.module.css';
import { AncestryInitialOverview, convertAncestryOperationsIntoUI } from '@drawers/types/AncestryDrawer';
import { BackgroundInitialOverview, convertBackgroundOperationsIntoUI } from '@drawers/types/BackgroundDrawer';
import { ClassInitialOverview, convertClassOperationsIntoUI } from '@drawers/types/ClassDrawer';
import {
  Accordion,
  Badge,
  Box,
  Button,
  Divider,
  Drawer,
  Group,
  ScrollArea,
  Stack,
  Text,
  Title,
  useMantineTheme,
} from '@mantine/core';
import { useDebouncedValue, useDidUpdate, useElementSize, useHover, useInterval, useMergedRef } from '@mantine/hooks';
import { openContextModal } from '@mantine/modals';
import { getChoiceCounts } from '@operations/choice-count-tracker';
import { executeCharacterOperations } from '@operations/operation-controller';
import { OperationResult } from '@operations/operation-runner';
import { ObjectWithUUID, convertKeyToBasePrefix, hasOperationSelection } from '@operations/operation-utils';
import { removeParentSelections } from '@operations/selection-tree';
import { IconId, IconPuzzle } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { AbilityBlock, Ancestry, Background, Character, Class, ClassArchetype, ContentPackage } from '@typing/content';
import { ImageOption } from '@typing/index';
import { OperationCharacterResultPackage, OperationSelect } from '@typing/operations';
import { VariableListStr, VariableProf } from '@typing/variables';
import { getAllPortraitImages } from '@utils/portrait-images';
import { displayResistWeak } from '@utils/resist-weaks';
import { isCharacterBuilderMobile } from '@utils/screen-sizes';
import { displayAttributeValue, displayFinalHealthValue, displayFinalProfValue } from '@variables/variable-display';
import { getAllSkillVariables, getVariable } from '@variables/variable-manager';
import { compileProficiencyType, variableToLabel } from '@variables/variable-utils';
import { isEqual, truncate } from 'lodash-es';
import { useEffect, useRef, useState } from 'react';
import { SetterOrUpdater, useRecoilState, useRecoilValue } from 'recoil';

// Determines how often to check for choice counts
const CHOICE_COUNT_INTERVAL = 2500;

export default function CharBuilderCreation(props: { pageHeight: number }) {
  const theme = useMantineTheme();
  const character = useRecoilValue(characterState);
  const [doneLoading, setDoneLoading] = useState(false);

  const { data: content, isFetching } = useQuery({
    queryKey: [`find-content-${character?.id}`],
    queryFn: async () => {
      // Prefetch content sources (to avoid multiple requests)
      await fetchContentSources(getDefaultSources('PAGE'));

      const content = await fetchContentPackage(getDefaultSources('PAGE'), {
        fetchSources: true,
        fetchCreatures: false,
      });
      return content;
    },
    refetchOnWindowFocus: false,
  });

  // Just load progress manually
  const [_p, setPercentage] = useState(0);
  const percentage = content && !doneLoading ? Math.max(_p, 50) : _p;
  const interval = useInterval(() => setPercentage(percentage + 2), 50);
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
      <D20Loader size={100} color={theme.colors[theme.primaryColor][5]} percentage={percentage} status='Loading...' />
    </Box>
  );

  if (isFetching || !content) {
    return loader;
  } else {
    return (
      <>
        <div style={{ display: doneLoading ? 'none' : undefined }}>{loader}</div>
        <div style={{ display: doneLoading ? undefined : 'none' }}>
          <CharBuilderCreationInner
            content={content}
            pageHeight={props.pageHeight}
            onFinishLoading={() => {
              interval.stop();
              setDoneLoading(true);
            }}
          />
        </div>
      </>
    );
  }
}

export function CharBuilderCreationInner(props: {
  content: ContentPackage;
  pageHeight: number;
  onFinishLoading?: () => void;
}) {
  const isMobile = isCharacterBuilderMobile();
  const [statPanelOpened, setStatPanelOpened] = useState(false);

  const [character, setCharacter] = useRecoilState(characterState);
  const [levelItemValue, setLevelItemValue] = useState<string | null>(null);

  // Execute operations
  const [operationResults, setOperationResults] = useState<OperationCharacterResultPackage>();
  const executingOperations = useRef(false);
  const [sDebouncedCharacter] = useDebouncedValue(character, 200);
  useEffect(() => {
    if (!sDebouncedCharacter || executingOperations.current) return;
    setTimeout(() => {
      if (!sDebouncedCharacter || executingOperations.current) return;
      executingOperations.current = true;
      executeCharacterOperations(sDebouncedCharacter, props.content, 'CHARACTER-BUILDER').then((results) => {
        setOperationResults(results);
        executingOperations.current = false;
      });
    }, 1);
  }, [sDebouncedCharacter]);

  useEffect(() => {
    setTimeout(() => {
      props.onFinishLoading?.();
    }, CHOICE_COUNT_INTERVAL + 500);
  }, []);

  const levelItems = Array.from({ length: (character?.level ?? 0) + 1 }, (_, i) => i).map((level) => {
    return (
      <LevelSection
        key={level}
        level={level}
        opened={levelItemValue === `${level}`}
        content={props.content}
        operationResults={operationResults}
      />
    );
  });

  return (
    <Group gap={0}>
      {isMobile ? (
        <Drawer
          opened={statPanelOpened}
          onClose={() => {
            setStatPanelOpened(false);
          }}
          title={<Title order={3}>Character Stats</Title>}
          size='xs'
          transitionProps={{ duration: 200 }}
        >
          <CharacterStatSidebar content={props.content} pageHeight={window.innerHeight - 80} />
        </Drawer>
      ) : (
        <Box style={{ flexBasis: '35%' }}>
          <CharacterStatSidebar content={props.content} pageHeight={props.pageHeight} />
        </Box>
      )}
      <Box style={{ flexBasis: isMobile ? '100%' : '64%' }}>
        {isMobile && (
          <>
            <Group justify='space-between' align='flex-start' wrap='nowrap'>
              <CharacterInfo
                character={character}
                hideImage
                onClickAncestry={() => {
                  selectContent<Ancestry>(
                    'ancestry',
                    (option) => {
                      // Wipe old data
                      const selections = removeParentSelections('ancestry', character?.operation_data?.selections);
                      setCharacter((prev) => {
                        if (!prev) return prev;
                        return {
                          ...prev,
                          details: {
                            ...prev.details,
                            ancestry: option,
                          },
                          operation_data: {
                            ...prev.operation_data,
                            selections,
                          },
                        };
                      });
                    },
                    {
                      selectedId: character?.details?.ancestry?.id,
                    }
                  );
                }}
                onClickBackground={() => {
                  selectContent<Background>(
                    'background',
                    (option) => {
                      // Wipe old data
                      const selections = removeParentSelections('background', character?.operation_data?.selections);
                      setCharacter((prev) => {
                        if (!prev) return prev;
                        return {
                          ...prev,
                          details: {
                            ...prev.details,
                            background: option,
                          },
                          operation_data: {
                            ...prev.operation_data,
                            selections,
                          },
                        };
                      });
                    },
                    {
                      selectedId: character?.details?.background?.id,
                    }
                  );
                }}
                onClickClass={() => {
                  selectContent<Class>(
                    'class',
                    (option) => {
                      handleClassArchetypeSelection(character, setCharacter, option, '1');

                      // Wipe old data
                      let selections = removeParentSelections('class_', character?.operation_data?.selections);
                      if (!character?.variants?.dual_class) {
                        selections = removeParentSelections('class-feature', selections);
                      }
                      setCharacter((prev) => {
                        if (!prev) return prev;
                        return {
                          ...prev,
                          details: {
                            ...prev.details,
                            class: option,
                            class_archetype: undefined,
                          },
                          operation_data: {
                            ...prev.operation_data,
                            selections,
                          },
                        };
                      });
                    },
                    {
                      selectedId: character?.details?.class?.id,
                      filterFn: (option) => option.id !== character?.details?.class_2?.id,
                    }
                  );
                }}
                onClickClass2={() => {
                  selectContent<Class>(
                    'class',
                    (option) => {
                      handleClassArchetypeSelection(character, setCharacter, option, '2');

                      // Wipe old data
                      const selections = removeParentSelections('class-2_', character?.operation_data?.selections);
                      setCharacter((prev) => {
                        if (!prev) return prev;
                        return {
                          ...prev,
                          details: {
                            ...prev.details,
                            class_2: option,
                            class_archetype_2: undefined,
                          },
                          operation_data: {
                            ...prev.operation_data,
                            selections,
                          },
                        };
                      });
                    },
                    {
                      selectedId: character?.details?.class_2?.id,
                      filterFn: (option) => option.id !== character?.details?.class?.id,
                    }
                  );
                }}
              />
              <Button
                leftSection={<IconId size={14} />}
                variant='light'
                size='xs'
                onClick={() => {
                  setStatPanelOpened((prev) => !prev);
                }}
              >
                Stats
              </Button>
            </Group>
            <Divider pb={5} />
          </>
        )}
        <ScrollArea h={props.pageHeight} pr={14} scrollbars='y'>
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

function CharacterStatSidebar(props: { content: ContentPackage; pageHeight: number }) {
  const { ref, height } = useElementSize();
  const [_drawer, openDrawer] = useRecoilState(drawerState);
  const [character, setCharacter] = useRecoilState(characterState);

  return (
    <Stack gap={5}>
      <Box pb={5}>
        <CharacterInfo
          ref={ref}
          character={character}
          onClickAncestry={() => {
            selectContent<Ancestry>(
              'ancestry',
              (option) => {
                // Wipe old data
                const selections = removeParentSelections('ancestry', character?.operation_data?.selections);
                setCharacter((prev) => {
                  if (!prev) return prev;
                  return {
                    ...prev,
                    details: {
                      ...prev.details,
                      ancestry: option,
                    },
                    operation_data: {
                      ...prev.operation_data,
                      selections,
                    },
                  };
                });
              },
              {
                selectedId: character?.details?.ancestry?.id,
              }
            );
          }}
          onClickBackground={() => {
            selectContent<Background>(
              'background',
              (option) => {
                // Wipe old data
                const selections = removeParentSelections('background', character?.operation_data?.selections);
                setCharacter((prev) => {
                  if (!prev) return prev;
                  return {
                    ...prev,
                    details: {
                      ...prev.details,
                      background: option,
                    },
                    operation_data: {
                      ...prev.operation_data,
                      selections,
                    },
                  };
                });
              },
              {
                selectedId: character?.details?.background?.id,
              }
            );
          }}
          onClickClass={() => {
            selectContent<Class>(
              'class',
              (option) => {
                handleClassArchetypeSelection(character, setCharacter, option, '1');

                // Wipe old data
                let selections = removeParentSelections('class_', character?.operation_data?.selections);
                if (!character?.variants?.dual_class) {
                  selections = removeParentSelections('class-feature', selections);
                }
                setCharacter((prev) => {
                  if (!prev) return prev;
                  return {
                    ...prev,
                    details: {
                      ...prev.details,
                      class: option,
                      class_archetype: undefined,
                    },
                    operation_data: {
                      ...prev.operation_data,
                      selections,
                    },
                  };
                });
              },
              {
                selectedId: character?.details?.class?.id,
                filterFn: (option) => option.id !== character?.details?.class_2?.id,
              }
            );
          }}
          onClickClass2={() => {
            selectContent<Class>(
              'class',
              (option) => {
                handleClassArchetypeSelection(character, setCharacter, option, '2');

                // Wipe old data
                const selections = removeParentSelections('class-2_', character?.operation_data?.selections);
                setCharacter((prev) => {
                  if (!prev) return prev;
                  return {
                    ...prev,
                    details: {
                      ...prev.details,
                      class_2: option,
                      class_archetype_2: undefined,
                    },
                    operation_data: {
                      ...prev.operation_data,
                      selections,
                    },
                  };
                });
              },
              {
                selectedId: character?.details?.class_2?.id,
                filterFn: (option) => option.id !== character?.details?.class?.id,
              }
            );
          }}
          onClickImage={() => {
            openContextModal({
              modal: 'selectImage',
              title: <Title order={3}>Select Portrait</Title>,
              innerProps: {
                options: getAllPortraitImages(),
                onSelect: (option: ImageOption) => {
                  setCharacter((prev) => {
                    if (!prev) return prev;
                    return {
                      ...prev,
                      details: {
                        ...prev.details,
                        image_url: prev.details?.image_url === option.url ? undefined : option.url,
                      },
                    };
                  });
                },
                category: 'portraits',
              },
            });
          }}
        />
      </Box>
      <ScrollArea h={props.pageHeight - height - 20} pr={14} scrollbars='y'>
        <Stack gap={5}>
          <Box>
            <Button
              variant='default'
              size='lg'
              fullWidth
              onClick={() => {
                openDrawer({ type: 'stat-attr', data: { id: 'CHARACTER' } });
              }}
              maw={257} // Max width to prevent overflow
            >
              <Group wrap='nowrap'>
                <AttributeModPart attribute='Str' variableName='ATTRIBUTE_STR' />
                <AttributeModPart attribute='Dex' variableName='ATTRIBUTE_DEX' />
                <AttributeModPart attribute='Con' variableName='ATTRIBUTE_CON' />
                <AttributeModPart attribute='Int' variableName='ATTRIBUTE_INT' />
                <AttributeModPart attribute='Wis' variableName='ATTRIBUTE_WIS' />
                <AttributeModPart attribute='Cha' variableName='ATTRIBUTE_CHA' />
              </Group>
            </Button>
          </Box>
          <StatButton
            onClick={() => {
              openDrawer({ type: 'stat-hp', data: { id: 'CHARACTER' } });
            }}
          >
            <Box>
              <Text c='gray.0' fz='sm'>
                Hit Points
              </Text>
            </Box>
            <Box>
              <Text c='gray.0'>{displayFinalHealthValue('CHARACTER')}</Text>
            </Box>
          </StatButton>
          <StatButton
            onClick={() => {
              openDrawer({
                type: 'stat-prof',
                data: { id: 'CHARACTER', variableName: 'CLASS_DC', isDC: true },
              });
            }}
          >
            <Box>
              <Text c='gray.0' fz='sm'>
                Class DC
              </Text>
            </Box>
            <Group>
              <Text c='gray.0'>{displayFinalProfValue('CHARACTER', 'CLASS_DC', true)}</Text>
              <Badge variant='default'>
                {compileProficiencyType(getVariable<VariableProf>('CHARACTER', 'CLASS_DC')?.value)}
              </Badge>
            </Group>
          </StatButton>
          <StatButton
            onClick={() => {
              openDrawer({
                type: 'stat-perception',
                data: { id: 'CHARACTER' },
              });
            }}
          >
            <Box>
              <Text c='gray.0' fz='sm'>
                Perception
              </Text>
            </Box>
            <Group>
              <Text c='gray.0'>{displayFinalProfValue('CHARACTER', 'PERCEPTION')}</Text>
              <Badge variant='default'>
                {compileProficiencyType(getVariable<VariableProf>('CHARACTER', 'PERCEPTION')?.value)}
              </Badge>
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
                  {getAllSkillVariables('CHARACTER')
                    .filter((skill) => skill.name !== 'SKILL_LORE____')
                    .map((skill, index) => (
                      <StatButton
                        key={index}
                        onClick={() => {
                          openDrawer({
                            type: 'stat-prof',
                            data: { id: 'CHARACTER', variableName: skill.name },
                          });
                        }}
                      >
                        <Box>
                          <Text c='gray.0' fz='sm'>
                            {truncate(variableToLabel(skill), { length: 15 })}
                          </Text>
                        </Box>
                        <Group wrap='nowrap'>
                          <Text c='gray.0'>{displayFinalProfValue('CHARACTER', skill.name)}</Text>
                          <Badge variant='default'>{compileProficiencyType(skill?.value)}</Badge>
                        </Group>
                      </StatButton>
                    ))}
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
                  <StatButton
                    onClick={() => {
                      openDrawer({
                        type: 'stat-prof',
                        data: { id: 'CHARACTER', variableName: 'SAVE_FORT' },
                      });
                    }}
                  >
                    <Box>
                      <Text c='gray.0' fz='sm'>
                        Fortitude
                      </Text>
                    </Box>
                    <Group>
                      <Text c='gray.0'>{displayFinalProfValue('CHARACTER', 'SAVE_FORT')}</Text>
                      <Badge variant='default'>
                        {compileProficiencyType(getVariable<VariableProf>('CHARACTER', 'SAVE_FORT')?.value)}
                      </Badge>
                    </Group>
                  </StatButton>
                  <StatButton
                    onClick={() => {
                      openDrawer({
                        type: 'stat-prof',
                        data: { id: 'CHARACTER', variableName: 'SAVE_REFLEX' },
                      });
                    }}
                  >
                    <Box>
                      <Text c='gray.0' fz='sm'>
                        Reflex
                      </Text>
                    </Box>
                    <Group>
                      <Text c='gray.0'>{displayFinalProfValue('CHARACTER', 'SAVE_REFLEX')}</Text>
                      <Badge variant='default'>
                        {compileProficiencyType(getVariable<VariableProf>('CHARACTER', 'SAVE_REFLEX')?.value)}
                      </Badge>
                    </Group>
                  </StatButton>
                  <StatButton
                    onClick={() => {
                      openDrawer({
                        type: 'stat-prof',
                        data: { id: 'CHARACTER', variableName: 'SAVE_WILL' },
                      });
                    }}
                  >
                    <Box>
                      <Text c='gray.0' fz='sm'>
                        Will
                      </Text>
                    </Box>
                    <Group>
                      <Text c='gray.0'>{displayFinalProfValue('CHARACTER', 'SAVE_WILL')}</Text>
                      <Badge variant='default'>
                        {compileProficiencyType(getVariable<VariableProf>('CHARACTER', 'SAVE_WILL')?.value)}
                      </Badge>
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
                  <StatButton
                    onClick={() => {
                      openDrawer({
                        type: 'stat-prof',
                        data: { id: 'CHARACTER', variableName: 'SIMPLE_WEAPONS' },
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
                        {compileProficiencyType(getVariable<VariableProf>('CHARACTER', 'SIMPLE_WEAPONS')?.value)}
                      </Badge>
                    </Group>
                  </StatButton>
                  <StatButton
                    onClick={() => {
                      openDrawer({
                        type: 'stat-prof',
                        data: { id: 'CHARACTER', variableName: 'MARTIAL_WEAPONS' },
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
                        {compileProficiencyType(getVariable<VariableProf>('CHARACTER', 'MARTIAL_WEAPONS')?.value)}
                      </Badge>
                    </Group>
                  </StatButton>
                  <StatButton
                    onClick={() => {
                      openDrawer({
                        type: 'stat-prof',
                        data: { id: 'CHARACTER', variableName: 'ADVANCED_WEAPONS' },
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
                        {compileProficiencyType(getVariable<VariableProf>('CHARACTER', 'ADVANCED_WEAPONS')?.value)}
                      </Badge>
                    </Group>
                  </StatButton>
                  <StatButton
                    onClick={() => {
                      openDrawer({
                        type: 'stat-prof',
                        data: { id: 'CHARACTER', variableName: 'UNARMED_ATTACKS' },
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
                        {compileProficiencyType(getVariable<VariableProf>('CHARACTER', 'UNARMED_ATTACKS')?.value)}
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
                        data: { id: 'CHARACTER', variableName: 'LIGHT_ARMOR' },
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
                        {compileProficiencyType(getVariable<VariableProf>('CHARACTER', 'LIGHT_ARMOR')?.value)}
                      </Badge>
                    </Group>
                  </StatButton>
                  <StatButton
                    onClick={() => {
                      openDrawer({
                        type: 'stat-prof',
                        data: { id: 'CHARACTER', variableName: 'MEDIUM_ARMOR' },
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
                        {compileProficiencyType(getVariable<VariableProf>('CHARACTER', 'MEDIUM_ARMOR')?.value)}
                      </Badge>
                    </Group>
                  </StatButton>
                  <StatButton
                    onClick={() => {
                      openDrawer({
                        type: 'stat-prof',
                        data: { id: 'CHARACTER', variableName: 'HEAVY_ARMOR' },
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
                        {compileProficiencyType(getVariable<VariableProf>('CHARACTER', 'HEAVY_ARMOR')?.value)}
                      </Badge>
                    </Group>
                  </StatButton>
                  <StatButton
                    onClick={() => {
                      openDrawer({
                        type: 'stat-prof',
                        data: { id: 'CHARACTER', variableName: 'UNARMORED_DEFENSE' },
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
                        {compileProficiencyType(getVariable<VariableProf>('CHARACTER', 'UNARMORED_DEFENSE')?.value)}
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
                        data: { id: 'CHARACTER', variableName: 'SPELL_ATTACK' },
                      });
                    }}
                  >
                    <Box>
                      <Text c='gray.0' fz='sm'>
                        Spell Attack
                      </Text>
                    </Box>
                    <Group>
                      <Text c='gray.0'>{displayFinalProfValue('CHARACTER', 'SPELL_ATTACK')}</Text>
                      <Badge variant='default'>
                        {compileProficiencyType(getVariable<VariableProf>('CHARACTER', 'SPELL_ATTACK')?.value)}
                      </Badge>
                    </Group>
                  </StatButton>
                  <StatButton
                    onClick={() => {
                      openDrawer({
                        type: 'stat-prof',
                        data: { id: 'CHARACTER', variableName: 'SPELL_DC', isDC: true },
                      });
                    }}
                  >
                    <Box>
                      <Text c='gray.0' fz='sm'>
                        Spell DC
                      </Text>
                    </Box>
                    <Group>
                      <Text c='gray.0'>{displayFinalProfValue('CHARACTER', 'SPELL_DC', true)}</Text>
                      <Badge variant='default'>
                        {compileProficiencyType(getVariable<VariableProf>('CHARACTER', 'SPELL_DC')?.value)}
                      </Badge>
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
                  {(getVariable<VariableListStr>('CHARACTER', 'LANGUAGE_IDS')?.value ?? []).map((languageId, index) => (
                    <StatButton
                      key={index}
                      onClick={() => {
                        openDrawer({
                          type: 'language',
                          data: { id: parseInt(languageId) },
                        });
                      }}
                    >
                      <Box>
                        <Text c='gray.0' fz='sm'>
                          {props.content.languages.find((lang) => lang.id === parseInt(languageId))?.name}
                        </Text>
                      </Box>
                      <Group></Group>
                    </StatButton>
                  ))}
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
                  {(getVariable<VariableListStr>('CHARACTER', 'RESISTANCES')?.value ?? []).map((opt, index) => (
                    <StatButton
                      key={index}
                      onClick={() => {
                        openDrawer({ type: 'stat-resist-weak', data: { id: 'CHARACTER' } });
                      }}
                    >
                      <Box>
                        <Text c='gray.0' fz='sm'>
                          {displayResistWeak('CHARACTER', opt)}
                        </Text>
                      </Box>
                      <Group>
                        <Badge
                          variant='default'
                          styles={{
                            root: {
                              textTransform: 'initial',
                            },
                          }}
                        >
                          Resist.
                        </Badge>
                      </Group>
                    </StatButton>
                  ))}
                  {(getVariable<VariableListStr>('CHARACTER', 'WEAKNESSES')?.value ?? []).map((opt, index) => (
                    <StatButton
                      key={index}
                      onClick={() => {
                        openDrawer({ type: 'stat-resist-weak', data: { id: 'CHARACTER' } });
                      }}
                    >
                      <Box>
                        <Text c='gray.0' fz='sm'>
                          {displayResistWeak('CHARACTER', opt)}
                        </Text>
                      </Box>
                      <Group>
                        <Badge
                          variant='default'
                          styles={{
                            root: {
                              textTransform: 'initial',
                            },
                          }}
                        >
                          Weak.
                        </Badge>
                      </Group>
                    </StatButton>
                  ))}
                  {(getVariable<VariableListStr>('CHARACTER', 'IMMUNITIES')?.value ?? []).map((opt, index) => (
                    <StatButton
                      key={index}
                      onClick={() => {
                        openDrawer({ type: 'stat-resist-weak', data: { id: 'CHARACTER' } });
                      }}
                    >
                      <Box>
                        <Text c='gray.0' fz='sm'>
                          {displayResistWeak('CHARACTER', opt)}
                        </Text>
                      </Box>
                      <Group>
                        <Badge
                          variant='default'
                          styles={{
                            root: {
                              textTransform: 'initial',
                            },
                          }}
                        >
                          Immun.
                        </Badge>
                      </Group>
                    </StatButton>
                  ))}

                  {(getVariable<VariableListStr>('CHARACTER', 'RESISTANCES')?.value ?? []).length === 0 &&
                    (getVariable<VariableListStr>('CHARACTER', 'WEAKNESSES')?.value ?? []).length === 0 &&
                    (getVariable<VariableListStr>('CHARACTER', 'IMMUNITIES')?.value ?? []).length === 0 && (
                      <Text fz='sm' c='dimmed' ta='center' fs='italic'>
                        No records found.
                      </Text>
                    )}
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        </Stack>
      </ScrollArea>
    </Stack>
  );
}

function AttributeModPart(props: { attribute: string; variableName: string }) {
  return (
    <Box>
      <Text c='gray.0' ta='center' fz={11}>
        {props.attribute}
      </Text>
      <Text c='gray.0' ta='center'>
        {displayAttributeValue('CHARACTER', props.variableName, {
          c: 'gray.0',
          ta: 'center',
        })}
      </Text>
    </Box>
  );
}

export function StatButton(props: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  darkVersion?: boolean;
}) {
  const theme = useMantineTheme();
  const { hovered, ref } = useHover<HTMLButtonElement>();

  return (
    <Box>
      <Button
        ref={ref}
        disabled={props.disabled}
        variant='default'
        size='compact-lg'
        styles={{
          root: {
            backgroundColor: props.darkVersion ? (hovered ? `#28292e` : `#212226`) : undefined,
          },
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
        <Group w='100%' justify='space-between' wrap='nowrap'>
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
  operationResults?: OperationCharacterResultPackage;
}) {
  const theme = useMantineTheme();
  const [subSectionValue, setSubSectionValue] = useState<string | null>(null);
  const { hovered, ref } = useHover();
  const [character, setCharacter] = useRecoilState(characterState);
  const choiceCountRef = useRef<HTMLDivElement>(null);
  const mergedRef = useMergedRef(ref, choiceCountRef);

  const [choiceCounts, setChoiceCounts] = useState<{
    current: number;
    max: number;
  }>({
    current: 0,
    max: 0,
  });

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (choiceCountRef.current) {
        const newChoiceCounts = getChoiceCounts(choiceCountRef.current);
        if (newChoiceCounts.current !== choiceCounts.current || newChoiceCounts.max !== choiceCounts.max)
          setChoiceCounts(newChoiceCounts);
      }
    }, CHOICE_COUNT_INTERVAL);
    return () => clearInterval(intervalId);
  }, [props.operationResults]);

  const saveSelectionChange = (path: string, value: string) => {
    setCharacter((prev) => {
      if (!prev) return prev;
      const newSelections = { ...prev.operation_data?.selections };
      if (!value) {
        delete newSelections[path];
      } else {
        newSelections[path] = `${value}`;
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

  if (
    props.operationResults?.ancestrySectionResults.length === 0 &&
    props.operationResults?.classFeatureResults.length === 0
  ) {
    if (props.level === 0) {
      return (
        <Text fz='sm' mt={10} ta='center' c='gray.5' fs='italic'>
          Select an ancestry, background, and class to get started.
        </Text>
      );
    } else {
      return null;
    }
  }

  return (
    <Accordion.Item
      data-wg-name={`level-${props.level}`}
      ref={mergedRef}
      value={`${props.level}`}
      style={{
        backgroundColor: hovered && !props.opened ? ICON_BG_COLOR_HOVER : undefined,
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
                c={choiceCounts.current === choiceCounts.max ? 'gray.5' : theme.colors[theme.primaryColor][5]}
                fw={choiceCounts.current === choiceCounts.max ? undefined : 600}
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
            onSaveChanges={(path, value) => {
              saveSelectionChange(path, value);
            }}
          />
        ) : (
          <Accordion
            variant='separated'
            value={subSectionValue}
            onChange={setSubSectionValue}
            styles={{
              label: { paddingTop: 5, paddingBottom: 5 },
            }}
          >
            {props.operationResults?.ancestrySectionResults.map(
              (r: { baseSource: AbilityBlock; baseResults: OperationResult[] }, index: number) =>
                r.baseSource.level === props.level && (
                  <AncestrySectionAccordionItem
                    key={index}
                    id={`ancestry-section-${index}`}
                    section={r.baseSource}
                    results={r.baseResults}
                    onSaveChanges={(path, value) => {
                      saveSelectionChange(path, value);
                    }}
                    opened={subSectionValue === `ancestry-section-${index}`}
                  />
                )
            )}
            {props.operationResults?.classFeatureResults.map(
              (r: { baseSource: AbilityBlock; baseResults: OperationResult[] }, index: number) =>
                r.baseSource.level === props.level && (
                  <ClassFeatureAccordionItem
                    key={index}
                    id={`class-feature-${index}`}
                    feature={r.baseSource}
                    results={r.baseResults}
                    onSaveChanges={(path, value) => {
                      saveSelectionChange(path, value);
                    }}
                    opened={subSectionValue === `class-feature-${index}`}
                  />
                )
            )}
          </Accordion>
        )}
      </Accordion.Panel>
    </Accordion.Item>
  );
}

/**
 * Handle class archetype selection
 * @param character - current character
 * @param setCharacter - setter for character state
 * @param class_ - selected class
 * @param recordT - '1' for primary class, '2' for second class
 */
function handleClassArchetypeSelection(
  _character: Character | null,
  setCharacter: SetterOrUpdater<Character | null>,
  class_: Class,
  recordT: '1' | '2'
) {
  fetchContent<ClassArchetype>('class-archetype', {
    class_id: class_.id,
    content_sources: getDefaultSources('PAGE'),
  }).then((options) => {
    if (options.length > 0) {
      selectContent<ClassArchetype>(
        'class-archetype',
        (option) => {
          if (option.id === 0) {
            return;
          }

          setCharacter((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              details: {
                ...(prev.details ?? {}),
                class_archetype: recordT === '1' ? option : prev.details?.class_archetype,
                class_archetype_2: recordT === '2' ? option : prev.details?.class_archetype_2,
              },
            };
          });
        },
        {
          selectedId: -1,
          description: (
            <Text fz='sm'>
              This class supports optional class archetypes that reshape its core mechanics. Would you like to select
              one?
            </Text>
          ),
          overrideOptions: [
            {
              id: 0,
              name: '— Base Class (No Archetype)',
            },
            ...options,
          ],
        }
      );
    }
  });
}

function ClassFeatureAccordionItem(props: {
  id: string;
  feature: AbilityBlock;
  results: OperationResult[];
  onSaveChanges: (path: string, value: string) => void;
  opened: boolean;
}) {
  const { hovered, ref } = useHover();

  const featureChoiceCountRef = useRef<HTMLDivElement>(null);
  const [featureChoiceCounts, setFeatureChoiceCounts] = useState<{
    current: number;
    max: number;
  }>({
    current: 0,
    max: 0,
  });

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (featureChoiceCountRef.current) {
        const choiceCounts = getChoiceCounts(featureChoiceCountRef.current);
        if (!isEqual(choiceCounts, featureChoiceCounts)) setFeatureChoiceCounts(choiceCounts);
      }
    }, CHOICE_COUNT_INTERVAL);
    return () => clearInterval(intervalId);
  }, [props.results]);

  return (
    <Accordion.Item
      data-wg-name={props.feature.name}
      value={props.id}
      ref={ref}
      style={{
        backgroundColor: hovered && !props.opened ? ICON_BG_COLOR_HOVER : undefined,
      }}
      mt={3}
    >
      <Accordion.Control>
        <Group gap={5}>
          <Box>{props.feature.name}</Box>
          {featureChoiceCounts.max - featureChoiceCounts.current > 0 && (
            <Badge variant='filled'>{featureChoiceCounts.max - featureChoiceCounts.current}</Badge>
          )}
        </Group>
      </Accordion.Control>
      <Accordion.Panel ref={featureChoiceCountRef}>
        <Stack gap={5}>
          <RichText ta='justify' store='CHARACTER'>
            {props.feature.description}
          </RichText>
          <DisplayOperationResult
            source={undefined}
            level={props.feature.level}
            results={props.results}
            onChange={(path, value) => {
              props.onSaveChanges(`${convertKeyToBasePrefix('classFeatureResults', props.feature.id)}_${path}`, value);
            }}
          />
        </Stack>
      </Accordion.Panel>
    </Accordion.Item>
  );
}

function AncestrySectionAccordionItem(props: {
  id: string;
  section: AbilityBlock;
  results: OperationResult[];
  onSaveChanges: (path: string, value: string) => void;
  opened: boolean;
}) {
  const { hovered, ref } = useHover();

  const featureChoiceCountRef = useRef<HTMLDivElement>(null);
  const [featureChoiceCounts, setFeatureChoiceCounts] = useState<{
    current: number;
    max: number;
  }>({
    current: 0,
    max: 0,
  });

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (featureChoiceCountRef.current) {
        const choiceCounts = getChoiceCounts(featureChoiceCountRef.current);
        if (!isEqual(choiceCounts, featureChoiceCounts)) setFeatureChoiceCounts(choiceCounts);
      }
    }, CHOICE_COUNT_INTERVAL);
    return () => clearInterval(intervalId);
  }, [props.results]);

  return (
    <Accordion.Item
      value={props.id}
      ref={ref}
      style={{
        backgroundColor: hovered && !props.opened ? ICON_BG_COLOR_HOVER : undefined,
      }}
      mt={3}
    >
      <Accordion.Control>
        <Group gap={5}>
          <Box>{props.section.name}</Box>
          {featureChoiceCounts.max - featureChoiceCounts.current > 0 && (
            <Badge variant='filled'>{featureChoiceCounts.max - featureChoiceCounts.current}</Badge>
          )}
        </Group>
      </Accordion.Control>
      <Accordion.Panel ref={featureChoiceCountRef}>
        <Stack gap={5}>
          <RichText ta='justify' store='CHARACTER'>
            {props.section.description}
          </RichText>
          <DisplayOperationResult
            source={undefined}
            level={props.section.level}
            results={props.results}
            onChange={(path, value) => {
              props.onSaveChanges(
                `${convertKeyToBasePrefix('ancestrySectionResults', props.section.id)}_${path}`,
                value
              );
            }}
          />
        </Stack>
      </Accordion.Panel>
    </Accordion.Item>
  );
}

function InitialStatsLevelSection(props: {
  content: ContentPackage;
  operationResults?: OperationCharacterResultPackage;
  onSaveChanges: (path: string, value: string) => void;
}) {
  const [subSectionValue, setSubSectionValue] = useState<string | null>(null);
  const [character, setCharacter] = useRecoilState(characterState);
  const [_drawer, openDrawer] = useRecoilState(drawerState);

  const class_ = props.content.classes.find((class_) => class_.id === character?.details?.class?.id);
  const class_2 = props.content.classes.find((class_) => class_.id === character?.details?.class_2?.id);
  const ancestry = props.content.ancestries.find((ancestry) => ancestry.id === character?.details?.ancestry?.id);
  const background = props.content.backgrounds.find(
    (background) => background.id === character?.details?.background?.id
  );
  // const heritage = props.content.abilityBlocks.find(
  //   (ab) => ab.id === character?.details?.heritage?.id && ab.type === 'heritage'
  // );

  if (!props.operationResults) return null;

  const hasOperationResults = (
    data: {
      baseSource: any;
      baseResults: OperationResult[];
    }[]
  ) => {
    if (data.length === 0) return false;
    for (const r of data) {
      for (const result of r.baseResults) {
        if (result) return true;
      }
    }
    return false;
  };

  return (
    <>
      <Accordion
        variant='separated'
        value={subSectionValue}
        onChange={setSubSectionValue}
        styles={{
          label: { paddingTop: 5, paddingBottom: 5 },
        }}
      >
        <AncestryAccordionItem
          ancestry={ancestry}
          content={props.content}
          operationResults={props.operationResults}
          onSaveChanges={(path, value) => {
            props.onSaveChanges(path, value);
          }}
          opened={subSectionValue === 'ancestry'}
        />

        <BackgroundAccordionItem
          background={background}
          operationResults={props.operationResults}
          onSaveChanges={(path, value) => {
            props.onSaveChanges(path, value);
          }}
          opened={subSectionValue === 'background'}
        />

        <ClassAccordionItem
          class_={class_}
          operationResults={props.operationResults}
          onSaveChanges={(path, value) => {
            props.onSaveChanges(path, value);
          }}
          opened={subSectionValue === 'class'}
        />

        {class_2 && (
          <ClassAccordionItem
            class_={class_2}
            operationResults={props.operationResults}
            onSaveChanges={(path, value) => {
              props.onSaveChanges(path, value);
            }}
            opened={subSectionValue === 'class_2'}
            isClass2
          />
        )}

        {hasOperationResults(props.operationResults.contentSourceResults) && (
          <BooksAccordionItem
            operationResults={props.operationResults}
            onSaveChanges={(path, value) => {
              props.onSaveChanges(path, value);
            }}
            opened={subSectionValue === 'books'}
          />
        )}
        {hasOperationResults(props.operationResults.itemResults) && (
          <ItemsAccordionItem
            operationResults={props.operationResults}
            onSaveChanges={(path, value) => {
              props.onSaveChanges(path, value);
            }}
            opened={subSectionValue === 'items'}
          />
        )}
        {props.operationResults.characterResults.length > 0 && (
          <CustomAccordionItem
            operationResults={props.operationResults}
            onSaveChanges={(path, value) => {
              props.onSaveChanges(path, value);
            }}
            opened={subSectionValue === 'custom'}
          />
        )}
      </Accordion>
    </>
  );
}

function AncestryAccordionItem(props: {
  ancestry?: Ancestry;
  content: ContentPackage;
  operationResults: OperationCharacterResultPackage;
  onSaveChanges: (path: string, value: string) => void;
  opened: boolean;
}) {
  const [character, setCharacter] = useRecoilState(characterState);
  const [_drawer, openDrawer] = useRecoilState(drawerState);
  const { hovered, ref } = useHover();

  const choiceCountRef = useRef<HTMLDivElement>(null);
  const [choiceCounts, setChoiceCounts] = useState<{
    current: number;
    max: number;
  }>({
    current: 0,
    max: 0,
  });

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (choiceCountRef.current) {
        const newChoiceCounts = getChoiceCounts(choiceCountRef.current);
        if (!isEqual(newChoiceCounts, choiceCounts)) setChoiceCounts(newChoiceCounts);
      }
    }, CHOICE_COUNT_INTERVAL);
    return () => clearInterval(intervalId);
  }, [props.operationResults]);

  // Only display the operation results that aren't already displayed in the ancestry overview
  const physicalFeatures = (props.content.abilityBlocks ?? []).filter((block) => block.type === 'physical-feature');
  const senses = (props.content.abilityBlocks ?? []).filter((block) => block.type === 'sense');
  const languages = (props.content.languages ?? []).sort((a, b) => a.name.localeCompare(b.name));
  const heritages = (props.content.abilityBlocks ?? []).filter(
    (block) => block.type === 'heritage' && block.traits?.includes(props.ancestry?.trait_id ?? -1)
  );
  let ancestryOperationResults = props.operationResults?.ancestryResults ?? [];
  const ancestryInitialOverviewDisplay = props.ancestry
    ? convertAncestryOperationsIntoUI(
        props.ancestry,
        physicalFeatures,
        senses,
        languages,
        'READ/WRITE',
        props.operationResults?.ancestryResults ?? [],
        [character, setCharacter],
        openDrawer
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
        (record) => result?.selection?.id !== undefined && record.operation?.id === result?.selection?.id
      );
    });
  }

  return (
    <Accordion.Item
      value='ancestry'
      ref={ref}
      style={{
        backgroundColor: hovered && !props.opened ? ICON_BG_COLOR_HOVER : undefined,
      }}
      mt={3}
    >
      <Accordion.Control disabled={!props.ancestry} icon={getIconFromContentType('ancestry', '1rem')}>
        <Group gap={5}>
          <Box>Ancestry</Box>
          {choiceCounts.max - choiceCounts.current > 0 && (
            <Badge variant='filled'>{choiceCounts.max - choiceCounts.current}</Badge>
          )}
        </Group>
      </Accordion.Control>
      <Accordion.Panel ref={choiceCountRef}>
        <Stack gap={5}>
          <Box>
            {props.ancestry && (
              <AncestryInitialOverview
                ancestry={props.ancestry}
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
              level={1}
              results={ancestryOperationResults}
              onChange={(path, value) => {
                props.onSaveChanges(`${convertKeyToBasePrefix('ancestryResults')}_${path}`, value);
              }}
            />
          </Box>
        </Stack>
      </Accordion.Panel>
    </Accordion.Item>
  );
}

function BackgroundAccordionItem(props: {
  background?: Background;
  operationResults: OperationCharacterResultPackage;
  onSaveChanges: (path: string, value: string) => void;
  opened: boolean;
}) {
  const [character, setCharacter] = useRecoilState(characterState);
  const [_drawer, openDrawer] = useRecoilState(drawerState);
  const { hovered, ref } = useHover();

  const choiceCountRef = useRef<HTMLDivElement>(null);
  const [choiceCounts, setChoiceCounts] = useState<{
    current: number;
    max: number;
  }>({
    current: 0,
    max: 0,
  });

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (choiceCountRef.current) {
        const newChoiceCounts = getChoiceCounts(choiceCountRef.current);
        if (!isEqual(newChoiceCounts, choiceCounts)) setChoiceCounts(newChoiceCounts);
      }
    }, CHOICE_COUNT_INTERVAL);
    return () => clearInterval(intervalId);
  }, [props.operationResults]);

  // Only display the operation results that aren't already displayed in the background overview
  let backgroundOperationResults = props.operationResults?.backgroundResults ?? [];
  const backgroundInitialOverviewDisplay = props.background
    ? convertBackgroundOperationsIntoUI(
        props.background,
        'READ/WRITE',
        props.operationResults?.backgroundResults ?? [],
        [character, setCharacter],
        openDrawer
      )
    : null;
  if (backgroundInitialOverviewDisplay) {
    // Filter out operation results that are already displayed in the background overview
    let displayRecords: {
      ui: React.ReactNode;
      operation: OperationSelect | null;
    }[] = [];
    for (const value of Object.values(backgroundInitialOverviewDisplay)) {
      if (Array.isArray(value)) {
        displayRecords = [...displayRecords, ...value];
      } else {
        displayRecords.push(value);
      }
    }

    // Filter operation results
    backgroundOperationResults = backgroundOperationResults.filter((result: OperationResult) => {
      return !displayRecords.find(
        (record) => result?.selection?.id !== undefined && record.operation?.id === result?.selection?.id
      );
    });
  }

  return (
    <Accordion.Item
      value='background'
      ref={ref}
      style={{
        backgroundColor: hovered && !props.opened ? ICON_BG_COLOR_HOVER : undefined,
      }}
      mt={3}
    >
      <Accordion.Control disabled={!props.background} icon={getIconFromContentType('background', '1rem')}>
        <Group gap={5}>
          <Box>Background</Box>
          {choiceCounts.max - choiceCounts.current > 0 && (
            <Badge variant='filled'>{choiceCounts.max - choiceCounts.current}</Badge>
          )}
        </Group>
      </Accordion.Control>
      <Accordion.Panel ref={choiceCountRef}>
        <Stack gap={5}>
          <Box>
            {props.background && (
              <BackgroundInitialOverview
                background={props.background}
                mode='READ/WRITE'
                operationResults={props.operationResults.backgroundResults}
              />
            )}
          </Box>

          <Box>
            <DisplayOperationResult
              source={undefined}
              level={1}
              results={backgroundOperationResults}
              onChange={(path, value) => {
                props.onSaveChanges(`${convertKeyToBasePrefix('backgroundResults')}_${path}`, value);
              }}
            />
          </Box>
        </Stack>
      </Accordion.Panel>
    </Accordion.Item>
  );
}

function ClassAccordionItem(props: {
  class_?: Class;
  operationResults: OperationCharacterResultPackage;
  onSaveChanges: (path: string, value: string) => void;
  opened: boolean;
  isClass2?: boolean;
}) {
  const [character, setCharacter] = useRecoilState(characterState);
  const [_drawer, openDrawer] = useRecoilState(drawerState);
  const { hovered, ref } = useHover();

  const choiceCountRef = useRef<HTMLDivElement>(null);
  const [choiceCounts, setChoiceCounts] = useState<{
    current: number;
    max: number;
  }>({
    current: 0,
    max: 0,
  });

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (choiceCountRef.current) {
        const newChoiceCounts = getChoiceCounts(choiceCountRef.current);
        if (!isEqual(newChoiceCounts, choiceCounts)) setChoiceCounts(newChoiceCounts);
      }
    }, CHOICE_COUNT_INTERVAL);
    return () => clearInterval(intervalId);
  }, [props.operationResults]);

  // Only display the operation results that aren't already displayed in the class overview
  let classOperationResults =
    (props.isClass2 ? props.operationResults?.class2Results : props.operationResults?.classResults) ?? [];
  const classInitialOverviewDisplay = props.class_
    ? convertClassOperationsIntoUI(
        props.class_,
        'READ/WRITE',
        (props.isClass2 ? props.operationResults?.class2Results : props.operationResults?.classResults) ?? [],
        [character, setCharacter],
        props.isClass2
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

    // Filter operation results
    classOperationResults = classOperationResults.filter((result: OperationResult) => {
      return !displayRecords.find(
        (record) => result?.selection?.id !== undefined && record.operation?.id === result?.selection?.id
      );
    });
  }

  return (
    <Accordion.Item
      value={props.isClass2 ? 'class_2' : 'class'}
      ref={ref}
      style={{
        backgroundColor: hovered && !props.opened ? ICON_BG_COLOR_HOVER : undefined,
      }}
      mt={3}
    >
      <Accordion.Control disabled={!props.class_} icon={getIconFromContentType('class', '1rem')}>
        <Group gap={5}>
          <Box>Class {props.isClass2 ? '2' : ''}</Box>
          {choiceCounts.max - choiceCounts.current > 0 && (
            <Badge variant='filled'>{choiceCounts.max - choiceCounts.current}</Badge>
          )}
        </Group>
      </Accordion.Control>
      <Accordion.Panel ref={choiceCountRef}>
        <Stack gap={5}>
          <Box>
            {props.class_ && (
              <ClassInitialOverview
                class_={props.class_}
                mode='READ/WRITE'
                operationResults={
                  props.isClass2 ? props.operationResults?.class2Results : props.operationResults?.classResults
                }
                isClass2={props.isClass2}
              />
            )}
          </Box>

          <Box>
            <DisplayOperationResult
              source={undefined}
              level={1}
              results={classOperationResults}
              onChange={(path, value) => {
                props.onSaveChanges(
                  `${props.isClass2 ? convertKeyToBasePrefix('class2Results') : convertKeyToBasePrefix('classResults')}_${path}`,
                  value
                );
              }}
            />
          </Box>
        </Stack>
      </Accordion.Panel>
    </Accordion.Item>
  );
}

function BooksAccordionItem(props: {
  operationResults: OperationCharacterResultPackage;
  onSaveChanges: (path: string, value: string) => void;
  opened: boolean;
}) {
  const { hovered, ref } = useHover();

  const character = useRecoilValue(characterState);

  const choiceCountRef = useRef<HTMLDivElement>(null);
  const [choiceCounts, setChoiceCounts] = useState<{
    current: number;
    max: number;
  }>({
    current: 0,
    max: 0,
  });

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (choiceCountRef.current) {
        const newChoiceCounts = getChoiceCounts(choiceCountRef.current);
        if (!isEqual(newChoiceCounts, choiceCounts)) setChoiceCounts(newChoiceCounts);
      }
    }, CHOICE_COUNT_INTERVAL);
    return () => clearInterval(intervalId);
  }, [props.operationResults]);

  return (
    <Accordion.Item
      value='books'
      ref={ref}
      style={{
        backgroundColor: hovered && !props.opened ? ICON_BG_COLOR_HOVER : undefined,
      }}
      mt={3}
    >
      <Accordion.Control icon={getIconFromContentType('content-source', '1rem')}>
        <Group gap={5}>
          <Box>Books</Box>
          {choiceCounts.max - choiceCounts.current > 0 && (
            <Badge variant='filled'>{choiceCounts.max - choiceCounts.current}</Badge>
          )}
        </Group>
      </Accordion.Control>
      <Accordion.Panel ref={choiceCountRef}>
        {props.operationResults.contentSourceResults.map((s, index) => (
          <DisplayOperationResult
            key={index}
            source={{
              ...s.baseSource,
              _select_uuid: `${s.baseSource.id}`,
              _content_type: 'content-source',
            }}
            level={character?.level ?? 1}
            results={s.baseResults}
            onChange={(path, value) => {
              props.onSaveChanges(`${convertKeyToBasePrefix('contentSourceResults', s.baseSource.id)}_${path}`, value);
            }}
          />
        ))}
      </Accordion.Panel>
    </Accordion.Item>
  );
}

function ItemsAccordionItem(props: {
  operationResults: OperationCharacterResultPackage;
  onSaveChanges: (path: string, value: string) => void;
  opened: boolean;
}) {
  const { hovered, ref } = useHover();

  const choiceCountRef = useRef<HTMLDivElement>(null);
  const [choiceCounts, setChoiceCounts] = useState<{
    current: number;
    max: number;
  }>({
    current: 0,
    max: 0,
  });

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (choiceCountRef.current) {
        const newChoiceCounts = getChoiceCounts(choiceCountRef.current);
        if (!isEqual(newChoiceCounts, choiceCounts)) setChoiceCounts(newChoiceCounts);
      }
    }, CHOICE_COUNT_INTERVAL);
    return () => clearInterval(intervalId);
  }, [props.operationResults]);

  return (
    <Accordion.Item
      value='items'
      ref={ref}
      style={{
        backgroundColor: hovered && !props.opened ? ICON_BG_COLOR_HOVER : undefined,
      }}
      mt={3}
    >
      <Accordion.Control icon={getIconFromContentType('item', '1rem')}>
        <Group gap={5}>
          <Box>Items</Box>
          {choiceCounts.max - choiceCounts.current > 0 && (
            <Badge variant='filled'>{choiceCounts.max - choiceCounts.current}</Badge>
          )}
        </Group>
      </Accordion.Control>
      <Accordion.Panel ref={choiceCountRef}>
        {props.operationResults.itemResults.map((s, index) => (
          <DisplayOperationResult
            key={index}
            source={{
              ...s.baseSource,
              _select_uuid: `${s.baseSource.id}`,
              _content_type: 'item',
            }}
            level={s.baseSource.level}
            results={s.baseResults}
            onChange={(path, value) => {
              props.onSaveChanges(`${convertKeyToBasePrefix('itemResults', s.baseSource.id)}_${path}`, value);
            }}
          />
        ))}
      </Accordion.Panel>
    </Accordion.Item>
  );
}

function CustomAccordionItem(props: {
  operationResults: OperationCharacterResultPackage;
  onSaveChanges: (path: string, value: string) => void;
  opened: boolean;
}) {
  const { hovered, ref } = useHover();

  const character = useRecoilValue(characterState);

  const choiceCountRef = useRef<HTMLDivElement>(null);
  const [choiceCounts, setChoiceCounts] = useState<{
    current: number;
    max: number;
  }>({
    current: 0,
    max: 0,
  });

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (choiceCountRef.current) {
        const newChoiceCounts = getChoiceCounts(choiceCountRef.current);
        if (!isEqual(newChoiceCounts, choiceCounts)) setChoiceCounts(newChoiceCounts);
      }
    }, CHOICE_COUNT_INTERVAL);
    return () => clearInterval(intervalId);
  }, [props.operationResults]);

  const selections = props.operationResults.characterResults.filter((result) => hasOperationSelection(result));

  return (
    <Accordion.Item
      value='custom'
      ref={ref}
      style={{
        backgroundColor: hovered && !props.opened ? ICON_BG_COLOR_HOVER : undefined,
      }}
      mt={3}
    >
      <Accordion.Control icon={<IconPuzzle size='1rem' />}>
        <Group gap={5}>
          <Box>Custom</Box>
          {choiceCounts.max - choiceCounts.current > 0 && (
            <Badge variant='filled'>{choiceCounts.max - choiceCounts.current}</Badge>
          )}
        </Group>
      </Accordion.Control>
      <Accordion.Panel ref={choiceCountRef}>
        <DisplayOperationResult
          source={undefined}
          level={character?.level ?? 1}
          results={props.operationResults.characterResults}
          onChange={(path, value) => {
            props.onSaveChanges(`${convertKeyToBasePrefix('characterResults')}_${path}`, value);
          }}
        />
        {selections.length === 0 && (
          <Text c='gray.6' fz='sm' ta='center' fs='italic'>
            No selections found for the {props.operationResults.characterResults.length} executed operation(s).
          </Text>
        )}
      </Accordion.Panel>
    </Accordion.Item>
  );
}

//////////////////////////////////////////

export function DisplayOperationResult(props: {
  source?: ObjectWithUUID;
  level?: number;
  results: OperationResult[];
  onChange: (path: string, value: string) => void;
}) {
  const selections = props.results.filter((result) => hasOperationSelection(result));
  if (selections.length === 0) return null;

  // This is the magic sauce
  return (
    <ResultWrapper label={`From ${props.source?.name ?? 'Unknown'}`} disabled={!props.source}>
      <Stack gap={10}>
        {selections.map((result, i) => (
          <Stack key={i} gap={10}>
            {result?.selection && (
              <OperationResultSelector result={result} level={props.level} onChange={props.onChange} />
            )}
            {result?.result?.results && result.result.results.length > 0 && (
              <DisplayOperationResult
                source={result.result.source}
                level={props.level}
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

function OperationResultSelector(props: {
  result: OperationResult;
  level?: number;
  onChange: (path: string, value: string) => void;
}) {
  const character = useRecoilValue(characterState);
  return (
    <SelectContentButton
      type={
        (props.result?.selection?.options ?? []).length > 0
          ? (props.result?.selection?.options[0]._content_type ?? 'ability-block')
          : 'ability-block'
      }
      onClick={(option) => {
        props.onChange(props.result!.selection?.id ?? '', option._select_uuid);
      }}
      onClear={() => {
        props.onChange(props.result!.selection?.id ?? '', '');
      }}
      selectedId={props.result!.result?.source?.id}
      options={{
        overrideOptions: props.result?.selection?.options.map((option) => ({
          ...option,
          _source_level: props.level,
        })),
        overrideLabel: props.result?.selection?.title || 'Select an Option',
        abilityBlockType:
          (props.result?.selection?.options ?? []).length > 0 ? props.result?.selection?.options[0].type : undefined,
        skillAdjustment: props.result?.selection?.skillAdjustment,
        // advancedPresetFilters: {
        //   type: props.result?.selection?.options[0]._content_type,
        //   ab_type: props.result?.selection?.options[0].type,
        //   content_sources: character ? character.content_sources?.enabled : undefined,
        //   level_max: character ? character.level : undefined,
        //   level_min: 1,
        // },
      }}
    />
  );
}
