import {
  Badge,
  Box,
  Button,
  Divider,
  Group,
  Image,
  NavLink,
  Paper,
  SegmentedControl,
  Stack,
  Switch,
  Text,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { useState } from 'react';
import { z } from 'zod';
import { navigationTarget, screenMap } from './screen-map';

const captureSchema = z.object({
  id: z.string(),
  width: z.number(),
  height: z.number(),
  text: z.string(),
  controls: z.array(
    z.object({
      label: z.string(),
      role: z.string(),
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number(),
    })
  ),
});
type Capture = z.infer<typeof captureSchema>;
const captures: Capture[] = Object.values(
  import.meta.glob('./captures/*-screens.json', { eager: true, import: 'default' })
).flatMap((value) => z.array(captureSchema).parse(value));
const images: Record<string, string> = import.meta.glob('./captures/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
});

/** Reuse the untouched captures in the matching before/after view. */
export function CurrentSheetImage({ screen, width }: { screen: string; width: string }) {
  return (
    <Image
      src={images[`./captures/${width}-${screen}.png`]}
      alt={`Current ${screen} screen at ${width} pixels`}
      className='study-baseline-image'
    />
  );
}

/** A click-through record of the current UI. It has no application API or save path. */
export function MobileSheetPrototype({ initialScreen = 'overview' }: { initialScreen?: string }) {
  const [activeId, setActiveId] = useState<string>(initialScreen);
  const [previousId, setPreviousId] = useState<string>('overview');
  const [width, setWidth] = useState<string>('390');
  const [showHotspots, setShowHotspots] = useState<boolean>(false);
  const [actualSize, setActualSize] = useState<boolean>(false);
  const description = screenMap.find((screen) => screen.id === activeId) ?? screenMap[0];
  const capture = captures.find((screen) => screen.id === activeId && screen.width === Number(width));

  /** The picker closes back to the screen it was opened from, as in the actual sheet. */
  const navigate = (id: string): void => {
    if (id === 'picker') setPreviousId(activeId);
    setActiveId(id);
  };

  return (
    <Box className='prototype-shell' p={{ base: 'sm', sm: 'xl' }}>
      <Group justify='space-between' align='flex-start' mb='lg' gap='md'>
        <Stack gap={4}>
          <Group gap='xs'>
            <Badge variant='light'>Current UI</Badge>
            <Text size='xs' c='dimmed'>
              Baseline: 02940a97
            </Text>
          </Group>
          <Title order={2}>Mobile character sheet</Title>
          <Text size='sm' c='dimmed'>
            Captured screens. Click the grid or navigation map.
          </Text>
        </Stack>
        <Stack gap='xs' align='flex-end'>
          <SegmentedControl
            aria-label='Captured phone width'
            value={width}
            onChange={setWidth}
            data={[
              { label: '390 px', value: '390' },
              { label: '430 px', value: '430' },
            ]}
          />
          <Switch
            label='Show clickable areas'
            size='xs'
            checked={showHotspots}
            onChange={(event) => setShowHotspots(event.currentTarget.checked)}
          />
          <Switch
            label='Actual size'
            size='xs'
            checked={actualSize}
            onChange={(event) => setActualSize(event.currentTarget.checked)}
          />
        </Stack>
      </Group>

      <Box className='prototype-layout'>
        <Paper component='nav' aria-label='Current sheet map' withBorder p='xs' className='prototype-map'>
          <Text fw={600} size='sm' px='sm' py='xs'>
            Navigation map
          </Text>
          {screenMap
            .filter((screen) => !screen.parent)
            .map((screen) => (
              <Box key={screen.id}>
                <NavLink
                  component='button'
                  label={screen.title}
                  active={activeId === screen.id}
                  onClick={() => navigate(screen.id)}
                />
                {screenMap
                  .filter((child) => child.parent === screen.id)
                  .map((child) => (
                    <NavLink
                      key={child.id}
                      component='button'
                      pl='xl'
                      label={child.title}
                      active={activeId === child.id}
                      onClick={() => navigate(child.id)}
                    />
                  ))}
              </Box>
            ))}
        </Paper>

        <Stack align='center' gap='xs' className='prototype-stage'>
          <Box
            className='prototype-phone'
            data-actual-size={actualSize || undefined}
            style={{ '--capture-width': width, '--capture-height': '844' }}
          >
            {capture ? (
              <>
                <Image
                  src={images[`./captures/${width}-${activeId}.png`]}
                  alt={`${description.title}, current mobile sheet at ${width} pixels`}
                  draggable={false}
                />
                {capture.controls.flatMap((control, index) => {
                  let target = navigationTarget(control.label, activeId);
                  if (activeId === 'picker' && control.label === 'Panel Grid') target = previousId;
                  if (!target) return [];
                  const destination: string = target;
                  return [
                    <UnstyledButton
                      key={index}
                      className='prototype-hotspot'
                      data-highlighted={showHotspots || undefined}
                      aria-label={control.label.trim()}
                      title={control.label.trim()}
                      onClick={() => navigate(destination)}
                      style={{
                        left: `${(control.x / capture.width) * 100}%`,
                        top: `${(control.y / capture.height) * 100}%`,
                        width: `${(control.width / capture.width) * 100}%`,
                        height: `${(control.height / capture.height) * 100}%`,
                      }}
                    />,
                  ];
                })}
              </>
            ) : (
              <Text p='xl'>Capture pending</Text>
            )}
          </Box>
          <Text c='dimmed' size='xs'>
            {width} × 844 · Public character: Kip
          </Text>
          {['overview', 'overview-bottom'].includes(activeId) && (
            <Button
              variant='subtle'
              size='xs'
              onClick={() => navigate(activeId === 'overview' ? 'overview-bottom' : 'overview')}
            >
              {activeId === 'overview' ? 'View lower stats' : 'Back to top'}
            </Button>
          )}
        </Stack>

        <Stack gap='md' className='prototype-context'>
          <Stack gap='xs'>
            <Text size='xs' c='dimmed'>
              SELECTED SCREEN
            </Text>
            <Title order={3}>{description.title}</Title>
            <Text size='sm'>{description.contents}</Text>
            <Text size='sm' c='dimmed'>
              {description.interaction}
            </Text>
          </Stack>
          <Divider />
          <Stack gap='xs'>
            <Text fw={600} size='sm'>
              What stays on screen
            </Text>
            <Text size='sm' c='dimmed'>
              The character header stays. Opening a panel hides the overview stats.
            </Text>
            <Text size='sm' c='dimmed'>
              The grid button switches panels. Modes, campaign and dice shortcuts depend on the character.
            </Text>
          </Stack>
          <Divider />
          <Stack gap='xs'>
            <Text fw={600} size='sm'>
              Reference scope
            </Text>
            <Text size='sm' c='dimmed'>
              Navigation is clickable. The captured fields, searches and game controls are visual references.
            </Text>
            <Text size='sm' c='dimmed'>
              Current dark theme. No redesign decisions yet.
            </Text>
          </Stack>
          <Button variant='light' onClick={() => navigate('overview')}>
            Return to overview
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}
