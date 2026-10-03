import { Button, Center, Stack, Title } from '@mantine/core';
import { setPageTitle } from '@utils/document-change';
import { useEffect } from 'react';
import { Link, useRouteError } from 'react-router-dom';

/** A fatal route failure keeps diagnostics in logs and offers one simple way back. */
export function ErrorPage() {
  const error = useRouteError();
  useEffect(() => {
    setPageTitle('Page unavailable');
    console.error('Could not open page:', error);
  }, [error]);
  return (
    <Center mih='100dvh' px='md'>
      <Stack align='center' gap='md'>
        <Title order={3} ta='center'>
          Unable to open this page
        </Title>
        <Button component={Link} to='/' variant='light'>
          Back to home
        </Button>
      </Stack>
    </Center>
  );
}
