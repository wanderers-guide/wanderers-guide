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
  Textarea,
  Pill,
  Accordion,
  Badge,
  Box,
  Text,
  Tabs,
  Autocomplete,
  NumberInput,
  Select,
  SimpleGrid,
  Button,
  Center,
} from '@mantine/core';
import { StatButton } from '@pages/character_builder/CharBuilderCreation';
import { IconExternalLink } from '@tabler/icons-react';
import { ContentPackage, Creature, LivingEntity, PublicUser } from '@typing/content';
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
import { SetterOrUpdater, useRecoilState, useRecoilValue } from 'recoil';
import classes from '@css/FaqSimple.module.css';
import { isPhoneSized } from '@utils/mobile-responsive';
import { useDebouncedState, useDebouncedValue, useDidUpdate } from '@mantine/hooks';
import { makeRequest } from '@requests/request-manager';
import { useMutation } from '@tanstack/react-query';
import { JSendResponse } from '@typing/requests';
import { useState } from 'react';
import { getCachedPublicUser, getPublicUser } from '@auth/user-manager';
import { CreateSocietyAdventureEntryModal } from '@modals/CreateSocietyAdventureEntryModal';
import _ from 'lodash-es';
import { Money, getGpGained } from '@utils/money';
import { pluralize } from '@utils/strings';
import RichText from '@common/RichText';
import TraitsDisplay from '@common/TraitsDisplay';

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
              <TraitsDisplay
                size='md'
                traitIds={[]}
                // @ts-ignore
                pfSize={size?.toUpperCase() || 'MEDIUM'}
                displayAll
                interactable
              />
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
                        <Text c='gray.0'>{displayFinalProfValue(props.id, 'SPELL_DC')}</Text>
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
          <Tabs.Tab value='languages'>Languages</Tabs.Tab>
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

