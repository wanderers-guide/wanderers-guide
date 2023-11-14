import { AbilityBlock, Background, Creature, Item, Spell } from '@typing/content';
import _ from 'lodash';
import { makeRequest } from '@requests/request-manager';

export async function upsertAbilityBlock(abilityBlock: AbilityBlock) {
  const result = await makeRequest<AbilityBlock>('create-ability-block', {
    ...abilityBlock,
  });
  return result ? abilityBlock : null;
}

export async function upsertSpell(spell: Spell) {
  const result = await makeRequest<Spell>('create-spell', {
    ...spell,
  });
  return result ? spell : null;
}

export async function upsertItem(item: Item) {
  const result = await makeRequest<Item>('create-item', {
    ...item,
  });
  return result ? item : null;
}

export async function upsertCreature(creature: Creature) {
  const result = await makeRequest<Creature>('create-creature', {
    ...creature,
  });
  return result ? creature : null;
}

export async function upsertBackground(background: Background) {
  const result = await makeRequest<Background>('create-background', {
    ...background,
  });
  return result ? background : null;
}
