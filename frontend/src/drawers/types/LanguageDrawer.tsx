import IndentedText from '@common/IndentedText';
import RichText from '@common/RichText';
import TraitsDisplay from '@common/TraitsDisplay';
import { TEXT_INDENT_AMOUNT } from '@constants/data';
import { fetchContentById } from '@content/content-store';
import { Title, Text, Image, Loader, Group, Divider, Stack, Box, Flex } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { AbilityBlock, Language } from '@typing/content';

export function LanguageDrawerTitle(props: { data: { id?: number; language?: Language } }) {
  const id = props.data.id;

  const { data: _language } = useQuery({
    queryKey: [`find-language-${id}`, { id }],
    queryFn: async ({ queryKey }) => {
      // @ts-ignore
      // eslint-disable-next-line
      const [_key, { id }] = queryKey;
      return await fetchContentById<Language>('language', id);
    },
    enabled: !!id,
  });
  const language = props.data.language ?? _language;

  return (
    <>
      {language && (
        <Group justify='space-between' wrap='nowrap'>
          <Group wrap='nowrap' gap={10}>
            <Box>
              <Title order={3}>{language.name}</Title>
            </Box>
            <Box>
              <TraitsDisplay traitIds={[]} rarity={language.rarity} />
            </Box>
          </Group>
        </Group>
      )}
    </>
  );
}

export function LanguageDrawerContent(props: { data: { id?: number; language?: Language } }) {
  const id = props.data.id;

  const { data: _language } = useQuery({
    queryKey: [`find-language-${id}`, { id }],
    queryFn: async ({ queryKey }) => {
      // @ts-ignore
      // eslint-disable-next-line
      const [_key, { id }] = queryKey;
      return await fetchContentById<Language>('language', id);
    },
    enabled: !!id,
  });
  const language = props.data.language ?? _language;

  if (!language) {
    return (
      <Loader
        type='bars'
        style={{
          position: 'absolute',
          top: '35%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />
    );
  }

  return (
    <Box>
      <Box>
        {language.speakers && (
          <IndentedText ta='justify'>
            <Text fw={600} c='gray.5' span>
              Speakers
            </Text>{' '}
            {language.speakers}
          </IndentedText>
        )}
        {language.script && (
          <IndentedText ta='justify'>
            <Text fw={600} c='gray.5' span>
              Script
            </Text>{' '}
            {language.script}
          </IndentedText>
        )}
        {(language.speakers || language.script) && <Divider />}
        <RichText ta='justify'>{language.description}</RichText>
      </Box>
    </Box>
  );
}
