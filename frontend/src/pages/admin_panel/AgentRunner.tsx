import { runItemAgent } from '@ai/agent/claude';
import BlurBox from '@common/BlurBox';
import { Center, Group, Title, Textarea, Button, Stack } from '@mantine/core';
import { useState } from 'react';

const ENABLED = true;

export default function AgentRunner() {
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');

  if (!ENABLED) null;

  return (
    <>
      <BlurBox p='sm'>
        <Center p='sm'>
          <Stack>
            <Group>
              <Title order={3}>Agent Runner</Title>
              <Button
                size='compact-sm'
                loading={loading}
                onClick={async () => {
                  setLoading(true);
                  await runItemAgent(text);
                  setLoading(false);
                }}
              >
                Run Agent
              </Button>
            </Group>

            <Textarea
              placeholder='Enter an operation for the agent to perform...'
              minRows={4}
              maxRows={10}
              autosize
              style={{ flex: 1, width: 400 }}
              value={text}
              onChange={(e) => setText(e.currentTarget.value)}
            />
          </Stack>
        </Center>
      </BlurBox>
    </>
  );
}
