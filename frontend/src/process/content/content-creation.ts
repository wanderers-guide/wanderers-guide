import {
  AbilityBlock,
  Ancestry,
  Background,
  Class,
  ContentSource,
  ContentType,
  Creature,
  Item,
  Spell,
  Trait,
} from '@typing/content';
import _ from 'lodash';
import { makeRequest } from '@requests/request-manager';

export async function deleteContentSource(type: ContentType, id: number) {
  const result = await makeRequest('delete-content', {
    id: id,
    type: type,
  });
  return result;
}

export async function upsertContentSource(contentSource: ContentSource) {
  const result = await makeRequest<ContentSource | true>('create-content-source', {
    ...contentSource,
  });
  return result ? (result === true ? contentSource : result) : null;
}

export async function upsertAbilityBlock(abilityBlock: AbilityBlock) {
  const result = await makeRequest<AbilityBlock | true>('create-ability-block', {
    ...abilityBlock,
  });
  return result ? (result === true ? abilityBlock : result) : null;
}

export async function upsertSpell(spell: Spell) {
  const result = await makeRequest<Spell | true>('create-spell', {
    ...spell,
  });
  return result ? (result === true ? spell : result) : null;
}

export async function upsertItem(item: Item) {
  const result = await makeRequest<Item | true>('create-item', {
    ...item,
  });
  return result ? (result === true ? item : result) : null;
}

export async function upsertCreature(creature: Creature) {
  const result = await makeRequest<Creature | true>('create-creature', {
    ...creature,
  });
  return result ? (result === true ? creature : result) : null;
}

export async function upsertBackground(background: Background) {
  const result = await makeRequest<Background | true>('create-background', {
    ...background,
  });
  return result ? (result === true ? background : result) : null;
}

export async function upsertClass(class_: Class) {
  const result = await makeRequest<Class | true>('create-class', {
    ...class_,
  });
  return result ? (result === true ? class_ : result) : null;
}

export async function upsertAncestry(ancestry: Ancestry) {
  const result = await makeRequest<Ancestry | true>('create-ancestry', {
    ...ancestry,
  });
  return result ? (result === true ? ancestry : result) : null;
}

export async function upsertTrait(trait: Trait) {
  const result = await makeRequest<Trait | true>('create-trait', {
    ...trait,
  });
  return result ? (result === true ? trait : result) : null;
}
