import { characterState } from '@atoms/characterAtoms';
import { drawerState } from '@atoms/navAtoms';
import RichText from '@common/RichText';
import TraitsDisplay from '@common/TraitsDisplay';
import { fetchContentById } from '@content/content-store';
import ShowOperationsButton from '@drawers/ShowOperationsButton';
import { Anchor, Box, Group, Image, Loader, Paper, Stack, Text, Title, useMantineTheme } from '@mantine/core';
import { OperationResult } from '@operations/operation-runner';
import { useQuery } from '@tanstack/react-query';
import { Background, Character } from '@typing/content';
import { DrawerType } from '@typing/index';
import { getStatBlockDisplay } from '@variables/initial-stats-display';
import { getAllAttributeVariables } from '@variables/variable-manager';
import { useState } from 'react';
import { SetterOrUpdater, useRecoilState } from 'recoil';

export function BackgroundDrawerTitle(props: { data: { id?: number; background?: Background } }) {
  const id = props.data.id;

  const { data: _background } = useQuery({
    queryKey: [`find-background-${id}`, { id }],
    queryFn: async ({ queryKey }) => {
      // @ts-ignore
      // eslint-disable-next-line
      const [_key, { id }] = queryKey;
      return await fetchContentById<Background>('background', id);
    },
    enabled: !!id,
  });
  const background = props.data.background ?? _background;

  return (
    <>
      {background && (
        <Group justify='space-between' wrap='nowrap'>
          <Group wrap='nowrap' gap={10}>
            <Box>
              <Title order={3}>{background.name}</Title>
            </Box>
          </Group>
          <TraitsDisplay traitIds={[]} rarity={background.rarity} />
        </Group>
      )}
    </>
  );
}

export function BackgroundDrawerContent(props: {
  data: { id?: number; background?: Background; showOperations?: boolean };
  onMetadataChange?: (openedDict?: Record<string, string>) => void;
}) {
  const id = props.data.id;

  const { data } = useQuery({
    queryKey: [`find-background-details-${id}`, { id }],
    queryFn: async ({ queryKey }) => {
      // @ts-ignore
      // eslint-disable-next-line
      const [_key, { id }] = queryKey;
      const background = await fetchContentById<Background>('background', id);
      return {
        background: props.data.background ?? background,
      };
    },
  });

  const [_drawer, openDrawer] = useRecoilState(drawerState);

  if (!data || !data.background) {
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
    <Stack>
      <BackgroundInitialOverview background={data.background} mode='READ' />
      {props.data.showOperations && (
        <ShowOperationsButton name={data.background.name} operations={data.background.operations} />
      )}
    </Stack>
  );
}

export function BackgroundInitialOverview(props: {
  background: Background;
  mode: 'READ' | 'READ/WRITE';
  operationResults?: OperationResult[];
}) {
  const theme = useMantineTheme();
  const [descHidden, setDescHidden] = useState(true);
  const charState = useRecoilState(characterState);
  const [_drawer, openDrawer] = useRecoilState(drawerState);

  // Reading thru operations to get display UI
  const MODE = props.mode;
  const display = convertBackgroundOperationsIntoUI(
    props.background,
    props.mode,
    props.operationResults ?? [],
    charState,
    openDrawer
  );

  // Split the description, remove the first intro paragraph
  let description = props.background.description;
  let introParagraph = ``;
  const descMatch = /^\s*(\> _.+?_)/gm.exec(props.background.description);
  if (descMatch && descMatch.length > 1) {
    description = description.replace(descMatch[0], ``).trim();
    introParagraph = descMatch[1].trim();
  }

  return (
    <>
      <Box
        style={{
          position: 'relative',
        }}
      >
        <Box
          mah={descHidden ? 400 : undefined}
          style={{
            WebkitMaskImage: descHidden ? 'linear-gradient(to bottom, black 60%, transparent 100%)' : undefined,
            maskImage: descHidden ? 'linear-gradient(to bottom, black 60%, transparent 100%)' : undefined,
            overflowY: descHidden ? 'hidden' : undefined,
          }}
        >
          {props.background.artwork_url && (
            <Image
              style={{
                float: 'right',
                maxWidth: 150,
                height: 'auto',
              }}
              ml='sm'
              radius='md'
              fit='contain'
              src={props.background.artwork_url}
            />
          )}
          <RichText ta='justify'>{introParagraph || description}</RichText>
        </Box>
        <Anchor
          size='sm'
          style={{
            position: 'absolute',
            bottom: 5,
            right: 20,
          }}
          onClick={() => setDescHidden(!descHidden)}
        >
          {descHidden ? 'Show more' : 'Show less'}
        </Anchor>
      </Box>
      <Box>
        <Group align='flex-start' grow>
          {display.attributes
            .sort((a, b) => {
              return (a.uuid ?? '').localeCompare(b.uuid ?? '');
            })
            .map((attribute, index) => (
              <Paper
                key={index}
                shadow='xs'
                p='sm'
                radius='md'
                style={{
                  backgroundColor: theme.colors.dark[8],
                  position: 'relative',
                }}
              >
                <Text c='gray.5' ta='center'>
                  Attribute Boost
                </Text>
                <Text c='gray.4' fw={700} ta='center' style={{ display: 'flex', justifyContent: 'center' }}>
                  {attribute.ui}
                </Text>
              </Paper>
            ))}
        </Group>
      </Box>
      {introParagraph && <RichText ta='justify'>{description}</RichText>}
    </>
  );
}

export function convertBackgroundOperationsIntoUI(
  background: Background,
  mode: 'READ' | 'READ/WRITE',
  operationResults: OperationResult[],
  charState: [Character | null, SetterOrUpdater<Character | null>],
  openDrawer: SetterOrUpdater<{
    type: DrawerType;
    data: any;
    extra?: any;
  } | null>
) {
  const backgroundOperations = background.operations ?? [];
  const MODE = mode;
  const writeDetails =
    MODE === 'READ/WRITE'
      ? {
          operationResults: operationResults,
          characterState: charState,
          primarySource: 'background',
        }
      : undefined;

  const attributes = getStatBlockDisplay(
    'CHARACTER',
    getAllAttributeVariables('CHARACTER').map((v) => v.name),
    backgroundOperations,
    MODE,
    writeDetails
  );

  console.log(attributes);

  return {
    attributes,
  };
}
