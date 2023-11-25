import { drawerState } from '@atoms/navAtoms';
import { ActionSymbol } from '@common/Actions';
import IndentedText from '@common/IndentedText';
import RichText from '@common/RichText';
import TraitsDisplay from '@common/TraitsDisplay';
import { TEXT_INDENT_AMOUNT } from '@constants/data';
import { findAllPrereqs, getContent } from '@content/content-controller';
import { Title, Text, Image, Loader, Group, Divider, Stack, Box, Flex, Anchor } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { AbilityBlock } from '@typing/content';
import { listToLabel } from '@utils/strings';
import { useRecoilState } from 'recoil';

export function FeatDrawerTitle(props: { data: { id: number } }) {
  const id = props.data.id;

  const { data: feat } = useQuery({
    queryKey: [`find-feat-${id}`, { id }],
    queryFn: async ({ queryKey }) => {
      // @ts-ignore
      // eslint-disable-next-line
      const [_key, { id }] = queryKey;
      return await getContent<AbilityBlock>('ability-block', id);
    },
  });

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
          {feat.level && <Text style={{ textWrap: 'nowrap' }}>Feat {feat.level}</Text>}
        </Group>
      )}
    </>
  );
}

const DISPLAY_PREREQUS = true;

export function FeatDrawerContent(props: { data: { id: number } }) {
  const id = props.data.id;

  const { data: feat } = useQuery({
    queryKey: [`find-feat-${id}`, { id }],
    queryFn: async ({ queryKey }) => {
      // @ts-ignore
      // eslint-disable-next-line
      const [_key, { id }] = queryKey;
      return await getContent<AbilityBlock>('ability-block', id);
    },
  });

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

  const hasTopSection =
    (feat.prerequisites && feat.prerequisites.length > 0) ||
    feat.frequency ||
    feat.trigger ||
    feat.cost ||
    feat.requirements ||
    feat.access;

    console.log(feat.description);

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
        {DISPLAY_PREREQUS && feat.prerequisites && feat.prerequisites.length > 0 && (
          <IndentedText ta='justify'>
            <Text fw={600} c='gray.5' span>
              Prerequisites
            </Text>{' '}
            {feat.prerequisites.join(', ')}
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

        {DISPLAY_PREREQUS && (
          <PrerequisiteForSection name={feat.name} />
        )}
      </Box>
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
      return await findAllPrereqs(name);
    },
  });

  const [_drawer, openDrawer] = useRecoilState(drawerState);

  if(!data || data.length === 0) { return null; }

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
                    type: 'class-feature',
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