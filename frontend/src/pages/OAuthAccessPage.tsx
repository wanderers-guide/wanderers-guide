import BlurBox from '@common/BlurBox';
import { Box, Text, Button, Center, PasswordInput, Stack, Group, Loader, ActionIcon, Title } from '@mantine/core';
import { useState } from 'react';
import { setPageTitle } from '@utils/document-change';
import { supabase } from '../main';
import { useLoaderData, useNavigate, useSearchParams } from 'react-router-dom';
import { makeRequest } from '@requests/request-manager';
import { Character, PublicUser } from '@typing/content';
import { useQuery } from '@tanstack/react-query';
import { DisplayIcon } from '@common/IconDisplay';
import { IconDots } from '@tabler/icons-react';

export function Component() {
  setPageTitle('Access Character');

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const characterId = searchParams.get('character_id');
  const userId = searchParams.get('user_id');
  const clientId = searchParams.get('client_id');

  const { data, isFetching } = useQuery({
    queryKey: [`find-oauth-data`, characterId, userId, clientId],
    queryFn: async () => {
      const character = await makeRequest<Character>('find-character', {
        id: characterId,
      });

      console.log(userId, 'userId');

      const clientUser = await makeRequest<PublicUser>('get-user', {
        _id: userId,
      });
      const client = clientUser?.api?.clients?.find((c) => c.id === clientId);

      return {
        character,
        client,
      };
    },
    enabled: !!characterId && !!userId && !!clientId,
    refetchOnWindowFocus: false,
  });

  console.log(data);

  if (!data || isFetching) {
    return (
      <Loader
        size='lg'
        type='bars'
        style={{
          position: 'absolute',
          top: '30%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />
    );
  }

  return (
    <>
      <Center>
        <BlurBox w={350} p='lg'>
          <Center>
            <Box w={250}>
              <Stack>
                <Group wrap='nowrap'>
                  <DisplayIcon strValue={data?.client?.image_url} radius={500} />
                  <ActionIcon variant='transparent' color='gray.6' size='lg'>
                    <IconDots style={{ width: '70%', height: '70%' }} stroke={1.5} />
                  </ActionIcon>
                  <DisplayIcon strValue={data?.character?.details?.image_url} radius={500} />
                </Group>
                <Stack gap={5}>
                  <Title order={3} ta='center'>
                    {data?.client?.name}
                  </Title>
                  <Text ta='center' fz='sm'>
                    wants to access your character
                  </Text>
                  <Text ta='center' fz='sm' fw='bold'>
                    {data?.character?.name}
                  </Text>
                </Stack>
                <BlurBox p='sm'>Something</BlurBox>
                <Group grow>
                  <Button variant='default'>Cancel</Button>
                  <Button>Authorize</Button>
                </Group>
              </Stack>
            </Box>
          </Center>
        </BlurBox>
      </Center>
    </>
  );
}
