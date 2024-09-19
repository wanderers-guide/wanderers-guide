import { JSONContent, generateHTML, generateJSON } from '@tiptap/react';
import Highlight from '@tiptap/extension-highlight';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Superscript from '@tiptap/extension-superscript';
import SubScript from '@tiptap/extension-subscript';
import { ActionSymbol } from './ActionSymbolExtension';
import { toHTML, toMarkdown } from '@content/content-utils';

export function convertTiptapToMarkdown(content: JSONContent) {
  return toMarkdown(
    generateHTML(content, [
      StarterKit,
      Underline,
      //ContentLink(_drawerState),
      ActionSymbol,
      Superscript,
      SubScript,
      Highlight,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ])
  );
}

export function convertMarkdownToTiptap(text: string) {
  return generateJSON(toHTML(text) ?? '', [
    StarterKit,
    Underline,
    //ContentLink(_drawerState),
    ActionSymbol,
    Superscript,
    SubScript,
    Highlight,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
  ]);
}
