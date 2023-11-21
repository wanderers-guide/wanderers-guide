import { useEffect, useState } from 'react';
import {
  defineEnabledContentSources,
  getAllContentSources,
  getContent,
} from '@content/content-controller';
import { selectContent } from '@common/select/SelectContent';
import { ActionIcon, Box, Button, Center, Grid, Group, Menu, Stack, TextInput, Title, rem } from '@mantine/core';
import { AbilityBlock, Character, ContentSource } from '@typing/content';
import { OperationSection } from '@common/operations/Operations';
import { setPageTitle } from '@utils/document-change';
import { modals, openContextModal } from '@mantine/modals';
import { CreateAbilityBlockModal } from '@modals/CreateAbilityBlockModal';
import { useQuery } from '@tanstack/react-query';
import { makeRequest } from '@requests/request-manager';
import { CharacterInfo } from '@common/CharacterInfo';
import BlurBox from '@common/BlurBox';
import { IconCodeDots, IconCopy, IconDots, IconFileTypePdf, IconMessageCircle, IconPhoto, IconSettings, IconTrash } from '@tabler/icons-react';

export default function DashboardPage() {
  setPageTitle(`Dashboard`);

  const { data: charDetails } = useQuery({
    queryKey: [`find-characters`],
    queryFn: async () => {
      return await makeRequest<{ characters: Character[]; books: ContentSource[] }>('find-characters', {});
    },
  });

  console.log(charDetails);

  return (
    <Center>
      <Box maw={800} w='100%'>
        <Group>
          {charDetails?.characters.map((character) => (
            <BlurBox p='xs' blur={10}>
              <CharacterInfo character={character} onClick={() => {}} />
              <Group gap='xs' pt={5}>
                <Button size='xs' variant='light' radius='xl' style={{ flex: 1 }}>
                  Edit
                </Button>
                <Menu shadow='md' width={200} withArrow withinPortal>
                  <Menu.Target>
                    <ActionIcon size='lg' variant='light' radius='xl' aria-label='Options'>
                      <IconDots style={{ width: '60%', height: '60%' }} stroke={1.5} />
                    </ActionIcon>
                  </Menu.Target>

                  <Menu.Dropdown>
                    <Menu.Label>Options</Menu.Label>
                    <Menu.Item
                      leftSection={<IconCopy style={{ width: rem(14), height: rem(14) }} />}
                      onClick={async () => {

                        // 

                      }}
                    >
                      Create Copy
                    </Menu.Item>
                    <Menu.Item
                      leftSection={<IconCodeDots style={{ width: rem(14), height: rem(14) }} />}
                    >
                      Export to JSON
                    </Menu.Item>
                    <Menu.Item
                      leftSection={<IconFileTypePdf style={{ width: rem(14), height: rem(14) }} />}
                    >
                      Export to PDF
                    </Menu.Item>

                    <Menu.Divider />

                    <Menu.Label>Danger zone</Menu.Label>
                    <Menu.Item
                      color='red'
                      leftSection={<IconTrash style={{ width: rem(14), height: rem(14) }} />}
                    >
                      Delete Character
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </Group>
            </BlurBox>
          ))}
        </Group>
      </Box>
    </Center>
  );
}
