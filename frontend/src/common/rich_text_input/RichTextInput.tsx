import { RichTextEditor } from '@mantine/tiptap';
import { useEditor } from '@tiptap/react';
import Highlight from '@tiptap/extension-highlight';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Superscript from '@tiptap/extension-superscript';
import SubScript from '@tiptap/extension-subscript';
import { useMantineTheme, Text, Box } from '@mantine/core';
import { ContentLink } from './ContentLinkExtension';
import ContentLinkControl from './ContentLinkControl';

interface RichTextInputProps {
  label?: string;
}

export default function RichTextInput(props: RichTextInputProps) {
  const theme = useMantineTheme();

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      ContentLink,
      Superscript,
      SubScript,
      Highlight,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: '',
  });

  return (
    <Box>
      {props.label && (
        <Text fz='sm' fw={500}>
          {props.label}
        </Text>
      )}
      <RichTextEditor
        editor={editor}
        fz='sm'
        styles={{
          toolbar: {
            backgroundColor: theme.colors.dark[7],
          },
          content: {
            backgroundColor: theme.colors.dark[6],
          },
        }}
      >
        <RichTextEditor.Toolbar sticky stickyOffset={60}>
          <RichTextEditor.ControlsGroup>
            <ContentLinkControl />
            <RichTextEditor.Unlink />
          </RichTextEditor.ControlsGroup>

          <RichTextEditor.ControlsGroup>
            <RichTextEditor.Bold />
            <RichTextEditor.Italic />
            <RichTextEditor.Underline />
          </RichTextEditor.ControlsGroup>

          <RichTextEditor.ControlsGroup>
            {/* <RichTextEditor.Blockquote /> */}
            <RichTextEditor.Hr />
            <RichTextEditor.BulletList />
            <RichTextEditor.OrderedList />
          </RichTextEditor.ControlsGroup>

          <RichTextEditor.ControlsGroup>
            <RichTextEditor.H1 />
            <RichTextEditor.H2 />
            <RichTextEditor.H3 />
            <RichTextEditor.H4 />
          </RichTextEditor.ControlsGroup>
        </RichTextEditor.Toolbar>

        <RichTextEditor.Content />
      </RichTextEditor>
    </Box>
  );
}
