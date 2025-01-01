import { getJsonV4Content } from '@export/json/json-v4';
import { Box, Group, LoadingOverlay, Stack, Title, Text, Divider } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import {
  AbilityBlock,
  AbilityBlockType,
  ContentType,
  InventoryItem,
  Item,
  LivingEntity,
  SenseWithRange,
  Spell,
} from '@typing/content';
import { toLabel } from '@utils/strings';
import { isCharacter, isCreature, isTruthy } from '@utils/type-fixing';
import TraitsDisplay from './TraitsDisplay';
import { convertToSize } from '@upload/foundry-utils';
import RichText from './RichText';
import { compactLabels } from '@variables/variable-utils';
import { rankNumber, sign } from '@utils/numbers';
import IndentedText from './IndentedText';
import _ from 'lodash-es';
import { actionCostToRichTextInsert } from '@utils/actions';
import { getWeaponStats, parseOtherDamage } from '@items/weapon-handler';
import { isItemRangedWeapon, isItemWeapon } from '@items/inv-utils';
import { RecallKnowledgeText } from '@drawers/types/CreatureDrawer';
import { getVariable } from '@variables/variable-manager';
import { DisplayIcon } from './IconDisplay';
import { useMediaQuery } from '@mantine/hooks';
import { phoneQuery } from '@utils/mobile-responsive';

