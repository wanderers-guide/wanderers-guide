import { Box, Checkbox, Group, TextInput, UnstyledButton } from '@mantine/core';
import {
  IconChevronDown,
  IconGridDots,
  IconMenu2,
  IconMoon,
  IconSearch,
  IconStar,
  IconStarFilled,
  IconX,
} from '@tabler/icons-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import LogoIcon from '../../../assets/images/LogoIcon';
import ArmorIcon from '../../../assets/images/ArmorIcon';

export type GlassVariant = 'smoked' | 'unified' | 'frosted';
export type GlassScreen = 'overview' | 'skills' | 'spells';
const portrait =
  'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/portraits/0b7a9464-cf77-4a95-8018-6e4c6fc414b4/3524096663233119.png';
const skillRows: [string, number, string][] = [
  ['Acrobatics', 6, 'T'],
  ['Arcana', 1, 'U'],
  ['Athletics', 1, 'U'],
  ['Computers', 1, 'U'],
  ['Crafting', 1, 'U'],
  ['Deception', 4, 'U'],
  ['Diplomacy', 9, 'T'],
  ['Intimidation', 9, 'T'],
  ['Ferret Lore', 6, 'T'],
  ['Technology Lore', 6, 'T'],
  ['Medicine', 1, 'U'],
  ['Nature', 1, 'U'],
  ['Occultism', 8, 'E'],
  ['Performance', 9, 'T'],
  ['Piloting', 1, 'U'],
  ['Religion', 6, 'T'],
  ['Society', 6, 'T'],
  ['Stealth', 1, 'U'],
  ['Survival', 6, 'T'],
  ['Thievery', 1, 'U'],
];
const ranks: Record<string, string> = { U: 'Untrained', T: 'Trained', E: 'Expert' };

