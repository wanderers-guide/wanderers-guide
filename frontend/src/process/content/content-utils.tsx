import {
  IconBackpack,
  IconBook2,
  IconCaretLeftRight,
  IconFlare,
  IconLanguage,
  IconPaw,
  IconTag,
  IconTree,
  IconVocabulary,
  IconWindow,
} from "@tabler/icons-react";
import { AbilityBlockType, ActionCost, ContentType } from "@typing/content";
import { isString } from "lodash-es";
import * as showdown from "showdown";
import Turndown from "turndown";

export function toMarkdown(html: any) {
  if (!isString(html)) return undefined;
  const td = new Turndown({
    hr: "",
  });
  td.keep(["abbr"]);
  return td.turndown(html) || undefined;
}

export function toHTML(markdown: any) {
  if (!isString(markdown)) return undefined;
  const sd = new showdown.Converter();
  return sd.makeHtml(markdown) || undefined;
}

export function toText(html: any) {
  if (!isString(html)) return undefined;
  let tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || undefined;
}

export function convertToContentType(
  type: ContentType | AbilityBlockType
): ContentType {
  return (
    isAbilityBlockType(type) ? "ability-block" : type
  ) satisfies ContentType;
}
export function isAbilityBlockType(value: any): value is AbilityBlockType {
  return [
    "action",
    "feat",
    "physical-feature",
    "sense",
    "class-feature",
    "heritage",
  ].includes(value ?? "");
}

export function isActionCost(value: string | null): value is ActionCost {
  return [
    "ONE-ACTION",
    "TWO-ACTIONS",
    "THREE-ACTIONS",
    "REACTION",
    "FREE-ACTION",
    "ONE-TO-TWO-ACTIONS",
    "ONE-TO-THREE-ACTIONS",
    "TWO-TO-THREE-ACTIONS",
    "TWO-TO-TWO-ROUNDS",
    "TWO-TO-THREE-ROUNDS",
    "THREE-TO-TWO-ROUNDS",
    "THREE-TO-THREE-ROUNDS",
    null,
  ].includes(value);
}

export function getIconFromContentType(type: ContentType, size: string) {
  return {
    trait: <IconTag size={size} />,
    item: <IconBackpack size={size} />,
    spell: <IconFlare size={size} />,
    class: <IconVocabulary size={size} />,
    "ability-block": <IconCaretLeftRight size={size} />,
    creature: <IconPaw size={size} />,
    ancestry: <IconTree size={size} />,
    background: <IconWindow size={size} />,
    language: <IconLanguage size={size} />,
    "content-source": <IconBook2 size={size} />,
  }[type];
}
