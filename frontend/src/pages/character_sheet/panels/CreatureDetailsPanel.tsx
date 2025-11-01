import { characterState } from '@atoms/characterAtoms';
import { drawerState } from '@atoms/navAtoms';
import {
  useMantineTheme,
  Group,
  Paper,
  Stack,
  Title,
  ScrollArea,
  TextInput,
  ActionIcon,
  Divider,
  Pill,
  Accordion,
  Badge,
  Box,
  Text,
  Tabs,
  Autocomplete,
  NumberInput,
  SimpleGrid,
  Button,
  Center,
} from '@mantine/core';
import { StatButton } from '@pages/character_builder/CharBuilderCreation';
import { IconExternalLink } from '@tabler/icons-react';
import { ContentPackage, Creature, PublicUser } from '@typing/content';
import { StoreID, VariableListStr, VariableProf, VariableStr } from '@typing/variables';
import { displayFinalProfValue } from '@variables/variable-display';
import {
  getVariable,
  getAllWeaponGroupVariables,
  getAllWeaponVariables,
  getAllArmorGroupVariables,
  getAllArmorVariables,
  getAllAncestryTraitVariables,
} from '@variables/variable-manager';
import { compileProficiencyType, variableToLabel } from '@variables/variable-utils';
import { useRecoilState, useRecoilValue } from 'recoil';
import classes from '@css/FaqSimple.module.css';
import { isPhoneSized } from '@utils/mobile-responsive';
import { useDebouncedValue, useDidUpdate } from '@mantine/hooks';
import { makeRequest } from '@requests/request-manager';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { getCachedPublicUser, getPublicUser } from '@auth/user-manager';
import { CreateSocietyAdventureEntryModal } from '@modals/CreateSocietyAdventureEntryModal';
import { Money, getGpGained } from '@utils/money';
import { pluralize } from '@utils/strings';
import RichText from '@common/RichText';
import TraitsDisplay from '@common/TraitsDisplay';
import { convertToSize } from '@upload/foundry-utils';
import { DisplayIcon } from '@common/IconDisplay';
import { cloneDeep } from 'lodash-es';

const SECTION_WIDTH = 280;

