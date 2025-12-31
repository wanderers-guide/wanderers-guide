import {
  Button,
  Collapse,
  Divider,
  Group,
  Modal,
  NumberInput,
  ScrollArea,
  SegmentedControl,
  Select,
  Stack,
  TextInput,
  Title,
  useMantineTheme,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { Combatant } from '@typing/content';
import { Operation } from '@typing/operations';
import { useState } from 'react';
import { toLabel } from '@utils/strings';
import { SelectIcon } from '@common/IconDisplay';
import { sign } from '@utils/numbers';
import { isEqual, uniqWith } from 'lodash-es';
import { getEntityLevel } from '@utils/entity-utils';

/**
 * Modal for creating or editing a creature
 * @param props.opened - Whether the modal is opened
 * @param props.editId - The id of the creature being edited
 * @param props.editCreature - The creature being edited (alternative to editId)
 * @param props.onComplete - Callback when the modal is completed
 * @param props.onCancel - Callback when the modal is cancelled
 * Notes:
 * - Either supply editId or editCreature to be in editing mode
 * - If editId is supplied, the creature with that id will be fetched
 * - If editCreature is supplied, it will be used instead of fetching
 */
export function CreateCombatantModal(props: {
  opened: boolean;
  onComplete: (combatant: Combatant) => void;
  onCancel: () => void;
  onNameBlur?: (name: string) => void;
}) {
  const theme = useMantineTheme();

  const [openedAdditional, { toggle: toggleAdditional }] = useDisclosure(false);

  // Initialize form
  const form = useForm<Combatant>({
    initialValues: {
      _id: '',
      type: 'CREATURE',
      ally: true,
      initiative: undefined,
      creature: {
        id: -1,
        created_at: '',
        name: '',
        level: -1,
        experience: 0,
        hp_current: 0,
        hp_temp: 0,
        stamina_current: 0,
        resolve_current: 0,
        rarity: 'COMMON',
        inventory: undefined,
        notes: undefined,
        details: {
          image_url: undefined,
          background_image_url: undefined,
          conditions: undefined,
          description: '',
        },
        roll_history: undefined,
        operations: [],
        abilities_base: [],
        abilities_added: [],
        spells: undefined,
        meta_data: undefined,
        content_source_id: -1,
        version: '1.0',
      },
      character: undefined,
      data: undefined,
    },
  });

  // UI Stats -> Ops
  const [totalMaxHP, setTotalMaxHP] = useState<number | undefined>();
  const [totalAC, setTotalAC] = useState<number | undefined>();
  const [totalPerc, setTotalPerc] = useState<number | undefined>();

  const [totalFort, setTotalFort] = useState<number | undefined>();
  const [totalRef, setTotalRef] = useState<number | undefined>();
  const [totalWill, setTotalWill] = useState<number | undefined>();

  const STAT_OPS: Operation[] = [
    {
      id: 'ba155ae7-a343-4ae0-b3fb-e68020e4b055',
      type: 'adjValue',
      data: {
        variable: 'AC_BONUS',
        value: (totalAC ?? 0) - 10,
      },
    },
    {
      id: 'd66fa178-9993-46da-ad6a-e2263f4e8897',
      type: 'addBonusToValue',
      data: {
        variable: 'SAVE_FORT',
        text: '',
        value: `${sign(totalFort ?? 0)}`,
      },
    },
    {
      id: '43ec2706-8c3b-4bbe-af6c-a99c7ceaa381',
      type: 'addBonusToValue',
      data: {
        variable: 'SAVE_REFLEX',
        text: '',
        value: `${sign(totalRef ?? 0)}`,
      },
    },
    {
      id: 'd7025dfd-b90f-4e76-988b-c946312d2939',
      type: 'addBonusToValue',
      data: {
        variable: 'SAVE_WILL',
        text: '',
        value: `${sign(totalWill ?? 0)}`,
      },
    },
    {
      id: 'f2d3d23a-9397-4127-91cc-96c6af99feed',
      type: 'adjValue',
      data: {
        variable: 'MAX_HEALTH_BONUS',
        value: totalMaxHP ?? 0,
      },
    },
    {
      id: '1ff885b6-75d8-4694-9c71-d4e02b873859',
      type: 'addBonusToValue',
      data: {
        variable: 'PERCEPTION',
        text: '',
        value: `${sign(totalPerc ?? 0)}`,
      },
    },
  ];

  const onSubmit = async (values: typeof form.values) => {
    props.onComplete({
      ...values,
      creature: {
        ...values.creature!,
        name: values.creature!.name.trim(),
        level: parseInt(`${getEntityLevel(values.creature!)}`),
        hp_current: totalMaxHP ?? 0,
        operations: uniqWith([...(values.creature!.operations ?? []), ...STAT_OPS], isEqual),
      },
    });
    setTimeout(() => {
      onReset();
    }, 1000);
  };

  const onReset = () => {
    setTotalAC(0);
    setTotalFort(0);
    setTotalRef(0);
    setTotalWill(0);
    setTotalMaxHP(0);
    setTotalPerc(0);
    form.reset();
  };

  return (
    <Modal
      opened={props.opened}
      onClose={() => {
        props.onCancel();
        onReset();
      }}
      title={
        <Group>
          <Title order={3}>Add Combatant</Title>
          <SegmentedControl
            size='md'
            value={form.values.ally ? 'ally' : 'enemy'}
            onChange={(value) => form.setFieldValue('ally', value === 'ally')}
            data={[
              { label: 'Ally', value: 'ally' },
              { label: 'Enemy', value: 'enemy' },
            ]}
          />
        </Group>
      }
      styles={{
        body: {
          paddingRight: 2,
        },
      }}
      size={'md'}
      closeOnClickOutside={false}
      closeOnEscape={false}
      keepMounted={false}
    >
      <ScrollArea pr={14} scrollbars='y'>
        <form onSubmit={form.onSubmit(onSubmit)}>
          <Stack gap={10}>
            <Group wrap='nowrap' justify='space-between'>
              <Group wrap='nowrap'>
                <TextInput
                  label='Name'
                  required
                  {...form.getInputProps('creature.name')}
                  onPaste={(e) => {
                    const text = e.clipboardData.getData('text/plain');
                    if (text.toUpperCase() === text) {
                      e.preventDefault();
                      form.setFieldValue('creature.name', toLabel(text));
                    }
                  }}
                  onBlur={() => props.onNameBlur?.(form.values.creature!.name)}
                />
                <Select
                  label='Level'
                  required
                  data={Array.from({ length: 32 }, (_, i) => (i - 1).toString())}
                  w={70}
                  {...form.getInputProps('creature.level')}
                />
              </Group>
            </Group>

            <Divider my='xs' />

            <Group wrap='nowrap'>
              <NumberInput
                required
                label='Max HP.'
                placeholder='Max Health'
                min={0}
                value={totalMaxHP}
                onChange={(value) => setTotalMaxHP(parseInt(`${value}`))}
              />
              <NumberInput
                required
                label='AC'
                placeholder='Armor Class'
                min={0}
                value={totalAC}
                onChange={(value) => setTotalAC(parseInt(`${value}`))}
              />
              <NumberInput
                required
                label='Perc.'
                placeholder='Perception'
                prefix='+'
                min={0}
                value={totalPerc}
                onChange={(value) => setTotalPerc(parseInt(`${value}`))}
              />
            </Group>

            <Group wrap='nowrap'>
              <NumberInput
                label='Fort.'
                placeholder='Fortitude'
                prefix='+'
                min={0}
                value={totalFort}
                onChange={(value) => setTotalFort(parseInt(`${value}`))}
              />
              <NumberInput
                label='Ref.'
                placeholder='Reflex'
                prefix='+'
                min={0}
                value={totalRef}
                onChange={(value) => setTotalRef(parseInt(`${value}`))}
              />
              <NumberInput
                label='Will'
                placeholder='Will'
                prefix='+'
                min={0}
                value={totalWill}
                onChange={(value) => setTotalWill(parseInt(`${value}`))}
              />
            </Group>

            <Divider
              my='xs'
              label={
                <Group gap={3} wrap='nowrap'>
                  <Button variant={openedAdditional ? 'light' : 'subtle'} size='compact-sm' color='gray.6'>
                    Misc. Sections
                  </Button>
                </Group>
              }
              labelPosition='left'
              onClick={toggleAdditional}
            />
            <Collapse in={openedAdditional}>
              <Stack gap={10}>
                <SelectIcon
                  strValue={form.values.creature?.details.image_url ?? ''}
                  setValue={(strValue) => {
                    form.setFieldValue('creature.details.image_url', strValue);
                  }}
                />

                <Divider />
              </Stack>
            </Collapse>

            <Group justify='flex-end'>
              <Button
                variant='default'
                onClick={() => {
                  props.onCancel();
                  onReset();
                }}
              >
                Cancel
              </Button>
              <Button type='submit'>Add</Button>
            </Group>
          </Stack>
        </form>
      </ScrollArea>
    </Modal>
  );
}
