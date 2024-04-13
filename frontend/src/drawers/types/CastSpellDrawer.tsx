import { characterState } from '@atoms/characterAtoms';
import { drawerState } from '@atoms/navAtoms';
import { ActionSymbol } from '@common/Actions';
import IndentedText from '@common/IndentedText';
import RichText from '@common/RichText';
import TraitsDisplay from '@common/TraitsDisplay';
import { TEXT_INDENT_AMOUNT } from '@constants/data';
import { fetchContentById } from '@content/content-store';
import { isActionCost } from '@content/content-utils';
import { Title, Text, Image, Loader, Group, Divider, Stack, Box, Flex, Button, Paper } from '@mantine/core';
import { getSpellStats } from '@spells/spell-handler';
import { isCantrip, isFocusSpell, isRitual } from '@spells/spell-utils';
import { useQuery } from '@tanstack/react-query';
import { AbilityBlock, Spell } from '@typing/content';
import { convertCastToActionCost } from '@utils/actions';
import { sign } from '@utils/numbers';
import { useRecoilState, useRecoilValue } from 'recoil';

export function CastSpellDrawerTitle(props: {
  data: {
    id: number;
    spell: Spell;
    exhausted: boolean;
    tradition: string;
    attribute: string;
    onCastSpell: (cast: boolean) => void;
  };
}) {
  const spell = props.data.spell;

  const character = useRecoilValue(characterState);
  const [_drawer, openDrawer] = useRecoilState(drawerState);

  const cast = spell?.cast ?? '';

  let disableCasting = false;

  let rankTitle = 'Spell';
  let rank = spell?.rank;
  if (spell && isCantrip(spell)) {
    rankTitle = 'Cantrip';
    if (character) {
      rank = Math.ceil(character.level / 2);
    } else {
      rank = 1;
    }
  }
  if (spell && isRitual(spell)) {
    rankTitle = 'Ritual';
  }

  if (spell && character && isFocusSpell(spell)) {
    // rankTitle = 'Focus';
    rank = Math.max(Math.ceil(character.level / 2), spell.rank);

    /*
    "You can’t cast a focus spell if its minimum rank is greater than
    half your level rounded up, even if you somehow gain access to it." (pg. 298)
    */
    if (spell.rank > Math.ceil(character.level / 2)) {
      disableCasting = true;
    }
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
          {props.data.exhausted ? (
            <Button
              variant='outline'
              radius='xl'
              mb={3}
              size='compact-sm'
              onClick={() => {
                props.data.onCastSpell(false);
                openDrawer(null);
              }}
            >
              Recover {rankTitle} {rank}
            </Button>
          ) : (
            <Button
              disabled={disableCasting}
              variant='filled'
              radius='xl'
              mb={3}
              size='compact-sm'
              onClick={() => {
                props.data.onCastSpell(true);
                openDrawer(null);
              }}
            >
              Cast {rankTitle} {rank}
            </Button>
          )}
        </Group>
      )}
    </>
  );
}

export function CastSpellDrawerContent(props: {
  data: { id: number; spell: Spell; exhausted: boolean; tradition: string; attribute: string };
}) {
  const spell = props.data.spell;

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

  // Highlight the tradition of the spell
  const TRADITIONS = [];
  if (spell.traditions) {
    for (const tradition of spell.traditions) {
      if (tradition.toLowerCase() === props.data.tradition.toLowerCase()) {
        TRADITIONS.push(
          <Text key={tradition} td='underline' span>
            {tradition}
          </Text>
        );
      } else {
        TRADITIONS.push(<>{tradition}</>);
      }
    }
  }

  // Spell Attack and DC
  const spellStats = getSpellStats('CHARACTER', spell, props.data.tradition, props.data.attribute);

  const attackAndDcSection = (
    <Paper shadow='xs' my={5} py={5} px={10} bg='dark.6' radius='md'>
      <Group wrap='nowrap' grow>
        <Group wrap='nowrap' gap={10}>
          <Text fw={600} c='gray.5' span>
            Attack
          </Text>
          <Text c='gray.5' span>
            {sign(spellStats.spell_attack.total[0])} / {sign(spellStats.spell_attack.total[1])} /{' '}
            {sign(spellStats.spell_attack.total[2])}
          </Text>
        </Group>
        <Group wrap='nowrap' gap={10}>
          <Text fw={600} c='gray.5' span>
            DC
          </Text>
          <Text c='gray.5' span>
            {spellStats.spell_dc.total}
          </Text>
        </Group>
      </Group>
    </Paper>
  );

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
        {attackAndDcSection}
        {spell.traditions && spell.traditions.length > 0 && (
          <IndentedText ta='justify'>
            <Text fw={600} c='gray.5' span>
              Traditions
            </Text>{' '}
            {TRADITIONS.flatMap((node, index) => (index < TRADITIONS.length - 1 ? [node, ', '] : [node]))}
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
        <RichText ta='justify' store='CHARACTER' py={5}>
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
