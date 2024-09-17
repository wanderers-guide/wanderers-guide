import { characterState } from '@atoms/characterAtoms';
import { drawerState } from '@atoms/navAtoms';
import { ActionSymbol } from '@common/Actions';
import { EllipsisText } from '@common/EllipsisText';
import TraitsDisplay from '@common/TraitsDisplay';
import { ICON_BG_COLOR_HOVER } from '@constants/data';
import { collectCharacterAbilityBlocks } from '@content/collect-content';
import { isAbilityBlockVisible } from '@content/content-hidden';
import { isItemWeapon, handleUpdateItem, handleDeleteItem, handleMoveItem } from '@items/inv-utils';
import { getWeaponStats, parseOtherDamage } from '@items/weapon-handler';
import {
  useMantineTheme,
  Group,
  Stack,
  TextInput,
  ScrollArea,
  Badge,
  ActionIcon,
  Accordion,
  Box,
  Text,
  Tabs,
} from '@mantine/core';
import { useHover, useMediaQuery } from '@mantine/hooks';
import { StatButton } from '@pages/character_builder/CharBuilderCreation';
import { IconSearch } from '@tabler/icons-react';
import { ActionCost, Rarity, ContentPackage, Inventory, AbilityBlock, InventoryItem } from '@typing/content';
import { DrawerType } from '@typing/index';
import { findActions } from '@utils/actions';
import { isPhoneSized, mobileQuery } from '@utils/mobile-responsive';
import { sign } from '@utils/numbers';
import { toLabel } from '@utils/strings';
import { hasTraitType } from '@utils/traits';
import { displayFinalProfValue } from '@variables/variable-display';
import { getAllSkillVariables } from '@variables/variable-manager';
import { compileProficiencyType, variableToLabel } from '@variables/variable-utils';
import _ from 'lodash-es';
import { useState, useMemo, useEffect } from 'react';
import { useRecoilValue, useRecoilState } from 'recoil';

