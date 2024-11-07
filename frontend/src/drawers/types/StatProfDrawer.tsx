import { drawerState } from '@atoms/navAtoms';
import { ActionSymbol } from '@common/Actions';
import IndentedText from '@common/IndentedText';
import RichText from '@common/RichText';
import TraitsDisplay from '@common/TraitsDisplay';
import { ActionSelectionOption, FeatSelectionOption } from '@common/select/SelectContent';
import { TEXT_INDENT_AMOUNT } from '@constants/data';
import { fetchContentAll, fetchContentById } from '@content/content-store';
import { convertToHardcodedLink } from '@content/hardcoded-links';
import {
  Title,
  Text,
  Image,
  Loader,
  Group,
  Divider,
  Stack,
  Box,
  Flex,
  Badge,
  Accordion,
  Kbd,
  Timeline,
  HoverCard,
  List,
} from '@mantine/core';
import {
  IconBadgesFilled,
  IconBlockquote,
  IconCaretLeftRight,
  IconFrame,
  IconGitBranch,
  IconGitCommit,
  IconGitPullRequest,
  IconMathSymbols,
  IconMessageDots,
  IconPlusMinus,
  IconTimeline,
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { AbilityBlock } from '@typing/content';
import { StoreID, VariableBool, VariableProf } from '@typing/variables';
import { sign } from '@utils/numbers';
import { toLabel } from '@utils/strings';
import { displayFinalProfValue, getBonusText, getProfValueParts } from '@variables/variable-display';
import { getVariable, getVariableBonuses, getVariableHistory } from '@variables/variable-manager';
import {
  compileProficiencyType,
  getProficiencyTypeValue,
  isProficiencyType,
  isProficiencyValue,
  labelToVariable,
  proficiencyTypeToLabel,
  variableToLabel,
} from '@variables/variable-utils';
import * as _ from 'lodash-es';
import { useRecoilState } from 'recoil';
import { titleCase } from 'title-case';

export function StatProfDrawerTitle(props: { data: { id: StoreID; variableName: string; isDC?: boolean } }) {
  const variable = getVariable<VariableProf>(props.data.id, props.data.variableName);

  return (
    <>
      {variable && (
        <Group justify='space-between' wrap='nowrap'>
          <Group wrap='nowrap' gap={10}>
            <Box>
              <Title order={3}>{titleCase(variableToLabel(variable))}</Title>
            </Box>
          </Group>
          <Box>
            <Badge>{proficiencyTypeToLabel(compileProficiencyType(variable.value))}</Badge>
          </Box>
        </Group>
      )}
    </>
  );
}

export function StatProfDrawerContent(props: { data: { id: StoreID; variableName: string; isDC?: boolean } }) {
  const variable = getVariable<VariableProf>(props.data.id, props.data.variableName);
  if (!variable) return null;

  // Breakdown
  const parts = getProfValueParts(props.data.id, variable.name)!;

  // Timeline
  const history = getVariableHistory(props.data.id, variable.name);
  const bonuses = getVariableBonuses(props.data.id, variable.name);

  let timeline: {
    type: 'BONUS' | 'ADJUSTMENT';
    title: string;
    description: string;
    timestamp: number;
  }[] = [];
  for (const hist of history) {
    const from = isProficiencyValue(hist.from) ? proficiencyTypeToLabel(compileProficiencyType(hist.from)) : hist.from;
    const to = isProficiencyValue(hist.to) ? proficiencyTypeToLabel(compileProficiencyType(hist.to)) : hist.to;
    if (from === to) continue;
    timeline.push({
      type: 'ADJUSTMENT',
      title: from ? `${from} → ${to}` : `${to}`,
      description: `From ${hist.source}`,
      timestamp: hist.timestamp,
    });
  }
  for (const bonus of bonuses) {
    timeline.push({
      type: 'BONUS',
      title: getBonusText(bonus),
      description: `From ${bonus.source}`,
      timestamp: bonus.timestamp,
    });
  }
  timeline = timeline.sort((a, b) => a.timestamp - b.timestamp);

  const profWithoutLevel = !!getVariable<VariableBool>('CHARACTER', 'PROF_WITHOUT_LEVEL')?.value;

  return (
    <Box>
      <Accordion variant='separated' defaultValue=''>
        <Accordion.Item value='description'>
          <Accordion.Control icon={<IconBlockquote size='1rem' />}>Description</Accordion.Control>
          <Accordion.Panel>
            <RichText ta='justify' store={props.data.id}>
              {getProfDescription(props.data.variableName)}
            </RichText>
          </Accordion.Panel>
        </Accordion.Item>

        {props.data.variableName.startsWith('SKILL_') && (
          <Accordion.Item value='skill-actions'>
            <Accordion.Control icon={<IconCaretLeftRight size='1rem' />}>Skill Actions</Accordion.Control>
            <Accordion.Panel>
              <SkillActionsSection variableName={props.data.variableName} />
            </Accordion.Panel>
          </Accordion.Item>
        )}

        {(variable.value.attribute || parts.attributeMod) && (
          <Accordion.Item value='breakdown'>
            <Accordion.Control icon={<IconMathSymbols size='1rem' />}>Breakdown</Accordion.Control>
            <Accordion.Panel>
              <Group gap={8} align='center'>
                {displayFinalProfValue(props.data.id, variable.name, props.data.isDC)} = {props.data.isDC && <>10 + </>}
                <HoverCard shadow='md' openDelay={250} width={230} position='bottom' zIndex={10000} withArrow>
                  <HoverCard.Target>
                    <Kbd style={{ cursor: 'pointer' }}>{parts.profValue}</Kbd>
                  </HoverCard.Target>
                  <HoverCard.Dropdown py={5} px={10}>
                    <Text c='gray.0' size='xs'>
                      You're {proficiencyTypeToLabel(compileProficiencyType(variable.value)).toLowerCase()} in this
                      proficiency, resulting in a{' '}
                      {sign(getProficiencyTypeValue(compileProficiencyType(variable.value)))} bonus.
                    </Text>
                  </HoverCard.Dropdown>
                </HoverCard>
                +
                <HoverCard shadow='md' openDelay={250} width={230} position='bottom' zIndex={10000} withArrow>
                  <HoverCard.Target>
                    <Kbd style={{ cursor: 'pointer' }}>{parts.level}</Kbd>
                  </HoverCard.Target>
                  <HoverCard.Dropdown py={5} px={10}>
                    <Text c='gray.0' size='xs'>
                      {profWithoutLevel ? (
                        <>
                          {compileProficiencyType(variable.value) === 'U' ? (
                            <>
                              Because you're{' '}
                              {proficiencyTypeToLabel(compileProficiencyType(variable.value)).toLowerCase()} in this
                              proficiency, you have a -2 modifier because of your variant rule.
                            </>
                          ) : (
                            <>
                              Even though you're{' '}
                              {proficiencyTypeToLabel(compileProficiencyType(variable.value)).toLowerCase()} in this
                              proficiency, you don't add your level because of your variant rule.
                            </>
                          )}
                        </>
                      ) : (
                        <>
                          {compileProficiencyType(variable.value) === 'U' ? (
                            <>
                              Because you're{' '}
                              {proficiencyTypeToLabel(compileProficiencyType(variable.value)).toLowerCase()} in this
                              proficiency, you don't add your level.
                            </>
                          ) : (
                            <>
                              Because you're{' '}
                              {proficiencyTypeToLabel(compileProficiencyType(variable.value)).toLowerCase()} in this
                              proficiency, you add your level.
                            </>
                          )}
                        </>
                      )}
                    </Text>
                  </HoverCard.Dropdown>
                </HoverCard>
                {parts.attributeMod !== null && (
                  <>
                    +
                    <HoverCard shadow='md' openDelay={250} width={230} position='bottom' zIndex={10000} withArrow>
                      <HoverCard.Target>
                        <Kbd style={{ cursor: 'pointer' }}>{parts.attributeMod}</Kbd>
                      </HoverCard.Target>
                      <HoverCard.Dropdown py={5} px={10}>
                        <Text c='gray.0' size='xs'>
                          This proficiency is associated with the {toLabel(variable.value.attribute ?? '')} attribute,
                          so you add your {toLabel(variable.value.attribute ?? '')} modifier.
                        </Text>
                      </HoverCard.Dropdown>
                    </HoverCard>
                  </>
                )}
                {[...parts.breakdown.bonuses.entries()].map(([key, bonus], index) => (
                  <>
                    +
                    <HoverCard shadow='md' openDelay={250} width={230} position='bottom' zIndex={10000} withArrow>
                      <HoverCard.Target>
                        <Kbd style={{ cursor: 'pointer' }}>{bonus.value}</Kbd>
                      </HoverCard.Target>
                      <HoverCard.Dropdown py={5} px={10}>
                        <Text c='gray.0' size='xs'>
                          {key.startsWith('untyped ')
                            ? `Additional untyped modifiers:`
                            : `Your ${key}. Use the greatest from the following:`}
                          <Divider pb={5} />
                          <List size='xs'>
                            {bonus.composition.map((item, i) => (
                              <List.Item key={i}>
                                {sign(item.amount)}{' '}
                                <Text pl={5} c='dimmed' span>
                                  {'['}from {item.source}
                                  {']'}
                                </Text>
                              </List.Item>
                            ))}
                          </List>
                        </Text>
                      </HoverCard.Dropdown>
                    </HoverCard>
                  </>
                ))}
                {parts.hasConditionals && (
                  <>
                    +
                    <HoverCard shadow='md' openDelay={250} width={230} position='bottom' zIndex={10000} withArrow>
                      <HoverCard.Target>
                        <Kbd style={{ cursor: 'pointer' }} c='guide.5'>
                          *
                        </Kbd>
                      </HoverCard.Target>
                      <HoverCard.Dropdown py={5} px={10}>
                        <Text c='gray.0' size='xs'>
                          You have some conditionals! These will only apply situationally:
                          <Divider pb={5} />
                          <List size='xs'>
                            {parts.breakdown.conditionals.map((item, i) => (
                              <List.Item key={i}>
                                {item.text}{' '}
                                <Text c='dimmed' span>
                                  {'['}from {item.source}
                                  {']'}
                                </Text>
                              </List.Item>
                            ))}
                          </List>
                        </Text>
                      </HoverCard.Dropdown>
                    </HoverCard>
                  </>
                )}
              </Group>
            </Accordion.Panel>
          </Accordion.Item>
        )}
        <Accordion.Item value='timeline'>
          <Accordion.Control icon={<IconTimeline size='1rem' />}>Timeline</Accordion.Control>
          <Accordion.Panel>
            <Box>
              <Timeline active={timeline.length - 1} bulletSize={24} lineWidth={2}>
                {timeline.map((item, index) => (
                  <Timeline.Item
                    bullet={item.type === 'ADJUSTMENT' ? <IconBadgesFilled size={12} /> : <IconFrame size={12} />}
                    title={item.title}
                    key={index}
                  >
                    <Text size='xs' fs='italic' mt={4}>
                      {item.description}
                    </Text>
                  </Timeline.Item>
                ))}
                {timeline.length === 0 && (
                  <Text fz='sm' fs='italic'>
                    No recorded history found for this proficiency.
                  </Text>
                )}
              </Timeline>
            </Box>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Box>
  );
}

function getProfDescription(variableName: string) {
  if (variableName === 'CLASS_DC') {
    return `A class DC sets the difficulty for certain abilities granted by your character’s class.`;
  }

  if (variableName === 'SPELL_ATTACK') {
    return `Some spells require you to succeed at a spell attack roll to affect the target. This is usually because they require you to precisely aim a ray or otherwise make an accurate attack. A spell attack roll is compared to the target’s AC. Spell attack rolls benefit from any bonuses or penalties to attack rolls, including your multiple attack penalty, but not any special benefits or penalties that apply only to weapon or unarmed attacks. Spell attacks don’t deal any damage beyond what’s listed in the spell description.
    \n\nIn rare cases, a spell might have you make some other type of attack, such as a weapon ${convertToHardcodedLink('action', 'Strike')}. Such attacks use the normal rules and attack bonus for that type of attack.`;
  }
  if (variableName === 'SPELL_DC') {
    return `Many times, instead of requiring you to make a spell attack roll, the spells you cast will require those within the area or targeted by the spell to attempt a saving throw against your spell DC to determine how the spell affects them.`;
  }

  if (variableName === 'LIGHT_ARMOR') {
    return `Made from supple and thin materials, light armor favors agile adventurers since it offers some protection without sacrificing much mobility.`;
  }
  if (variableName === 'MEDIUM_ARMOR') {
    return `Medium armor offers more protection than light armor, but it also impairs movement more.`;
  }
  if (variableName === 'HEAVY_ARMOR') {
    return `Of all the armor categories, heavy armor offers the best protection. These suits of armor cover the entire body and are designed to stop a wide range of attacks.`;
  }
  if (variableName === 'UNARMORED_DEFENSE') {
    return `Clothing or simple robes offer little protection, but they don’t hinder your movement.`;
  }

  if (variableName === 'SIMPLE_WEAPONS') {
    return `These weapons are basic armaments that most characters can wield effectively, regardless of their class or skill level.`;
  }
  if (variableName === 'MARTIAL_WEAPONS') {
    return `These weapons typically offer higher damage outputs and more diverse combat features but require further training.`;
  }
  if (variableName === 'ADVANCED_WEAPONS') {
    return `These weapons are rare and exotic, and they often have special abilities that set them apart from other weapons.`;
  }
  if (variableName === 'UNARMED_ATTACKS') {
    return `Almost all characters start out trained in unarmed attacks. You can ${convertToHardcodedLink('action', 'Strike')} with your fist or another body part, calculating your attack and damage rolls in the same way you would with a weapon. Unarmed attacks can belong to a weapon group, and they might have weapon traits. However, unarmed attacks aren’t weapons, and effects and abilities that work with weapons never work with unarmed attacks unless they specifically say so.`;
  }

  if (variableName === 'WEAPON_DIVISION_GUN') {
    return `Any ranged weapon with the analog or tech trait.`;
  }

  if (variableName === 'SAVE_FORT') {
    return `A Fortitude saving throw is used when your character’s health or vitality is under attack, such as from poison or disease.`;
  }
  if (variableName === 'SAVE_REFLEX') {
    return `A Reflex saving throw is called for when your character must dodge away from danger, usually something that affects a large area, such as the scorching blast of a fireball spell.`;
  }
  if (variableName === 'SAVE_WILL') {
    return `A Will saving throw is often your defense against spells and effects that target your character’s mind, such as a charm or confusion spell.`;
  }

  if (variableName === 'SKILL_ACROBATICS') {
    return `Acrobatics measures your ability to perform tasks requiring coordination and grace. When you use the ${convertToHardcodedLink('action', 'Escape')} basic action, you can use your Acrobatics modifier instead of your unarmed attack modifier. You can also use it for the basic actions Arrest a Fall (page 418) and Grab an Edge (page 418) instead of Reflex.`;
  }
  if (variableName === 'SKILL_ARCANA') {
    return `Arcana measures how much you know about arcane magic and creatures. Even if you’re untrained, you can ${convertToHardcodedLink('action', 'Recall Knowledge')}.`;
  }
  if (variableName === 'SKILL_ATHLETICS') {
    return `Athletics allows you to perform deeds of physical prowess. Most Athletics actions let you move about the environment or control your opponent’s movement in combat. When you use the ${convertToHardcodedLink('action', 'Escape')} basic action, you can use your Athletics modifier instead of your unarmed attack modifier.`;
  }
  if (variableName === 'SKILL_CRAFTING') {
    return `You can use this skill to create and repair items. Even if you’re untrained, you can ${convertToHardcodedLink('action', 'Recall Knowledge')}.`;
  }
  if (variableName === 'SKILL_DECEPTION') {
    return `You can trick and mislead others using disguises, lies, and other forms of subterfuge. Deception often has a drawback if you get found out, and it’s often best to be out of town by the time this happens.`;
  }
  if (variableName === 'SKILL_DIPLOMACY') {
    return `You influence others through negotiation and flattery, or find out information through friendly chats.`;
  }
  if (variableName === 'SKILL_INTIMIDATION') {
    return `You bend others to your will using threats. Unlike Deception or Diplomacy, Intimidation is typically a blunt instrument with little room for nuance or care.`;
  }
  if (variableName === 'SKILL_MEDICINE') {
    return `You can patch up wounds and help people recover from diseases and poisons. ${convertToHardcodedLink('action', 'Treat Wounds')} is especially useful, allowing your adventuring party to heal up between fights. It can be made more efficient with skill feats like Continual Recovery (page 254) and Ward Medic (page 265). Even if you’re untrained in Medicine, you can use it to ${convertToHardcodedLink('action', 'Recall Knowledge')}.`;
  }
  if (variableName === 'SKILL_NATURE') {
    return `You know about the natural world, and you command and train animals and magical beasts. Even if you’re untrained in Nature, you can use it to ${convertToHardcodedLink('action', 'Recall Knowledge')}.`;
  }
  if (variableName === 'SKILL_OCCULTISM') {
    return `You know a great deal about ancient philosophies, esoteric lore, obscure mysticism, and supernatural creatures. Even if you’re untrained in Occultism, you can use it to ${convertToHardcodedLink('action', 'Recall Knowledge')}.`;
  }
  if (variableName === 'SKILL_PERFORMANCE') {
    return `You are skilled at a form of performance, using your talents to impress a crowd or make a living.
    Some performances require you to be more than just charismatic, and if you don’t meet the demands of the art form or the audience, the GM might apply a penalty based on the relevant attribute. For example, if you’re dancing and have a negative Dexterity modifier, you might take a penalty to your attempt at dancing. Likewise, if you are orating and have a negative Intelligence modifier, you might have to hope your raw Charisma can overcome the penalties from your intellectual shortcomings—or ask someone to help write your speeches!`;
  }
  if (variableName === 'SKILL_RELIGION') {
    return `The secrets of deities, dogma, faith, and the realms of divine creatures both sublime and sinister are open to you. You also understand how magic works, though your training imparts a religious slant to that knowledge. Even if you’re untrained in Religion, you can use it to ${convertToHardcodedLink('action', 'Recall Knowledge')}.`;
  }
  if (variableName === 'SKILL_SOCIETY') {
    return `You understand the people and systems that make civilization run, and you know the historical events that make societies what they are today. Further, you can use that knowledge to navigate the complex physical, societal, and economic workings of settlements. Even if you’re untrained in Society, you can use it to ${convertToHardcodedLink('action', 'Recall Knowledge')} and ${convertToHardcodedLink('action', 'Subsist')}.`;
  }
  if (variableName === 'SKILL_STEALTH') {
    return `You are skilled at avoiding detection, allowing you to slip past foes, hide, or conceal an item.`;
  }
  if (variableName === 'SKILL_SURVIVAL') {
    return `You are adept at living in the wilderness, foraging for food and building shelter, and with training you discover the secrets of tracking and hiding your trail. Even if you’re untrained, you can still use Survival to ${convertToHardcodedLink('action', 'Subsist')}.`;
  }
  if (variableName === 'SKILL_THIEVERY') {
    return `You are trained in a particular set of skills favored by thieves and miscreants.`;
  }
  if (variableName.startsWith('SKILL_LORE_')) {
    return `You have specialized information on a narrow topic. Lore features many subcategories.
    The GM determines what other subcategories they’ll allow as Lore skills, though these categories are always less broad than any of the other skills that allow you to ${convertToHardcodedLink('action', 'Recall Knowledge')}, and they should never be able to take the place of another skill’s ${convertToHardcodedLink('action', 'Recall Knowledge')} action. For instance, you couldn’t choose Magic Lore to recall the breadth of knowledge about magic covered by Arcana, Nature, Occultism, and Religion, or choose Adventuring Lore to give you all the information an adventurer needs, or choose Planar Lore to gain all the information spread across various skills and subcategories such as Heaven Lore. 
    If you’re making a check and multiple subcategories of Lore could apply, or a non-Lore skill could apply, you can use whichever skill you prefer. If there’s any doubt whether a Lore skill applies to a specific topic or action, the GM decides whether it can be used or not. 
    Even if you’re untrained in Lore, you can use it to ${convertToHardcodedLink('action', 'Recall Knowledge')}.`;
  }
  return '_No description available for this proficiency._';
}

function SkillActionsSection(props: { variableName: string }) {
  const [_drawer, openDrawer] = useRecoilState(drawerState);

  const { data: actions } = useQuery({
    queryKey: [`find-skill-actions-${props.variableName}`, { variableName: props.variableName }],
    queryFn: async ({ queryKey }) => {
      // @ts-ignore
      // eslint-disable-next-line
      const [_key, { variableName }] = queryKey;
      const abilityBlocks = await fetchContentAll<AbilityBlock>('ability-block');
      return abilityBlocks.filter((block) => {
        if (!block.meta_data?.skill) return false;
        if (block.type !== 'action') return false;

        let convertedSkills = Array.isArray(block.meta_data?.skill) ? block.meta_data?.skill : [block.meta_data?.skill];
        convertedSkills = convertedSkills.map((skill) => `SKILL_${labelToVariable(skill)}`);

        return (
          convertedSkills.includes(variableName) ||
          (convertedSkills.includes('SKILL_LORE') && variableName.startsWith('SKILL_LORE_'))
        );
      });
    },
  });

  return (
    <Stack gap={0}>
      <Divider color='dark.6' />
      {(actions ?? [])
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((action, index) => (
          <ActionSelectionOption
            key={index}
            action={action}
            showButton={false}
            onClick={() => {
              openDrawer({
                type: 'action',
                data: { id: action.id },
                extra: { addToHistory: true },
              });
            }}
          />
        ))}

      {actions?.length === 0 && (
        <Text fz='sm' fs='italic' pt={10}>
          No actions found for this skill.
        </Text>
      )}
    </Stack>
  );
}
