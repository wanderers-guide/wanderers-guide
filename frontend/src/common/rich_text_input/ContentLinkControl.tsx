import { useEffect, useState } from 'react';
import {
  Menu,
  ScrollArea,
  Box,
  Title,
} from '@mantine/core';
import { useDisclosure, useWindowEvent } from '@mantine/hooks';
import { IconLink } from '@tabler/icons-react';
import { RichTextEditor, useRichTextEditorContext } from '@mantine/tiptap';
import { selectContent } from '@common/select/SelectContent';
import { AbilityBlockType, ContentType } from '@typing/content';
import _ from 'lodash';
import { buildHrefFromContentData, getContentDataFromHref } from './ContentLinkExtension';
import { toLabel } from '@utils/strings';
import { convertToContentType } from '@content/content-utils';
import { fetchContentById } from '@content/content-store';

export default function ContentLinkControl() {
  const { editor } = useRichTextEditorContext();

  const [content, setContent] = useState<Record<string, any>>();
  const [url, setUrl] = useState('');
  const [opened, { open, close }] = useDisclosure(false);

  const handleOpen = () => {
    open();
    const linkData = editor?.getAttributes('link');
    setUrl(linkData?.href || '');
  };

  const handleClose = () => {
    close();
    setTimeout(() => {
      setUrl('');
    }, 1000);
  };

  const setLink = (newUrl: string) => {
    handleClose();
    newUrl === ''
      ? editor?.chain().focus().extendMarkRange('link').unsetLink().run()
      : editor
          ?.chain()
          .focus()
          .extendMarkRange('link')
          .setLink({ href: newUrl, rel: 'tag' })
          .run();
  };

  useWindowEvent('edit-link', handleOpen, false);

  function onSelectContent<T>(type: ContentType, abilityBlockType?: AbilityBlockType) {
    selectContent<T>(
      type,
      (option) => {
        // @ts-ignore
        const id = option.id;

        const newUrl = buildHrefFromContentData(abilityBlockType ?? type, id);
        setUrl(newUrl);
        setLink(newUrl);
      },
      {
        abilityBlockType,
        groupBySource: true,
      }
    );
  }

  // Fetch content from url
  useEffect(() => {
    (async () => {
      const contentData = getContentDataFromHref(url);
      if (!contentData) return;

      const type = convertToContentType(contentData.type);
      const content = await fetchContentById(type, contentData.id);
      if (content) {
        setContent(content);
      }
    })();
  }, [url]);

  const selectedContentType = toLabel(getContentDataFromHref(url)?.type);

  const selectedContentName = content?.name ?? '';

  return (
    <Menu shadow='md' position='top' width={180} withinPortal withArrow opened={opened} onClose={handleClose}>
      <Menu.Target>
        <RichTextEditor.Control
          onClick={handleOpen}
          active={editor?.isActive('link')}
          aria-label='Link Content'
        >
          <IconLink size='1.0rem' stroke={1.5} />
        </RichTextEditor.Control>
      </Menu.Target>

      <Menu.Dropdown>
        <ScrollArea h={250}>
          {selectedContentType ? (
            <>
              <Menu.Label>
                <Title order={6} c='gray.4'>
                  Linked {selectedContentType}
                </Title>
                <Box>{selectedContentName}</Box>
              </Menu.Label>
              <Menu.Divider />
            </>
          ) : (
            <>
              <Menu.Label>
                <Title order={6} c='gray.4'>
                  Select a Category
                </Title>
              </Menu.Label>
              <Menu.Divider />
            </>
          )}
          <Menu.Item onClick={() => onSelectContent('ability-block', 'action')}>Action</Menu.Item>
          <Menu.Item onClick={() => onSelectContent('ability-block', 'feat')}>Feat</Menu.Item>
          <Menu.Item onClick={() => onSelectContent('ability-block', 'physical-feature')}>
            Physical Feature
          </Menu.Item>
          <Menu.Item onClick={() => onSelectContent('ability-block', 'sense')}>Sense</Menu.Item>
          <Menu.Item onClick={() => onSelectContent('ability-block', 'class-feature')}>
            Class Feature
          </Menu.Item>
          <Menu.Item onClick={() => onSelectContent('ability-block', 'heritage')}>
            Heritage
          </Menu.Item>
          <Menu.Item onClick={() => onSelectContent('trait')}>Trait</Menu.Item>
          <Menu.Item onClick={() => onSelectContent('item')}>Item</Menu.Item>
          <Menu.Item onClick={() => onSelectContent('spell')}>Spell</Menu.Item>
          <Menu.Item onClick={() => onSelectContent('class')}>Class</Menu.Item>
          <Menu.Item onClick={() => onSelectContent('ancestry')}>Ancestry</Menu.Item>
          <Menu.Item onClick={() => onSelectContent('background')}>Background</Menu.Item>
          <Menu.Item onClick={() => onSelectContent('language')}>Language</Menu.Item>
        </ScrollArea>
      </Menu.Dropdown>
    </Menu>
  );
}
