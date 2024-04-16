import { IconAffiliate, IconLayersLinked } from '@tabler/icons-react';
import { RichTextEditor, useRichTextEditorContext } from '@mantine/tiptap';
import * as _ from 'lodash-es';
import { toHTML, toMarkdown } from '@content/content-utils';

export default function AutoContentLinkControl() {
  const { editor } = useRichTextEditorContext();

  const handleOpen = () => {
    const text = toMarkdown(editor?.getHTML() ?? '');

    // TODO, Implement auto link content
    console.log(text);

    // Set html
    editor?.commands.setContent(toHTML(text) ?? '');
  };

  return (
    <RichTextEditor.Control
      disabled
      onClick={handleOpen}
      active={editor?.isActive('actionSymbol')}
      aria-label='Auto Link Content'
    >
      <IconAffiliate size='1.0rem' stroke={1.5} />
    </RichTextEditor.Control>
  );
}
