import { Anchor, Box, Divider, Group, Image, SegmentedControl, Stack, Tabs, Text, Title } from '@mantine/core';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { castingModelCases } from './casting-model-data';
import { entryName } from './spell-study-data';
import { mobbinReferences } from './mobbin-references';
import classes from './spell-references.module.css';

/** Static placement shapes deliberately have no button semantics or simulated save behavior. */
function SketchRow({ name, detail, state }: { name: string; detail?: string; state?: string }) {
  return (
    <Group className={classes.row} justify='space-between' wrap='nowrap' gap='sm'>
      <Box className={classes.copy}>
        <Text size='md'>{name}</Text>
        {detail && (
          <Text size='xs' c='gray.5'>
            {detail}
          </Text>
        )}
      </Box>
      {state && (
        <Text size='xs' c='gray.4' className={classes.state}>
          {state}
        </Text>
      )}
    </Group>
  );
}

/** A small excerpt reuses the existing prepared and spontaneous fixtures without another casting model. */
function ListSketch({ caster }: { caster: string }) {
  const example = castingModelCases.find((item) => item.id === caster)!;
  const source = example.scenario.sources[0];
  const ranks = [...new Set(source.entries.map((entry) => entry.rank))].sort((a, b) => a - b);
  return (
    <Box className={classes.sketch}>
      <Text fw={600} size='xl'>
        Spells
      </Text>
      <Text className={classes.searchShape} c='gray.5' size='sm'>
        Search spells or sources
      </Text>
      <Group justify='space-between' mt='lg' mb='xs'>
        <Text fw={600}>{source.name}</Text>
        <Text c='gray.4' size='xs'>
          {caster === 'prepared' ? 'Prepare' : 'Repertoire'}
        </Text>
      </Group>
      <Text c='gray.5' size='xs'>
        Attack +{source.attack} · DC {source.dc}
      </Text>
      {ranks.slice(0, 3).map((rank) => {
        const entries = source.entries.filter((entry) => entry.rank === rank);
        const pool = source.pools[`rank-${rank}`];
        const empty = entries.filter((entry) => !entry.spell && !entry.missing);
        return (
          <Box key={rank} mt='md'>
            <Group justify='space-between' gap='xs'>
              <Text size='xs' c='gray.5'>
                {rank === 0 ? 'Cantrips' : `Rank ${rank}`}
              </Text>
              {caster === 'spontaneous' && pool && (
                <Text size='xs' c='gray.3'>
                  {pool.remaining} / {pool.max} slots left
                </Text>
              )}
            </Group>
            {entries
              .filter((entry) => entry.spell || entry.missing)
              .map((entry) => (
                <SketchRow
                  key={entry.id}
                  name={entryName(entry)}
                  detail={example.options[source.id]?.signatures?.includes(entry.id) ? 'Signature spell' : undefined}
                  state={caster === 'prepared' && rank > 0 ? (entry.used ? 'Used' : 'Ready') : undefined}
                />
              ))}
            {empty.length > 0 && (
              <Text size='xs' c='gray.5' mt='xs'>
                {empty.length} unprepared · Prepare
              </Text>
            )}
          </Box>
        );
      })}
    </Box>
  );
}

/** A preparation excerpt preserves exact slot positions; the actual editor remains in the earlier model study. */
function PreparationSketch() {
  const example = castingModelCases.find((item) => item.id === 'prepared')!;
  const source = example.scenario.sources[0];
  return (
    <Box className={classes.sketch}>
      <Text c='gray.5' size='xs'>
        Spells / {source.name}
      </Text>
      <Text fw={600} size='xl' mt='xs'>
        Prepare spells
      </Text>
      <Text c='gray.5' size='sm' mt='xs'>
        Rank 1
      </Text>
      <Box mt='md'>
        {source.entries
          .filter((entry) => entry.rank === 1)
          .map((entry, index) => (
            <Box key={entry.id} className={classes.slot}>
              <Text size='xs' c='gray.5'>
                Slot {index + 1}
                {example.options[source.id]?.restrictions?.[entry.id]
                  ? ` · ${example.options[source.id].restrictions![entry.id]}`
                  : ''}
              </Text>
              <SketchRow
                name={entry.spell ? entryName(entry) : 'Choose a spell'}
                state={entry.spell ? 'Change' : '+'}
              />
            </Box>
          ))}
      </Box>
      <Box className={classes.annotation} mt='xl'>
        <Text size='sm'>Tap a slot → choose a spell → return here</Text>
        <Text size='xs' c='gray.5' mt='xs'>
          The picker uses your spellbook or tradition and keeps the slot restriction visible.
        </Text>
      </Box>
    </Box>
  );
}

/** The staff is the demanding payment example; these are labeled shapes, not functioning controls. */
function CastingSketch() {
  return (
    <Box className={`${classes.sketch} ${classes.castSketch}`}>
      <Text c='gray.5' size='sm' ta='center' py='lg'>
        Spell list remains behind the sheet
      </Text>
      <Box className={classes.sheetShape}>
        <Text c='gray.5' size='xs'>
          Sample staff · Rank 3
        </Text>
        <Text size='xl' fw={600} mt='xs'>
          Fireball
        </Text>
        <Text c='gray.5' size='sm' mt='md'>
          Description and spell details
        </Text>
        <Box className={classes.descriptionShape} mt='sm'>
          Scrollable description area
        </Box>
        <Text size='sm' fw={600} mt='lg'>
          Cast using
        </Text>
        <SketchRow name='3 staff charges' detail='5 charges available' state='Selected' />
        <SketchRow name='1 charge + a spell slot' detail='Choose an eligible source and rank' />
        <Text className={classes.actionShape} mt='lg' ta='center' fw={600}>
          Cast · 3 charges
        </Text>
      </Box>
    </Box>
  );
}

