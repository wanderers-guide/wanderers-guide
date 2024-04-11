import HeroPointIcon from '@assets/images/HeroPointIcon';
import { characterState } from '@atoms/characterAtoms';
import { drawerState } from '@atoms/navAtoms';
import BlurBox from '@common/BlurBox';
import ConditionPill from '@common/ConditionPill';
import TokenSelect from '@common/TokenSelect';
import { selectContent } from '@common/select/SelectContent';
import { getConditionByName, getAllConditions, compiledConditions } from '@conditions/condition-handler';
import { ICON_BG_COLOR } from '@constants/data';
import { getInvBulk, getBulkLimit } from '@items/inv-utils';
import { useMantineTheme, Group, ActionIcon, ScrollArea, Title, Button, Box, Text } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { openContextModal, modals } from '@mantine/modals';
import { IconPlus, IconJewishStar, IconJewishStarFilled } from '@tabler/icons-react';
import { Character, Condition } from '@typing/content';
import { phoneQuery } from '@utils/mobile-responsive';
import _ from 'lodash-es';
import { useNavigate } from 'react-router-dom';
import { SetterOrUpdater, useRecoilState } from 'recoil';

export function selectCondition(currentConditions: Condition[], addCondition: (condition: Condition) => void) {
  selectContent(
    'ability-block',
    (option) => {
      const condition = getConditionByName(option.name);
      if (!condition) return;
      const hasCondition = currentConditions?.find((c) => c.name === condition.name);
      if (hasCondition) return;
      addCondition(condition);
    },
    {
      overrideOptions: getAllConditions()
        .filter((condition) => condition.for_character)
        .map((condition, index) => ({
          id: index,
          name: condition.name,
          _custom_select: {
            title: condition.name,
            description: condition.description,
          },
        })),
      overrideLabel: 'Select a Condition',
      selectedId: -1,
    }
  );
}

export default function ConditionSection() {
  const navigate = useNavigate();
  const theme = useMantineTheme();

  const [_drawer, openDrawer] = useRecoilState(drawerState);
  const [character, setCharacter] = useRecoilState(characterState);

  return (
    <BlurBox blur={10}>
      <Box
        pt='xs'
        pb={5}
        px='xs'
        style={{
          borderTopLeftRadius: theme.radius.md,
          borderTopRightRadius: theme.radius.md,
          position: 'relative',
        }}
        h='100%'
      >
        <Group align='flex-start' justify='space-between' wrap='nowrap' gap={0}>
          <Box w={200}>
            <Group wrap='nowrap' gap={5} justify='center'>
              <Text ta='center' fz='md' fw={500} c='gray.0'>
                Conditions
              </Text>
              <ActionIcon
                variant='light'
                aria-label='Add Condition'
                size='xs'
                radius='xl'
                color='gray'
                onClick={() => {
                  selectCondition(character?.details?.conditions ?? [], (condition) => {
                    if (!character) return;
                    setCharacter({
                      ...character,
                      details: {
                        ...character.details,
                        conditions: [...(character.details?.conditions ?? []), condition],
                      },
                    });
                  });
                }}
              >
                <IconPlus size='1rem' stroke={1.5} />
              </ActionIcon>
            </Group>
            <ScrollArea h={70} scrollbars='y'>
              <Group gap={5} justify='center'>
                {compiledConditions(character?.details?.conditions ?? []).map((condition, index) => (
                  <ConditionPill
                    key={index}
                    text={condition.name}
                    amount={condition.value}
                    onClick={() => {
                      let source = condition.source;

                      // Check if the condition is from being over bulk limit
                      const isEncumberedFromBulk =
                        condition.name === 'Encumbered' &&
                        character?.inventory &&
                        getInvBulk(character.inventory) > getBulkLimit('CHARACTER');
                      if (character?.options?.ignore_bulk_limit !== true && isEncumberedFromBulk) {
                        source = 'Over Bulk Limit';
                      }

                      openContextModal({
                        modal: 'condition',
                        title: (
                          <Group justify='space-between'>
                            <Title order={3}>{condition.name}</Title>
                            {source ? (
                              <Text fs='italic' fz='sm' mr={15}>
                                From: <Text span>{source}</Text>
                              </Text>
                            ) : (
                              <Button
                                variant='light'
                                color='gray'
                                size='compact-xs'
                                mr={15}
                                onClick={() => {
                                  modals.closeAll();

                                  let newConditions = _.cloneDeep(character?.details?.conditions ?? []);
                                  // Remove condition
                                  newConditions = newConditions.filter((c) => c.name !== condition.name);
                                  // Add wounded condition if we're removing dying
                                  if (condition.name === 'Dying') {
                                    const wounded = newConditions.find((c) => c.name === 'Wounded');
                                    if (wounded) {
                                      wounded.value = 1 + wounded.value!;
                                    } else {
                                      newConditions.push(getConditionByName('Wounded')!);
                                    }
                                  }

                                  setCharacter((c) => {
                                    if (!c) return c;
                                    return {
                                      ...c,
                                      details: {
                                        ...c.details,
                                        conditions: newConditions,
                                      },
                                    };
                                  });
                                }}
                              >
                                Remove
                              </Button>
                            )}
                          </Group>
                        ),
                        innerProps: {
                          condition: condition,
                          onValueChange: (condition, value) => {
                            setCharacter((c) => {
                              if (!c) return c;
                              return {
                                ...c,
                                details: {
                                  ...c.details,
                                  conditions: c.details?.conditions?.map((c) => {
                                    if (c.name === condition.name) {
                                      return {
                                        ...c,
                                        value: value,
                                      };
                                    } else {
                                      return c;
                                    }
                                  }),
                                },
                              };
                            });
                          },
                        },
                        styles: {
                          title: {
                            width: '100%',
                          },
                        },
                      });
                    }}
                  />
                ))}
                {(character?.details?.conditions ?? []).length === 0 && (
                  <Text c='gray.6' fz='xs' fs='italic'>
                    None active
                  </Text>
                )}
              </Group>
            </ScrollArea>
          </Box>
          <Box w={100} style={{ position: 'relative' }}>
            <Box
              style={{
                position: 'absolute',
                top: 20,
                left: '50%',
                transform: 'translate(-50%, 0px)',
              }}
            >
              <HeroPointIcon size={75} color={ICON_BG_COLOR} />
            </Box>
            <Group justify='flex-start' style={{ flexDirection: 'column' }} h={100} gap={15}>
              <Text ta='center' fz='md' fw={500} c='gray.0' style={{ whiteSpace: 'nowrap' }}>
                Hero Points
              </Text>
              <Group justify='center'>
                {character && (
                  <TokenSelect
                    count={3}
                    value={character.hero_points ?? 0}
                    onChange={(v) => {
                      setCharacter((c) => {
                        if (!c) return c;
                        return {
                          ...c,
                          hero_points: v,
                        };
                      });
                    }}
                    size='xs'
                    emptySymbol={
                      <ActionIcon
                        variant='transparent'
                        color='gray.1'
                        aria-label='Hero Point, Empty'
                        size='xs'
                        style={{ opacity: 0.7 }}
                      >
                        <IconJewishStar size='0.8rem' />
                      </ActionIcon>
                    }
                    fullSymbol={
                      <ActionIcon
                        variant='transparent'
                        color='gray.1'
                        aria-label='Hero Point, Full'
                        size='xs'
                        style={{ opacity: 0.7 }}
                      >
                        <IconJewishStarFilled size='0.8rem' />
                      </ActionIcon>
                    }
                  />
                )}
              </Group>
            </Group>
          </Box>
        </Group>
      </Box>
    </BlurBox>
  );
}
