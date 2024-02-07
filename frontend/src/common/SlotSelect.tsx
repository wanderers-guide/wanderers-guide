import { Box, Button, Grid, Group, NumberInput, Stack, Text } from '@mantine/core';
import { rankNumber } from '@utils/numbers';
import { useState } from 'react';

export function SlotSelect(props: {
  value?: { lvl: number; rank: number; amt: number }[];
  onChange?: (value: { lvl: number; rank: number; amt: number }[]) => void;
}) {
  const LEVELS = 21;
  const RANKS = 12;

  const [slots, setSlots] = useState(props.value);

  const getColumn = (h: number, w: number) => {
    return (
      <Stack gap={1} h={640} justify='space-around'>
        {new Array(h).fill(0).map((_, i) => (
          <>
            {i === 0 ? (
              <Text fz={10} ta='center' truncate>
                {w === 1 ? 'Can.' : rankNumber(w - 1)}
              </Text>
            ) : (
              <NumberInput
                variant='filled'
                clampBehavior='strict'
                size='xs'
                hideControls
                min={0}
                max={9}
                value={slots?.find((s) => s.lvl === i && s.rank === w - 1)?.amt}
                onChange={(value) => {
                  const amount = parseInt(`${value}`);
                  const newSlots = slots || [];
                  const index = newSlots.findIndex((s) => s.lvl === i && s.rank === w - 1);
                  if (index !== -1) {
                    newSlots[index] = { lvl: i, rank: w - 1, amt: amount };
                  } else {
                    newSlots.push({ lvl: i, rank: w - 1, amt: amount });
                  }
                  setSlots(newSlots);
                  props.onChange?.(newSlots);
                }}
                allowDecimal={false}
                styles={{ input: { textAlign: 'center' } }}
              />
            )}
          </>
        ))}
      </Stack>
    );
  };

  return (
    <Grid w={400}>
      {new Array(RANKS).fill(0).map((_, i) => (
        <Grid.Col span={1} key={i} p={1}>
          {i === 0 ? (
            <Stack pt={20} gap={1} h={640} justify='space-around'>
              {new Array(LEVELS).fill(0).map((_, i) => (
                <>
                  {i !== 0 && (
                    <Text key={i} fz={10} ta='center' truncate>
                      Lvl. {i}
                    </Text>
                  )}
                </>
              ))}
            </Stack>
          ) : (
            <>{getColumn(LEVELS, i)}</>
          )}
        </Grid.Col>
      ))}
    </Grid>
  );
}
