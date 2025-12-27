import { drawerState } from '@atoms/navAtoms';
import { ActionSymbol } from '@common/Actions';
import { DisplayIcon } from '@common/IconDisplay';
import IndentedText from '@common/IndentedText';
import RichText from '@common/RichText';
import TraitsDisplay from '@common/TraitsDisplay';
import { isActionCost } from '@content/content-utils';
import ShowInjectedText from '@drawers/ShowInjectedText';
import { Title, Text, Group, Divider, Box, Button, Paper } from '@mantine/core';
import { getEntityLevel } from '@pages/character_sheet/living-entity-utils';
import { getSpellStats } from '@spells/spell-handler';
import { getHeighteningData, getSpellRank, isCantrip, isFocusSpell, isRitual } from '@spells/spell-utils';
import { useQuery } from '@tanstack/react-query';
import { LivingEntity, Spell } from '@typing/content';
import { StoreID } from '@typing/variables';
import { sign } from '@utils/numbers';
import { toLabel } from '@utils/strings';
import { useRecoilState } from 'recoil';

export function CastSpellDrawerTitle(props: {
  data: {
    id: number;
    spell: Spell;
    exhausted: boolean;
    tradition: string;
    attribute: string;
    onCastSpell: (cast: boolean) => void;
    storeId: StoreID;
    entity: LivingEntity | null;
  };
}) {
  const spell = props.data.spell;

  const [_drawer, openDrawer] = useRecoilState(drawerState);

  const cast = spell?.cast ?? '';

  let disableCasting = false;

  let rankTitle = 'Spell';
  const rank = getSpellRank(spell, props.data.entity);
  if (spell && isCantrip(spell)) {
    rankTitle = 'Cantrip';
  }
  if (spell && isRitual(spell)) {
    rankTitle = 'Ritual';
  }

  if (spell && props.data.entity && isFocusSpell(spell)) {
    // rankTitle = 'Focus';

    /*
    "You can’t cast a focus spell if its minimum rank is greater than
    half your level rounded up, even if you somehow gain access to it." (pg. 298)
    */
    if (spell.rank > Math.ceil(getEntityLevel(props.data.entity) / 2)) {
      disableCasting = true;
    }
  }

  return (
    <>
      {spell && (
        <Group justify='space-between' wrap='nowrap'>
          <Group wrap='nowrap' gap={10}>
            <Box>
              <Title order={3}>{toLabel(spell.name)}</Title>
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
              mb={5}
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
              mb={5}
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
  data: {
    id: number;
    spell: Spell;
    exhausted: boolean;
    tradition: string;
    attribute: string;
    storeId: StoreID;
    entity: LivingEntity | null;
  };
}) {
  const spell = props.data.spell;

  const { data: heighteningData } = useQuery({
    queryKey: [`find-spell-heightening-data-${spell.id}`, { id: spell.id }],
    queryFn: async () => {
      return await getHeighteningData(spell, props.data.entity);
    },
  });

  const hasHeightening = (amount: string) => heighteningData && heighteningData.size > 0 && heighteningData.get(amount);

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
  const spellStats = getSpellStats(props.data.storeId, spell, props.data.tradition, props.data.attribute);

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
      <DisplayIcon strValue={spell.meta_data?.image_url} />
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
        <RichText ta='justify' store={props.data.storeId} py={5}>
          {spell.description}
        </RichText>

        {spell.heightened && spell.heightened.text && spell.heightened.text.length > 0 && (
          <Box>
            <Divider />
            {spell.heightened.text.map((text, index) => (
              <IndentedText key={index} ta='justify'>
                <Text
                  style={{
                    opacity: props.data.entity && !hasHeightening(text.amount) ? 0.6 : 1,
                  }}
                >
                  <Text fw={600} c='gray.5' span>
                    Heightened {text.amount}{' '}
                    {text.amount.startsWith('(+') && hasHeightening(text.amount) ? (
                      <Text fw={600} c='gray.5' span>
                        [{heighteningData?.get(text.amount)}x]
                      </Text>
                    ) : (
                      ''
                    )}
                  </Text>{' '}
                  <RichText span>{text.text}</RichText>
                </Text>
              </IndentedText>
            ))}
          </Box>
        )}

        <ShowInjectedText varId={props.data.storeId} type='spell' id={spell.id} />
      </Box>
    </Box>
  );
}
