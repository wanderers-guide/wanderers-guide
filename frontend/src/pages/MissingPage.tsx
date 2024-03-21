import { Title, Image, Text, Button, Container, Group, rem, useMantineTheme, Box, Center } from '@mantine/core';
import { setPageTitle } from '@utils/document-change';
import { useNavigate } from 'react-router-dom';
import BlurBox from '@common/BlurBox';

export function Component() {
  setPageTitle(`Error 404`);

  const theme = useMantineTheme();
  const navigate = useNavigate();

  return (
    <Center>
      <Box maw={875} w='100%'>
        <BlurBox w={'100%'} p='md'>
          <div
            style={{
              textAlign: 'center',
              fontWeight: 900,
              fontSize: rem(100),
              lineHeight: 1,
              color: theme.colors.dark[2],
            }}
          >
            404
          </div>
          <Title
            style={{
              fontFamily: `Greycliff CF, ${theme.fontFamily}`,
              textAlign: 'center',
              fontWeight: 900,
              fontSize: rem(20),
              marginTop: 0,
            }}
          >
            You found a secret place.
          </Title>
          <Text
            c='gray.5'
            size='xs'
            ta='center'
            my='lg'
            style={{
              maxWidth: rem(500),
              margin: 'auto',
            }}
          >
            Unfortunately, this is only a 404 page. You may have mistyped the address, or the page has been moved to
            another URL.
          </Text>
          <Group align='center' justify='center'>
            <Button
              variant='subtle'
              size='compact-sm'
              onClick={() => {
                navigate('/');
              }}
            >
              Go to home page
            </Button>
          </Group>
        </BlurBox>
      </Box>
    </Center>
  );
}
