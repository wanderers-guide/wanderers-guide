import { isString } from 'lodash';
import Turndown from 'turndown';
import _ from 'lodash';
import * as showdown from 'showdown';

export function toMarkdown(html: any) {
  if (!isString(html)) return undefined;
  const td = new Turndown({
    hr: '',
  });
  return td.turndown(html) || undefined;
}

export function toHTML(markdown: any) {
  if (!isString(markdown)) return undefined;
  const sd = new showdown.Converter();
  return sd.makeHtml(markdown) || undefined;
}

export function toText(html: any) {
  if (!isString(html)) return undefined;
  let tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || undefined;
}
