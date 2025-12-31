import { drawerState } from '@atoms/navAtoms';
import { FeatSelectionOption } from '@common/select/SelectContent';
import { useMantineTheme, Stack, Group, TextInput, ScrollArea, Accordion, Divider, Box, Text } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { AbilityBlock, ContentPackage, Creature, Trait } from '@typing/content';
import { useState, useRef, useEffect, useMemo } from 'react';
import { useRecoilState, SetterOrUpdater } from 'recoil';
import * as JsSearch from 'js-search';
import { isTruthy } from '@utils/type-fixing';
import { useDebouncedValue, useMediaQuery } from '@mantine/hooks';
import { phoneQuery } from '@utils/mobile-responsive';
import { collectEntityAbilityBlocks } from '@content/collect-content';
import { flattenDeep } from 'lodash-es';
import { StoreID } from '@typing/variables';
import { getContentFast } from '@content/content-store';

export default function CreatureAbilitiesPanel(props: {
  id: StoreID;
  content: ContentPackage;
  panelHeight: number;
  panelWidth: number;
  creature: Creature | null;
  setCreature: SetterOrUpdater<Creature | null>;
}) {
  const isPhone = useMediaQuery(phoneQuery());
  const theme = useMantineTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchQueryDebounced] = useDebouncedValue(searchQuery, 200);
  const [_drawer, openDrawer] = useRecoilState(drawerState);

  const entityAbilityBlocks = useMemo(() => {
    if (!props.creature) return [];

    const allAbs = flattenDeep(
      Object.values(collectEntityAbilityBlocks(props.id, props.creature, props.content.abilityBlocks))
    );

    // Filter ability blocks
    return searchQueryDebounced.trim()
      ? allAbs.filter((action) => {
          // Custom search, alt could be to use JsSearch here
          const query = searchQueryDebounced.trim().toLowerCase();

          const checkAbs = (action: AbilityBlock) => {
            const searchStr = JSON.stringify({
              _: action.name,
              ___: getContentFast<Trait>('trait', action.traits ?? []).map((t) => t.name),
              ____: action.meta_data?.skill,
              _____: action.rarity,
            }).toLowerCase();

            return searchStr.includes(query);
          };

          if (checkAbs(action)) return true;
          return false;
        })
      : allAbs;
  }, [props.content.abilityBlocks, searchQueryDebounced, props.id, props.creature]);

  const data = useMemo(() => {
    const addedAbilities: AbilityBlock[] = [];
    const baseAbilities: AbilityBlock[] = [];
    const otherAbilities: AbilityBlock[] = [];
    for (const ab of entityAbilityBlocks) {
      if (props.creature?.abilities_added?.includes(ab.id)) {
        addedAbilities.push(ab);
      } else if (props.creature?.abilities_base?.find((b) => b.id === ab.id)) {
        baseAbilities.push(ab);
      } else {
        otherAbilities.push(ab);
      }
    }

    return {
      addedAbilities,
      baseAbilities,
      otherAbilities,
    };
  }, [props.creature, entityAbilityBlocks]);

  return (
    <Box h='100%'>
      <Stack gap={5}>
        <Group>
          <TextInput
            style={{ flex: 1 }}
            leftSection={isPhone ? undefined : <IconSearch size='0.9rem' />}
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
          {entityAbilityBlocks.length === 0 && (
            <Text c='gray.5' fz='sm' ta='center' fs='italic' py={20}>
              No abilities found.
            </Text>
          )}

          <Accordion
            variant='separated'
            multiple
            defaultValue={['base-abilities', 'added-abilities', 'other-abilities']}
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
                            type: 'action',
                            data: {
                              action: ability,
                            },
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
                            type: 'action',
                            data: {
                              action: ability,
                            },
                            extra: { addToHistory: true },
                          });
                        }}
                      />
                    ))}
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>
            )}
            {data.otherAbilities.length > 0 && (
              <Accordion.Item value='other-abilities'>
                <Accordion.Control>
                  <Text fw={600}>Other Abilities</Text>
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
                    {data.otherAbilities.map((ability, index) => (
                      <FeatSelectionOption
                        key={index}
                        feat={ability}
                        displayLevel
                        showButton={false}
                        onClick={() => {
                          openDrawer({
                            type: 'action',
                            data: {
                              action: ability,
                            },
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
        </ScrollArea>
      </Stack>
    </Box>
  );
}