interface ActionItem {
  id: number;
  name: string;
  drawerType: DrawerType;
  drawerData: any;
  cost: ActionCost;
  level?: number;
  traits?: number[];
  rarity?: Rarity;
  skill?: string | string[] | undefined;
  leftSection?: React.ReactNode;
}
export default function SkillsActionsPanel(props: {
  content: ContentPackage;
  panelHeight: number;
  panelWidth: number;
  inventory: Inventory;
  setInventory: React.Dispatch<React.SetStateAction<Inventory>>;
}) {
  const isPhone = isPhoneSized(props.panelWidth);

  const theme = useMantineTheme();
  const character = useRecoilValue(characterState);
  const [skillsSearch, setSkillsSearch] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [_drawer, openDrawer] = useRecoilState(drawerState);

  const [actionTypeFilter, setActionTypeFilter] = useState<ActionCost | 'ALL'>('ALL');
  const [actionSectionValue, setActionSectionValue] = useState<string | null>(null);

  // This is a hack to fix a big where variables are updated on init load but the sheet state hasn't updated yet
  // const forceUpdate = useForceUpdate();
  // useEffect(() => {
  //   const timer = setTimeout(() => {
  //     forceUpdate();
  //   }, 1000);
  //   return () => clearTimeout(timer);
  // }, []);

  const actions = useMemo(() => {
    const allActions = props.content.abilityBlocks
      .filter((ab) => ab.type === 'action')
      .filter((ab) => isAbilityBlockVisible('CHARACTER', ab))
      .sort((a, b) => a.name.localeCompare(b.name));

    // Filter actions
    return searchQuery.trim() || actionTypeFilter !== 'ALL'
      ? allActions.filter((action) => {
          // Custom search, alt could be to use JsSearch here
          const query = searchQuery.trim().toLowerCase();

          const checkAction = (action: AbilityBlock) => {
            if (actionTypeFilter !== 'ALL' && action.actions !== actionTypeFilter) return false;

            if (action.name.toLowerCase().includes(query)) return true;
            //if (action.description.toLowerCase().includes(query)) return true;
            return false;
          };

          if (checkAction(action)) return true;
          return false;
        })
      : allActions;
  }, [props.content.abilityBlocks, actionTypeFilter, searchQuery]);

  const weapons = useMemo(() => {
    const weapons = props.inventory.items
      .filter((invItem) => invItem.is_equipped && isItemWeapon(invItem.item))
      .sort((a, b) => a.item.name.localeCompare(b.item.name));

    // Filter weapons
    return searchQuery.trim() || actionTypeFilter !== 'ALL'
      ? weapons.filter((invItem) => {
          // Custom search, alt could be to use JsSearch here
          const query = searchQuery.trim().toLowerCase();

          const checkInvItem = (invItem: InventoryItem) => {
            if (actionTypeFilter !== 'ALL') return false;

            if (invItem.item.name.toLowerCase().includes(query)) return true;
            return false;
          };

          if (checkInvItem(invItem)) return true;
          return false;
        })
      : weapons;
  }, [props.inventory.items, actionTypeFilter, searchQuery]);

  const [updateWeaponAttacks, setUpdateWeaponAttacks] = useState(0);
  const weaponAttacks = useMemo(() => {
    return weapons.map((invItem) => {
      const weaponStats = getWeaponStats('CHARACTER', invItem.item);
      return {
        invItem: invItem,
        leftSection: (
          <Group wrap='nowrap' gap={10} maw={300}>
            <Text c='gray.6' fz='xs' fs='italic' span>
              {sign(weaponStats.attack_bonus.total[0])}
            </Text>
            <EllipsisText c='gray.6' fz='xs' fs='italic' span>
              {weaponStats.damage.dice}
              {weaponStats.damage.die}
              {weaponStats.damage.bonus.total > 0 ? ` + ${weaponStats.damage.bonus.total}` : ``}{' '}
              {weaponStats.damage.damageType}
              {parseOtherDamage(weaponStats.damage.other)}
              {weaponStats.damage.extra ? ` + ${weaponStats.damage.extra}` : ''}
            </EllipsisText>
          </Group>
        ),
      };
    });
  }, [weapons, updateWeaponAttacks]);

  // Update the weapon attacks after character is updated (delay so operations are -roughly- executed first)
  useEffect(() => {
    setTimeout(() => {
      setUpdateWeaponAttacks((x) => x + 1);
    }, 500);
  }, [character]);

  const basicActions = useMemo(() => {
    return actions.filter(
      (a) =>
        !a.meta_data?.skill &&
        (!a.requirements || a.requirements.trim().length === 0) &&
        !hasTraitType('EXPLORATION', a.traits) &&
        !hasTraitType('DOWNTIME', a.traits)
    );
  }, [actions]);

  const basicSpecialityActions = useMemo(() => {
    return actions.filter((a) => !a.meta_data?.skill && a.requirements && a.requirements.trim().length > 0);
  }, [actions]);

  const skillActions = useMemo(() => {
    // const skillActions: { [key: string]: AbilityBlock[] } = {};
    // for (const action of actions.filter((a) => a.meta_data?.skill)) {
    //   const skills = Array.isArray(action.meta_data!.skill!) ? action.meta_data!.skill! : [action.meta_data!.skill!];
    //   for (const sss of skills) {
    //     for (const ss of sss.split(',')) {
    //       const skill = ss.trim();
    //       if (!skillActions[skill]) {
    //         skillActions[skill] = [];
    //       }
    //       skillActions[skill].push(action);
    //     }
    //   }
    // }

    // // Sort by skill name
    // const sortedSkillActions: { [key: string]: AbilityBlock[] } = {};
    // Object.keys(skillActions)
    //   .sort()
    //   .forEach((key) => {
    //     sortedSkillActions[key] = skillActions[key];
    //   });

    // // Merge to single array
    // const mergedSkillActions: AbilityBlock[] = [];
    // for (const key in sortedSkillActions) {
    //   mergedSkillActions.push(...sortedSkillActions[key]);
    // }

    // // Remove dupes
    // const uniqueMergedSkillActions = mergedSkillActions.filter(
    //   (action, index, self) => index === self.findIndex((t) => t.id === action.id)
    // );

    return actions.filter((a) => a.meta_data?.skill);
  }, [actions]);

  const explorationActions = useMemo(() => {
    let explorationFeats: AbilityBlock[] = [];
    if (character) {
      const results = collectCharacterAbilityBlocks(character, props.content.abilityBlocks);
      explorationFeats = _.flattenDeep(Object.values(results)).filter((ab) => hasTraitType('EXPLORATION', ab.traits));
    }
    return [...actions.filter((a) => hasTraitType('EXPLORATION', a.traits)), ...explorationFeats].sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [actions, props.content.abilityBlocks, character]);

  const downtimeActions = useMemo(() => {
    let downtimeFeats: AbilityBlock[] = [];
    if (character) {
      const results = collectCharacterAbilityBlocks(character, props.content.abilityBlocks);
      downtimeFeats = _.flattenDeep(Object.values(results)).filter((ab) => hasTraitType('DOWNTIME', ab.traits));
    }
    return [...actions.filter((a) => hasTraitType('DOWNTIME', a.traits)), ...downtimeFeats].sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [actions, props.content.abilityBlocks, character]);

  const itemsWithActions = useMemo(() => {
    const actionItems = props.inventory.items.filter((invItem) => {
      return findActions(invItem.item.description).length > 0;
    });

    // Filter items
    return searchQuery.trim() || actionTypeFilter !== 'ALL'
      ? actionItems.filter((invItem) => {
          // Custom search, alt could be to use JsSearch here
          const query = searchQuery.trim().toLowerCase();

          const checkInvItem = (invItem: InventoryItem) => {
            if (actionTypeFilter !== 'ALL') {
              const actions = findActions(invItem.item.description);
              const hasAction = actions.find((action) => action === actionTypeFilter);
              if (!hasAction) return false;
            }
            if (invItem.item.name.toLowerCase().includes(query)) return true;
            if (invItem.item.description.toLowerCase().includes(query)) return true;
            if (invItem.item.group.toLowerCase().includes(query)) return true;
            return false;
          };

          if (checkInvItem(invItem)) return true;
          if (invItem.container_contents.some((containedItem) => checkInvItem(containedItem))) return true;
          return false;
        })
      : actionItems;
  }, [props.inventory.items, actionTypeFilter, searchQuery]);

  const featsWithActions = useMemo(() => {
    if (!character) return [];
    const results = collectCharacterAbilityBlocks(character, props.content.abilityBlocks);
    const feats = _.flattenDeep(Object.values(results)).filter((ab) => ab.actions !== null);

    // Filter feats
    return searchQuery.trim() || actionTypeFilter !== 'ALL'
      ? feats.filter((feat) => {
          // Custom search, alt could be to use JsSearch here
          const query = searchQuery.trim().toLowerCase();

          const checkFeat = (feat: AbilityBlock) => {
            if (actionTypeFilter !== 'ALL' && feat.actions !== actionTypeFilter) return false;

            if (feat.name.toLowerCase().includes(query)) return true;
            return false;
          };

          if (checkFeat(feat)) return true;
          return false;
        })
      : feats;
  }, [character, props.content.abilityBlocks, actionTypeFilter, searchQuery]);

  const getSkillsSection = () => (
    <Box>
      {/* <Paper
          shadow='sm'
          h='100%'
          p={10}
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.13)',
          }}
        ></Paper> */}
      <Stack gap={5}>
        <TextInput
          style={{ flex: 1 }}
          leftSection={<IconSearch size='0.9rem' />}
          placeholder={`Search skills`}
          onChange={(event) => setSkillsSearch(event.target.value)}
          styles={{
            input: {
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              borderColor: skillsSearch.trim().length > 0 ? theme.colors['guide'][8] : undefined,
            },
          }}
        />
        <ScrollArea h={props.panelHeight - 50} scrollbars='y'>
          <Stack gap={5}>
            {getAllSkillVariables('CHARACTER')
              .filter((skill) => skill.name !== 'SKILL_LORE____')
              .filter(
                (skill) =>
                  variableToLabel(skill) // Normal filter by query
                    .toLowerCase()
                    .includes(skillsSearch.toLowerCase().trim()) || // If it starts with "Strength" find those skills
                  toLabel(skill.value.attribute ?? '')
                    .toLowerCase()
                    .endsWith(skillsSearch.toLowerCase().trim()) || // If it starrts with "Str" find those skills
                  skill.value.attribute?.toLowerCase().endsWith(skillsSearch.toLowerCase().trim())
              )
              .map((skill, index) => (
                <StatButton
                  key={index}
                  onClick={() => {
                    openDrawer({
                      type: 'stat-prof',
                      data: { variableName: skill.name },
                    });
                  }}
                >
                  <Box>
                    <Text c='gray.0' fz='sm'>
                      {variableToLabel(skill)}
                    </Text>
                  </Box>
                  <Group wrap='nowrap'>
                    <Text c='gray.0'>{displayFinalProfValue('CHARACTER', skill.name)}</Text>
                    <Badge variant='default'>{compileProficiencyType(skill?.value)}</Badge>
                  </Group>
                </StatButton>
              ))}
          </Stack>
        </ScrollArea>
      </Stack>
    </Box>
  );

  const getActionsSection = () => (
    <Box>
      <Stack gap={5}>
        <Group>
          <TextInput
            style={{ flex: 1 }}
            leftSection={<IconSearch size='0.9rem' />}
            placeholder={`Search actions & activities`}
            onChange={(event) => setSearchQuery(event.target.value)}
            styles={{
              input: {
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                borderColor: searchQuery.trim().length > 0 ? theme.colors['guide'][8] : undefined,
              },
            }}
          />
          <Group gap={5}>
            <ActionIcon
              variant='subtle'
              color='dark'
              radius='xl'
              size='lg'
              aria-label='Filter One Action'
              style={{
                backgroundColor: actionTypeFilter === 'ALL' ? theme.colors.dark[6] : undefined,
                borderColor: actionTypeFilter === 'ALL' ? theme.colors.dark[4] : undefined,
              }}
              onClick={() => {
                setActionTypeFilter('ALL');
              }}
            >
              <Text c='gray.3'>All</Text>
            </ActionIcon>
            <ActionIcon
              variant='subtle'
              color='dark'
              radius='xl'
              size='lg'
              aria-label='Filter One Action'
              style={{
                backgroundColor: actionTypeFilter === 'ONE-ACTION' ? theme.colors.dark[6] : undefined,
                borderColor: actionTypeFilter === 'ONE-ACTION' ? theme.colors['guide'][8] : undefined,
              }}
              onClick={() => {
                setActionTypeFilter('ONE-ACTION');
              }}
            >
              <ActionSymbol cost={'ONE-ACTION'} size={'1.9rem'} />
            </ActionIcon>
            <ActionIcon
              variant='subtle'
              color='dark'
              radius='xl'
              size='lg'
              aria-label='Filter Two Actions'
              style={{
                backgroundColor: actionTypeFilter === 'TWO-ACTIONS' ? theme.colors.dark[6] : undefined,
                borderColor: actionTypeFilter === 'TWO-ACTIONS' ? theme.colors['guide'][8] : undefined,
              }}
              onClick={() => {
                setActionTypeFilter('TWO-ACTIONS');
              }}
            >
              <ActionSymbol cost={'TWO-ACTIONS'} size={'1.9rem'} />
            </ActionIcon>
            <ActionIcon
              variant='subtle'
              color='dark'
              radius='xl'
              size='lg'
              aria-label='Filter Three Actions'
              style={{
                backgroundColor: actionTypeFilter === 'THREE-ACTIONS' ? theme.colors.dark[6] : undefined,
                borderColor: actionTypeFilter === 'THREE-ACTIONS' ? theme.colors['guide'][8] : undefined,
              }}
              onClick={() => {
                setActionTypeFilter('THREE-ACTIONS');
              }}
            >
              <ActionSymbol cost={'THREE-ACTIONS'} size={'1.9rem'} />
            </ActionIcon>
            <ActionIcon
              variant='subtle'
              color='dark'
              radius='xl'
              size='lg'
              aria-label='Filter Free Action'
              style={{
                backgroundColor: actionTypeFilter === 'FREE-ACTION' ? theme.colors.dark[6] : undefined,
                borderColor: actionTypeFilter === 'FREE-ACTION' ? theme.colors['guide'][8] : undefined,
              }}
              onClick={() => {
                setActionTypeFilter('FREE-ACTION');
              }}
            >
              <ActionSymbol cost={'FREE-ACTION'} size={'1.9rem'} />
            </ActionIcon>
            <ActionIcon
              variant='subtle'
              color='dark'
              radius='xl'
              size='lg'
              aria-label='Filter Reaction'
              style={{
                backgroundColor: actionTypeFilter === 'REACTION' ? theme.colors.dark[6] : undefined,
                borderColor: actionTypeFilter === 'REACTION' ? theme.colors['guide'][8] : undefined,
              }}
              onClick={() => {
                setActionTypeFilter('REACTION');
              }}
            >
              <ActionSymbol cost={'REACTION'} size={'1.9rem'} />
            </ActionIcon>
          </Group>
        </Group>
        <ScrollArea h={props.panelHeight - 50} scrollbars='y'>
          <Accordion
            value={actionSectionValue}
            onChange={setActionSectionValue}
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
            <ActionAccordionItem
              id='weapon-attacks'
              title='Weapon Attacks'
              isPhone={isPhone}
              opened={actionSectionValue === 'weapon-attacks'}
              actions={weaponAttacks.map((weapon) => {
                return {
                  id: parseInt(weapon.invItem.id),
                  name: weapon.invItem.item.name,
                  drawerType: 'inv-item',
                  drawerData: {
                    zIndex: 100,
                    invItem: _.cloneDeep(weapon.invItem),
                    onItemUpdate: (newInvItem: InventoryItem) => {
                      handleUpdateItem(props.setInventory, newInvItem);
                    },
                    onItemDelete: (newInvItem: InventoryItem) => {
                      handleDeleteItem(props.setInventory, newInvItem);
                      openDrawer(null);
                    },
                    onItemMove: (invItem: InventoryItem, containerItem: InventoryItem | null) => {
                      handleMoveItem(props.setInventory, invItem, containerItem);
                    },
                  },
                  cost: null,
                  traits: weapon.invItem.item.traits,
                  rarity: weapon.invItem.item.rarity,
                  leftSection: weapon.leftSection,
                };
              })}
            />
            <ActionAccordionItem
              id='feats'
              title='Feats (with Actions)'
              isPhone={isPhone}
              opened={actionSectionValue === 'feats'}
              actions={featsWithActions.map((feat) => {
                return {
                  id: feat.id,
                  name: feat.name,
                  drawerType: feat.type,
                  drawerData: { id: feat.id },
                  cost: feat.actions,
                  traits: feat.traits,
                  rarity: feat.rarity,
                  skill: feat.meta_data?.skill,
                };
              })}
            />
            <ActionAccordionItem
              id='items'
              title='Items (with Actions)'
              isPhone={isPhone}
              opened={actionSectionValue === 'items'}
              actions={
                itemsWithActions
                  .map((invItem) => {
                    const actions = findActions(invItem.item.description);
                    const action = actions.length > 0 ? actions[0] : 'ONE-ACTION';

                    // if (action === 'ONE-ACTION' && isItemWeapon(invItem.item) && invItem.is_equipped) {
                    //   // It's a weapon with one action, we already have a section for weapons
                    //   return null;
                    // }

                    return {
                      id: parseInt(invItem.id),
                      name: invItem.item.name,
                      drawerType: 'inv-item',
                      drawerData: {
                        zIndex: 100,
                        invItem: _.cloneDeep(invItem),
                        onItemUpdate: (newInvItem: InventoryItem) => {
                          handleUpdateItem(props.setInventory, newInvItem);
                        },
                        onItemDelete: (newInvItem: InventoryItem) => {
                          handleDeleteItem(props.setInventory, newInvItem);
                          openDrawer(null);
                        },
                        onItemMove: (invItem: InventoryItem, containerItem: InventoryItem | null) => {
                          handleMoveItem(props.setInventory, invItem, containerItem);
                        },
                      },
                      cost: action,
                      traits: invItem.item.traits,
                      rarity: invItem.item.rarity,
                    };
                  })
                  .filter((a) => a) as ActionItem[]
              }
            />
            <ActionAccordionItem
              id='basic-actions'
              title='Basic Actions'
              isPhone={isPhone}
              opened={actionSectionValue === 'basic-actions'}
              actions={basicActions.map((action) => {
                return {
                  id: action.id,
                  name: action.name,
                  drawerType: 'action',
                  drawerData: { id: action.id },
                  cost: action.actions,
                  traits: action.traits,
                  rarity: action.rarity,
                  skill: action.meta_data?.skill,
                };
              })}
            />
            <ActionAccordionItem
              id='skill-actions'
              title='Skill Actions'
              isPhone={isPhone}
              opened={actionSectionValue === 'skill-actions'}
              actions={skillActions.map((action) => {
                return {
                  id: action.id,
                  name: action.name,
                  drawerType: 'action',
                  drawerData: { id: action.id },
                  cost: action.actions,
                  traits: action.traits,
                  rarity: action.rarity,
                  skill: action.meta_data?.skill,
                };
              })}
            />
            <ActionAccordionItem
              id='speciality-basic-actions'
              title='Speciality Basics'
              isPhone={isPhone}
              opened={actionSectionValue === 'speciality-basic-actions'}
              actions={basicSpecialityActions.map((action) => {
                return {
                  id: action.id,
                  name: action.name,
                  drawerType: 'action',
                  drawerData: { id: action.id },
                  cost: action.actions,
                  traits: action.traits,
                  rarity: action.rarity,
                  skill: action.meta_data?.skill,
                };
              })}
            />
            <ActionAccordionItem
              id='exploration-activities'
              title='Exploration Activities'
              isPhone={isPhone}
              opened={actionSectionValue === 'exploration-activities'}
              actions={explorationActions.map((action) => {
                return {
                  id: action.id,
                  name: action.name,
                  drawerType: 'action',
                  drawerData: { id: action.id },
                  cost: action.actions,
                  traits: action.traits,
                  rarity: action.rarity,
                  skill: action.meta_data?.skill,
                };
              })}
            />
            <ActionAccordionItem
              id='downtime-activities'
              title='Downtime Activities'
              isPhone={isPhone}
              opened={actionSectionValue === 'downtime-activities'}
              actions={downtimeActions.map((action) => {
                return {
                  id: action.id,
                  name: action.name,
                  drawerType: 'action',
                  drawerData: { id: action.id },
                  cost: action.actions,
                  traits: action.traits,
                  rarity: action.rarity,
                  skill: action.meta_data?.skill,
                };
              })}
            />
          </Accordion>
        </ScrollArea>
      </Stack>
    </Box>
  );

  if (isPhone) {
    return (
      <Tabs defaultValue='skills' style={{ minHeight: props.panelHeight }}>
        <Tabs.List style={{ flexWrap: 'nowrap' }} grow>
          <Tabs.Tab value='skills'>Skills</Tabs.Tab>
          <Tabs.Tab value='actions'>Actions / Abilities</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value='skills' pt={5}>
          {getSkillsSection()}
        </Tabs.Panel>

        <Tabs.Panel value='actions' pt={5}>
          {getActionsSection()}
        </Tabs.Panel>
      </Tabs>
    );
  } else {
    return (
      <Group gap={10} align='flex-start' justify='center' style={{ minHeight: props.panelHeight }}>
        <Box style={{ flexBasis: 'calc(30% - 10px)' }} h='100%'>
          {getSkillsSection()}
        </Box>
        <Box style={{ flexBasis: '70%' }} h='100%'>
          {getActionsSection()}
        </Box>
      </Group>
    );
  }
}

function ActionAccordionItem(props: {
  id: string;
  title: string;
  opened: boolean;
  actions: ActionItem[];
  isPhone?: boolean;
}) {
  const theme = useMantineTheme();
  const [subSectionValue, setSubSectionValue] = useState<string | null>(null);
  const { hovered, ref } = useHover();

  if (props.actions.length === 0) return null;

  return (
    <Accordion.Item
      ref={ref}
      value={props.id}
      style={{
        backgroundColor: hovered && !props.opened ? ICON_BG_COLOR_HOVER : undefined,
      }}
    >
      <Accordion.Control>
        <Group wrap='nowrap' justify='space-between' gap={0}>
          <Text c='gray.5' fw={700} fz='sm'>
            {props.title}
          </Text>
          <Badge mr='sm' variant='outline' color='gray.5' size='xs'>
            <Text fz='sm' c='gray.5' span>
              {props.actions.length}
            </Text>
          </Badge>
        </Group>
      </Accordion.Control>
      <Accordion.Panel>
        <Stack gap={5}>
          {props.actions.map((action, index) => (
            <ActionSelectionOption key={index} action={action} onClick={() => {}} isPhone={props.isPhone} />
          ))}
        </Stack>
      </Accordion.Panel>
    </Accordion.Item>
  );
}

function ActionSelectionOption(props: {
  action: ActionItem;
  onClick: (action: ActionItem) => void;
  isPhone?: boolean;
}) {
  const theme = useMantineTheme();
  const { hovered, ref } = useHover();
  const [_drawer, openDrawer] = useRecoilState(drawerState);

  return (
    <StatButton
      darkVersion
      onClick={() => {
        openDrawer({ type: props.action.drawerType, data: props.action.drawerData });
      }}
    >
      <Group
        ref={ref}
        py='sm'
        style={{
          cursor: 'pointer',
          borderBottom: '1px solid ' + theme.colors.dark[6],
          // backgroundColor: hovered ? theme.colors.dark[6] : 'transparent',
          position: 'relative',
        }}
        onClick={() => props.onClick(props.action)}
        justify='space-between'
        w='100%'
        wrap='nowrap'
      >
        {props.action.level && (
          <Text
            fz={10}
            c='dimmed'
            ta='right'
            w={14}
            style={{
              position: 'absolute',
              top: 15,
              left: 1,
            }}
          >
            {props.action.level}.
          </Text>
        )}
        <Group wrap='nowrap' gap={5}>
          <Box pl={8}>
            <Text fz='sm'>{props.action.name}</Text>
          </Box>
          <Box>
            <ActionSymbol cost={props.action.cost} />
          </Box>
          {props.action.leftSection && <Box>{props.action.leftSection}</Box>}
        </Group>
        {!props.isPhone && (
          <Group wrap='nowrap' justify='flex-end' style={{ marginLeft: 'auto' }}>
            <Box>
              <TraitsDisplay
                justify='flex-end'
                size='xs'
                traitIds={props.action.traits ?? []}
                rarity={props.action.rarity}
                skill={props.action.skill}
              />
            </Box>
          </Group>
        )}
      </Group>
    </StatButton>
  );
}
