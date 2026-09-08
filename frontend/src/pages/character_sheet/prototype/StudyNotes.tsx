import { ActionIcon, Box, Button, Group, Select, Text, TextInput } from '@mantine/core';
import { RichTextEditor } from '@mantine/tiptap';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { IconPlus, IconSettings } from '@tabler/icons-react';
import { useState } from 'react';

import { type StudyNote } from './sheet-study-data';

/** A real local editor with illustrative notes, never connected to the character save system. */
export function StudyNotes({ notes, onChange }: { notes: StudyNote[]; onChange: (notes: StudyNote[]) => void }) {
  const [pageId, setPageId] = useState('journal');
  const [settings, setSettings] = useState(false);
  const page = notes.find((note) => note.id === pageId) ?? notes[0];
  return (
    <Box>
      <Group mb='sm' gap='xs' wrap='nowrap'>
        <Select
          className='sheet-field'
          aria-label='Note page'
          value={page.id}
          data={notes.map((note) => ({ value: note.id, label: note.title || 'Untitled' }))}
          onChange={(value) => {
            if (value) setPageId(value);
          }}
          allowDeselect={false}
          comboboxProps={{ withinPortal: false }}
          flex={1}
        />
        <ActionIcon
          className='sheet-tool'
          variant='subtle'
          aria-label='Add note page'
          onClick={() => {
            const id = `page-${notes.length + 1}`;
            onChange([...notes, { id, title: `Page ${notes.length + 1}`, content: '<p></p>' }]);
            setPageId(id);
          }}
        >
          <IconPlus size={19} />
        </ActionIcon>
        <ActionIcon
          className='sheet-tool'
          variant='subtle'
          aria-label='Page settings'
          aria-expanded={settings}
          onClick={() => setSettings(!settings)}
        >
          <IconSettings size={19} />
        </ActionIcon>
      </Group>
      {settings && (
        <Box className='sheet-reading-inset' mb='sm'>
          <TextInput
            className='sheet-field'
            label='Page title'
            value={page.title}
            onChange={(event) =>
              onChange(
                notes.map((note) => (note.id === page.id ? { ...note, title: event.currentTarget.value } : note))
              )
            }
          />
          <Button className='sheet-button' variant='light' mt='sm' onClick={() => setSettings(false)}>
            Done
          </Button>
        </Box>
      )}
      <NoteEditor
        key={page.id}
        content={page.content}
        onChange={(content) => onChange(notes.map((note) => (note.id === page.id ? { ...note, content } : note)))}
      />
      <Text className='sheet-muted' size='xs' mt='sm'>
        Private page
      </Text>
    </Box>
  );
}

/** The editor owns the selection; its parent retains content while navigating the prototype. */
function NoteEditor({ content, onChange }: { content: string; onChange: (content: string) => void }) {
  const editor = useEditor({
    extensions: [StarterKit],
    content,
    shouldRerenderOnTransaction: true,
    editorProps: { attributes: { 'aria-label': 'Note text', role: 'textbox', 'aria-multiline': 'true' } },
    onUpdate: ({ editor: current }) => onChange(current.getHTML()),
  });
  return (
    <RichTextEditor editor={editor} className='sheet-editor' variant='subtle'>
      <RichTextEditor.Toolbar>
        <RichTextEditor.ControlsGroup>
          <RichTextEditor.Bold />
          <RichTextEditor.Italic />
          <RichTextEditor.Underline />
        </RichTextEditor.ControlsGroup>
        <RichTextEditor.ControlsGroup>
          <RichTextEditor.H3 />
          <RichTextEditor.BulletList />
          <RichTextEditor.OrderedList />
          <RichTextEditor.Blockquote />
        </RichTextEditor.ControlsGroup>
        <RichTextEditor.ControlsGroup>
          <RichTextEditor.Undo />
          <RichTextEditor.Redo />
        </RichTextEditor.ControlsGroup>
      </RichTextEditor.Toolbar>
      <RichTextEditor.Content />
    </RichTextEditor>
  );
}
