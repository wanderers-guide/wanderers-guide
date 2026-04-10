import { drawerState } from '@atoms/navAtoms';
import BlurBox from '@common/BlurBox';
import BlurButton from '@common/BlurButton';
import { CharacterInfo } from '@common/CharacterInfo';
import { useMantineTheme, Group, Stack, TextInput, Box, Text, Title } from '@mantine/core';
import { getHotkeyHandler } from '@mantine/hooks';
import { StoreID } from '@schemas/variables';
import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAtom } from 'jotai';
import { SetterOrUpdater } from '@utils/type-fixing';
import { confirmExperience, handleRest } from '../entity-handler';
import tinyInputClasses from '@css/TinyBlurInput.module.css';
import { Character, LivingEntity } from '@schemas/content';
import { isCharacter, isCreature } from '@utils/type-fixing';
import { CreatureDetailedInfo } from '@common/CreatureInfo';
import { IMPRINT_BG_COLOR } from '@constants/data';
import { modals } from '@mantine/modals';
import { getEntityLevel } from '@utils/entity-utils';
import ImprintButton from '@common/ImprintButton';

export default function EntityInfoSection(props: {
  id: StoreID;
  entity: LivingEntity | null;
  setEntity: SetterOrUpdater<LivingEntity | null>;
}) {
  const navigate = useNavigate();
  const theme = useMantineTheme();

  const [_drawer, openDrawer] = useAtom(drawerState);

  const expRef = useRef<HTMLInputElement>(null);
  const [exp, setExp] = useState<string | undefined>();
  useEffect(() => {
    setExp(props.entity?.experience ? `${props.entity.experience}` : undefined);
  }, [props.entity]);

  const handleExperienceSubmit = () => {
    if (!props.entity) return;
    const finalExpResult = confirmExperience(exp ?? '0', props.entity, props.setEntity);
    setExp(`${finalExpResult.value}`);
    expRef.current?.blur();
  };

  return (
    <BlurBox>
      <Box
        pt='xs'
        pb={5}
        px='xs'
        style={{
          borderTopLeftRadius: theme.radius.md,
          borderTopRightRadius: theme.radius.md,
          position: 'relative',
        }}
      >
        <Group gap={20} wrap='nowrap' align='flex-start' justify='space-between'>
          {isCharacter(props.entity) && (
            <CharacterInfo
              character={props.entity}
              color='gray.5'
              nameCutOff={20}
              onClickAncestry={() => {
                openDrawer({
                  type: 'ancestry',
                  data: { id: (props.entity as Character)?.details?.ancestry?.id },
                  extra: { addToHistory: true },
                });
              }}
              onClickBackground={() => {
                openDrawer({
                  type: 'background',
                  data: { id: (props.entity as Character)?.details?.background?.id },
                  extra: { addToHistory: true },
                });
              }}
              onClickClass={() => {
                openDrawer({
                  type: 'class',
                  data: { id: (props.entity as Character)?.details?.class?.id },
                  extra: { addToHistory: true },
                });
              }}
              onClickClass2={() => {
                openDrawer({
                  type: 'class',
                  data: { id: (props.entity as Character)?.details?.class_2?.id },
                  extra: { addToHistory: true },
                });
              }}
            />
          )}
          {isCreature(props.entity) && <CreatureDetailedInfo id={props.id} creature={props.entity} />}

          <Stack gap={10} justify='flex-start' pt={3}>
            <Stack gap={5}>
              <Box maw={80}>
                <ImprintButton
                  size='compact-xs'
                  fw={500}
                  fullWidth
                  radius='xl'
                  noBorder
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    if (isCharacter(props.entity)) {
                      navigate(`/builder/${props.entity?.id}`);
                    }
                  }}
                  href={isCharacter(props.entity) ? `/builder/${props.entity?.id}` : undefined}
                >
                  Edit
                </ImprintButton>
              </Box>
              <Box maw={80}>
                <ImprintButton
                  size='compact-xs'
                  fw={500}
                  fullWidth
                  radius='xl'
                  noBorder
                  onClick={() => {
                    modals.openConfirmModal({
                      id: 'click-rest',
                      title: <Title order={4}>Are you sure you want to rest?</Title>,
                      children: (
                        <Box>
                          <Text size='sm'>
                            You will regain some HP (Con. mod × level), reset spell slots & focus points, and you may
                            recover from or improve certain conditions.
                          </Text>
                        </Box>
                      ),
                      labels: { confirm: 'Rest', cancel: 'Cancel' },
                      onCancel: () => {},
                      onConfirm: () => {
                        if (props.entity) {
                          handleRest(props.id, props.entity, props.setEntity);
                        }
                      },
                    });
                  }}
                >
                  Rest
                </ImprintButton>
              </Box>
            </Stack>
            <Stack gap={0}>
              <Box maw={80}>
                <Text fz='xs' ta='center' c='gray.2'>
                  Lvl. {props.entity ? getEntityLevel(props.entity) : '?'}
                </Text>
              </Box>
              <Box maw={80}>
                <TextInput
                  className={tinyInputClasses.input}
                  ref={expRef}
                  variant='filled'
                  size='xs'
                  radius='lg'
                  placeholder='XP'
                  value={exp}
                  onChange={(e) => {
                    setExp(e.currentTarget.value);
                  }}
                  onFocus={(e) => {
                    const length = e.target.value.length;
                    // Move cursor to end
                    requestAnimationFrame(() => {
                      e.target.setSelectionRange(length, length);
                    });
                  }}
                  onBlur={handleExperienceSubmit}
                  onKeyDown={getHotkeyHandler([
                    ['mod+Enter', handleExperienceSubmit],
                    ['Enter', handleExperienceSubmit],
                  ])}
                />
              </Box>
            </Stack>
          </Stack>
        </Group>
      </Box>
    </BlurBox>
  );
}