const IMAGE_SIZE = 120;

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
  const isPhone = useMediaQuery(phoneQuery());

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
      <Text fz='xs' fw={600} c='gray.4' span>
        {compactLabels(toLabel(l))}
      </Text>{' '}
      <RichText fz='xs' span>
        {data.attributes[l].partial ? `__${sign(data.attributes[l].value)}__` : sign(data.attributes[l].value)}
      </RichText>
    </Text>
  ));

  console.log(data);

  const getArmorShieldDisplay = (armor: InventoryItem | null, shield: InventoryItem | null) => {
    if (!armor && !shield) {
      return '';
    }

    const str = [
      armor ? linkContent(armor.item.name.toLowerCase(), 'item', armor.item) : undefined,
      shield
        ? `${linkContent(shield.item.name.toLowerCase(), 'item', shield.item)}, ${sign(shield.item.meta_data?.ac_bonus ?? 0)}, hp: ${shield.item.meta_data?.hp ?? 0} / ${shield.item.meta_data?.hp_max ?? 0}`
        : undefined,
    ]
      .filter(isTruthy)
      .join('; ');
    if (!str) {
      return '';
    }

    return (
      <RichText ta='justify' fz='xs' span>
        ({str})
      </RichText>
    );
  };

  const getResistWeaksDisplay = (rw: { resists: string[]; weaks: string[]; immunes: string[] }) => {
    const str = [
      rw.immunes.length > 0 ? `**Immunities** ${rw.immunes.join(', ').toLowerCase()}` : undefined,
      rw.resists.length > 0 ? `**Resistances** ${rw.resists.join(', ').toLowerCase()}` : undefined,
      rw.weaks.length > 0 ? `**Weaknesses** ${rw.weaks.join(', ').toLowerCase()}` : undefined,
    ]
      .filter(isTruthy)
      .join('; ');

    return str ? `; ${str}` : '';
  };

  const getAbilityDisplay = (ab: AbilityBlock) => {
    const traitsStr = (ab.traits ?? [])
      .map((id) => data.all_traits.find((t) => id === t.id))
      .filter(isTruthy)
      .map((t) => linkContent(t.name.toLowerCase(), 'trait', t))
      .join(', ')
      .trim();

    const parts = [
      ab.frequency ? `**Frequency** ${ab.frequency}` : undefined,
      ab.cost ? `**Cost** ${ab.cost}` : undefined,
      ab.trigger ? `**Trigger** ${ab.trigger}` : undefined,
      ab.requirements ? `**Requirements** ${ab.requirements}` : undefined,
    ].filter(isTruthy);

    const specialStr = ab.special ? `\n\n**Special** ${ab.special}` : '';

    return (
      <RichText ta='justify' fz='xs' span>
        **{ab.name}** {actionCostToRichTextInsert(ab.actions)} {traitsStr ? `(${traitsStr})` : ''} {parts.join(' ')}{' '}
        {parts.length > 0 ? '**Effect**' : ''} {ab.description} {specialStr}
      </RichText>
    );
  };

  const getWeaponDisplay = (weapon: {
    item: Item;
    stats: {
      attack_bonus: {
        total: [number, number, number];
        parts: Map<string, number>;
      };
      damage: {
        dice: number;
        die: string;
        damageType: string;
        bonus: {
          total: number;
          parts: any;
        };
        other: any[];
        extra: string | undefined;
      };
    };
  }) => {
    const traitsStr = (weapon.item.traits ?? [])
      .map((id) => data.all_traits.find((t) => id === t.id))
      .filter(isTruthy)
      .map((t) => linkContent(t.name.toLowerCase(), 'trait', t))
      .join(', ')
      .trim();

    const damageBonus = weapon.stats.damage.bonus.total > 0 ? ` + ${weapon.stats.damage.bonus.total}` : ``;

    return (
      <RichText ta='justify' fz='xs' span>
        **{isItemRangedWeapon(weapon.item) ? 'Ranged' : 'Melee'}** {actionCostToRichTextInsert('ONE-ACTION')}{' '}
        {linkContent(weapon.item.name.toLowerCase(), 'item', weapon.item)} {sign(weapon.stats.attack_bonus.total[0])} /{' '}
        {sign(weapon.stats.attack_bonus.total[1])} / {sign(weapon.stats.attack_bonus.total[2])}{' '}
        {traitsStr ? `(${traitsStr})` : ''}, **Damage** {weapon.stats.damage.dice}
        {weapon.stats.damage.die}
        {damageBonus} {weapon.stats.damage.damageType}
        {parseOtherDamage(weapon.stats.damage.other)}
        {weapon.stats.damage.extra ? ` + ${weapon.stats.damage.extra}` : ''}
      </RichText>
    );
  };

  const getInnateSpellsDisplay = () => {
    const spellAttack = data.proficiencies['SPELL_ATTACK'].total;
    const spellDc = parseInt(data.proficiencies['SPELL_DC'].total) + 10;

    const spellsDict = _.groupBy(data.innate_spells, (s) => s.tradition);
    return Object.entries(spellsDict).map(([tradition, spells]) => {
      const spellsRankDict = _.groupBy(spells, (s) => s.rank);

      return (
        <RichText ta='justify' fz='xs' span>
          **{toLabel(tradition)} Innate Spells** DC {spellDc}, attack {sign(spellAttack)};{' '}
          {Object.entries(spellsRankDict)
            .sort(([ar, as], [br, bs]) => {
              return parseInt(br) - parseInt(ar);
            })
            .map(
              ([rank, spells]) =>
                `**${rankNumber(parseInt(rank), `Cantrips (${rankNumber(Math.ceil(entity.level / 2))})`)}** ${spells
                  .map((s) => {
                    const spellLink = linkContent(s.spell.name.toLowerCase(), 'spell', s.spell);
                    if (s.casts_max > 1) {
                      return `${spellLink} (${s.casts_current}/${s.casts_max})`;
                    } else {
                      return spellLink;
                    }
                  })
                  .join(', ')}`
            )
            .join('; ')}
        </RichText>
      );
    });
  };

  const getSpontaneousSpellsDisplay = () => {
    const spontSources = data.spell_sources.filter((s) => s.source.type.startsWith('SPONTANEOUS-'));

    const spellsDict = _.groupBy(spontSources, (s) => s.source.tradition);
    return Object.entries(spellsDict).map(([tradition, d]) => {
      const spellAttack = d[0].stats.spell_attack.total[0];
      const spellDc = d[0].stats.spell_dc.total;

      const sources = d.map((s) => s.source.name);
      const spells = data.spell_raw_data.list.filter((s) => sources.includes(s.source));

      const spellsRankDict = _.groupBy(spells, (s) => s.rank);

      return (
        <RichText ta='justify' fz='xs' span>
          **{toLabel(tradition)} Spontaneous Spells** DC {spellDc}, attack {sign(spellAttack)};{' '}
          {Object.entries(spellsRankDict)
            .sort(([ar, as], [br, bs]) => {
              return parseInt(br) - parseInt(ar);
            })
            .map(([rank, spells]) => {
              const slots = data.spell_slots.filter(
                (slot) => sources.includes(slot.source) && slot.rank === parseInt(rank)
              );
              const remainingSlots = slots.filter((s) => s.exhausted !== true);

              const slotsStr =
                parseInt(rank) > 0
                  ? ` (${slots.length === remainingSlots.length ? `${slots.length}` : `${remainingSlots.length}/${slots.length}`} ${slots.length > 1 ? 'slots' : 'slot'})`
                  : '';

              return `**${rankNumber(parseInt(rank), `Cantrips (${rankNumber(Math.ceil(entity.level / 2))})`)}**${slotsStr} ${spells
                .map((s) => {
                  const spellData = data.spells.all.find((_s) => _s.id === s.spell_id);
                  if (!spellData) {
                    return '';
                  }
                  return linkContent(spellData.name.toLowerCase(), 'spell', spellData);
                })
                .filter((s) => s !== '')
                .join(', ')}`;
            })
            .join('; ')}
        </RichText>
      );
    });
  };

  const getPreparedSpellsDisplay = () => {
    const spontSources = data.spell_sources.filter((s) => s.source.type.startsWith('PREPARED-'));

    const spellsDict = _.groupBy(spontSources, (s) => s.source.tradition);
    return Object.entries(spellsDict).map(([tradition, d]) => {
      const spellAttack = d[0].stats.spell_attack.total[0];
      const spellDc = d[0].stats.spell_dc.total;

      const sources = d.map((s) => s.source.name);
      const slots = data.spell_slots.filter((s) => sources.includes(s.source));

      const spellsRankDict = _.groupBy(slots, (s) => s.rank);

      return (
        <RichText ta='justify' fz='xs' span>
          **{toLabel(tradition)} Prepared Spells** DC {spellDc}, attack {sign(spellAttack)};{' '}
          {Object.entries(spellsRankDict)
            .sort(([ar, as], [br, bs]) => {
              return parseInt(br) - parseInt(ar);
            })
            .map(([rank, spellsData]) => {
              return `**${rankNumber(parseInt(rank), `Cantrips (${rankNumber(Math.ceil(entity.level / 2))})`)}** ${spellsData
                .map((s) => {
                  if (!s.spell) {
                    return '';
                  }
                  const linkStr = linkContent(s.spell.name.toLowerCase(), 'spell', s.spell);
                  return s.exhausted ? `~~${linkStr}~~` : linkStr;
                })
                .filter((s) => s !== '')
                .join(', ')}`;
            })
            .join('; ')}
        </RichText>
      );
    });
  };

  const getFocusSpellsDisplay = () => {
    const spellsDict = _.groupBy(data.focus_spells, (s) => s.casting_source);
    return Object.entries(spellsDict).map(([source, spells]) => {
      const sourceData = data.spell_sources.find((s) => s.source.name === source);
      const spellAttack = sourceData?.stats.spell_attack.total[0] ?? 0;
      const spellDc = sourceData?.stats.spell_dc.total ?? 0;

      const spellsRankDict = _.groupBy(spells, (s) => s.rank);

      const maxPoints = spells.filter((s) => s.rank > 0).length;
      const currentPoints = entity.spells?.focus_point_current ?? maxPoints;
      return (
        <RichText ta='justify' fz='xs' span>
          **{toLabel(source)} Focus Spells** DC {spellDc}, attack {sign(spellAttack)},{' '}
          {`${maxPoints === currentPoints ? `${maxPoints}` : `${currentPoints}/${maxPoints}`} ${maxPoints > 1 ? 'focus points' : 'focus point'}`}
          ;{' '}
          {Object.entries(spellsRankDict)
            .sort(([ar, as], [br, bs]) => {
              return parseInt(br) - parseInt(ar);
            })
            .map(
              ([rank, spells]) =>
                `**${rankNumber(parseInt(rank), `Cantrips (${rankNumber(Math.ceil(entity.level / 2))})`)}** ${spells
                  .map((s) => {
                    return linkContent(s.name.toLowerCase(), 'spell', s);
                  })
                  .join(', ')}`
            )
            .join('; ')}
        </RichText>
      );
    });
  };

  const getRitualSpellsDisplay = () => {
    if (data.spells.rituals.length === 0) {
      return null;
    }
    const spellsRankDict = _.groupBy(data.spells.rituals, (s) => s.rank);
    return (
      <RichText ta='justify' fz='xs' span>
        **Rituals**{' — '}
        {Object.entries(spellsRankDict)
          .sort(([ar, as], [br, bs]) => {
            return parseInt(br) - parseInt(ar);
          })
          .map(
            ([rank, spells]) =>
              `**${rankNumber(parseInt(rank))}** ${spells
                .map((s) => {
                  return linkContent(s.name.toLowerCase(), 'spell', s);
                })
                .join(', ')}`
          )
          .join('; ')}
      </RichText>
    );
  };

  const abilities = _.flatten(Object.values(data.feats_features));

  return (
    <Stack gap={5} pb={15}>
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
        <Box pr={IMAGE_SIZE}>
          <TraitsDisplay
            justify='flex-start'
            size='sm'
            traitIds={data.character_traits.map((trait) => trait.id)}
            rarity={isCreature(entity) ? entity.rarity : undefined}
            pfSize={convertToSize(data.size)}
            interactable
          />
        </Box>
      )}
      {props.options?.hideImage ? null : (
        <Box
          style={{
            position: 'absolute',
            top: 15 + (!props.options?.hideName ? 55 : 0),
            right: 15,
          }}
        >
          <DisplayIcon strValue={entity.details?.image_url} width={IMAGE_SIZE} />
        </Box>
      )}
      {isCreature(entity) && <RecallKnowledgeText entity={entity} traits={data.all_traits} />}
      <IndentedText ta='justify' fz='xs' pr={IMAGE_SIZE} span>
        <Text fz='xs' fw={600} c='gray.4' span>
          Perception
        </Text>{' '}
        <RichText ta='justify' fz='xs' span>
          {data.proficiencies['PERCEPTION'].total}; {stringifySenses(data.senses)}
        </RichText>
      </IndentedText>
      {data.languages.length > 0 && (
        <IndentedText ta='justify' fz='xs' pr={IMAGE_SIZE} span>
          <Text fz='xs' fw={600} c='gray.4' span>
            Languages
          </Text>{' '}
          <RichText ta='justify' fz='xs' span>
            {data.languages.map((l) => toLabel(l)).join(', ')}
          </RichText>
        </IndentedText>
      )}
      <IndentedText ta='justify' fz='xs' pr={isPhone ? 0 : IMAGE_SIZE} span>
        <Text fz='xs' fw={600} c='gray.4' span>
          Skills
        </Text>{' '}
        <RichText ta='justify' fz='xs' span>
          {Object.keys(data.proficiencies)
            .filter((name) => name.startsWith('SKILL_') && name !== 'SKILL_LORE____')
            //.sort((a, b) => data.proficiencies[b].total - data.proficiencies[a].total)
            .map((l) => `${toLabel(l)} ${data.proficiencies[l].total}`)
            .join(', ')}
        </RichText>
      </IndentedText>
      <IndentedText ta='justify' fz='xs' span>
        {ATTR.flatMap((node, index) => (index < ATTR.length - 1 ? [node, ', '] : [node]))}
      </IndentedText>
      {data.inventory_flat.filter((i) => i.item.meta_data?.unselectable !== true).length > 0 && (
        <IndentedText ta='justify' fz='xs' span>
          <Text fz='xs' fw={600} c='gray.4' span>
            Items
          </Text>{' '}
          <RichText ta='justify' fz='xs' span>
            {data.inventory_flat
              .filter((i) => i.item.meta_data?.unselectable !== true)
              .map((i) => {
                const nameStr = linkContent(i.item.name.toLowerCase(), 'item', i.item);
                if (i.item.meta_data?.quantity && i.item.meta_data?.quantity > 1) {
                  return `${nameStr} (${i.item.meta_data?.quantity})`;
                } else {
                  return nameStr;
                }
              })
              .join(', ')}
          </RichText>
        </IndentedText>
      )}
      <Divider />
      <IndentedText ta='justify' fz='xs' span>
        <Text fz='xs' fw={600} c='gray.4' span>
          AC
        </Text>{' '}
        <Text ta='justify' fz='xs' span>
          {data.ac};
        </Text>{' '}
        {getArmorShieldDisplay(data.armor_item, data.shield_item)}{' '}
        <Text fz='xs' fw={600} c='gray.4' span>
          Fort.
        </Text>{' '}
        <Text ta='justify' fz='xs' span>
          {data.proficiencies['SAVE_FORT'].total},
        </Text>{' '}
        <Text fz='xs' fw={600} c='gray.4' span>
          Ref.
        </Text>{' '}
        <Text ta='justify' fz='xs' span>
          {data.proficiencies['SAVE_REFLEX'].total},
        </Text>{' '}
        <Text fz='xs' fw={600} c='gray.4' span>
          Will
        </Text>{' '}
        <Text ta='justify' fz='xs' span>
          {data.proficiencies['SAVE_WILL'].total}
        </Text>
      </IndentedText>
      {!props.options?.hideHealth && (
        <RichText ta='justify' fz='xs' span>
          **HP** {entity.hp_current ?? data.max_hp} / {data.max_hp}
          {entity.hp_temp ? ` (${entity.hp_temp} temp)` : ''}
          {getResistWeaksDisplay(data.resist_weaks)}
        </RichText>
      )}
      {abilities
        .filter((ab) => ab.actions === 'FREE-ACTION' || ab.actions === 'REACTION')
        .map((ab) => getAbilityDisplay(ab))}
      <Divider />
      {data.speeds.filter((s) => s.value.total !== 0).length > 0 && (
        <IndentedText ta='justify' fz='xs' span>
          <Text fz='xs' fw={600} c='gray.4' span>
            Speed
          </Text>{' '}
          <RichText ta='justify' fz='xs' span>
            {data.speeds
              .filter((s) => s.value.value !== 0)
              .map((s) => {
                if (s.name === 'SPEED') {
                  return `${s.value.total} ft`;
                } else {
                  return `${s.name.replace('SPEED_', '').toLowerCase()} ${s.value.total} ft`;
                }
              })
              .join(', ')}
          </RichText>
        </IndentedText>
      )}
      {(data.weapons ?? []).map((w) => getWeaponDisplay(w))}
      {getInnateSpellsDisplay()}
      {getPreparedSpellsDisplay()}
      {getSpontaneousSpellsDisplay()}
      {getFocusSpellsDisplay()}
      {getRitualSpellsDisplay()}
      {abilities
        .filter((ab) => ab.actions && ab.actions !== 'FREE-ACTION' && ab.actions !== 'REACTION')
        .map((ab) => getAbilityDisplay(ab))}
      <Divider />
      {abilities.filter((ab) => !ab.actions).map((ab) => getAbilityDisplay(ab))}
      <Divider />

      {!props.options?.hideDescription && isCreature(entity) && entity.details.description.trim() && (
        <Box p='lg'>
          <RichText ta='justify' fz='xs' fs='italic' c='dimmed' span>
            {entity.details.description}
          </RichText>
        </Box>
      )}
    </Stack>
  );
}
