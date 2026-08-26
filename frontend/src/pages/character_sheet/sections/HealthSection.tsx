import { characterState } from '@atoms/characterAtoms';
import { drawerState } from '@atoms/navAtoms';
import BlurBox from '@common/BlurBox';
import ClickEditText from '@common/ClickEditText';
import { useMantineTheme, Group, Anchor, Button, Box, Text } from '@mantine/core';
import { interpolateHealth } from '@utils/colors';
import {
  getFinalHealthValue,
  getFinalResolveValue,
  getFinalStaminaValue,
  isStaminaVariant,
} from '@variables/variable-helpers';
import { evaluate } from 'mathjs';
import { useNavigate } from 'react-router-dom';
import { useAtom } from 'jotai';
import { SetterOrUpdater } from '@utils/type-fixing';
import { confirmHealth, confirmPool, handleTakeBreather } from '../entity-handler';
import { StoreID } from '@schemas/variables';
import { LivingEntity } from '@schemas/content';

export default function HealthSection(props: {
  id: StoreID;
  entity: LivingEntity | null;
  setEntity: SetterOrUpdater<LivingEntity | null>;
}) {
  const theme = useMantineTheme();

  const [_drawer, openDrawer] = useAtom(drawerState);

  const maxHealth = getFinalHealthValue(props.id);
  let currentHealth = props.entity?.hp_current;
  if (currentHealth === undefined || currentHealth < 0) {
    currentHealth = maxHealth;
  }

  let tempHealth = props.entity?.hp_temp;
  if (tempHealth === undefined || tempHealth < 0) {
    tempHealth = 0;
  }

  // Stamina variant (GM Core): the sheet gains stamina & resolve pools.
  // Negative pool values are the "uninitialized / full" sentinel (same convention as HP).
  const staminaVariant = isStaminaVariant(props.id);
  const maxStamina = getFinalStaminaValue(props.id);
  const maxResolve = getFinalResolveValue(props.id);
  let currentStamina = props.entity?.stamina_current;
  if (currentStamina === undefined || currentStamina < 0 || currentStamina > maxStamina) {
    currentStamina = maxStamina;
  }
  let currentResolve = props.entity?.resolve_current;
  if (currentResolve === undefined || currentResolve < 0 || currentResolve > maxResolve) {
    currentResolve = maxResolve;
  }

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
        h='100%'
      >
        <Group justify='space-between' style={{ flexDirection: 'column' }} h='100%' gap={0}>
          <Group wrap='nowrap' justify='space-between' align='flex-start' w='100%' gap={0} grow>
            <Box>
              <Text ta='center' fz='md' fw={500} c='gray.0'>
                Hit Points
              </Text>
              <Group wrap='nowrap' justify='center' align='center' gap={10}>
                <ClickEditText
                  color={interpolateHealth(currentHealth / maxHealth)}
                  size='xl'
                  value={`${currentHealth}`}
                  height={50}
                  miw={20}
                  placeholder='HP'
                  onChange={(value) => {
                    if (!props.entity) return;
                    confirmHealth(value, getFinalHealthValue(props.id), props.entity, props.setEntity);
                  }}
                />
                <Box>
                  <Text size='md' c='gray.4' style={{ cursor: 'default' }}>
                    /
                  </Text>
                </Box>
                <Box>
                  <Anchor
                    size='lg'
                    c='gray.2'
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      openDrawer({
                        type: 'stat-hp',
                        data: { id: props.id },
                        extra: { addToHistory: true },
                      });
                    }}
                    underline='hover'
                  >
                    {maxHealth}
                  </Anchor>
                </Box>
              </Group>
            </Box>

            <Box>
              <Text ta='center' fz='sm' fw={500} c='gray.0'>
                Temp. HP
              </Text>
              <ClickEditText
                color={tempHealth ? `blue` : `gray.5`}
                size='xl'
                value={tempHealth ? `${tempHealth}` : `—`}
                height={50}
                miw={20}
                placeholder='HP'
                onChange={(value) => {
                  let result = -1;
                  try {
                    result = evaluate(value);
                  } catch (e) {
                    result = parseInt(value);
                  }
                  if (isNaN(result)) result = 0;
                  result = Math.floor(result);
                  if (result < 0) result = 0;

                  props.setEntity((c) => {
                    if (!c) return c;
                    return {
                      ...c,
                      hp_temp: result,
                    };
                  });
                }}
              />
            </Box>
          </Group>
          {/* Stamina variant row — only rendered when the variant is enabled */}
          {staminaVariant && (
            <Group wrap='nowrap' justify='space-between' align='flex-start' w='100%' gap={0} grow>
              <Box>
                <Text ta='center' fz='sm' fw={500} c='gray.0'>
                  Stamina
                </Text>
                <Group wrap='nowrap' justify='center' align='center' gap={10}>
                  <ClickEditText
                    color={interpolateHealth(maxStamina > 0 ? currentStamina / maxStamina : 0)}
                    size='lg'
                    value={`${currentStamina}`}
                    height={40}
                    miw={20}
                    placeholder='SP'
                    onChange={(value) => {
                      if (!props.entity) return;
                      confirmPool('stamina_current', value, getFinalStaminaValue(props.id), props.setEntity);
                    }}
                  />
                  <Box>
                    <Text size='md' c='gray.4' style={{ cursor: 'default' }}>
                      /
                    </Text>
                  </Box>
                  <Box>
                    <Anchor
                      size='md'
                      c='gray.2'
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        openDrawer({
                          type: 'stat-hp',
                          data: { id: props.id },
                          extra: { addToHistory: true },
                        });
                      }}
                      underline='hover'
                    >
                      {maxStamina}
                    </Anchor>
                  </Box>
                </Group>
              </Box>

              <Box>
                <Text ta='center' fz='sm' fw={500} c='gray.0'>
                  Resolve
                </Text>
                <Group wrap='nowrap' justify='center' align='center' gap={10}>
                  <ClickEditText
                    color={currentResolve > 0 ? theme.colors.guide[4] : theme.colors.gray[5]}
                    size='lg'
                    value={`${currentResolve}`}
                    height={40}
                    miw={20}
                    placeholder='RP'
                    onChange={(value) => {
                      if (!props.entity) return;
                      confirmPool('resolve_current', value, getFinalResolveValue(props.id), props.setEntity);
                    }}
                  />
                  <Box>
                    <Text size='md' c='gray.4' style={{ cursor: 'default' }}>
                      /
                    </Text>
                  </Box>
                  <Box>
                    <Anchor
                      size='md'
                      c='gray.2'
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        openDrawer({
                          type: 'stat-hp',
                          data: { id: props.id },
                          extra: { addToHistory: true },
                        });
                      }}
                      underline='hover'
                    >
                      {maxResolve}
                    </Anchor>
                  </Box>
                </Group>
              </Box>
            </Group>
          )}
          <Group wrap='nowrap' justify='center' gap={0}>
            <Button
              variant='subtle'
              color='gray.5'
              size='compact-xs'
              fw={400}
              onClick={() => {
                openDrawer({
                  type: 'stat-resist-weak',
                  data: { id: props.id },
                  extra: { addToHistory: true },
                });
              }}
            >
              Resistances & Weaknesses
            </Button>
            {/* Take a Breather (stamina variant): spend 1 resolve to refill stamina */}
            {staminaVariant && (
              <Button
                variant='subtle'
                color='gray.5'
                size='compact-xs'
                fw={400}
                disabled={currentResolve <= 0}
                onClick={() => {
                  if (!props.entity) return;
                  handleTakeBreather(props.id, props.entity, props.setEntity);
                }}
              >
                Breather
              </Button>
            )}
          </Group>
        </Group>
      </Box>
    </BlurBox>
  );
}
