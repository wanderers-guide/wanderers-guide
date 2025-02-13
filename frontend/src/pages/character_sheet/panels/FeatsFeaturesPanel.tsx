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
import { AbilityBlock } from '@typing/content';
import { useState, useRef, useEffect } from 'react';
import { useRecoilValue, useRecoilState } from 'recoil';
import * as JsSearch from 'js-search';
import { collectEntityAbilityBlocks } from '@content/collect-content';

export default function FeatsFeaturesPanel(props: { panelHeight: number; panelWidth: number }) {
  const theme = useMantineTheme();
  const character = useRecoilValue(characterState);
  const [searchQuery, setSearchQuery] = useState('');
  const [_drawer, openDrawer] = useRecoilState(drawerState);
  const [section, setSection] = useState('FEATS');

  const { data: rawData } = useQuery({
    queryKey: [`find-feats-and-features`],
    queryFn: async () => {
      if (!character) return null;

      const abilityBlocks = await fetchContentAll<AbilityBlock>('ability-block');
      return collectEntityAbilityBlocks('CHARACTER', character, abilityBlocks, {
        filterBasicClassFeatures: true,
      });
    },
  });

  // Filter options based on search query
  const search = useRef(new JsSearch.Search('id'));
  useEffect(() => {
    if (!rawData) return;
    search.current.addIndex('name');
    search.current.addIndex('description');
    search.current.addIndex('_group');
    search.current.addDocuments([
      ...rawData.ancestryFeats.map((feat) => ({
        ...feat,
        _group: 'ancestryFeats',
      })),
      ...rawData.classFeats.map((feat) => ({ ...feat, _group: 'classFeats' })),
      ...rawData.generalAndSkillFeats.map((feat) => ({
        ...feat,
        _group: 'generalAndSkillFeats',
      })),
      ...rawData.otherFeats.map((feat) => ({ ...feat, _group: 'otherFeats' })),
      ...rawData.classFeatures.map((feat) => ({
        ...feat,
        _group: 'classFeatures',
      })),
      ...rawData.heritages.map((feat) => ({ ...feat, _group: 'heritages' })),
      ...rawData.physicalFeatures.map((feat) => ({
        ...feat,
        _group: 'physicalFeatures',
      })),
    ]);
  }, [rawData]);

  const constructData = (data: Record<string, any>[]) => {
    const classFeats = data.filter((feat) => feat._group === 'classFeats');
    const ancestryFeats = data.filter((feat) => feat._group === 'ancestryFeats');
    const generalAndSkillFeats = data.filter((feat) => feat._group === 'generalAndSkillFeats');
    const otherFeats = data.filter((feat) => feat._group === 'otherFeats');
    const classFeatures = data.filter((feat) => feat._group === 'classFeatures');
    const heritages = data.filter((feat) => feat._group === 'heritages');
    const physicalFeatures = data.filter((feat) => feat._group === 'physicalFeatures');

    return {
      classFeats,
      ancestryFeats,
      generalAndSkillFeats,
      otherFeats,
      classFeatures,
      heritages,
      physicalFeatures,
    } as typeof rawData;
  };

  const data = searchQuery.trim() ? constructData(search.current.search(searchQuery.trim())) : rawData;

  const dualLayout = props.panelWidth > 1000;
  const featsSection = (
    <>
      {data && (section === 'FEATS' || searchQuery.trim() || dualLayout) && (
        <Accordion
          variant='separated'
          multiple
          defaultValue={['class-feats', 'ancestry-feats', 'general-skill-feats', 'other-feats']}
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
          {data.classFeats.length > 0 && (
            <Accordion.Item value='class-feats'>
              <Accordion.Control>
                <Text fw={600}>Class Feats</Text>
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
                  {data.classFeats.map((feat, index) => (
                    <FeatSelectionOption
                      key={index}
                      feat={feat}
                      displayLevel
                      showButton={false}
                      onClick={() => {
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
          )}
          {data.ancestryFeats.length > 0 && (
            <Accordion.Item value='ancestry-feats'>
              <Accordion.Control>
                <Text fw={600}>Ancestry Feats</Text>
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
                  {data.ancestryFeats.map((feat, index) => (
                    <FeatSelectionOption
                      key={index}
                      feat={feat}
                      displayLevel
                      showButton={false}
                      onClick={() => {
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
          )}
          {data.generalAndSkillFeats.length > 0 && (
            <Accordion.Item value='general-skill-feats'>
              <Accordion.Control>
                <Text fw={600}>General & Skill Feats</Text>
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
                  {data.generalAndSkillFeats.map((feat, index) => (
                    <FeatSelectionOption
                      key={index}
                      feat={feat}
                      displayLevel
                      showButton={false}
                      onClick={() => {
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
          )}
          {data.otherFeats.length > 0 && (
            <Accordion.Item value='other-feats'>
              <Accordion.Control>
                <Text fw={600}>Other Feats</Text>
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
                  {data.otherFeats.map((feat, index) => (
                    <FeatSelectionOption
                      key={index}
                      feat={feat}
                      displayLevel
                      showButton={false}
                      onClick={() => {
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
          )}
        </Accordion>
      )}
    </>
  );

  const featuresSection = (
    <>
      {data && (section === 'FEATURES' || searchQuery.trim() || dualLayout) && (
        <Accordion
          variant='separated'
          multiple
          defaultValue={['class-features', 'heritages', 'ancestry-features']}
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
          {data.classFeatures.length > 0 && (
            <Accordion.Item value='class-features'>
              <Accordion.Control>
                <Text fw={600}>Class Features</Text>
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
                  {data.classFeatures.map((feature, index) => (
                    <ClassFeatureSelectionOption
                      key={index}
                      classFeature={feature}
                      showButton={false}
                      onClick={() => {
                        openDrawer({
                          type: 'class-feature',
                          data: { id: feature.id },
                          extra: { addToHistory: true },
                        });
                      }}
                    />
                  ))}
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          )}
          {data.heritages.length > 0 && (
            <Accordion.Item value='heritages'>
              <Accordion.Control>
                <Text fw={600}>Heritage</Text>
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
                  {data.heritages.map((heritage, index) => (
                    <HeritageSelectionOption
                      key={index}
                      heritage={heritage}
                      showButton={false}
                      onClick={() => {
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
          )}
          {data.physicalFeatures.length > 0 && (
            <Accordion.Item value='ancestry-features'>
              <Accordion.Control>
                <Text fw={600}>Ancestry Features</Text>
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
                  {data.physicalFeatures.map((feature, index) => (
                    <PhysicalFeatureSelectionOption
                      key={index}
                      physicalFeature={feature}
                      showButton={false}
                      onClick={() => {
                        openDrawer({
                          type: 'physical-feature',
                          data: { id: feature.id },
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
    </>
  );

  return (
    <Box h='100%'>
      <Stack gap={5}>
        <Group>
          <TextInput
            style={{ flex: 1 }}
            leftSection={<IconSearch size='0.9rem' />}
            placeholder={`Search feats & features`}
            onChange={(event) => setSearchQuery(event.target.value)}
            styles={{
              input: {
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                borderColor: searchQuery.trim().length > 0 ? theme.colors['guide'][8] : undefined,
              },
            }}
          />
          {!dualLayout && (
            <SegmentedControl
              value={section}
              onChange={setSection}
              disabled={!!searchQuery.trim()}
              data={[
                { label: 'Feats', value: 'FEATS' },
                { label: 'Features', value: 'FEATURES' },
              ]}
            />
          )}
        </Group>
        <ScrollArea h={props.panelHeight - 50} scrollbars='y'>
          {data &&
            data.ancestryFeats.length === 0 &&
            data.classFeats.length === 0 &&
            data.generalAndSkillFeats.length === 0 &&
            data.otherFeats.length === 0 &&
            data.classFeatures.length === 0 &&
            data.heritages.length === 0 &&
            data.physicalFeatures.length === 0 && (
              <Text c='gray.5' fz='sm' ta='center' fs='italic' py={20}>
                No feats or features found.
              </Text>
            )}
          {dualLayout ? (
            <Group align='flex-start' gap={10} grow>
              <ScrollArea h={props.panelHeight - 50} scrollbars='y'>
                {featsSection}
              </ScrollArea>
              <ScrollArea h={props.panelHeight - 50} scrollbars='y'>
                {featuresSection}
              </ScrollArea>
            </Group>
          ) : (
            <>
              {featsSection}
              {featuresSection}
            </>
          )}
        </ScrollArea>
      </Stack>
    </Box>
  );
}
