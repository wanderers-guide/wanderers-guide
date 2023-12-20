import { drawerState } from '@atoms/navAtoms';
import { ActionSymbol } from '@common/Actions';
import IndentedText from '@common/IndentedText';
import RichText from '@common/RichText';
import TraitsDisplay from '@common/TraitsDisplay';
import { ActionSelectionOption, FeatSelectionOption } from '@common/select/SelectContent';
import { TEXT_INDENT_AMOUNT } from '@constants/data';
import { fetchContentAll, fetchContentById } from '@content/content-store';
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
import { VariableProf } from '@typing/variables';
import { sign } from '@utils/numbers';
import {
  displayFinalProfValue,
  getBonusText,
  getProfValueParts,
} from '@variables/variable-display';
import { getVariable, getVariableBonuses, getVariableHistory } from '@variables/variable-manager';
import {
  getProficiencyTypeValue,
  isProficiencyType,
  isProficiencyValue,
  proficiencyTypeToLabel,
  variableNameToLabel,
  variableToLabel,
} from '@variables/variable-utils';
import _ from 'lodash';
import { useRecoilState } from 'recoil';

export function StatProfDrawerTitle(props: { data: { variableName: string; isDC?: boolean } }) {
  const variable = getVariable<VariableProf>('CHARACTER', props.data.variableName);

  return (
    <>
      {variable && (
        <Group justify='space-between' wrap='nowrap'>
          <Group wrap='nowrap' gap={10}>
            <Box>
              <Title order={3}>{_.startCase(variableToLabel(variable))}</Title>
            </Box>
          </Group>
          <Box>
            <Badge>{proficiencyTypeToLabel(variable.value.value)}</Badge>
          </Box>
        </Group>
      )}
    </>
  );
}