function Surface({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <Box className={`sheet-surface ${className}`}>{children}</Box>;
}

function StatRow({ label, bonus, rank }: { label: string; bonus: number; rank?: string }) {
  return (
    <Box className='sheet-stat-row'>
      <span>{label}</span>
      <strong>+{bonus}</strong>
      {rank && (
        <span className='sheet-rank' title={ranks[rank]} aria-label={ranks[rank]}>
          {rank}
        </span>
      )}
    </Box>
  );
}

/** Sample state is memory-only and never imports character controllers or API clients. */
export function GlassSheet({
  variant,
  screen,
  onScreenChange,
  backdrop,
}: {
  variant: GlassVariant;
  screen: GlassScreen;
  onScreenChange: (screen: GlassScreen) => void;
  backdrop: string;
}) {
  const [heroPoints, setHeroPoints] = useState(1);
  const [search, setSearch] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [usedSlots, setUsedSlots] = useState([true, false, false, false]);
  const viewport = useRef<HTMLDivElement>(null);
  const pickerButton = useRef<HTMLButtonElement>(null);
  const firstDestination = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    viewport.current?.scrollTo({ top: 0 });
  }, [screen]);
  useEffect(() => {
    if (pickerOpen) firstDestination.current?.focus();
  }, [pickerOpen]);
  const closePicker = () => {
    setPickerOpen(false);
    pickerButton.current?.focus();
  };

  return (
    <Box className='glass-phone' data-glass={variant} data-backdrop={backdrop}>
      <Box className='sheet-viewport' ref={viewport} tabIndex={0} aria-label={`${variant} character sheet, scrollable`}>
        <Box className='sheet-app-header'>
          <IconMenu2 size={23} aria-hidden />
          <LogoIcon size={31} color='var(--sheet-accent)' />
          <span>Wanderer’s Guide</span>
        </Box>
        <Box className='sheet-body'>
          <Surface className='sheet-identity'>
            <img className='sheet-portrait' src={portrait} alt='Kip, an awakened animal adventurer' />
            <Box className='sheet-identity-text'>
              <h3>Kip</h3>
              <p>Awakened Animal</p>
              <p>Chatty</p>
              <p>Oracle</p>
            </Box>
            <Box className='sheet-identity-meta'>
              <span className='sheet-control-label'>Edit</span>
              <span className='sheet-control-label'>
                <IconMoon size={13} /> Rest
              </span>
              <span>Lvl. 3</span>
              <span className='sheet-muted'>XP</span>
            </Box>
          </Surface>

          {screen === 'overview' && (
            <>
              <Surface className='sheet-health'>
                <Box className='sheet-two-columns'>
                  <Box>
                    <h4>Hit Points</h4>
                    <p className='sheet-health-value'>
                      <span>11</span>
                      <span className='sheet-muted'> / 33</span>
                    </p>
                  </Box>
                  <Box>
                    <h4>Temp. HP</h4>
                    <p className='sheet-health-value sheet-muted'>0</p>
                  </Box>
                </Box>
                <p className='sheet-muted sheet-centered'>Resistances & Weaknesses</p>
              </Surface>
              <Surface className='sheet-conditions sheet-two-columns'>
                <Box>
                  <h4>Conditions</h4>
                  <p className='sheet-muted'>None active</p>
                </Box>
                <Box>
                  <h4>Hero Points</h4>
                  <Group justify='center' gap={0} mt={8}>
                    {[1, 2, 3].map((point) => (
                      <UnstyledButton
                        key={point}
                        className='sheet-star'
                        aria-label={`Hero point ${point}`}
                        aria-pressed={point <= heroPoints}
                        onClick={() => setHeroPoints(point === heroPoints ? point - 1 : point)}
                      >
                        {point <= heroPoints ? <IconStarFilled size={22} /> : <IconStar size={22} />}
                      </UnstyledButton>
                    ))}
                  </Group>
                </Box>
              </Surface>
              <Surface className='sheet-attributes'>
                {[
                  ['Strength', 1],
                  ['Intelligence', 1],
                  ['Dexterity', 1],
                  ['Wisdom', 1],
                  ['Constitution', 1],
                  ['Charisma', 4],
                ].map(([label, bonus]) => (
                  <StatRow key={label} label={String(label)} bonus={Number(bonus)} />
                ))}
              </Surface>
              <Surface className='sheet-defense'>
                <Box className='sheet-armor'>
                  <ArmorIcon size={92} color='var(--sheet-ornament)' />
                  <div>
                    <strong>17</strong>
                    <span>AC</span>
                  </div>
                </Box>
                <Box className='sheet-saves'>
                  <StatRow label='Fortitude' bonus={6} rank='T' />
                  <StatRow label='Reflex' bonus={6} rank='T' />
                  <StatRow label='Will' bonus={8} rank='E' />
                </Box>
              </Surface>
              <Surface className='sheet-awareness'>
                <Box>
                  <h4>Perception</h4>
                  <strong>+6</strong>
                  <span className='sheet-muted'>Normal Vision</span>
                </Box>
                <Box>
                  <h4>Speed</h4>
                  <strong>
                    20 <small>ft.</small>
                  </strong>
                  <span className='sheet-muted'>And others</span>
                </Box>
                <Box>
                  <h4>Class DC</h4>
                  <strong>19</strong>
                </Box>
              </Surface>
            </>
          )}

          {screen === 'skills' && (
            <Surface className='sheet-panel'>
              <Box className='sheet-panel-tabs'>
                <strong>Skills</strong>
                <span className='sheet-muted'>Actions / Abilities</span>
              </Box>
              <TextInput
                classNames={{ input: 'sheet-input' }}
                leftSection={<IconSearch size={17} />}
                aria-label='Search skills'
                placeholder='Search skills'
                value={search}
                onChange={(event) => setSearch(event.currentTarget.value)}
              />
              <Box className='sheet-skill-list'>
                {skillRows
                  .filter(([name]) => name.toLowerCase().includes(search.toLowerCase()))
                  .map(([name, bonus, rank]) => (
                    <Box className='sheet-skill-row' key={name}>
                      <span>
                        {name}
                        {['Performance', 'Society'].includes(name) && <span aria-label='conditional modifier'> *</span>}
                      </span>
                      <strong>+{bonus}</strong>
                      <span className='sheet-rank' title={ranks[rank]} aria-label={ranks[rank]}>
                        {rank}
                      </span>
                    </Box>
                  ))}
                {!skillRows.some(([name]) => name.toLowerCase().includes(search.toLowerCase())) && (
                  <p className='sheet-muted'>No matching skills.</p>
                )}
              </Box>
              <p className='sheet-muted sheet-footnote'>
                U: Untrained · T: Trained · E: Expert
                <br />* Includes a conditional modifier
              </p>
            </Surface>
          )}

          {screen === 'spells' && (
            <Surface className='sheet-panel'>
              <h4 className='sheet-panel-title'>Spells</h4>
              <Box className='sheet-casting'>
                <strong>Oracle</strong>
                <span>Attack +9</span>
                <span>DC 19</span>
              </Box>
              <Box className='sheet-spell-section'>
                <h4>Cantrips</h4>
                <p className='sheet-muted'>No cantrips known</p>
              </Box>
              <Box className='sheet-spell-section'>
                <Group justify='space-between'>
                  <h4>Rank 1</h4>
                  <Group gap={9} aria-label='Rank 1 spell slots'>
                    {usedSlots.map((used, index) => (
                      <Checkbox
                        key={index}
                        size='xs'
                        checked={used}
                        aria-label={`Rank 1 slot ${index + 1} used`}
                        classNames={{ input: 'sheet-checkbox' }}
                        onChange={() => setUsedSlots((slots) => slots.map((slot, i) => (i === index ? !slot : slot)))}
                      />
                    ))}
                  </Group>
                </Group>
                <p className='sheet-muted sheet-footnote'>{usedSlots.filter(Boolean).length} of 4 slots used</p>
                {['Befuddle', 'Overheat', 'Déjà Vu'].map((spell) => (
                  <Box key={spell} className='sheet-spell-row'>
                    <span>{spell}</span>
                    <span className='sheet-actions' aria-label='Two actions'>
                      2
                    </span>
                  </Box>
                ))}
              </Box>
              <Box className='sheet-spell-section'>
                <h4>Rank 2</h4>
                <p className='sheet-muted'>No spells known</p>
              </Box>
              <Box className='sheet-spell-section'>
                <h4>Focus Spells</h4>
                <Box className='sheet-spell-row'>
                  <span>Temporal Distortion</span>
                  <span className='sheet-actions' aria-label='One action'>
                    1
                  </span>
                </Box>
              </Box>
            </Surface>
          )}
        </Box>
      </Box>

      {pickerOpen && (
        <Box
          className='sheet-picker'
          role='group'
          aria-label='Sample sheet panels'
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.stopPropagation();
              closePicker();
            }
          }}
        >
          <Group justify='space-between' mb={10}>
            <strong>Character sheet</strong>
            <UnstyledButton className='sheet-picker-close' aria-label='Close panels' onClick={closePicker}>
              <IconX size={20} />
            </UnstyledButton>
          </Group>
          {(
            [
              ['overview', 'Health, Attributes, Saves'],
              ['skills', 'Skills & Actions'],
              ['spells', 'Spells'],
            ] as const
          ).map(([id, label], index) => (
            <UnstyledButton
              ref={index === 0 ? firstDestination : undefined}
              key={id}
              className='sheet-picker-option'
              aria-current={screen === id ? 'page' : undefined}
              onClick={() => {
                onScreenChange(id);
                closePicker();
              }}
            >
              {label}
              <IconChevronDown size={16} />
            </UnstyledButton>
          ))}
        </Box>
      )}
      <UnstyledButton
        ref={pickerButton}
        className='sheet-grid-button'
        aria-label='Panel grid'
        aria-expanded={pickerOpen}
        onClick={() => (pickerOpen ? closePicker() : setPickerOpen(true))}
      >
        <IconGridDots size={27} />
      </UnstyledButton>
    </Box>
  );
}
