import React, { useEffect, useState } from 'react';
import {
  BoxProps,
  CompoundStylesApiProps,
  factory,
  useProps,
  Factory,
  PopoverProps,
  Popover,
  TextInput,
  Button,
  UnstyledButton,
  Tooltip,
  rem,
  useResolvedStylesApi,
  Group,
  Select,
  Menu,
  Text,
  ScrollArea,
  Box,
  Title,
} from '@mantine/core';
import { useInputState, useDisclosure, useWindowEvent } from '@mantine/hooks';
import { IconExternalLink, IconLink } from '@tabler/icons-react';
import { RichTextEditor, useRichTextEditorContext } from '@mantine/tiptap';
import { selectContent } from '@common/select/SelectContent';
import { AbilityBlockType, ContentType } from '@typing/content';
import { getContent } from '@content/content-controller';
import { isAbilityBlockType } from '@variables/variable-utils';
import _ from 'lodash';

export function getContentDataFromHref(href: string) {
  if (!href.startsWith('link_')) return null;
  const [link, type, id] = href.split('_');
  return { type: type as ContentType | AbilityBlockType, id: parseInt(id) };
}

export function buildHrefFromContentData(type: ContentType | AbilityBlockType, id: number) {
  return `link_${type}_${id}`;
}

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
    setUrl('');
  };

  const setLink = (newUrl: string) => {
    handleClose();
    newUrl === ''
      ? editor?.chain().focus().extendMarkRange('link').unsetLink().run()
      : editor
          ?.chain()
          .focus()
          .extendMarkRange('link')
          .setLink({ href: newUrl, target: '_self', rel: 'tag' })
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
        groupBySource: false,
        selectedId: undefined,
      }
    );
  }

  // Fetch content from url
  useEffect(() => {
    (async () => {
      const contentData = getContentDataFromHref(url);
      if (!contentData) return;

      const type = (
        isAbilityBlockType(contentData.type) ? 'ability-block' : contentData.type
      ) satisfies ContentType;

      const content = await getContent(type, contentData.id);
      if (content) {
        setContent(content);
      }
    })();
  }, [url]);

  const selectedContentType = _.startCase(
    getContentDataFromHref(url)?.type?.replace('-', ' ') ?? ''
  );
  const selectedContentName = content?.name ?? '';

  return (
    <Menu shadow='md' position='top' width={180} opened={opened} onClose={handleClose}>
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

    // <Popover
    //   trapFocus
    //   shadow='md'
    //   withinPortal
    //   opened={opened}
    //   onClose={handleClose}
    //   offset={-44}
    //   // closeOnClickOutside={false}
    //   // closeOnEscape={false}
    // >
    //   <Popover.Target>

    //   </Popover.Target>

    //   <Popover.Dropdown>
    //     <Group gap={0}>
    //       <Select
    //         placeholder='Category'
    //         value={category}
    //         onChange={setCategory}
    //         data={
    //           [
    //             { value: 'action', label: 'Action' },
    //             { value: 'feat', label: 'Feat' },
    //             { value: 'physical-feature', label: 'Physical Feature' },
    //             { value: 'sense', label: 'Sense' },
    //             { value: 'class-feature', label: 'Class Feature' },
    //             { value: 'heritage', label: 'Heritage' },
    //             { value: 'trait', label: 'Trait' },
    //             { value: 'item', label: 'Item' },
    //             { value: 'spell', label: 'Spell' },
    //             { value: 'class', label: 'Class' },
    //             { value: 'ancestry', label: 'Ancestry' },
    //             { value: 'background', label: 'Background' },
    //             { value: 'language', label: 'Language' },
    //           ] satisfies { value: ContentType | AbilityBlockType; label: string }[]
    //         }
    //         onClick={(e) => {
    //           e.stopPropagation();
    //         }}
    //       />
    //       <SelectContentButton
    //         type={
    //           (ABILITY_BLOCK_TYPES.includes((category ?? '') as AbilityBlockType)
    //             ? 'ability-block'
    //             : category ?? '') as ContentType
    //         }
    //         onClick={(option) => {
    //           console.log(option);
    //         }}
    //         options={{
    //           abilityBlockType: ABILITY_BLOCK_TYPES.includes((category ?? '') as AbilityBlockType)
    //             ? (category as AbilityBlockType)
    //             : undefined,
    //         }}
    //         // selectedId={props.selectedId}
    //       />
    //     </Group>

    //     {/* <div>
    //       <TextInput type='url' value={url} onChange={setUrl} onKeyDown={handleInputKeydown} />

    //       <Button variant='default' onClick={setLink}>
    //         Insert link
    //       </Button>
    //     </div> */}
    //   </Popover.Dropdown>
    // </Popover>
  );
}
