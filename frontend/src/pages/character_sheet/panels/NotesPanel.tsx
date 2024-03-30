import { characterState } from '@atoms/characterAtoms';
import { Icon } from '@common/Icon';
import RichTextInput from '@common/rich_text_input/RichTextInput';
import { GUIDE_BLUE } from '@constants/data';
import { Tabs, ActionIcon, ScrollArea, Title } from '@mantine/core';
import { openContextModal } from '@mantine/modals';
import { IconPlus, IconSettings } from '@tabler/icons-react';
import _ from 'lodash';
import { useState } from 'react';
import { useRecoilState } from 'recoil';

export default function NotesPanel(props: { panelHeight: number }) {
  const [activeTab, setActiveTab] = useState<string | null>('0');
  const [character, setCharacter] = useRecoilState(characterState);

  const defaultPage = {
    name: 'Notes',
    icon: 'notebook',
    color: character?.details?.sheet_theme?.color || GUIDE_BLUE,
    contents: null,
  };

  const pages = character?.notes?.pages ?? [_.cloneDeep(defaultPage)];

  return (
    <Tabs orientation='vertical' value={activeTab} onChange={setActiveTab}>
      <Tabs.List w={180} h={props.panelHeight}>
        {pages.map((page, index) => (
          <Tabs.Tab
            key={index}
            value={`${index}`}
            leftSection={
              <ActionIcon variant='transparent' aria-label={`${page.name}`} color={page.color} size='xs'>
                <Icon name={page.icon} size='1rem' />
              </ActionIcon>
            }
            color={page.color}
          >
            {_.truncate(page.name, { length: 16 })}
          </Tabs.Tab>
        ))}
        <Tabs.Tab
          value='add_page'
          mt='auto'
          leftSection={
            <ActionIcon variant='transparent' size='xs' color='gray.5'>
              <IconPlus size='1rem' />
            </ActionIcon>
          }
          onClick={(e) => {
            if (!character) return;
            e.stopPropagation();
            e.preventDefault();
            const newPages = _.cloneDeep(pages);
            newPages.push(_.cloneDeep(defaultPage));
            setCharacter({
              ...character,
              notes: {
                ...character.notes,
                pages: newPages,
              },
            });
            setActiveTab(`${newPages.length - 1}`);
          }}
        >
          Add Page
        </Tabs.Tab>
      </Tabs.List>

      {pages.map((page, index) => (
        <Tabs.Panel key={index} value={`${index}`} style={{ position: 'relative' }}>
          <ScrollArea h={props.panelHeight} scrollbars='y'>
            <RichTextInput
              placeholder='Your notes...'
              value={page.contents}
              onChange={(text, json) => {
                if (!character) return;
                const newPages = _.cloneDeep(pages);
                newPages[index].contents = json;
                setCharacter({
                  ...character,
                  notes: {
                    ...character.notes,
                    pages: newPages,
                  },
                });
              }}
              minHeight={props.panelHeight}
            />
            <ActionIcon
              variant='subtle'
              aria-label={`Page Settings`}
              size='md'
              radius='xl'
              color='gray.5'
              style={{
                position: 'absolute',
                top: 10,
                right: 10,
              }}
              onClick={() => {
                openContextModal({
                  modal: 'updateNotePage',
                  title: <Title order={3}>Update Page</Title>,
                  innerProps: {
                    page: page,
                    onUpdate: (name, icon, color) => {
                      if (!character) return;
                      const newPages = _.cloneDeep(pages);
                      newPages[index] = {
                        ...newPages[index],
                        name: name,
                        icon: icon,
                        color: color,
                      };
                      setCharacter({
                        ...character,
                        notes: {
                          ...character.notes,
                          pages: newPages,
                        },
                      });
                    },
                    onDelete: () => {
                      if (!character) return;
                      const newPages = _.cloneDeep(pages);
                      newPages.splice(index, 1);
                      setCharacter({
                        ...character,
                        notes: {
                          ...character.notes,
                          pages: newPages,
                        },
                      });
                      setActiveTab(`0`);
                    },
                  },
                });
              }}
            >
              <IconSettings size='1.2rem' />
            </ActionIcon>
          </ScrollArea>
        </Tabs.Panel>
      ))}
    </Tabs>
  );
}