export function StatProfDrawerContent(props: { data: { variableName: string; isDC?: boolean } }) {
  const variable = getVariable<VariableProf>('CHARACTER', props.data.variableName);
  if (!variable) return null;

  // Breakdown
  const parts = getProfValueParts('CHARACTER', variable.name)!;

  // Timeline
  const history = getVariableHistory('CHARACTER', variable.name);
  const bonuses = getVariableBonuses('CHARACTER', variable.name);

  let timeline: {
    type: 'BONUS' | 'ADJUSTMENT';
    title: string;
    description: string;
    timestamp: number;
  }[] = [];
  for (const hist of history) {
    const from = isProficiencyValue(hist.from)
      ? proficiencyTypeToLabel(hist.from.value)
      : hist.from;
    const to = isProficiencyValue(hist.to) ? proficiencyTypeToLabel(hist.to.value) : hist.to;
    timeline.push({
      type: 'ADJUSTMENT',
      title: `${from} → ${to}`,
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

  return (
    <Box>
      <Accordion variant='separated' defaultValue=''>
        <Accordion.Item value='description'>
          <Accordion.Control icon={<IconBlockquote size='1rem' />}>Description</Accordion.Control>
          <Accordion.Panel>
            <RichText ta='justify' pb={10}>
              {getProfDescription(props.data.variableName)}
            </RichText>
          </Accordion.Panel>
        </Accordion.Item>

        {props.data.variableName.startsWith('SKILL_') && (
          <Accordion.Item value='skill-actions'>
            <Accordion.Control icon={<IconCaretLeftRight size='1rem' />}>
              Skill Actions
            </Accordion.Control>
            <Accordion.Panel>
              <SkillActionsSection variableName={props.data.variableName} />
            </Accordion.Panel>
          </Accordion.Item>
        )}

        {variable.value.attribute && (
          <Accordion.Item value='breakdown'>
            <Accordion.Control icon={<IconMathSymbols size='1rem' />}>Breakdown</Accordion.Control>
            <Accordion.Panel>
              <Group gap={8} wrap='nowrap' align='center'>
                {displayFinalProfValue('CHARACTER', variable.name, props.data.isDC)} ={' '}
                {props.data.isDC && <>10 + </>}
                <HoverCard
                  shadow='md'
                  openDelay={250}
                  width={230}
                  position='bottom'
                  zIndex={10000}
                  withArrow
                >
                  <HoverCard.Target>
                    <Kbd style={{ cursor: 'pointer' }}>{parts.profValue}</Kbd>
                  </HoverCard.Target>
                  <HoverCard.Dropdown py={5} px={10}>
                    <Text c='gray.0' size='xs'>
                      You're {proficiencyTypeToLabel(variable.value.value).toLowerCase()} in this
                      proficiency, resulting in a{' '}
                      {sign(getProficiencyTypeValue(variable.value.value))} bonus.
                    </Text>
                  </HoverCard.Dropdown>
                </HoverCard>
                +
                <HoverCard
                  shadow='md'
                  openDelay={250}
                  width={230}
                  position='bottom'
                  zIndex={10000}
                  withArrow
                >
                  <HoverCard.Target>
                    <Kbd style={{ cursor: 'pointer' }}>{parts.level}</Kbd>
                  </HoverCard.Target>
                  <HoverCard.Dropdown py={5} px={10}>
                    <Text c='gray.0' size='xs'>
                      {variable.value.value === 'U' ? (
                        <>
                          Because you're{' '}
                          {proficiencyTypeToLabel(variable.value.value).toLowerCase()} in this
                          proficiency, you don't add your level.
                        </>
                      ) : (
                        <>
                          Because you're{' '}
                          {proficiencyTypeToLabel(variable.value.value).toLowerCase()} in this
                          proficiency, you add your level.
                        </>
                      )}
                    </Text>
                  </HoverCard.Dropdown>
                </HoverCard>
                {parts.attributeMod && (
                  <>
                    +
                    <HoverCard
                      shadow='md'
                      openDelay={250}
                      width={230}
                      position='bottom'
                      zIndex={10000}
                      withArrow
                    >
                      <HoverCard.Target>
                        <Kbd style={{ cursor: 'pointer' }}>{parts.attributeMod}</Kbd>
                      </HoverCard.Target>
                      <HoverCard.Dropdown py={5} px={10}>
                        <Text c='gray.0' size='xs'>
                          This proficiency is associated with the{' '}
                          {variableNameToLabel(variable.value.attribute ?? '')} attribute, so you
                          add your {variableNameToLabel(variable.value.attribute ?? '')} modifier.
                        </Text>
                      </HoverCard.Dropdown>
                    </HoverCard>
                  </>
                )}
                {[...parts.breakdown.bonuses.entries()].map(([key, bonus], index) => (
                  <>
                    +
                    <HoverCard
                      shadow='md'
                      openDelay={250}
                      width={230}
                      position='bottom'
                      zIndex={10000}
                      withArrow
                    >
                      <HoverCard.Target>
                        <Kbd style={{ cursor: 'pointer' }}>{bonus.value}</Kbd>
                      </HoverCard.Target>
                      <HoverCard.Dropdown py={5} px={10}>
                        <Text c='gray.0' size='xs'>
                          Your {key} bonus. Use the highest from the following:
                          <Divider pb={5} />
                          <List size='xs'>
                            {bonus.composition.map((item, i) => (
                              <List.Item key={i}>
                                {sign(item.amount)}{' '}
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
                ))}
                {parts.hasConditionals && (
                  <>
                    +
                    <HoverCard
                      shadow='md'
                      openDelay={250}
                      width={230}
                      position='bottom'
                      zIndex={10000}
                      withArrow
                    >
                      <HoverCard.Target>
                        <Kbd style={{ cursor: 'pointer' }} c='guide.5'>
                          *
                        </Kbd>
                      </HoverCard.Target>
                      <HoverCard.Dropdown py={5} px={10}>
                        <Text c='gray.0' size='xs'>
                          You have conditional bonuses! These will only apply situationally:
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
                    bullet={
                      item.type === 'ADJUSTMENT' ? (
                        <IconBadgesFilled size={12} />
                      ) : (
                        <IconFrame size={12} />
                      )
                    }
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
    return `Acrobatics measures your ability to perform tasks requiring coordination and grace. When you use the Escape basic action (page 416), you can use your Acrobatics modifier instead of your unarmed attack modifier. You can also use it for the basic actions Arrest a Fall (page 418) and Grab an Edge (page 418) instead of Reflex.`;
  }
  if (variableName === 'SKILL_ARCANA') {
    return `Arcana measures how much you know about arcane magic and creatures. Even if you’re untrained, you can Recall Knowledge.`;
  }
  if (variableName === 'SKILL_ATHLETICS') {
    return `Athletics allows you to perform deeds of physical prowess. Most Athletics actions let you move about the environment or control your opponent’s movement in combat. When you use the Escape basic action (page 416), you can use your Athletics modifier instead of your unarmed attack modifier.`;
  }
  if (variableName === 'SKILL_CRAFTING') {
    return `You can use this skill to create and repair items. Even if you’re untrained, you can Recall Knowledge.`;
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
    return `You can patch up wounds and help people recover from diseases and poisons. Treat Wounds is especially useful, allowing your adventuring party to heal up between fights. It can be made more efficient with skill feats like Continual Recovery (page 254) and Ward Medic (page 265). Even if you’re untrained in Medicine, you can use it to Recall Knowledge.`;
  }
  if (variableName === 'SKILL_NATURE') {
    return `You know about the natural world, and you command and train animals and magical beasts. Even if you’re untrained in Nature, you can use it to Recall Knowledge.`;
  }
  if (variableName === 'SKILL_OCCULTISM') {
    return `You know a great deal about ancient philosophies, esoteric lore, obscure mysticism, and supernatural creatures. Even if you’re untrained in Occultism, you can use it to Recall Knowledge.`;
  }
  if (variableName === 'SKILL_PERFORMANCE') {
    return `You are skilled at a form of performance, using your talents to impress a crowd or make a living.
    Some performances require you to be more than just charismatic, and if you don’t meet the demands of the art form or the audience, the GM might apply a penalty based on the relevant attribute. For example, if you’re dancing and have a negative Dexterity modifier, you might take a penalty to your attempt at dancing. Likewise, if you are orating and have a negative Intelligence modifier, you might have to hope your raw Charisma can overcome the penalties from your intellectual shortcomings—or ask someone to help write your speeches!`;
  }
  if (variableName === 'SKILL_RELIGION') {
    return `The secrets of deities, dogma, faith, and the realms of divine creatures both sublime and sinister are open to you. You also understand how magic works, though your training imparts a religious slant to that knowledge. Even if you’re untrained in Religion, you can use it to Recall Knowledge.`;
  }
  if (variableName === 'SKILL_SOCIETY') {
    return `You understand the people and systems that make civilization run, and you know the historical events that make societies what they are today. Further, you can use that knowledge to navigate the complex physical, societal, and economic workings of settlements. Even if you’re untrained in Society, you can use it to Recall Knowledge and Subsist.`;
  }
  if (variableName === 'SKILL_STEALTH') {
    return `You are skilled at avoiding detection, allowing you to slip past foes, hide, or conceal an item.`;
  }
  if (variableName === 'SKILL_SURVIVAL') {
    return `You are adept at living in the wilderness, foraging for food and building shelter, and with training you discover the secrets of tracking and hiding your trail. Even if you’re untrained, you can still use Survival to Subsist.`;
  }
  if (variableName === 'SKILL_THIEVERY') {
    return `You are trained in a particular set of skills favored by thieves and miscreants.`;
  }
  if (variableName.startsWith('SKILL_LORE_')) {
    return `You have specialized information on a narrow topic. Lore features many subcategories.
    The GM determines what other subcategories they’ll allow as Lore skills, though these categories are always less broad than any of the other skills that allow you to Recall Knowledge, and they should never be able to take the place of another skill’s Recall Knowledge action. For instance, you couldn’t choose Magic Lore to recall the breadth of knowledge about magic covered by Arcana, Nature, Occultism, and Religion, or choose Adventuring Lore to give you all the information an adventurer needs, or choose Planar Lore to gain all the information spread across various skills and subcategories such as Heaven Lore. 
    If you’re making a check and multiple subcategories of Lore could apply, or a non-Lore skill could apply, you can use whichever skill you prefer. If there’s any doubt whether a Lore skill applies to a specific topic or action, the GM decides whether it can be used or not. 
    Even if you’re untrained in Lore, you can use it to Recall Knowledge.`;
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

        let convertedSkills = Array.isArray(block.meta_data?.skill)
          ? block.meta_data?.skill
          : [block.meta_data?.skill];
        convertedSkills = convertedSkills.map((skill) => `SKILL_${skill}`);

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
            onClick={() => {
              openDrawer({
                type: 'action',
                data: { id: action.id },
                extra: { addToHistory: true },
              });
            }}
          />
        ))}
    </Stack>
  );
}
