import { characterState } from '@atoms/characterAtoms';
import { ActionSymbol } from '@common/Actions';
import IndentedText from '@common/IndentedText';
import RichText from '@common/RichText';
import TraitsDisplay from '@common/TraitsDisplay';
import { TEXT_INDENT_AMOUNT } from '@constants/data';
import { fetchContentById } from '@content/content-store';
import { isActionCost } from '@content/content-utils';
import { Title, Text, Image, Loader, Group, Divider, Stack, Box, Flex } from '@mantine/core';
import { isCantrip } from '@spells/spell-utils';
import { useQuery } from '@tanstack/react-query';
import { AbilityBlock, Spell } from '@typing/content';
import { convertCastToActionCost } from '@utils/actions';
import { useRecoilValue } from 'recoil';

export function SpellDrawerTitle(props: { data: { id?: number; spell?: Spell } }) {
  const id = props.data.id;

  const character = useRecoilValue(characterState);

  const { data: _spell } = useQuery({
    queryKey: [`find-spell-${id}`, { id }],
    queryFn: async ({ queryKey }) => {
      // @ts-ignore
      // eslint-disable-next-line
      const [_key, { id }] = queryKey;
      return await fetchContentById<Spell>('spell', id);
    },
    enabled: !!id,
  });
  const spell = props.data.spell ?? _spell;

  const cast = spell?.cast ?? '';

  let rankTitle = 'Spell';
  let rank = spell?.rank;
  if (spell && character && isCantrip(spell)) {
    rankTitle = 'Cantrip';
    rank = Math.floor((character.level ?? 1) / 2);
  }

  return (
    <>
      {spell && (
        <Group justify='space-between' wrap='nowrap'>
          <Group wrap='nowrap' gap={10}>
            <Box>
              <Title order={3}>{spell.name}</Title>
            </Box>
            {isActionCost(cast) && (
              <Box>
                <ActionSymbol cost={cast} size={'2.1rem'} />
              </Box>
            )}
          </Group>
          <Text style={{ textWrap: 'nowrap' }}>
            {rankTitle} {rank}
          </Text>
        </Group>
      )}
    </>
  );
}

export function SpellDrawerContent(props: { data: { id?: number; spell?: Spell } }) {
  const id = props.data.id;

  const { data: _spell } = useQuery({
    queryKey: [`find-spell-${id}`, { id }],
    queryFn: async ({ queryKey }) => {
      // @ts-ignore
      // eslint-disable-next-line
      const [_key, { id }] = queryKey;
      return await fetchContentById<Spell>('spell', id);
    },
    enabled: !!id,
  });
  const spell = props.data.spell ?? _spell;

  if (!spell) {
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

  const CR = [];
  const cast = spell?.cast ?? '';
  if (cast && !isActionCost(cast)) {
    CR.push(
      <>
        <Text key={0} fw={600} c='gray.5' span>
          Cast
        </Text>{' '}
        {cast}
      </>
    );
  }
  if (spell.requirements) {
    CR.push(
      <>
        <Text key={1} fw={600} c='gray.5' span>
          Requirements
        </Text>{' '}
        {spell.requirements}
      </>
    );
  }

  const CT = [];
  if (spell.cost) {
    CT.push(
      <>
        <Text key={0} fw={600} c='gray.5' span>
          Cost
        </Text>{' '}
        {spell.cost}
      </>
    );
  }
  if (spell.trigger) {
    CT.push(
      <>
        <Text key={1} fw={600} c='gray.5' span>
          Trigger
        </Text>{' '}
        {spell.trigger}
      </>
    );
  }

  const RAT = [];
  if (spell.range) {
    RAT.push(
      <>
        <Text key={0} fw={600} c='gray.5' span>
          Range
        </Text>{' '}
        {spell.range}
      </>
    );
  }
  if (spell.area) {
    RAT.push(
      <>
        <Text key={1} fw={600} c='gray.5' span>
          Area
        </Text>{' '}
        {spell.area}
      </>
    );
  }
  if (spell.targets) {
    RAT.push(
      <>
        <Text key={2} fw={600} c='gray.5' span>
          Targets
        </Text>{' '}
        {spell.targets}
      </>
    );
  }

  const DD = [];
  if (spell.defense) {
    DD.push(
      <>
        <Text key={0} fw={600} c='gray.5' span>
          Defense
        </Text>{' '}
        {spell.defense}
      </>
    );
  }
  if (spell.duration) {
    DD.push(
      <>
        <Text key={1} fw={600} c='gray.5' span>
          Duration
        </Text>{' '}
        {spell.duration}
      </>
    );
  }

  const heightened = spell.heightened;

  return (
    <Box>
      {spell.meta_data?.image_url && (
        <Image
          style={{
            float: 'right',
            maxWidth: 150,
            height: 'auto',
          }}
          ml='sm'
          radius='md'
          fit='contain'
          src={spell.meta_data?.image_url}
        />
      )}
      <Box>
        {/* Note: Can't use a Stack here as it breaks the floating image */}
        <Box pb={2}>
          <TraitsDisplay traitIds={spell.traits ?? []} rarity={spell.rarity} interactable />
        </Box>
        {spell.traditions && spell.traditions.length > 0 && (
          <IndentedText ta='justify'>
            <Text fw={600} c='gray.5' span>
              Traditions
            </Text>{' '}
            {spell.traditions.join(', ')}
          </IndentedText>
        )}
        {CR.length > 0 && (
          <IndentedText ta='justify'>
            {CR.flatMap((node, index) => (index < CR.length - 1 ? [node, '; '] : [node]))}
          </IndentedText>
        )}
        {CT.length > 0 && (
          <IndentedText ta='justify'>
            {CT.flatMap((node, index) => (index < CT.length - 1 ? [node, '; '] : [node]))}
          </IndentedText>
        )}
        {RAT.length > 0 && (
          <IndentedText ta='justify'>
            {RAT.flatMap((node, index) => (index < RAT.length - 1 ? [node, '; '] : [node]))}
          </IndentedText>
        )}
        {DD.length > 0 && (
          <IndentedText ta='justify'>
            {DD.flatMap((node, index) => (index < DD.length - 1 ? [node, '; '] : [node]))}
          </IndentedText>
        )}
        {true && <Divider />}
        <RichText ta='justify' py={5}>
          {spell.description}
        </RichText>

        {spell.heightened && spell.heightened.text && (
          <Box>
            <Divider />
            {spell.heightened.text.map((text, index) => (
              <IndentedText key={index} ta='justify'>
                <Text fw={600} c='gray.5' span>
                  Heightened {text.amount}
                </Text>{' '}
                {text.text}
              </IndentedText>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}
