import { Title, Image, Text, Button, Container, Group, rem, useMantineTheme, Box, Center } from '@mantine/core';
import { setPageTitle } from '@utils/document-change';
import { useNavigate } from 'react-router-dom';
import BlurBox from '@common/BlurBox';

export function Component() {
  setPageTitle(`Error 401`);

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
            401
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
            Private Character
          </Title>
          <Text
            size='xs'
            ta='center'
            my='lg'
            style={{
              maxWidth: rem(500),
              margin: 'auto',
            }}
          >
            This character sheet is private. To view it, you need one of the following:
            <p>
              <Text fs='italic' c='gray.5'>
                • Have the sheet be publicly accessible •
              </Text>
            </p>
            <p>
              <Text fs='italic' c='gray.5'>
                • Be the owner of a campaign the character is in •
              </Text>
            </p>
            <p>
              <Text fs='italic' c='gray.5'>
                • Be the owner of the character •
              </Text>
            </p>
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
