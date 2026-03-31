import {
  IconBackpack,
  IconBadge,
  IconBook2,
  IconCaretLeftRight,
  IconFlare,
  IconLanguage,
  IconMilitaryRank,
  IconPaw,
  IconTag,
  IconTree,
  IconVocabulary,
  IconWindow,
} from '@tabler/icons-react';
import { AbilityBlock, AbilityBlockType, ActionCost, ContentType, LivingEntity } from '@schemas/content';
import { DrawerType } from '@schemas/index';
import { isString } from 'lodash-es';
import * as showdown from 'showdown';
import Turndown from 'turndown';

export function toMarkdown(html: any) {
  if (!isString(html)) return null;
  const td = new Turndown({
    // Why was hr removed?
    //hr: '',
  });
  td.keep(['abbr']);
  return td.turndown(html) || null;
}

export function toHTML(markdown: any) {
  if (!isString(markdown)) return null;
  const sd = new showdown.Converter();
  return sd.makeHtml(markdown) || null;
}

export function toText(html: any) {
  if (!isString(html)) return null;
  let tmp = document.createElement('div');
  tmp.innerHTML = html;
  const text = tmp.textContent || tmp.innerText || null;
  if (!text) return null;

  return text.replace(/’/g, "'").trim();
}

export function convertToContentType(type: ContentType | AbilityBlockType): ContentType {
  // Handle special cases for DrawerTypes
  // @ts-ignore
  if (type === 'cast-spell') return 'spell';
  return (isAbilityBlockType(type) ? 'ability-block' : type) satisfies ContentType;
}
export function isAbilityBlockType(value: any): value is AbilityBlockType {
  return ['action', 'feat', 'physical-feature', 'sense', 'class-feature', 'heritage', 'mode'].includes(value ?? '');
}

export function isActionCost(value: string | null): value is ActionCost {
  return [
    'ONE-ACTION',
    'TWO-ACTIONS',
    'THREE-ACTIONS',
    'REACTION',
    'FREE-ACTION',
    'ONE-TO-TWO-ACTIONS',
    'ONE-TO-THREE-ACTIONS',
    'TWO-TO-THREE-ACTIONS',
    'TWO-TO-TWO-ROUNDS',
    'TWO-TO-THREE-ROUNDS',
    'THREE-TO-TWO-ROUNDS',
    'THREE-TO-THREE-ROUNDS',
    null,
  ].includes(value);
}

export function getIconFromContentType(type: ContentType, size: string) {
  return {
    trait: <IconTag size={size} />,
    item: <IconBackpack size={size} />,
    spell: <IconFlare size={size} />,
    class: <IconVocabulary size={size} />,
    'ability-block': <IconCaretLeftRight size={size} />,
    creature: <IconPaw size={size} />,
    ancestry: <IconTree size={size} />,
    background: <IconWindow size={size} />,
    language: <IconLanguage size={size} />,
    'content-source': <IconBook2 size={size} />,
    archetype: <IconMilitaryRank size={size} />,
    'versatile-heritage': <IconCaretLeftRight size={size} />,
    'class-archetype': <IconBadge size={size} />,
  }[type];
}
