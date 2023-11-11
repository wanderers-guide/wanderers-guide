import { AbilityBlock, Background, Creature, Item, Spell } from '@typing/content';
import _ from 'lodash';
import { makeRequest } from '@requests/request-manager';
import { UpdateResponse } from '@typing/requests';

function isUpdate(response: any): response is UpdateResponse {
  return _.has(response, 'status') && !_.has(response, 'id');
}

export async function upsertAbilityBlock(abilityBlock: AbilityBlock) {
  const result = await makeRequest<AbilityBlock>('create-ability-block', {
    ...abilityBlock,
  });
  if (isUpdate(result)) {
    return (result.status === 'SUCCESS') ? abilityBlock : null;
  } else {
    return result;
  }
}

export async function upsertSpell(spell: Spell) {
  const result = await makeRequest<Spell>('create-spell', {
    ...spell,
  });
  if (isUpdate(result)) {
    return result.status === 'SUCCESS' ? spell : null;
  } else {
    return result;
  }
}

export async function upsertItem(item: Item) {
  const result = await makeRequest<Item>('create-item', {
    ...item,
  });
  if (isUpdate(result)) {
    return result.status === 'SUCCESS' ? item : null;
  } else {
    return result;
  }
}

export async function upsertCreature(creature: Creature) {
  const result = await makeRequest<Creature>('create-creature', {
    ...creature,
  });
  if (isUpdate(result)) {
    return result.status === 'SUCCESS' ? creature : null;
  } else {
    return result;
  }
}

export async function upsertBackground(background: Background) {
  const result = await makeRequest<Background>('create-background', {
    ...background,
  });
  if (isUpdate(result)) {
    return result.status === 'SUCCESS' ? background : null;
  } else {
    return result;
  }
}