/** Reference review pairs inspected Mobbin screenshots with our own limited placement sketches. */
export function SpellReferenceStudy() {
  const [params, setParams] = useSearchParams();
  const reference = mobbinReferences.find((item) => item.id === params.get('pattern')) ?? mobbinReferences[0];
  const [caster, setCaster] = useState<string>('prepared');
  const [imageFailed, setImageFailed] = useState<boolean>(false);
  return (
    <Box className={classes.study}>
      <Group justify='space-between' align='flex-start' mb='lg'>
        <Box maw={660}>
          <Text c='gray.5' size='xs' mb='xs'>
            WANDERER’S GUIDE / MOBBIN REFERENCE STUDY
          </Text>
          <Title order={1} size='h2'>
            A calmer Spells page.
          </Title>
          <Text c='gray.4' size='sm' mt='xs'>
            Three real product references, with specific ideas for our layout. The sketches show placement, not a
            finished visual design.
          </Text>
        </Box>
        <Anchor component={Link} to='/?view=spell-models&group=casting' size='sm'>
          All casting models →
        </Anchor>
      </Group>
      <Tabs
        value={reference.id}
        onChange={(value) => {
          setImageFailed(false);
          setParams({ view: 'spell-references', pattern: value ?? 'browse' });
        }}
        variant='pills'
        radius='xl'
      >
        <Tabs.List aria-label='Reference patterns' mb='xl'>
          {mobbinReferences.map((item) => (
            <Tabs.Tab key={item.id} value={item.id}>
              {item.label}
            </Tabs.Tab>
          ))}
        </Tabs.List>
        {mobbinReferences.map((item) => (
          <Tabs.Panel key={item.id} value={item.id} keepMounted={false}>
            <Box className={classes.comparison}>
              <Box component='figure' m={0}>
                <Text fw={600}>{item.app}</Text>
                <Text size='xs' c='gray.5' mb='sm'>
                  {item.screen} · Actual reference
                </Text>
                {imageFailed ? (
                  <Text size='sm' c='gray.5'>
                    The hosted image could not load. Open the source below.
                  </Text>
                ) : (
                  <Anchor href={item.url} target='_blank' rel='noreferrer' className={classes.imageLink}>
                    <Image
                      src={item.image}
                      alt={`${item.app}: ${item.screen}, curated by Mobbin`}
                      fit='contain'
                      onError={() => setImageFailed(true)}
                    />
                  </Anchor>
                )}
                <Anchor href={item.url} target='_blank' rel='noreferrer' size='xs' mt='sm' display='block'>
                  View on Mobbin ↗
                </Anchor>
              </Box>
              <Stack gap='lg' className={classes.notes}>
                <Title order={2} size='h3'>
                  {item.title}
                </Title>
                <Box>
                  <Text fw={600} size='sm' mb='xs'>
                    What the reference does
                  </Text>
                  <Text size='sm' c='gray.4'>
                    {item.observation}
                  </Text>
                </Box>
                <Box>
                  <Text fw={600} size='sm' mb='xs'>
                    How I would use it here
                  </Text>
                  <Text size='sm' c='gray.3'>
                    {item.proposal}
                  </Text>
                </Box>
                <Text size='sm' c='gray.5'>
                  {item.caution}
                </Text>
              </Stack>
              <Box>
                <Group justify='space-between' mb='sm'>
                  <Text fw={600}>Our arrangement sketch</Text>
                  <Text size='xs' c='gray.5'>
                    Static shapes
                  </Text>
                </Group>
                {item.id === 'browse' && (
                  <SegmentedControl
                    fullWidth
                    value={caster}
                    onChange={setCaster}
                    mb='sm'
                    aria-label='Sketch casting model'
                    data={[
                      { value: 'prepared', label: 'Prepared' },
                      { value: 'spontaneous', label: 'Spontaneous' },
                    ]}
                  />
                )}
                {item.id === 'browse' ? (
                  <ListSketch caster={caster} />
                ) : item.id === 'prepare' ? (
                  <PreparationSketch />
                ) : (
                  <CastingSketch />
                )}
              </Box>
            </Box>
          </Tabs.Panel>
        ))}
      </Tabs>
      <Divider my='xl' />
      <Box className={classes.summary}>
        <Box>
          <Text fw={600} mb='xs'>
            One material, clear ownership.
          </Text>
          <Text size='sm' c='gray.4'>
            Keep the smoked glass around one reading surface. Spell names, costs, and actions need a stable dark
            backing. Group with spacing and restrained dividers.
          </Text>
        </Box>
        <Box>
          <Text fw={600} mb='xs'>
            The other sources still fit.
          </Text>
          <Text size='sm' c='gray.4'>
            Focus gets one shared pool. Innate spells and spellhearts keep their activation limits. Each staff keeps its
            charges; each wand keeps its daily use and overcharge state. Rituals open details without a Cast action.
          </Text>
        </Box>
      </Box>
      <Text size='xs' c='gray.5' mt='xl'>
        Reference screenshots belong to their respective owners and are hosted by Mobbin. Observations are from public
        screenshots, not usability tests. Illustrative sketches only. This branch remains unmerged.
      </Text>
    </Box>
  );
}
