import { Accordion, Box, Group, Tabs, Text, TextInput, UnstyledButton } from '@mantine/core';
import { IconChevronRight, IconSearch } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { isGlassScreen, type GlassScreen, type StudyEntry, type StudyGroup } from './sheet-study-data';

/** The same surface role is used across every sample panel. */
export function SheetSurface({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <Box className={`sheet-surface ${className}`}>{children}</Box>;
}

/** Native Mantine tab navigation; long labels wrap instead of clipping. */
export function SheetTabs({
  value,
  options,
  onChange,
}: {
  value: GlassScreen;
  options: { value: GlassScreen; label: string }[];
  onChange: (value: GlassScreen) => void;
}) {
  return (
    <Tabs
      className='sheet-tabs'
      value={value}
      onChange={(next) => {
        if (isGlassScreen(next)) onChange(next);
      }}
    >
      <Tabs.List>
        {options.map((option) => (
          <Tabs.Tab key={option.value} value={option.value}>
            {option.label}
          </Tabs.Tab>
        ))}
      </Tabs.List>
    </Tabs>
  );
}

/** Shared search styling keeps the entire placeholder visible on narrow screens. */
export function SheetSearch({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <TextInput
      className='sheet-field'
      classNames={{ input: 'sheet-input' }}
      leftSection={<IconSearch size={17} />}
      aria-label={label}
      placeholder={label}
      value={value}
      onChange={(event) => onChange(event.currentTarget.value)}
    />
  );
}

/** Names and metadata get separate lines; the whole row opens the local detail sample. */
export function StudyEntryRow({ entry, onOpen }: { entry: StudyEntry; onOpen: (entry: StudyEntry) => void }) {
  return (
    <UnstyledButton className='sheet-entry' onClick={() => onOpen(entry)}>
      <Box className='sheet-entry-copy'>
        <Text component='span' className='sheet-entry-name'>
          {entry.name}
        </Text>
        {(entry.level !== undefined || entry.summary) && (
          <Text component='span' className='sheet-entry-meta'>
            {entry.level !== undefined ? `Level ${entry.level}` : entry.summary}
          </Text>
        )}
      </Box>
      {entry.actions && (
        <Text
          component='span'
          className='sheet-actions'
          aria-label={
            entry.actions === '4' ? 'Free action' : entry.actions === '5' ? 'Reaction' : `${entry.actions} actions`
          }
        >
          {entry.actions}
        </Text>
      )}
      <IconChevronRight size={15} className='sheet-muted' aria-hidden />
    </UnstyledButton>
  );
}

/** These are real expand/collapse groups, visually distinct from destination buttons. */
export function StudyGroups({
  groups,
  onOpen,
  initiallyOpen,
}: {
  groups: StudyGroup[];
  onOpen: (entry: StudyEntry) => void;
  initiallyOpen?: string[];
}) {
  return (
    <Accordion
      className='sheet-groups'
      multiple
      defaultValue={initiallyOpen ?? groups.map((group) => group.name)}
      order={4}
      transitionDuration={0}
    >
      {groups.map((group) => (
        <Accordion.Item key={group.name} value={group.name}>
          <Accordion.Control>
            <Group component='span' justify='space-between' wrap='nowrap' gap='sm'>
              <Text component='span' fw={600}>
                {group.name}
              </Text>
              <Text component='span' className='sheet-count'>
                {group.entries.length}
              </Text>
            </Group>
          </Accordion.Control>
          <Accordion.Panel>
            {group.entries.map((entry) => (
              <StudyEntryRow key={entry.name} entry={entry} onOpen={onOpen} />
            ))}
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion>
  );
}
