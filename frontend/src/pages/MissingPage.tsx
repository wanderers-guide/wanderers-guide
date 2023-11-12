import {
  Title,
  Image,
  Text,
  Button,
  Container,
  Group,
  rem,
  useMantineTheme,
} from "@mantine/core";
import { setPageTitle } from "@utils/document-change";
import Guy404 from "@assets/images/404-guy.png";
import { useNavigate } from "react-router-dom";

export default function MissingPage() {
  setPageTitle(`Error 404`);
  
  const theme = useMantineTheme();
  const navigate = useNavigate();

  return (
    <Container
      style={{
        paddingTop: rem(80),
        paddingBottom: rem(80),
      }}
    >
      <div
        style={{
          textAlign: "center",
          fontWeight: 900,
          fontSize: rem(300),
          lineHeight: 1,
          color: theme.colors.dark[4],
          marginBottom: -250,
        }}
      >
        404
      </div>
      <div>
        <Image
          maw={240}
          mx="auto"
          radius="md"
          src={Guy404}
          alt="Random image"
        />
      </div>
      <Title
        style={{
          fontFamily: `Greycliff CF, ${theme.fontFamily}`,
          textAlign: "center",
          fontWeight: 900,
          fontSize: rem(38),
          marginTop: -20,
        }}
      >
        You found a secret place.
      </Title>
      <Text
        color="dimmed"
        size="lg"
        ta="center"
        style={{
          maxWidth: rem(500),
          margin: "auto",
          marginTop: theme.spacing.xl,
          marginBottom: `calc(${theme.spacing.xl} * 1.5)`,
        }}
      >
        Unfortunately, this is only a 404 page. You may have mistyped the
        address, or the page has been moved to another URL.
      </Text>
      <Group align="center">
        <Button
          variant="subtle"
          size="md"
          color="green"
          onClick={() => {
            navigate('/');
          }}
        >
          Take me back to home page
        </Button>
      </Group>
    </Container>
  );
}
