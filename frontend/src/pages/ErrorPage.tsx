import { Title, Text, Button, Container, Group, Box } from '@mantine/core';
import classes from '@css/ErrorPage.module.css';
import { setPageTitle } from '@utils/document-change';
import { IconBrandGithub } from '@tabler/icons-react';

export function ErrorPage() {
  setPageTitle(`Error 500`);

  return (
    <Box className={classes.root} h={'100dvh'}>
      <Container>
        <div className={classes.label}>500</div>
        <Title className={classes.title}>We just rolled a Nat 1...</Title>
        <Text size='lg' ta='center' className={classes.description}>
          Our servers could not handle your request. Please submit an issue on our GitHub repository and refresh the
          page.
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
