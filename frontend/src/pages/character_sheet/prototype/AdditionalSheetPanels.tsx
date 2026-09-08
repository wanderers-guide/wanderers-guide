import {
  Accordion,
  ActionIcon,
  Box,
  Button,
  Group,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
  Textarea,
  UnstyledButton,
} from '@mantine/core';
import { IconAdjustments, IconPaw, IconPlus, IconX } from '@tabler/icons-react';
import { useState, type ChangeEvent } from 'react';
import {
  featGroups,
  featureGroups,
  weapons,
  type GlassScreen,
  type StudyEntry,
  type StudyGroup,
} from './sheet-study-data';
import { SheetSearch, SheetSurface, SheetTabs, StudyEntryRow, StudyGroups } from './SheetStudyParts';
import { StudyNotes } from './StudyNotes';
import { initialNotes } from './sheet-study-data';

const skillTabs = [
  { value: 'skills', label: 'Skills' },
  { value: 'actions', label: 'Actions / Abilities' },
] as const;
const detailsTabs = [
  { value: 'details', label: 'Information' },
  { value: 'languages', label: 'Languages' },
  { value: 'proficiencies', label: 'Proficiencies' },
] as const;

/** Additional screen samples share state locally. Returning null leaves that state alive. */
export function AdditionalSheetPanels({
  screen,
  onScreenChange,
  onOpen,
}: {
  screen: GlassScreen;
  onScreenChange: (screen: GlassScreen) => void;
  onOpen: (entry: StudyEntry) => void;
}) {
  const [searches, setSearches] = useState<Record<string, string>>({});
  const [actionCost, setActionCost] = useState('all');
  const [equipped, setEquipped] = useState(['Bastard Sword', 'Club', 'Leather Armor']);
  const [inventoryOptions, setInventoryOptions] = useState(false);
  const [notes, setNotes] = useState(initialNotes);
  const [informationTab, setInformationTab] = useState('general');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [hasCompanion, setHasCompanion] = useState(true);
  const [confirmRemoval, setConfirmRemoval] = useState(false);
  const key = screen === 'features' ? 'feats' : screen;
  const search = searches[key] ?? '';
  const setSearch = (value: string) => setSearches((current) => ({ ...current, [key]: value }));
  const filterGroups = (groups: StudyGroup[]) =>
    groups
      .map((group) => ({
        ...group,
        entries: group.entries.filter((entry) => entry.name.toLowerCase().includes(search.toLowerCase())),
      }))
      .filter((group) => group.entries.length > 0);
  const field = (label: string, multiline = false) => {
    const shared = {
      label,
      value: fields[label] ?? '',
      className: 'sheet-field',
      onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const value = event.currentTarget.value;
        setFields((current) => ({ ...current, [label]: value }));
      },
    };
    return multiline ? (
      <Textarea key={label} {...shared} autosize minRows={2} />
    ) : (
      <TextInput key={label} {...shared} />
    );
  };

  if (screen === 'actions') {
    const groups = filterGroups([
      { name: 'Weapon Attacks', entries: weapons },
      {
        name: 'Feats (with Actions)',
        entries: featGroups.flatMap((group) => group.entries).filter((entry) => entry.actions),
      },
      { name: 'Items (with Actions)', entries: [{ name: 'Spring-Loaded Net Launcher', actions: '1' }] },
      {
        name: 'Basic Actions',
        entries: [
          { name: 'Stride', actions: '1', description: 'You move up to your Speed.' },
          { name: 'Step', actions: '1' },
          { name: 'Interact', actions: '1' },
          { name: 'Release', actions: '4' },
          { name: 'Aid', actions: '5' },
        ],
      },
      {
        name: 'Skill Actions',
        entries: [
          { name: 'Recall Knowledge', actions: '1' },
          { name: 'Demoralize', actions: '1' },
          { name: 'Make an Impression' },
        ],
      },
      {
        name: 'Speciality Basics',
        entries: [
          { name: 'Seek', actions: '1' },
          { name: 'Sense Motive', actions: '1' },
        ],
      },
      {
        name: 'Exploration Activities',
        entries: [{ name: 'Avoid Notice' }, { name: 'Defend' }, { name: 'Investigate' }],
      },
      { name: 'Downtime Activities', entries: [{ name: 'Earn Income' }, { name: 'Craft' }, { name: 'Subsist' }] },
    ])
      .map((group) => ({
        ...group,
        entries: group.entries.filter((entry) => actionCost === 'all' || entry.actions === actionCost),
      }))
      .filter((group) => group.entries.length > 0);
    return (
      <SheetSurface className='sheet-panel'>
        <SheetTabs value={screen} options={[...skillTabs]} onChange={onScreenChange} />
        <SheetSearch label='Search actions' value={search} onChange={setSearch} />
        <SegmentedControl
          className='sheet-segments sheet-action-filter'
          aria-label='Action cost'
          fullWidth
          value={actionCost}
          onChange={setActionCost}
          data={[
            { value: 'all', label: 'All' },
            ...['1', '2', '3', '4', '5'].map((cost) => ({
              value: cost,
              label: (
                <span
                  className='sheet-actions'
                  aria-label={cost === '4' ? 'Free action' : cost === '5' ? 'Reaction' : `${cost} actions`}
                >
                  {cost}
                </span>
              ),
            })),
          ]}
        />
        {groups.length ? (
          <StudyGroups
            key={`${search}-${actionCost}`}
            groups={groups}
            onOpen={onOpen}
            initiallyOpen={['Weapon Attacks']}
          />
        ) : (
          <Text className='sheet-empty'>No matching actions.</Text>
        )}
      </SheetSurface>
    );
  }
  if (screen === 'feats' || screen === 'features') {
    const groups = filterGroups(
      search ? [...featGroups, ...featureGroups] : screen === 'feats' ? featGroups : featureGroups
    );
    return (
      <SheetSurface className='sheet-panel'>
        <SheetTabs
          value={screen}
          options={[
            { value: 'feats', label: 'Feats' },
            { value: 'features', label: 'Features' },
          ]}
          onChange={onScreenChange}
        />
        <SheetSearch label='Search feats & features' value={search} onChange={setSearch} />
        {groups.length ? (
          <StudyGroups key={search || screen} groups={groups} onOpen={onOpen} />
        ) : (
          <Text className='sheet-empty'>No matching feats or features.</Text>
        )}
      </SheetSurface>
    );
  }
  if (screen === 'inventory') {
    const items: StudyEntry[] = [
      weapons[1],
      weapons[2],
      { name: 'Leather Armor' },
      { name: 'Spring-Loaded Net Launcher' },
      { name: 'Spyglass' },
    ];
    const matches = items.filter((item) => item.name.toLowerCase().includes(search.toLowerCase()));
    return (
      <SheetSurface className='sheet-panel'>
        <Group justify='space-between' mb='sm'>
          <Text component='h4'>Inventory</Text>
          <Button
            variant='subtle'
            className='sheet-button'
            size='xs'
            leftSection={<IconAdjustments size={16} />}
            onClick={() => setInventoryOptions(!inventoryOptions)}
            aria-expanded={inventoryOptions}
          >
            Options
          </Button>
        </Group>
        <SheetSearch label='Search items' value={search} onChange={setSearch} />
        {inventoryOptions && (
          <Box className='sheet-reading-inset' mt='sm'>
            <Group gap='xs'>
              <Button className='sheet-button' variant='light' size='xs' disabled>
                Add Item
              </Button>
              <Button className='sheet-button' variant='light' size='xs' disabled>
                Manage Currency
              </Button>
            </Group>
          </Box>
        )}
        <Stack gap='xs' mt='sm'>
          {matches.map((item) => (
            <Box className='sheet-inventory-row' key={item.name}>
              <StudyEntryRow entry={{ ...item, actions: undefined }} onOpen={onOpen} />
              {['Bastard Sword', 'Club', 'Leather Armor'].includes(item.name) && (
                <Button
                  className='sheet-button sheet-equip'
                  variant='light'
                  size='xs'
                  aria-label={`${equipped.includes(item.name) ? 'Unequip' : 'Equip'} ${item.name}`}
                  onClick={() =>
                    setEquipped((current) =>
                      current.includes(item.name)
                        ? current.filter((name) => name !== item.name)
                        : [...current, item.name]
                    )
                  }
                >
                  {equipped.includes(item.name) ? 'Unequip' : 'Equip'}
                </Button>
              )}
            </Box>
          ))}
        </Stack>
        {!matches.length && <Text className='sheet-empty'>No matching items.</Text>}
      </SheetSurface>
    );
  }
  if (screen === 'notes')
    return (
      <SheetSurface className='sheet-panel'>
        <StudyNotes notes={notes} onChange={setNotes} />
      </SheetSurface>
    );
  if (['details', 'languages', 'proficiencies'].includes(screen))
    return (
      <SheetSurface className='sheet-panel'>
        <SheetTabs value={screen} options={[...detailsTabs]} onChange={onScreenChange} />
        {screen === 'details' && (
          <>
            <SegmentedControl
              className='sheet-segments'
              fullWidth
              value={informationTab}
              onChange={setInformationTab}
              data={[
                { value: 'general', label: 'General' },
                { value: 'organized', label: 'Organized Play' },
              ]}
              mb='md'
            />
            {informationTab === 'general' ? (
              <Stack gap='md'>
                {['Appearance', 'Personality', 'Alignment', 'Beliefs'].map((label) =>
                  field(label, label !== 'Alignment')
                )}
                <Box className='sheet-field-grid'>
                  {['Age', 'Height', 'Weight', 'Gender', 'Pronouns'].map((label) => field(label))}
                </Box>
                {['Faction', 'Ethnicity', 'Nationality', 'Birthplace'].map((label) => field(label))}
              </Stack>
            ) : (
              <Stack gap='md'>
                {field('Organized Play ID')}
                {field('Character Number')}
                {field('Faction')}
                <Text className='sheet-muted' size='sm'>
                  No adventures recorded.
                </Text>
                <Button className='sheet-button' variant='light' disabled>
                  Add Adventure
                </Button>
              </Stack>
            )}
          </>
        )}
        {screen === 'languages' && (
          <Stack gap='xl' py='sm'>
            {[
              { title: 'Languages', entries: ['Common', 'Wildsong'] },
              { title: 'Traits', entries: ['Beast', 'Awakened Animal'] },
              { title: 'Size', entries: ['Tiny'] },
            ].map((group) => (
              <Box key={group.title}>
                <Text component='h4' mb='sm'>
                  {group.title}
                </Text>
                <Group gap='xs'>
                  {group.entries.map((name) => (
                    <Button
                      key={name}
                      variant='light'
                      className='sheet-button'
                      radius='xl'
                      onClick={() => onOpen({ name, summary: group.title })}
                    >
                      {name}
                    </Button>
                  ))}
                </Group>
              </Box>
            ))}
          </Stack>
        )}
        {screen === 'proficiencies' && (
          <>
            <Accordion className='sheet-groups' order={4} multiple defaultValue={['Attacks']} transitionDuration={0}>
              {[
                {
                  name: 'Attacks',
                  entries: [
                    ['Simple weapons', 'Trained'],
                    ['Martial weapons', 'Untrained'],
                    ['Unarmed attacks', 'Trained'],
                  ],
                },
                {
                  name: 'Defenses',
                  entries: [
                    ['Light armor', 'Trained'],
                    ['Unarmored defense', 'Trained'],
                  ],
                },
                { name: 'Spellcasting', entries: [['Oracle', 'Trained']] },
              ].map((group) => (
                <Accordion.Item key={group.name} value={group.name}>
                  <Accordion.Control>{group.name}</Accordion.Control>
                  <Accordion.Panel>
                    {group.entries.map(([label, rank]) => (
                      <Group className='sheet-proficiency-row' key={label} justify='space-between'>
                        <Text size='sm'>{label}</Text>
                        <Text className='sheet-muted' size='xs'>
                          {rank}
                        </Text>
                      </Group>
                    ))}
                  </Accordion.Panel>
                </Accordion.Item>
              ))}
            </Accordion>
            <Group className='sheet-reading-inset' justify='space-between' mt='md'>
              <Text>Class DC</Text>
              <Text fw={600}>19</Text>
              <Text className='sheet-muted' size='xs'>
                Trained
              </Text>
            </Group>
          </>
        )}
      </SheetSurface>
    );
  if (screen === 'companions')
    return (
      <SheetSurface className='sheet-panel'>
        <Text component='h4' mb='md'>
          Companions
        </Text>
        {hasCompanion ? (
          <Box className='sheet-companion-row'>
            <UnstyledButton
              className='sheet-companion-card'
              onClick={() => onOpen({ name: 'Badger', summary: 'Companion · Level 3' })}
            >
              <IconPaw size={30} />
              <Box>
                <Text fw={600}>Badger</Text>
                <Text className='sheet-muted' size='sm'>
                  Level 3
                </Text>
              </Box>
            </UnstyledButton>
            <ActionIcon
              className='sheet-tool'
              variant='subtle'
              aria-label='Remove companion'
              onClick={() => setConfirmRemoval(true)}
            >
              <IconX size={18} />
            </ActionIcon>
          </Box>
        ) : (
          <Text className='sheet-empty'>No companions.</Text>
        )}
        {confirmRemoval && (
          <Box className='sheet-reading-inset' mt='sm'>
            <Text mb='sm'>Remove Badger?</Text>
            <Group>
              <Button
                className='sheet-button'
                variant='light'
                onClick={() => {
                  setHasCompanion(false);
                  setConfirmRemoval(false);
                }}
              >
                Remove
              </Button>
              <Button className='sheet-button' variant='subtle' onClick={() => setConfirmRemoval(false)}>
                Cancel
              </Button>
            </Group>
          </Box>
        )}
        <Button
          className='sheet-button'
          variant='light'
          mt='lg'
          leftSection={<IconPlus size={17} />}
          onClick={() => {
            setHasCompanion(true);
            setConfirmRemoval(false);
          }}
        >
          Add Companion
        </Button>
      </SheetSurface>
    );
  if (screen === 'extras')
    return (
      <SheetSurface className='sheet-panel'>
        <Text component='h4'>More to come!</Text>
        <Text className='sheet-muted' size='sm' mt='sm'>
          More character tools will appear here.
        </Text>
      </SheetSurface>
    );
  return null;
}
