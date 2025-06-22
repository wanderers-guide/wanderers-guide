import RichTextInput from '@common/rich_text_input/RichTextInput';
import { fetchContentById } from '@content/content-store';
import { toHTML } from '@content/content-utils';
import {
  Button,
  Group,
  LoadingOverlay,
  Modal,
  ScrollArea,
  Stack,
  Select,
  TextInput,
  Title,
  useMantineTheme,
  NumberInput,
  Text,
  Box,
  Paper,
  Badge,
  ActionIcon,
  Divider,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { JSONContent } from '@tiptap/react';
import { Item, SocietyAdventureEntry } from '@typing/content';
import useRefresh from '@utils/use-refresh';
import { useState } from 'react';
import { DateInput } from '@mantine/dates';
import { useRecoilState, useRecoilValue } from 'recoil';
import { characterState } from '@atoms/characterAtoms';
import { getFlatInvItems } from '@items/inv-utils';
import { drawerState } from '@atoms/navAtoms';
import { IconAdjustments, IconCirclePlus, IconPlus, IconX } from '@tabler/icons-react';
import { selectContent } from '@common/select/SelectContent';
import { convertToGp } from '@items/currency-handler';
import { selectCondition } from '@pages/character_sheet/sections/ConditionSection';
import { modals } from '@mantine/modals';
import { isItemVisible } from '@content/content-hidden';
import { getGpGained } from '@utils/money';
import { cloneDeep, truncate } from 'lodash-es';

export function CreateSocietyAdventureEntryModal(props: {
  opened: boolean;
  editEntry?: SocietyAdventureEntry;
  onComplete: (entry: SocietyAdventureEntry) => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const theme = useMantineTheme();
  const editing = props.editEntry !== undefined;

  const [displaySellTotal, refreshSellTotal] = useRefresh();
  const [displayBuyTotal, refreshBuyTotal] = useRefresh();

  const [boons, setBoons] = useState<JSONContent>();
  const [notes, setNotes] = useState<JSONContent>();
  const character = useRecoilValue(characterState);
  const [_drawer, openDrawer] = useRecoilState(drawerState);

  const form = useForm<SocietyAdventureEntry>({
    initialValues: {
      id: props.editEntry?.id ?? crypto.randomUUID(),
      name: props.editEntry?.name ?? '',
      event: props.editEntry?.event ?? '',
      event_code: props.editEntry?.event_code ?? '',
      date: props.editEntry?.date ?? undefined,
      gm_organized_play_id: props.editEntry?.gm_organized_play_id ?? '',
      chronicle_code: props.editEntry?.chronicle_code ?? '',
      boons: props.editEntry?.boons ?? '',
      xp_gained: props.editEntry?.xp_gained ?? undefined,
      rep_gained: props.editEntry?.rep_gained ?? undefined,
      items_snapshot:
        props.editEntry?.items_snapshot ??
        (character?.inventory ? cloneDeep(getFlatInvItems(character?.inventory).map((i) => i.item)) : []),
      conditions_snapshot:
        props.editEntry?.conditions_snapshot ??
        (character?.details?.conditions ? cloneDeep(character.details.conditions) : []),
      items_sold: props.editEntry?.items_sold ?? [],
      items_bought: props.editEntry?.items_bought ?? [],
      items_total_buy: props.editEntry?.items_total_buy ?? undefined,
      items_total_sell: props.editEntry?.items_total_sell ?? undefined,
      items_total_extra: props.editEntry?.items_total_extra ?? undefined,
      conditions_gained: props.editEntry?.conditions_gained ?? [],
      conditions_cleared: props.editEntry?.conditions_cleared ?? [],
      notes: props.editEntry?.notes ?? '',
    },
  });

  const onSubmit = async (values: typeof form.values) => {
    props.onComplete({
      ...values,
    });
    setTimeout(() => {
      onReset();
    }, 1000);
  };

  const onReset = () => {
    form.reset();
    setBoons(undefined);
    setNotes(undefined);
  };

  return (
    <Modal
      opened={props.opened}
      onClose={() => {
        props.onCancel();
        onReset();
      }}
      title={<Title order={3}>{editing ? 'Manage' : 'Add'} Adventure Record</Title>}
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
            <TextInput label='Adventure Name' required placeholder='Adventure Name' {...form.getInputProps('name')} />

            <Group wrap='nowrap'>
              <TextInput label='Event' placeholder='Event' {...form.getInputProps('event')} />
              <TextInput label='Code' placeholder='Code' w='25%' {...form.getInputProps('event_code')} />
              <DateInput
                label='Date'
                placeholder='Date'
                value={form.values.date ? new Date(form.values.date) : new Date()}
                onChange={(date) => {
                  console.log(date);
                  // form.setFieldValue('date', moment(date))
                }}
              />
            </Group>
            <Group wrap='nowrap'>
              <TextInput
                label='GM Org. Play ID'
                placeholder='12345678-2000'
                w='70%'
                {...form.getInputProps('gm_organized_play_id')}
              />
              <TextInput label='Chronicle #' w='30%' {...form.getInputProps('chronicle_code')} />
            </Group>

            <Group wrap='nowrap'>
              <NumberInput label='XP Gained' placeholder='XP' {...form.getInputProps('xp_gained')} />
              <NumberInput label='Rep Gained' placeholder='Rep' {...form.getInputProps('rep_gained')} />
            </Group>

            <RichTextInput
              label='Reputation & Boons'
              value={boons ?? toHTML(form.values.boons)}
              onChange={(text, json) => {
                setBoons(json);
                form.setFieldValue('boons', text);
              }}
            />

            <Divider my='md' />

            <Box>
              <Text fz='sm'>Items Snapshot</Text>
              <Paper withBorder p='xs'>
                <ScrollArea h={100} scrollbars='y'>
                  <Group gap={8}>
                    {form.values.items_snapshot
                      ?.filter((i) => isItemVisible('CHARACTER', i))
                      .map((item, i) => (
                        <Badge
                          key={i}
                          size='xs'
                          variant='light'
                          style={{ cursor: 'pointer' }}
                          styles={{
                            root: {
                              textTransform: 'initial',
                            },
                          }}
                          onClick={() => {
                            openDrawer({
                              type: 'item',
                              data: { item },
                            });
                          }}
                        >
                          {convertToGp(item.price)} gp, {item.name}
                        </Badge>
                      ))}
                  </Group>
                </ScrollArea>
              </Paper>
            </Box>

            <Group wrap='nowrap' align='start' grow>
              <Box>
                <Group wrap='nowrap' justify='space-between'>
                  <Text fz='sm'>Items Sold</Text>
                  <ActionIcon
                    variant='subtle'
                    color='gray.5'
                    radius='lg'
                    aria-label='Add Item Sold'
                    onClick={() => {
                      selectContent<Item>(
                        'item',
                        (option) => {
                          const sold = [...form.values.items_sold, option];
                          form.setFieldValue('items_sold', sold);
                          form.setFieldValue(
                            'items_total_sell',
                            sold.reduce((acc, i) => acc + convertToGp(i.price), 0)
                          );
                          refreshSellTotal();
                        },
                        {
                          showButton: true,
                          groupBySource: true,
                        }
                      );
                    }}
                  >
                    <IconCirclePlus style={{ width: '70%', height: '70%' }} stroke={1.5} />
                  </ActionIcon>
                </Group>
                <Paper withBorder p='xs'>
                  <ScrollArea h={150} scrollbars='y'>
                    <Group gap={8}>
                      {form.values.items_sold.map((item, i) => (
                        <Badge
                          key={i}
                          size='xs'
                          variant='light'
                          style={{ cursor: 'pointer' }}
                          styles={{
                            root: {
                              textTransform: 'initial',
                            },
                          }}
                          onClick={() => {
                            openDrawer({
                              type: 'item',
                              data: { item },
                            });
                          }}
                          pr={0}
                          rightSection={
                            <ActionIcon
                              variant='subtle'
                              color='gray'
                              size='xs'
                              aria-label='Remove Item Sold'
                              onClick={(e) => {
                                e.stopPropagation();
                                const sold = form.values.items_sold.filter((i) => i !== item);
                                form.setFieldValue('items_sold', sold);
                                form.setFieldValue(
                                  'items_total_sell',
                                  sold.reduce((acc, i) => acc + convertToGp(i.price), 0)
                                );
                                refreshSellTotal();
                              }}
                            >
                              <IconX style={{ width: '70%', height: '70%' }} stroke={1.5} />
                            </ActionIcon>
                          }
                        >
                          {truncate(`${convertToGp(item.price)} gp, ${item.name}`, { length: 22 })}
                        </Badge>
                      ))}
                    </Group>
                    {form.values.items_sold.length === 0 && (
                      <Text fz='sm' c='dimmed' ta='center' fs='italic'>
                        No items sold.
                      </Text>
                    )}
                  </ScrollArea>
                </Paper>
              </Box>
              <Box>
                <Group wrap='nowrap' justify='space-between'>
                  <Text fz='sm'>Items Bought</Text>
                  <ActionIcon
                    variant='subtle'
                    color='gray.5'
                    radius='lg'
                    aria-label='Add Item Bought'
                    onClick={() => {
                      selectContent<Item>(
                        'item',
                        (option) => {
                          const buy = [...form.values.items_bought, option];
                          form.setFieldValue('items_bought', buy);
                          form.setFieldValue(
                            'items_total_buy',
                            buy.reduce((acc, i) => acc + convertToGp(i.price), 0)
                          );
                          refreshBuyTotal();
                        },
                        {
                          showButton: true,
                          groupBySource: true,
                        }
                      );
                    }}
                  >
                    <IconCirclePlus style={{ width: '70%', height: '70%' }} stroke={1.5} />
                  </ActionIcon>
                </Group>
                <Paper withBorder p='xs'>
                  <ScrollArea h={150} scrollbars='y'>
                    <Group gap={8}>
                      {form.values.items_bought.map((item, i) => (
                        <Badge
                          key={i}
                          size='xs'
                          variant='light'
                          style={{ cursor: 'pointer' }}
                          styles={{
                            root: {
                              textTransform: 'initial',
                            },
                          }}
                          onClick={() => {
                            openDrawer({
                              type: 'item',
                              data: { item },
                            });
                          }}
                          pr={0}
                          rightSection={
                            <ActionIcon
                              variant='subtle'
                              color='gray'
                              size='xs'
                              aria-label='Remove Item Bought'
                              onClick={(e) => {
                                e.stopPropagation();
                                const buy = form.values.items_bought.filter((i) => i !== item);
                                form.setFieldValue('items_bought', buy);
                                form.setFieldValue(
                                  'items_total_buy',
                                  buy.reduce((acc, i) => acc + convertToGp(i.price), 0)
                                );
                                refreshBuyTotal();
                              }}
                            >
                              <IconX style={{ width: '70%', height: '70%' }} stroke={1.5} />
                            </ActionIcon>
                          }
                        >
                          {truncate(`${convertToGp(item.price)} gp, ${item.name}`, { length: 22 })}
                        </Badge>
                      ))}
                    </Group>
                    {form.values.items_bought.length === 0 && (
                      <Text fz='sm' c='dimmed' ta='center' fs='italic'>
                        No items bought.
                      </Text>
                    )}
                  </ScrollArea>
                </Paper>
              </Box>
            </Group>

            <Group wrap='nowrap' align='end' gap={5}>
              <NumberInput
                label='GP Gained'
                placeholder='Result'
                readOnly
                value={getGpGained(form.values).value}
                style={{
                  whiteSpace: 'nowrap',
                }}
              />
              <Text pb={5}>=</Text>
              {displaySellTotal && (
                <NumberInput
                  hideControls
                  rightSectionPointerEvents='none'
                  rightSection={'/2'}
                  placeholder='Sell'
                  {...form.getInputProps('items_total_sell')}
                />
              )}
              <Text pb={5}>-</Text>
              {displayBuyTotal && (
                <NumberInput hideControls placeholder='Buy' {...form.getInputProps('items_total_buy')} />
              )}
              <Text pb={5}>+</Text>
              <NumberInput hideControls placeholder='Treasure' {...form.getInputProps('items_total_extra')} />
            </Group>

            <Divider my='md' />

            <Box>
              <Text fz='sm'>Conditions Snapshot</Text>
              <Paper withBorder p='xs'>
                <ScrollArea h={50} scrollbars='y'>
                  <Group gap={8}>
                    {form.values.conditions_snapshot.map((condition, i) => (
                      <Badge
                        key={i}
                        size='xs'
                        variant='light'
                        style={{ cursor: 'pointer' }}
                        styles={{
                          root: {
                            textTransform: 'initial',
                          },
                        }}
                        onClick={() => {
                          openDrawer({
                            type: 'condition',
                            data: { id: condition.name },
                          });
                        }}
                      >
                        {condition.name}
                        {condition.value ? ` (${condition.value})` : ''}
                      </Badge>
                    ))}
                  </Group>
                </ScrollArea>
              </Paper>
            </Box>

            <Group wrap='nowrap' align='start' grow>
              <Box>
                <Group wrap='nowrap' justify='space-between'>
                  <Text fz='sm'>Conditions Gained</Text>
                  <ActionIcon
                    variant='subtle'
                    color='gray.5'
                    radius='lg'
                    aria-label='Add Condition Gained'
                    onClick={() => {
                      selectCondition([], (condition) => {
                        const gained = [...form.values.conditions_gained, condition];
                        form.setFieldValue('conditions_gained', gained);
                      });
                    }}
                  >
                    <IconCirclePlus style={{ width: '70%', height: '70%' }} stroke={1.5} />
                  </ActionIcon>
                </Group>
                <Paper withBorder p='xs'>
                  <ScrollArea h={100} scrollbars='y'>
                    <Group gap={8}>
                      {form.values.conditions_gained.map((condition, i) => (
                        <Badge
                          key={i}
                          size='xs'
                          variant='light'
                          style={{ cursor: 'pointer' }}
                          styles={{
                            root: {
                              textTransform: 'initial',
                            },
                          }}
                          onClick={() => {
                            openDrawer({
                              type: 'condition',
                              data: { id: condition.name },
                            });
                          }}
                          pr={0}
                          rightSection={
                            <ActionIcon
                              variant='subtle'
                              color='gray'
                              size='xs'
                              aria-label='Remove Condition Gained'
                              onClick={(e) => {
                                e.stopPropagation();
                                selectCondition([], (condition) => {
                                  const gained = form.values.conditions_gained.filter((i) => i !== condition);
                                  form.setFieldValue('conditions_gained', gained);
                                });
                              }}
                            >
                              <IconX style={{ width: '70%', height: '70%' }} stroke={1.5} />
                            </ActionIcon>
                          }
                        >
                          {condition.name}
                        </Badge>
                      ))}
                    </Group>
                    {form.values.conditions_gained.length === 0 && (
                      <Text fz='sm' c='dimmed' ta='center' fs='italic'>
                        No conditions gained.
                      </Text>
                    )}
                  </ScrollArea>
                </Paper>
              </Box>
              <Box>
                <Group wrap='nowrap' justify='space-between'>
                  <Text fz='sm'>Conditions Cleared</Text>
                  <ActionIcon
                    variant='subtle'
                    color='gray.5'
                    radius='lg'
                    aria-label='Add Condition Cleared'
                    onClick={() => {
                      selectCondition([], (condition) => {
                        const cleared = [...form.values.conditions_cleared, condition];
                        form.setFieldValue('conditions_cleared', cleared);
                      });
                    }}
                  >
                    <IconCirclePlus style={{ width: '70%', height: '70%' }} stroke={1.5} />
                  </ActionIcon>
                </Group>
                <Paper withBorder p='xs'>
                  <ScrollArea h={100} scrollbars='y'>
                    <Group gap={8}>
                      {form.values.conditions_cleared.map((condition, i) => (
                        <Badge
                          key={i}
                          size='xs'
                          variant='light'
                          style={{ cursor: 'pointer' }}
                          styles={{
                            root: {
                              textTransform: 'initial',
                            },
                          }}
                          onClick={() => {
                            openDrawer({
                              type: 'condition',
                              data: { id: condition.name },
                            });
                          }}
                          pr={0}
                          rightSection={
                            <ActionIcon
                              variant='subtle'
                              color='gray'
                              size='xs'
                              aria-label='Remove Condition Cleared'
                              onClick={(e) => {
                                e.stopPropagation();
                                selectCondition([], (condition) => {
                                  const cleared = form.values.conditions_cleared.filter((i) => i !== condition);
                                  form.setFieldValue('conditions_cleared', cleared);
                                });
                              }}
                            >
                              <IconX style={{ width: '70%', height: '70%' }} stroke={1.5} />
                            </ActionIcon>
                          }
                        >
                          {condition.name}
                        </Badge>
                      ))}
                    </Group>
                    {form.values.conditions_cleared.length === 0 && (
                      <Text fz='sm' c='dimmed' ta='center' fs='italic'>
                        No conditions cleared.
                      </Text>
                    )}
                  </ScrollArea>
                </Paper>
              </Box>
            </Group>

            <Divider mt='md' />

            <RichTextInput
              label='Notes'
              value={notes ?? toHTML(form.values.notes)}
              onChange={(text, json) => {
                setNotes(json);
                form.setFieldValue('notes', text);
              }}
            />

            <Group justify='space-between' align='end'>
              {editing ? (
                <Button
                  variant='light'
                  color='red'
                  size='compact-sm'
                  onClick={() => {
                    modals.openConfirmModal({
                      title: <Title order={3}>Are you sure you want to delete this record?</Title>,
                      children: (
                        <Text size='sm'>
                          This action cannot be undone. All data associated with this record will be permanently
                          deleted.
                        </Text>
                      ),
                      labels: { confirm: 'Confirm', cancel: 'Cancel' },
                      onCancel: () => {},
                      onConfirm: () => {
                        props.onDelete();
                        onReset();
                      },
                    });
                  }}
                >
                  Delete Record
                </Button>
              ) : (
                <Box></Box>
              )}
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
                <Button type='submit'>{editing ? 'Update' : 'Create'}</Button>
              </Group>
            </Group>
          </Stack>
        </form>
      </ScrollArea>
    </Modal>
  );
}
