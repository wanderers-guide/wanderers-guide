import { characterState } from '@atoms/characterAtoms';
import { drawerState } from '@atoms/navAtoms';
import {
  FeatSelectionOption,
  ClassFeatureSelectionOption,
  HeritageSelectionOption,
  PhysicalFeatureSelectionOption,
} from '@common/select/SelectContent';
import { fetchContentAll } from '@content/content-store';
import {
  useMantineTheme,
  Stack,
  Group,
  TextInput,
  SegmentedControl,
  ScrollArea,
  Accordion,
  Divider,
  Box,
  Text,
} from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { AbilityBlock, ContentPackage, Creature } from '@typing/content';
import { useState, useRef, useEffect, useMemo } from 'react';
import { useRecoilValue, useRecoilState, SetterOrUpdater } from 'recoil';
import * as JsSearch from 'js-search';
import { isTruthy } from '@utils/type-fixing';

export default function CreatureAbilitiesPanel(props: {
  content: ContentPackage;
  panelHeight: number;
  panelWidth: number;
  creature: Creature | null;
  setCreature: SetterOrUpdater<Creature | null>;
}) {
  const theme = useMantineTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [_drawer, openDrawer] = useRecoilState(drawerState);

  const rawData = useMemo(() => {
    const base = props.creature?.abilities_base || [];
    const added = (props.creature?.abilities_added || [])
      .map((id) => {
        const ability = props.content.abilityBlocks.find((block) => block.id === id);
        return ability;
      })
      .filter(isTruthy);

    return {
      baseAbilities: base,
      addedAbilities: added,
    };
  }, [props]);

  // Filter options based on search query
  const search = useRef(new JsSearch.Search('id'));
  useEffect(() => {
    if (!rawData) return;
    search.current.addIndex('name');
    search.current.addIndex('description');
    search.current.addIndex('_group');
    search.current.addDocuments([
      ...rawData.baseAbilities.map((abil) => ({
        ...abil,
        _group: 'baseAbilities',
      })),
      ...rawData.addedAbilities.map((abil) => ({ ...abil, _group: 'addedAbilities' })),
    ]);
  }, [rawData]);

  const constructData = (data: Record<string, any>[]) => {
    const baseAbilities = data.filter((feat) => feat._group === 'baseAbilities');
    const addedAbilities = data.filter((feat) => feat._group === 'addedAbilities');

    return {
      baseAbilities,
      addedAbilities,
    } as typeof rawData;
  };

  const data = searchQuery.trim() ? constructData(search.current.search(searchQuery.trim())) : rawData;

  return (
    <Box h='100%'>
      <Stack gap={5}>
        <Group>
          <TextInput
            style={{ flex: 1 }}
            leftSection={<IconSearch size='0.9rem' />}
            placeholder={`Search abilities`}
            onChange={(event) => setSearchQuery(event.target.value)}
            styles={{
              input: {
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                borderColor: searchQuery.trim().length > 0 ? theme.colors['guide'][8] : undefined,
              },
            }}
          />
        </Group>
        <ScrollArea h={props.panelHeight - 50} scrollbars='y'>
          {data && data.addedAbilities.length === 0 && data.baseAbilities.length === 0 && (
            <Text c='gray.5' fz='sm' ta='center' fs='italic' py={20}>
              No abilities found.
            </Text>
          )}

          {data && (
            <Accordion
              variant='separated'
              multiple
              defaultValue={['base-abilities', 'added-abilities']}
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
              {data.baseAbilities.length > 0 && (
                <Accordion.Item value='base-abilities'>
                  <Accordion.Control>
                    <Text fw={600}>Base Abilities</Text>
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
                      {data.baseAbilities.map((ability, index) => (
                        <FeatSelectionOption
                          key={index}
                          feat={ability}
                          displayLevel
                          showButton={false}
                          onClick={() => {
                            openDrawer({
                              type: 'generic',
                              data: ability,
                              extra: { addToHistory: true },
                            });
                          }}
                        />
                      ))}
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>
              )}
              {data.addedAbilities.length > 0 && (
                <Accordion.Item value='added-abilities'>
                  <Accordion.Control>
                    <Text fw={600}>Added Abilities</Text>
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
                      {data.addedAbilities.map((ability, index) => (
                        <FeatSelectionOption
                          key={index}
                          feat={ability}
                          displayLevel
                          showButton={false}
                          onClick={() => {
                            openDrawer({
                              type: 'generic',
                              data: ability,
                              extra: { addToHistory: true },
                            });
                          }}
                        />
                      ))}
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>
              )}
            </Accordion>
          )}
        </ScrollArea>
      </Stack>
    </Box>
  );
}
