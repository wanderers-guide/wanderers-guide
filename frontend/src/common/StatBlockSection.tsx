import { getJsonV4Content } from '@export/json/json-v4';
import { Box, Group, LoadingOverlay, Stack, Title, Text, Divider } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { AbilityBlockType, ContentType, LivingEntity, SenseWithRange } from '@typing/content';
import { toLabel } from '@utils/strings';
import { isCharacter, isCreature } from '@utils/type-fixing';
import TraitsDisplay from './TraitsDisplay';
import { convertToSize } from '@upload/foundry-utils';
import RichText from './RichText';
import { compactLabels } from '@variables/variable-utils';
import { sign } from '@utils/numbers';
import IndentedText from './IndentedText';

export default function StatBlockSection(props: {
  entity: LivingEntity;
  options?: {
    hideName?: boolean;
    hideTraits?: boolean;
    hideImage?: boolean;
    hideHealth?: boolean;
    hideDescription?: boolean;
  };
}) {
  const { entity } = props;
  const { data, isLoading } = useQuery({
    queryKey: [`fetch-stat-block-data-content`, { entity }],
    queryFn: async () => {
      return await getJsonV4Content(entity);
    },
  });

  const stringifySenses = (senses: {
    precise: SenseWithRange[];
    imprecise: SenseWithRange[];
    vague: SenseWithRange[];
  }) => {
    const precise = senses.precise
      .map((sense) =>
        `${linkContent(sense.senseName.toLowerCase(), 'sense', sense.sense)} ${sense.range.trim() ? `(${sense.range} ft.)` : ``}`.trim()
      )
      .join(', ');
    const imprecise = senses.imprecise
      .map((sense) =>
        `${linkContent(sense.senseName.toLowerCase(), 'sense', sense.sense)} ${sense.range.trim() ? `(${sense.range} ft.)` : ``}`.trim()
      )
      .join(', ');
    const vague = senses.vague
      .map((sense) =>
        `${linkContent(sense.senseName.toLowerCase(), 'sense', sense.sense)} ${sense.range.trim() ? `(${sense.range} ft.)` : ``}`.trim()
      )
      .join(', ');
    return `precise: ${precise}; imprecise: ${imprecise}; vague: ${vague}`;
  };

  const linkContent = (text: string, type: ContentType | AbilityBlockType, data: any) => {
    if (data && data.id) {
      return `[${text}](link_${type}_${data.id})`;
    } else {
      return text;
    }
  };

  //

  if (!data || isLoading) {
    return <LoadingOverlay visible />;
  }

  //

  const ATTR = Object.keys(data.attributes).map((l) => (
    <Text fz='xs' span>
      <Text fz='xs' fw={500} c='gray.0' span>
        {compactLabels(toLabel(l))}
      </Text>{' '}
      <RichText fz='xs' span>
        {data.attributes[l].partial ? `__${sign(data.attributes[l].value)}__` : sign(data.attributes[l].value)}
      </RichText>
    </Text>
  ));

  return (
    <Stack gap={5}>
      {!props.options?.hideName && (
        <Stack gap={0}>
          <Group justify='space-between' wrap='nowrap'>
            <Title order={3}>{toLabel(entity.name)}</Title>
            <Text style={{ textWrap: 'nowrap' }}>
              {isCharacter(entity) ? 'Character' : 'Creature'} {entity.level}
            </Text>
          </Group>
          <Divider />
        </Stack>
      )}
      {!props.options?.hideTraits && (
        <TraitsDisplay
          justify='flex-start'
          size='md'
          traitIds={data.character_traits.map((trait) => trait.id)}
          rarity={isCreature(entity) ? entity.rarity : undefined}
          pfSize={convertToSize(data.size)}
        />
      )}
      <IndentedText ta='justify' fz='xs' span>
        <Text fz='xs' fw={500} c='gray.0' span>
          Perception
        </Text>{' '}
        <RichText ta='justify' fz='xs' span>
          {data.proficiencies['PERCEPTION'].total}; {stringifySenses(data.senses)}
        </RichText>
      </IndentedText>
      <IndentedText ta='justify' fz='xs' span>
        <Text fz='xs' fw={500} c='gray.0' span>
          Languages
        </Text>{' '}
        <RichText ta='justify' fz='xs' span>
          {data.languages.map((l) => toLabel(l)).join(', ')}
        </RichText>
      </IndentedText>
      <IndentedText ta='justify' fz='xs' span>
        <Text fz='xs' fw={500} c='gray.0' span>
          Skills
        </Text>{' '}
        <RichText ta='justify' fz='xs' span>
          {Object.keys(data.proficiencies)
            .filter((name) => name.startsWith('SKILL_'))
            .map((l) => `${toLabel(l)} ${data.proficiencies[l].total}`)
            .join(', ')}
        </RichText>
      </IndentedText>
      <IndentedText ta='justify' fz='xs' span>
        {ATTR.flatMap((node, index) => (index < ATTR.length - 1 ? [node, ', '] : [node]))}
      </IndentedText>
    </Stack>
  );
}
