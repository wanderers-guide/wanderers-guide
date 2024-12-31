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
} from '@typing/content';
import { toLabel } from '@utils/strings';
import { isCharacter, isCreature, isTruthy } from '@utils/type-fixing';
import TraitsDisplay from './TraitsDisplay';
import { convertToSize } from '@upload/foundry-utils';
import RichText from './RichText';
import { compactLabels } from '@variables/variable-utils';
import { sign } from '@utils/numbers';
import IndentedText from './IndentedText';
import _ from 'lodash-es';
import { actionCostToRichTextInsert } from '@utils/actions';
import { getWeaponStats, parseOtherDamage } from '@items/weapon-handler';
import { isItemRangedWeapon, isItemWeapon } from '@items/inv-utils';
import { RecallKnowledgeText } from '@drawers/types/CreatureDrawer';

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
      <Text fz='xs' fw={600} c='gray.4' span>
        {compactLabels(toLabel(l))}
      </Text>{' '}
      <RichText fz='xs' span>
        {data.attributes[l].partial ? `__${sign(data.attributes[l].value)}__` : sign(data.attributes[l].value)}
      </RichText>
    </Text>
  ));

  console.log(entity);

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
        <TraitsDisplay
          justify='flex-start'
          size='sm'
          traitIds={data.character_traits.map((trait) => trait.id)}
          rarity={isCreature(entity) ? entity.rarity : undefined}
          pfSize={convertToSize(data.size)}
          interactable
        />
      )}
      {isCreature(entity) && <RecallKnowledgeText entity={entity} traits={data.all_traits} />}
      <IndentedText ta='justify' fz='xs' span>
        <Text fz='xs' fw={600} c='gray.4' span>
          Perception
        </Text>{' '}
        <RichText ta='justify' fz='xs' span>
          {data.proficiencies['PERCEPTION'].total}; {stringifySenses(data.senses)}
        </RichText>
      </IndentedText>
      {data.languages.length > 0 && (
        <IndentedText ta='justify' fz='xs' span>
          <Text fz='xs' fw={600} c='gray.4' span>
            Languages
          </Text>{' '}
          <RichText ta='justify' fz='xs' span>
            {data.languages.map((l) => toLabel(l)).join(', ')}
          </RichText>
        </IndentedText>
      )}
      <IndentedText ta='justify' fz='xs' span>
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
              .filter((s) => s.value.total !== 0)
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
      {/* {(data.spell_slots ?? []).map((w) => getWeaponDisplay(w))} */}
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
