import { characterState } from '@atoms/characterAtoms';
import { drawerState } from '@atoms/navAtoms';
import { ActionSymbol } from '@common/Actions';
import IndentedText from '@common/IndentedText';
import RichText from '@common/RichText';
import TraitsDisplay from '@common/TraitsDisplay';
import { TEXT_INDENT_AMOUNT } from '@constants/data';
import { fetchAllPrereqs, fetchContentById } from '@content/content-store';
import ShowOperationsButton from '@drawers/ShowOperationsButton';
import {
  Title,
  Text,
  Image,
  Loader,
  Group,
  Divider,
  Stack,
  Box,
  Flex,
  Anchor,
  useMantineTheme,
  ThemeIcon,
} from '@mantine/core';
import { IconCheck, IconZoomCheck, IconX, IconQuestionMark } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { AbilityBlock } from '@typing/content';
import { listToLabel } from '@utils/strings';
import { meetsPrerequisites } from '@variables/prereq-detection';
import { ReactNode } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import { DisplayOperationSelectionOptions } from './ActionDrawer';

export function FeatDrawerTitle(props: { data: { id?: number; feat?: AbilityBlock } }) {
  const id = props.data.id;

  const { data: _feat } = useQuery({
    queryKey: [`find-feat-${id}`, { id }],
    queryFn: async ({ queryKey }) => {
      // @ts-ignore
      // eslint-disable-next-line
      const [_key, { id }] = queryKey;
      return await fetchContentById<AbilityBlock>('ability-block', id);
    },
    enabled: !!id,
  });
  const feat = props.data.feat ?? _feat;

  return (
    <>
      {feat && (
        <Group justify='space-between' wrap='nowrap'>
          <Group wrap='nowrap' gap={10}>
            <Box>
              <Title order={3}>{feat.name}</Title>
            </Box>
            <Box>
              <ActionSymbol cost={feat.actions} size={'2.1rem'} />
            </Box>
          </Group>
          <Text style={{ textWrap: 'nowrap' }}>{feat.meta_data?.unselectable ? 'Action' : `Feat ${feat.level}`}</Text>
        </Group>
      )}
    </>
  );
}

