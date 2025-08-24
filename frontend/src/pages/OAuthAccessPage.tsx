import BlurBox from '@common/BlurBox';
import {
  Box,
  Text,
  Button,
  Center,
  PasswordInput,
  Stack,
  Group,
  Loader,
  ActionIcon,
  Title,
  List,
  ThemeIcon,
} from '@mantine/core';
import { useState } from 'react';
import { setPageTitle } from '@utils/document-change';
import { supabase } from '../main';
import { useLoaderData, useNavigate, useSearchParams } from 'react-router-dom';
import { makeRequest } from '@requests/request-manager';
import { Character, PublicUser } from '@typing/content';
import { useQuery } from '@tanstack/react-query';
import { DisplayIcon } from '@common/IconDisplay';
import { IconCheck, IconCircleCheck, IconCircleCheckFilled, IconDots } from '@tabler/icons-react';
import { isEqual, uniqWith } from 'lodash-es';

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

  const getOAuthSection = () => {
    return (
      <Stack>
        <Group wrap='nowrap'>
          <DisplayIcon strValue={data?.client?.image_url} radius={500} />
          <ActionIcon variant='transparent' color='gray.6' size='lg'>
            <IconDots style={{ width: '70%', height: '70%' }} stroke={1.5} />
          </ActionIcon>
          <DisplayIcon strValue={data?.character?.details?.image_url ?? 'icon|||avatar|||#868e96'} radius={500} />
        </Group>
        <Stack gap={5}>
          <Title order={3} ta='center'>
            {data?.client?.name}
          </Title>
          <Text ta='center' fz='sm'>
            wants to access your character
          </Text>
          <Text ta='center' fz='sm' fw='bold' fs='italic'>
            {data?.character?.name}
          </Text>
        </Stack>
        <BlurBox p='sm'>
          <Stack>
            <Text ta='center' fz='xs'>
              This will allow the external service to:
            </Text>
            <List
              spacing='xs'
              size='sm'
              center
              icon={
                <ThemeIcon color='gray.8' size={22} radius='xl'>
                  <IconCheck size={18} />
                </ThemeIcon>
              }
            >
              <List.Item>Access your character information</List.Item>
              <List.Item>Edit your character's stats</List.Item>
              <List.Item>Manage your character's inventory</List.Item>
            </List>
          </Stack>
        </BlurBox>
        <Group grow>
          <Button
            variant='default'
            onClick={() => {
              navigate('/characters');
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={async () => {
              await makeRequest('update-character', {
                id: characterId,
                details: {
                  ...(data.character?.details ?? {}),
                  api_clients: {
                    ...(data.character?.details?.api_clients ?? {}),
                    client_access: uniqWith(
                      [
                        ...(data.character?.details?.api_clients?.client_access ?? []),
                        {
                          publicUserId: userId ?? '',
                          clientId: clientId ?? '',
                          addedAt: new Date().getTime(),
                        },
                      ],
                      (a, b) => a.clientId === b.clientId && a.publicUserId === b.publicUserId
                    ),
                  },
                },
              });
              navigate(`/builder/${characterId}`);
            }}
          >
            Authorize
          </Button>
        </Group>
      </Stack>
    );
  };

  const getCharacterNotFoundSection = () => {
    return (
      <Stack gap={5}>
        <Title order={3} ta='center'>
          Not Found
        </Title>
        <Text ta='center' fz='sm'>
          Could not find the requested character (ID# {characterId}).
        </Text>
        <Text ta='center' fz='sm'>
          This account must be the owner of the character to authorize access.
        </Text>
      </Stack>
    );
  };

  return (
    <>
      <Center>
        <BlurBox w={350} p='lg'>
          <Center>
            <Box w={250}>{data?.character ? getOAuthSection() : getCharacterNotFoundSection()}</Box>
          </Center>
        </BlurBox>
      </Center>
    </>
  );
}