function OrgPlaySection(props: { setDebouncedInfo: (info: any) => void }) {
  const character = useRecoilValue(characterState);

  const [openedAdventureId, setOpenedAdventureId] = useState<string | null>(null);
  const [user, setUser] = useState<PublicUser | null>(getCachedPublicUser());

  const { mutate: mutateUser } = useMutation(
    async (data: Record<string, any>) => {
      const response = await makeRequest('update-user', {
        ...data,
      });
      return response;
    },
    {
      onSuccess: () => {
        // Stores to cache again
        getPublicUser();
      },
    }
  );

  // Update user in db when state changed
  const [debouncedUser] = useDebouncedValue(user, 200);
  useDidUpdate(() => {
    if (!debouncedUser) return;
    mutateUser({
      organized_play_id: debouncedUser.organized_play_id,
    });
  }, [debouncedUser]);

  return (
    <Stack gap={5}>
      <TextInput
        label='Organized Play ID'
        placeholder='12345678-2000'
        defaultValue={
          character?.details?.info?.organized_play_id || (user?.organized_play_id ? user?.organized_play_id + '-2' : '')
        }
        onChange={(e) => {
          if (!character || !user) return;
          props.setDebouncedInfo({
            ...character.details?.info,
            organized_play_id: e.target.value,
          });
          setUser({ ...user, organized_play_id: e.target.value?.split('-')[0] });
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
      <Group wrap='nowrap'>
        <Autocomplete
          label='Faction'
          placeholder='Faction'
          data={[
            `Envoy's Alliance`,
            'Grand Archive',
            'Horizon Hunters',
            'Radiant Oath',
            'Verdant Wheel',
            'Vigilant Sea',
          ]}
          defaultValue={character?.details?.info?.faction}
          onChange={(val) => {
            if (!character) return;
            props.setDebouncedInfo({
              ...character.details?.info,
              faction: val,
            });
          }}
        />
        <NumberInput
          w='30%'
          label='Rep'
          placeholder='Rep'
          defaultValue={character?.details?.info?.reputation}
          onChange={(val) => {
            if (!character) return;
            props.setDebouncedInfo({
              ...character.details?.info,
              reputation: parseInt(`${val}`),
            });
          }}
        />
      </Group>
      <Divider my='sm' />
      <Paper
        withBorder
        p='xs'
        style={{
          backgroundColor: `#212226`,
        }}
      >
        <Group wrap='nowrap' justify='space-between'>
          <Group wrap='nowrap' gap={5}>
            <Text px={5} fz='lg'>
              Adventures
            </Text>
            <Badge size='sm' variant='light' circle>
              <Text fz='xs'>{(character?.details?.info?.organized_play_adventures ?? []).length}</Text>
            </Badge>
          </Group>
          <Button
            size='compact-sm'
            variant='filled'
            radius={'xl'}
            onClick={() => {
              setOpenedAdventureId('-1');
            }}
          >
            Add
          </Button>
        </Group>
        <Divider my={8} />
        <SimpleGrid cols={4} spacing={0}>
          <Stack gap={0}>
            <Text ta='center'>Lvl</Text>
            <Center>
              <Badge size='lg' variant='light'>
                <Text fz='sm'>
                  {1 +
                    Math.floor(
                      (character?.details?.info?.organized_play_adventures ?? []).reduce(
                        (acc, a) => acc + (a.xp_gained ?? 0),
                        0
                      ) / 12
                    )}
                </Text>
              </Badge>
            </Center>
          </Stack>
          <Stack gap={0}>
            <Text ta='center'>XP</Text>
            <Center>
              <Badge size='lg' variant='light'>
                <Text fz='sm'>
                  {(character?.details?.info?.organized_play_adventures ?? []).reduce(
                    (acc, a) => acc + (a.xp_gained ?? 0),
                    0
                  ) % 12}
                </Text>
              </Badge>
            </Center>
          </Stack>
          <Stack gap={0}>
            <Text ta='center'>GP</Text>
            <Center>
              <Badge size='lg' variant='light'>
                <Text fz='sm'>
                  {
                    (character?.details?.info?.organized_play_adventures ?? []).reduce(
                      (acc, a) => acc.add(getGpGained(a)),
                      new Money(0)
                    ).value
                  }
                </Text>
              </Badge>
            </Center>
          </Stack>
          <Stack gap={0}>
            <Text ta='center'>Rep</Text>
            <Center>
              <Badge size='lg' variant='light'>
                <Text fz='sm'>
                  {(character?.details?.info?.organized_play_adventures ?? []).reduce(
                    (acc, a) => acc + (a.rep_gained ?? 0),
                    0
                  )}
                </Text>
              </Badge>
            </Center>
          </Stack>
        </SimpleGrid>
      </Paper>
      <Stack pt={5}>
        <Accordion
          variant='separated'
          defaultValue='options'
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
          {character?.details?.info?.organized_play_adventures?.map((adventure, index) => (
            <Accordion.Item value={`${index}`} key={index}>
              <Accordion.Control>
                <Group wrap='nowrap' justify='space-between' pr='xs'>
                  {adventure.event_code !== '' ? (
                    <Text fz='md'>
                      {adventure.event_code}: {adventure.name}
                    </Text>
                  ) : (
                    <Text fz='md'>{adventure.name}</Text>
                  )}
                  <Button
                    size='compact-xs'
                    variant='light'
                    radius={'xl'}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setOpenedAdventureId(`${adventure.id}`);
                    }}
                  >
                    Details
                  </Button>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <SimpleGrid cols={4}>
                  <Stack gap={0}>
                    <Text ta='center'>Lvl</Text>
                    <Text ta='center' fw={600}>
                      {adventure.character_level}
                    </Text>
                  </Stack>
                  <Stack gap={0}>
                    <Text ta='center'>+XP</Text>
                    <Text ta='center' fw={600}>
                      {adventure.xp_gained}
                    </Text>
                  </Stack>
                  <Stack gap={0}>
                    <Text ta='center'>+GP</Text>
                    <Text ta='center' fw={600}>
                      {getGpGained(adventure).value}
                    </Text>
                  </Stack>
                  <Stack gap={0}>
                    <Text ta='center'>+Rep</Text>
                    <Text ta='center' fw={600}>
                      {adventure.rep_gained}
                    </Text>
                  </Stack>
                </SimpleGrid>
                <Divider my={8} />
                <Group wrap='nowrap' justify='space-between' mx='xs'>
                  <Text fz='sm'>{adventure.event}</Text>
                  <Text fz='sm'>{adventure.date ? new Date(adventure.date).toLocaleDateString() : undefined}</Text>
                </Group>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      </Stack>
      {!!openedAdventureId && (
        <CreateSocietyAdventureEntryModal
          opened={true}
          editEntry={character?.details?.info?.organized_play_adventures?.find((a) => `${a.id}` === openedAdventureId)}
          onComplete={async (entry) => {
            const adventures = _.cloneDeep(character?.details?.info?.organized_play_adventures ?? []);

            const existing = adventures.find((a) => a.id === entry.id);
            if (existing) {
              Object.assign(existing, entry);
            } else {
              adventures.push({
                ...entry,
                character_level: entry.character_level ?? character?.level,
              });
            }
            props.setDebouncedInfo({
              ...character?.details?.info,
              organized_play_adventures: adventures,
            });
            setOpenedAdventureId(null);
          }}
          onDelete={() => {
            props.setDebouncedInfo({
              ...character?.details?.info,
              organized_play_adventures: (character?.details?.info?.organized_play_adventures ?? []).filter(
                (a) => `${a.id}` !== openedAdventureId
              ),
            });
            setOpenedAdventureId(null);
          }}
          onCancel={() => {
            setOpenedAdventureId(null);
          }}
        />
      )}
    </Stack>
  );
}
