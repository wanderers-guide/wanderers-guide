// import { runItemAgent } from '@ai/agent/manager';
import BlurBox from '@common/BlurBox';
import { Center, Group, Title, Textarea, Button, Stack } from '@mantine/core';

const ENABLED = true;

export default function ContentCleaning() {
  if (!ENABLED) null;

  return (
    <>
      <BlurBox p='sm'>
        <Center p='sm'>
          <Stack>
            <Group>
              <Title order={3}>Content Cleaning</Title>
              <Button
                size='compact-sm'
                onClick={async () => {
                  window.location.href = '/content-cleaning-source';
                }}
              >
                Open
              </Button>
            </Group>
          </Stack>
        </Center>
      </BlurBox>
    </>
  );
}
