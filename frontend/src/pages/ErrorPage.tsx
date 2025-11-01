import { Title, Text, Button, Container, Group, Box, Textarea, Code, ScrollArea } from '@mantine/core';
import classes from '@css/ErrorPage.module.css';
import { setPageTitle } from '@utils/document-change';
import { IconBrandGithub } from '@tabler/icons-react';
import { useRouteError } from 'react-router-dom';

export function ErrorPage() {
  setPageTitle(`Error 500`);

  const error = useRouteError() as any;
  console.error(error);

  return (
    <Box className={classes.root} h={'100dvh'}>
      <Container>
        <div className={classes.label}>500</div>
        <Title className={classes.title}>We just rolled a Nat 1...</Title>
        <Text size='lg' ta='center' className={classes.description}>
          Our servers could not handle your request. Please submit an issue on our GitHub repository and refresh the
          page.
          <ScrollArea h={80} bg='#fff' mt='xs' style={{ borderRadius: '5px' }}>
            <Text
              size='lg'
              ta='center'
              p='xs'
              style={{
                wordBreak: 'break-all',
              }}
            >
              <Code c='blue.8' bg='#fff'>
                {error?.stack || String(error)}
              </Code>
            </Text>
          </ScrollArea>
        </Text>
        <Group justify='center'>
          <Button
            leftSection={<IconBrandGithub size='1.4rem' />}
            variant='white'
            size='md'
            component='a'
            href='https://github.com/wanderers-guide/wanderers-guide/issues'
            target='_blank'
          >
            GitHub Issues
          </Button>
        </Group>
      </Container>
    </Box>
  );
}