export default function CreatureDetailsPanel(props: {
  id: StoreID;
  creature: Creature | null;
  content: ContentPackage;
  panelHeight: number;
  panelWidth: number;
}) {
  const theme = useMantineTheme();
  const isPhone = isPhoneSized(props.panelWidth);
  const [_drawer, openDrawer] = useRecoilState(drawerState);

  const languages = (getVariable<VariableListStr>(props.id, 'LANGUAGE_IDS')?.value ?? []).map((langId) => {
    const lang = props.content.languages.find((lang) => `${lang.id}` === langId);
    return lang;
  });

  const traits = getAllAncestryTraitVariables(props.id).map((v) => {
    const trait = props.content.traits.find((trait) => trait.id === v.value);
    return trait;
  });

  const size = getVariable<VariableStr>(props.id, 'SIZE')?.value;

  const weaponGroupProfs = getAllWeaponGroupVariables(props.id).filter(
    (prof) => compileProficiencyType(prof.value) !== 'U'
  );
  const weaponProfs = getAllWeaponVariables(props.id).filter((prof) => compileProficiencyType(prof.value) !== 'U');

  const armorGroupProfs = getAllArmorGroupVariables(props.id).filter(
    (prof) => compileProficiencyType(prof.value) !== 'U'
  );
  const armorProfs = getAllArmorVariables(props.id).filter((prof) => compileProficiencyType(prof.value) !== 'U');

  // Barding
  const lightBardingProf = compileProficiencyType(getVariable<VariableProf>(props.id, 'LIGHT_BARDING')?.value);
  const heavyBardingProf = compileProficiencyType(getVariable<VariableProf>(props.id, 'HEAVY_BARDING')?.value);
  const hasBardingProf = lightBardingProf !== 'U' || heavyBardingProf !== 'U';

  const getInfoSection = () => (
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
        <ScrollArea h={props.panelHeight - 60} scrollbars='y'>
          <Group justify='center'>
            <Box w={SECTION_WIDTH}>
              <DisplayIcon strValue={props.creature?.details.image_url} width={160} />
              <RichText ta='justify' fz='sm'>
                {props.creature?.details.description || 'No description given.'}
              </RichText>
            </Box>
          </Group>
        </ScrollArea>
      </Stack>
    </Paper>
  );

  const getLanguagesSection = () => (
    <Paper
      shadow='sm'
      p='sm'
      h='100%'
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.13)',
      }}
    >
      <Stack gap={10} h={props.panelHeight - 25}>
        <Stack gap={10}>
          <Title order={4}>Languages</Title>
          <ScrollArea h={100} scrollbars='y'>
            <Box w={SECTION_WIDTH}>
              <Pill.Group>
                {languages.map((language, index) => (
                  <Pill
                    key={index}
                    size='md'
                    styles={{
                      label: {
                        cursor: 'pointer',
                      },
                      root: {
                        border: `1px solid ${theme.colors.dark[4]}`,
                        backgroundColor: theme.colors.dark[6],
                      },
                    }}
                    onClick={() => {
                      openDrawer({
                        type: 'language',
                        data: { id: language?.id },
                        extra: { addToHistory: true },
                      });
                    }}
                  >
                    {language?.name ?? 'Unknown'}
                  </Pill>
                ))}
                {languages.length === 0 && (
                  <Text ta='center' c='gray.5' fs='italic'>
                    No languages found
                  </Text>
                )}
              </Pill.Group>
            </Box>
          </ScrollArea>
        </Stack>
        <Stack gap={10}>
          <Title order={4}>Traits</Title>
          <ScrollArea h={100} scrollbars='y'>
            <Box w={SECTION_WIDTH}>
              <Pill.Group>
                <TraitsDisplay size='lg' traitIds={[]} rarity={props.creature?.rarity} />
                {traits.map((trait, index) => (
                  <Pill
                    key={index}
                    size='md'
                    styles={{
                      label: {
                        cursor: 'pointer',
                      },
                      root: {
                        border: `1px solid ${theme.colors.dark[4]}`,
                        backgroundColor: theme.colors.dark[6],
                      },
                    }}
                    onClick={() => {
                      openDrawer({
                        type: 'trait',
                        data: { id: trait?.id },
                        extra: { addToHistory: true },
                      });
                    }}
                  >
                    {trait?.name ?? 'Unknown'}
                  </Pill>
                ))}
                {traits.length === 0 && (
                  <Text ta='center' c='gray.5' fs='italic'>
                    No traits found
                  </Text>
                )}
              </Pill.Group>
            </Box>
          </ScrollArea>
        </Stack>
        <Stack gap={10}>
          <Title order={4}>Size</Title>
          <ScrollArea h={100} scrollbars='y'>
            <Box w={SECTION_WIDTH}>
              <TraitsDisplay size='md' traitIds={[]} pfSize={convertToSize(size)} displayAll interactable />
            </Box>
          </ScrollArea>
        </Stack>
      </Stack>
    </Paper>
  );

  const getProficienciesSection = () => (
    <Paper
      shadow='sm'
      p='sm'
      h='100%'
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.13)',
      }}
    >
      <Stack gap={10}>
        <Title order={4}>Proficiencies</Title>
        <ScrollArea h={props.panelHeight - 60} scrollbars='y'>
          <Box w={SECTION_WIDTH}>
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
                          data: { id: props.id, variableName: 'SIMPLE_WEAPONS' },
                          extra: { addToHistory: true },
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
                          {compileProficiencyType(getVariable<VariableProf>(props.id, 'SIMPLE_WEAPONS')?.value)}
                        </Badge>
                      </Group>
                    </StatButton>
                    <StatButton
                      onClick={() => {
                        openDrawer({
                          type: 'stat-prof',
                          data: { id: props.id, variableName: 'MARTIAL_WEAPONS' },
                          extra: { addToHistory: true },
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
                          {compileProficiencyType(getVariable<VariableProf>(props.id, 'MARTIAL_WEAPONS')?.value)}
                        </Badge>
                      </Group>
                    </StatButton>
                    <StatButton
                      onClick={() => {
                        openDrawer({
                          type: 'stat-prof',
                          data: { id: props.id, variableName: 'ADVANCED_WEAPONS' },
                          extra: { addToHistory: true },
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
                          {compileProficiencyType(getVariable<VariableProf>(props.id, 'ADVANCED_WEAPONS')?.value)}
                        </Badge>
                      </Group>
                    </StatButton>
                    <StatButton
                      onClick={() => {
                        openDrawer({
                          type: 'stat-prof',
                          data: { id: props.id, variableName: 'UNARMED_ATTACKS' },
                          extra: { addToHistory: true },
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
                          {compileProficiencyType(getVariable<VariableProf>(props.id, 'UNARMED_ATTACKS')?.value)}
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
                    {hasBardingProf && (
                      <StatButton
                        onClick={() => {
                          openDrawer({
                            type: 'stat-prof',
                            data: { id: props.id, variableName: 'LIGHT_BARDING' },
                            extra: { addToHistory: true },
                          });
                        }}
                      >
                        <Box>
                          <Text c='gray.0' fz='sm'>
                            Light Barding
                          </Text>
                        </Box>
                        <Group>
                          <Badge variant='default'>{lightBardingProf}</Badge>
                        </Group>
                      </StatButton>
                    )}
                    {hasBardingProf && (
                      <StatButton
                        onClick={() => {
                          openDrawer({
                            type: 'stat-prof',
                            data: { id: props.id, variableName: 'HEAVY_BARDING' },
                            extra: { addToHistory: true },
                          });
                        }}
                      >
                        <Box>
                          <Text c='gray.0' fz='sm'>
                            Heavy Barding
                          </Text>
                        </Box>
                        <Group>
                          <Badge variant='default'>{heavyBardingProf}</Badge>
                        </Group>
                      </StatButton>
                    )}
                    <StatButton
                      onClick={() => {
                        openDrawer({
                          type: 'stat-prof',
                          data: { id: props.id, variableName: 'LIGHT_ARMOR' },
                          extra: { addToHistory: true },
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
                          {compileProficiencyType(getVariable<VariableProf>(props.id, 'LIGHT_ARMOR')?.value)}
                        </Badge>
                      </Group>
                    </StatButton>
                    <StatButton
                      onClick={() => {
                        openDrawer({
                          type: 'stat-prof',
                          data: { id: props.id, variableName: 'MEDIUM_ARMOR' },
                          extra: { addToHistory: true },
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
                          {compileProficiencyType(getVariable<VariableProf>(props.id, 'MEDIUM_ARMOR')?.value)}
                        </Badge>
                      </Group>
                    </StatButton>
                    <StatButton
                      onClick={() => {
                        openDrawer({
                          type: 'stat-prof',
                          data: { id: props.id, variableName: 'HEAVY_ARMOR' },
                          extra: { addToHistory: true },
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
                          {compileProficiencyType(getVariable<VariableProf>(props.id, 'HEAVY_ARMOR')?.value)}
                        </Badge>
                      </Group>
                    </StatButton>
                    <StatButton
                      onClick={() => {
                        openDrawer({
                          type: 'stat-prof',
                          data: { id: props.id, variableName: 'UNARMORED_DEFENSE' },
                          extra: { addToHistory: true },
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
                          {compileProficiencyType(getVariable<VariableProf>(props.id, 'UNARMORED_DEFENSE')?.value)}
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
                          data: { id: props.id, variableName: 'SPELL_ATTACK' },
                          extra: { addToHistory: true },
                        });
                      }}
                    >
                      <Box>
                        <Text c='gray.0' fz='sm'>
                          Spell Attack
                        </Text>
                      </Box>
                      <Group>
                        <Text c='gray.0'>{displayFinalProfValue(props.id, 'SPELL_ATTACK')}</Text>
                        <Badge variant='default'>
                          {compileProficiencyType(getVariable<VariableProf>(props.id, 'SPELL_ATTACK')?.value)}
                        </Badge>
                      </Group>
                    </StatButton>
                    <StatButton
                      onClick={() => {
                        openDrawer({
                          type: 'stat-prof',
                          data: { id: props.id, variableName: 'SPELL_DC', isDC: true },
                          extra: { addToHistory: true },
                        });
                      }}
                    >
                      <Box>
                        <Text c='gray.0' fz='sm'>
                          Spell DC
                        </Text>
                      </Box>
                      <Group>
                        <Text c='gray.0'>{displayFinalProfValue(props.id, 'SPELL_DC', true)}</Text>
                        <Badge variant='default'>
                          {compileProficiencyType(getVariable<VariableProf>(props.id, 'SPELL_DC')?.value)}
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
                              data: { id: props.id, variableName: weapon.name },
                              extra: { addToHistory: true },
                            });
                          }}
                        >
                          <Box>
                            <Text c='gray.0' fz='sm'>
                              {pluralize(variableToLabel(weapon))}
                            </Text>
                          </Box>
                          <Group>
                            <Badge variant='default'>{compileProficiencyType(weapon.value)}</Badge>
                          </Group>
                        </StatButton>
                      ))}
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>
              )}
              {weaponGroupProfs.length > 0 && (
                <Accordion.Item className={classes.item} value={'weapon-groups'}>
                  <Accordion.Control>
                    <Text c='white' fz='sm'>
                      Weapon Groups
                    </Text>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <Stack gap={5}>
                      {weaponGroupProfs.map((weapon, index) => (
                        <StatButton
                          key={index}
                          onClick={() => {
                            openDrawer({
                              type: 'stat-prof',
                              data: { id: props.id, variableName: weapon.name },
                              extra: { addToHistory: true },
                            });
                          }}
                        >
                          <Box>
                            <Text c='gray.0' fz='sm'>
                              {variableToLabel(weapon)}
                            </Text>
                          </Box>
                          <Group>
                            <Badge variant='default'>{compileProficiencyType(weapon.value)}</Badge>
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
                              data: { id: props.id, variableName: armor.name },
                              extra: { addToHistory: true },
                            });
                          }}
                        >
                          <Box>
                            <Text c='gray.0' fz='sm'>
                              {variableToLabel(armor)}
                            </Text>
                          </Box>
                          <Group>
                            <Badge variant='default'>{compileProficiencyType(armor.value)}</Badge>
                          </Group>
                        </StatButton>
                      ))}
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>
              )}
              {armorGroupProfs.length > 0 && (
                <Accordion.Item className={classes.item} value={'armor-groups'}>
                  <Accordion.Control>
                    <Text c='white' fz='sm'>
                      Armor Groups
                    </Text>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <Stack gap={5}>
                      {armorGroupProfs.map((armor, index) => (
                        <StatButton
                          key={index}
                          onClick={() => {
                            openDrawer({
                              type: 'stat-prof',
                              data: { id: props.id, variableName: armor.name },
                              extra: { addToHistory: true },
                            });
                          }}
                        >
                          <Box>
                            <Text c='gray.0' fz='sm'>
                              {variableToLabel(armor)}
                            </Text>
                          </Box>
                          <Group>
                            <Badge variant='default'>{compileProficiencyType(armor.value)}</Badge>
                          </Group>
                        </StatButton>
                      ))}
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>
              )}

              <StatButton
                onClick={() => {
                  openDrawer({
                    type: 'stat-prof',
                    data: { id: props.id, variableName: 'CLASS_DC', isDC: true },
                    extra: { addToHistory: true },
                  });
                }}
              >
                <Box>
                  <Text c='gray.0' fz='sm'>
                    Class DC
                  </Text>
                </Box>
                <Group>
                  <Text c='gray.0'>{displayFinalProfValue(props.id, 'CLASS_DC', true)}</Text>
                  <Badge variant='default'>
                    {compileProficiencyType(getVariable<VariableProf>(props.id, 'CLASS_DC')?.value)}
                  </Badge>
                </Group>
              </StatButton>
            </Accordion>
          </Box>
        </ScrollArea>
      </Stack>
    </Paper>
  );

  if (isPhone) {
    return (
      <Tabs defaultValue='information'>
        <Tabs.List style={{ flexWrap: 'nowrap' }}>
          <Tabs.Tab value='information'>Description</Tabs.Tab>
          <Tabs.Tab value='languages'>Miscellaneous</Tabs.Tab>
          <Tabs.Tab value='proficiencies'>Proficiencies</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value='information'>
          <Group justify='center'>{getInfoSection()}</Group>
        </Tabs.Panel>

        <Tabs.Panel value='languages'>
          <Group justify='center'>{getLanguagesSection()}</Group>
        </Tabs.Panel>

        <Tabs.Panel value='proficiencies'>
          <Group justify='center'>{getProficienciesSection()}</Group>
        </Tabs.Panel>
      </Tabs>
    );
  } else {
    return (
      <Group align='flex-start' justify='center'>
        {getInfoSection()}
        {getLanguagesSection()}
        {getProficienciesSection()}
      </Group>
    );
  }
}