export function FeatDrawerContent(props: { data: { id?: number; feat?: AbilityBlock; showOperations?: boolean } }) {
  const id = props.data.id;
  const theme = useMantineTheme();

  const character = useRecoilValue(characterState);
  const DETECT_PREREQUS = character?.options?.auto_detect_prerequisites ?? false;

  const { data: _feat } = useQuery({
    queryKey: [`find-feat-${id}`, { id }],
    queryFn: async ({ queryKey }) => {
      // @ts-ignore
      // eslint-disable-next-line
      const [_key, { id }] = queryKey;
      return await fetchContentById<AbilityBlock>('ability-block', id);
    },
    enabled: !!id,
  });
  const feat = props.data.feat ?? _feat;

  if (!feat) {
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

  const prereqMet = DETECT_PREREQUS && meetsPrerequisites('CHARACTER', feat.prerequisites);
  const prereqUI: ReactNode[] = [];
  if (prereqMet && prereqMet.meetMap.size > 0) {
    for (const [prereq, met] of prereqMet.meetMap.entries()) {
      if (!met) {
        prereqUI.push(<>{prereq}</>);
      } else if (met === 'FULLY') {
        prereqUI.push(
          <>
            <Text
              style={{
                textDecoration: 'underline',
                textDecorationColor: theme.colors[theme.primaryColor][4],
              }}
              span
            >
              {prereq}
            </Text>
          </>
        );
      } else if (met === 'PARTIALLY') {
        prereqUI.push(
          <>
            <Text
              style={{
                textDecoration: 'underline',
                textDecorationColor: theme.colors[theme.primaryColor][2],
              }}
              span
            >
              {prereq}
            </Text>
          </>
        );
      } else if (met === 'NOT') {
        prereqUI.push(
          <>
            <Text
              style={{
                textDecoration: 'underline',
                textDecorationColor: theme.colors.red[4],
              }}
              span
            >
              {prereq}
            </Text>
          </>
        );
      } else if (met === 'UNKNOWN') {
        prereqUI.push(
          <>
            <Text
              style={{
                textDecoration: 'underline',
                textDecorationColor: theme.colors.yellow[2],
              }}
              span
            >
              {prereq}
            </Text>
          </>
        );
      }
    }
  } else {
    prereqUI.push(...(feat.prerequisites ?? []).map((prereq) => <>{prereq}</>));
  }

  const hasTopSection =
    (feat.prerequisites && feat.prerequisites.length > 0) ||
    feat.frequency ||
    feat.trigger ||
    feat.cost ||
    feat.requirements ||
    feat.access;

  return (
    <Box>
      {feat.meta_data?.image_url && (
        <Image
          style={{
            float: 'right',
            maxWidth: 150,
            height: 'auto',
          }}
          ml='sm'
          radius='md'
          fit='contain'
          src={feat.meta_data?.image_url}
        />
      )}
      <Box>
        {/* Note: Can't use a Stack here as it breaks the floating image */}
        <Box pb={2}>
          <TraitsDisplay traitIds={feat.traits ?? []} rarity={feat.rarity} interactable />
        </Box>
        {prereqUI && prereqUI.length > 0 && (
          <IndentedText ta='justify'>
            <Text fw={600} c='gray.5' span>
              Prerequisites
            </Text>{' '}
            {prereqUI.flatMap((node, index) => (index < prereqUI.length - 1 ? [node, '; '] : [node]))}
          </IndentedText>
        )}
        {feat.frequency && (
          <IndentedText ta='justify'>
            <Text fw={600} c='gray.5' span>
              Frequency
            </Text>{' '}
            {feat.frequency}
          </IndentedText>
        )}
        {feat.trigger && (
          <IndentedText ta='justify'>
            <Text fw={600} c='gray.5' span>
              Trigger
            </Text>{' '}
            {feat.trigger}
          </IndentedText>
        )}
        {feat.cost && (
          <IndentedText ta='justify'>
            <Text fw={600} c='gray.5' span>
              Cost
            </Text>{' '}
            {feat.cost}
          </IndentedText>
        )}
        {feat.requirements && (
          <IndentedText ta='justify'>
            <Text fw={600} c='gray.5' span>
              Requirements
            </Text>{' '}
            {feat.requirements}
          </IndentedText>
        )}
        {feat.access && (
          <IndentedText ta='justify'>
            <Text fw={600} c='gray.5' span>
              Access
            </Text>{' '}
            {feat.access}
          </IndentedText>
        )}
        {hasTopSection && <Divider />}
        <RichText ta='justify'>{feat.description}</RichText>
        {feat.special && (
          <Text ta='justify' style={{ textIndent: TEXT_INDENT_AMOUNT }}>
            <Text fw={600} c='gray.5' span>
              Special
            </Text>{' '}
            <RichText span>{feat.special}</RichText>
          </Text>
        )}

        {<PrerequisiteForSection name={feat.name} />}
      </Box>
      <DisplayOperationSelectionOptions operations={feat.operations} />
      {props.data.showOperations && <ShowOperationsButton name={feat.name} operations={feat.operations} />}
    </Box>
  );
}

export function PrerequisiteForSection(props: { name: string }) {
  const { data } = useQuery({
    queryKey: [`find-prereqs-for-${props.name}`, { name: props.name }],
    queryFn: async ({ queryKey }) => {
      // @ts-ignore
      // eslint-disable-next-line
      const [_key, { name }] = queryKey;
      return await fetchAllPrereqs(name);
    },
  });

  const [_drawer, openDrawer] = useRecoilState(drawerState);

  if (!data || data.length === 0) {
    return null;
  }

  const options = data.sort((a, b) => {
    if (a.level === undefined || b.level === undefined) {
      return a.name.localeCompare(b.name);
    }
    return a.level - b.level;
  });

  return (
    <Box pt='sm'>
      <Divider />
      <IndentedText>
        <Text fw={600} c='gray.5' span>
          Prerequisite for
        </Text>{' '}
        {listToLabel(
          options.map((feat, index) => (
            <Text key={index} span>
              <Anchor
                onClick={() => {
                  openDrawer({
                    type: 'feat',
                    data: { id: feat.id },
                    extra: { addToHistory: true },
                  });
                }}
              >
                {feat.name}
              </Anchor>{' '}
              ({feat.level})
            </Text>
          )),
          'and'
        )}
      </IndentedText>
    </Box>
  );
}
