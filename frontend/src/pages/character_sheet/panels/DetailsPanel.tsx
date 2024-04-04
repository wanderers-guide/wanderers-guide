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
} from '@mantine/core';
import { StatButton } from '@pages/character_builder/CharBuilderCreation';
import { IconExternalLink } from '@tabler/icons-react';
import { ContentPackage } from '@typing/content';
import { VariableListStr, VariableProf } from '@typing/variables';
import { displayFinalProfValue } from '@variables/variable-display';
import {
  getVariable,
  getAllWeaponGroupVariables,
  getAllWeaponVariables,
  getAllArmorGroupVariables,
  getAllArmorVariables,
  getAllAncestryTraitVariables,
} from '@variables/variable-manager';
import { variableToLabel } from '@variables/variable-utils';
import { useRecoilState } from 'recoil';
import classes from '@css/FaqSimple.module.css';
import { isPhoneSized } from '@utils/mobile-responsive';

const SECTION_WIDTH = 280;

export default function DetailsPanel(props: { content: ContentPackage; panelHeight: number; panelWidth: number }) {
  const theme = useMantineTheme();
  const isPhone = isPhoneSized(props.panelWidth);
  const [_drawer, openDrawer] = useRecoilState(drawerState);

  const [character, setCharacter] = useRecoilState(characterState);

  const languages = (getVariable<VariableListStr>('CHARACTER', 'LANGUAGE_IDS')?.value ?? []).map((langId) => {
    const lang = props.content.languages.find((lang) => `${lang.id}` === langId);
    return lang;
  });

  const traits = getAllAncestryTraitVariables('CHARACTER').map((v) => {
    const trait = props.content.traits.find((trait) => trait.id === v.value);
    return trait;
  });

  const weaponGroupProfs = getAllWeaponGroupVariables('CHARACTER').filter((prof) => prof.value.value !== 'U');
  const weaponProfs = getAllWeaponVariables('CHARACTER').filter((prof) => prof.value.value !== 'U');

  const armorGroupProfs = getAllArmorGroupVariables('CHARACTER').filter((prof) => prof.value.value !== 'U');
  const armorProfs = getAllArmorVariables('CHARACTER').filter((prof) => prof.value.value !== 'U');

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
        <Group justify='center'>
          <Box w={SECTION_WIDTH}>
            <Title order={4}>Information</Title>
          </Box>
        </Group>
        <ScrollArea h={props.panelHeight - 60} scrollbars='y'>
          <Group justify='center'>
            <Box w={SECTION_WIDTH}>
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
                      });
                    }}
                  >
                    {language?.name ?? 'Unknown'}
                  </Pill>
                ))}
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
                      });
                    }}
                  >
                    {trait?.name ?? 'Unknown'}
                  </Pill>
                ))}
              </Pill.Group>
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
                          {getVariable<VariableProf>('CHARACTER', 'SIMPLE_WEAPONS')?.value.value}
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
                          {getVariable<VariableProf>('CHARACTER', 'MARTIAL_WEAPONS')?.value.value}
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
                          {getVariable<VariableProf>('CHARACTER', 'ADVANCED_WEAPONS')?.value.value}
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
                          {getVariable<VariableProf>('CHARACTER', 'UNARMED_ATTACKS')?.value.value}
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
                          {getVariable<VariableProf>('CHARACTER', 'LIGHT_ARMOR')?.value.value}
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
                          {getVariable<VariableProf>('CHARACTER', 'MEDIUM_ARMOR')?.value.value}
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
                          {getVariable<VariableProf>('CHARACTER', 'HEAVY_ARMOR')?.value.value}
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
                          {getVariable<VariableProf>('CHARACTER', 'UNARMORED_DEFENSE')?.value.value}
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
                        <Text c='gray.0'>{displayFinalProfValue('CHARACTER', 'SPELL_ATTACK')}</Text>
                        <Badge variant='default'>
                          {getVariable<VariableProf>('CHARACTER', 'SPELL_ATTACK')?.value.value}
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
                        <Text c='gray.0'>{displayFinalProfValue('CHARACTER', 'SPELL_DC')}</Text>
                        <Badge variant='default'>
                          {getVariable<VariableProf>('CHARACTER', 'SPELL_DC')?.value.value}
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

              <StatButton
                onClick={() => {
                  openDrawer({
                    type: 'stat-prof',
                    data: { variableName: 'CLASS_DC', isDC: true },
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
                  <Badge variant='default'>{getVariable<VariableProf>('CHARACTER', 'CLASS_DC')?.value.value}</Badge>
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
          <Tabs.Tab value='information'>Information</Tabs.Tab>
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
