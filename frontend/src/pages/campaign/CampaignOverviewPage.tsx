import { sessionState } from '@atoms/supabaseAtoms';
import BlurBox from '@common/BlurBox';
import { CharacterDetailedInfo, CharacterInfo } from '@common/CharacterInfo';
import { Box, Center, SimpleGrid } from '@mantine/core';
import { makeRequest } from '@requests/request-manager';
import { useQuery } from '@tanstack/react-query';
import { Character } from '@typing/content';
import { setPageTitle } from '@utils/document-change';
import { useRecoilValue } from 'recoil';

export function Component() {
  setPageTitle(`Campaign`);
  const session = useRecoilValue(sessionState);

  const {
    data: characters,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: [`find-character`],
    queryFn: async () => {
      return await makeRequest<Character[]>('find-character', {
        user_id: session?.user.id,
      });
    },
    enabled: !!session,
    refetchInterval: 400,
  });

  console.log(characters);

  return (
    <Center>
      <Box w={600}>
        <SimpleGrid cols={2}>
          {characters?.map((character) => (
            <BlurBox blur={10} maw={280} py={5} px='sm'>
              <CharacterDetailedInfo character={character} />
            </BlurBox>
          ))}
        </SimpleGrid>
      </Box>
    </Center>
  );
}
