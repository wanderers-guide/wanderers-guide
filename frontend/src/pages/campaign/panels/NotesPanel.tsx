import { EllipsisText } from '@common/EllipsisText';
import { Icon } from '@common/Icon';
import RichTextInput from '@common/rich_text_input/RichTextInput';
import { GUIDE_BLUE } from '@constants/data';
import { Tabs, ActionIcon, ScrollArea, Title, Box, Menu, Button } from '@mantine/core';
import { useDebouncedState, useDidUpdate } from '@mantine/hooks';
import { openContextModal } from '@mantine/modals';
import { IconCheck, IconPlus, IconSettings } from '@tabler/icons-react';
import { JSONContent } from '@tiptap/react';
import { Campaign } from '@typing/content';
import { isPhoneSized } from '@utils/mobile-responsive';
import useRefresh from '@utils/use-refresh';
import { cloneDeep, truncate } from 'lodash-es';
import { useEffect, useState } from 'react';

export default function NotesPanel(props: {
  panelHeight: number;
  panelWidth: number;
  campaign: Campaign;
  setCampaign: (campaign: Campaign) => void;
}) {
  const [activeTab, setActiveTab] = useState<string | null>('0');
  const isPhone = isPhoneSized(props.panelWidth);
  const [displayNotes, refreshNotes] = useRefresh();

  const [debouncedJson, setDebouncedJson] = useDebouncedState<{
    index: number;
    json: JSONContent;
  } | null>(null, 500);

  useDidUpdate(() => {
    // Saving notes
    if (!props.campaign || !debouncedJson) return;
    const newPages = cloneDeep(pages);
    newPages[debouncedJson.index].contents = debouncedJson.json;
    props.setCampaign({
      ...props.campaign,
      notes: {
        ...props.campaign.notes,
        pages: newPages,
      },
    });
  }, [debouncedJson]);

  useEffect(() => {
    refreshNotes();
  }, [activeTab]);

  const defaultPage = {
    name: 'Overview',
    icon: 'notebook',
    color: GUIDE_BLUE,
    contents: null,
  };

  const pages = props.campaign?.notes?.pages ?? [cloneDeep(defaultPage)];

  const addPage = () => {
    if (!props.campaign) return;
    const newPages = cloneDeep(pages);
    newPages.push(cloneDeep(defaultPage));
    props.setCampaign({
      ...props.campaign,
      notes: {
        ...props.campaign.notes,
        pages: newPages,
      },
    });
    setActiveTab(`${newPages.length - 1}`);
  };

  const getPage = (page: { name: string; icon: string; color: string; contents: JSONContent }, index: number) => {
    return (
      <ScrollArea h={props.panelHeight} scrollbars='y'>
        <RichTextInput
          placeholder='Your notes...'
          value={page.contents}
          onChange={(text, json) => {
            setDebouncedJson({ index: index, json: json });
          }}
          minHeight={props.panelHeight}
        />
        {isPhone && (
          <Menu shadow='md' width={160}>
            <Menu.Target>
              <Button
                variant='light'
                aria-label={`Page Settings`}
                size='xs'
                radius='xl'
                color={isPhone ? page.color || 'gray.5' : 'gray.5'}
                style={{
                  position: 'absolute',
                  bottom: 10,
                  left: 10,
                  //
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                }}
                w={130}
                leftSection={
                  <ActionIcon variant='transparent' size='xs' color={page.color}>
                    <Icon name={page.icon} size='1rem' />
                  </ActionIcon>
                }
              >
                {page.name}
              </Button>
            </Menu.Target>

            <Menu.Dropdown>
              {pages.map((page, index) => (
                <Menu.Item
                  key={index}
                  value={`${index}`}
                  leftSection={
                    <ActionIcon variant='transparent' aria-label={`${page.name}`} color={page.color} size='xs'>
                      <Icon name={page.icon} size='1rem' />
                    </ActionIcon>
                  }
                  rightSection={
                    activeTab === `${index}` ? (
                      <ActionIcon variant='transparent' color={page.color} size='xs'>
                        <IconCheck size='1rem' />
                      </ActionIcon>
                    ) : undefined
                  }
                  color={page.color}
                  onClick={() => {
                    setActiveTab(`${index}`);
                  }}
                >
                  {truncate(page.name, { length: 16 })}
                </Menu.Item>
              ))}

              <Menu.Divider />

              <Menu.Item
                value='add_page'
                mt='auto'
                leftSection={
                  <ActionIcon variant='transparent' size='xs' color='gray.5'>
                    <IconPlus size='1rem' />
                  </ActionIcon>
                }
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  addPage();
                }}
              >
                Add Page
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        )}
        <ActionIcon
          variant={isPhone ? 'light' : 'subtle'}
          aria-label={`Page Settings`}
          size='md'
          radius='xl'
          color={isPhone ? page.color || 'gray.5' : 'gray.5'}
          style={{
            position: 'absolute',
            top: isPhone ? undefined : 10,
            bottom: isPhone ? 10 : undefined,
            left: isPhone ? 150 : undefined,
            right: isPhone ? undefined : 10,
            //
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
          onClick={() => {
            openContextModal({
              modal: 'updateNotePage',
              title: <Title order={3}>Update Page</Title>,
              innerProps: {
                page: page,
                onUpdate: (name: string, icon: string, color: string) => {
                  if (!props.campaign) return;
                  const newPages = cloneDeep(pages);
                  newPages[index] = {
                    ...newPages[index],
                    name: name,
                    icon: icon,
                    color: color,
                  };
                  props.setCampaign({
                    ...props.campaign,
                    notes: {
                      ...props.campaign.notes,
                      pages: newPages,
                    },
                  });
                },
                onDelete: () => {
                  if (!props.campaign) return;
                  const newPages = cloneDeep(pages);
                  newPages.splice(index, 1);
                  props.setCampaign({
                    ...props.campaign,
                    notes: {
                      ...props.campaign.notes,
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
    );
  };

  if (isPhone) {
    if (displayNotes) {
      return <Box>{getPage(pages[parseInt(activeTab ?? '')], parseInt(activeTab ?? ''))}</Box>;
    } else {
      return <></>;
    }
  } else {
    return (
      <Tabs
        orientation='vertical'
        value={activeTab}
        onChange={setActiveTab}
        styles={{
          list: {
            '--tab-border-color': 'transparent',
          },
        }}
      >
        <Tabs.List w={190} h={props.panelHeight}>
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
              <Box maw={125}>
                <EllipsisText fz='sm' openDelay={1000}>
                  {page.name}
                </EllipsisText>
              </Box>
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
              e.stopPropagation();
              e.preventDefault();
              addPage();
            }}
          >
            Add Page
          </Tabs.Tab>
        </Tabs.List>

        {pages.map((page, index) => (
          <Tabs.Panel key={index} value={`${index}`} style={{ position: 'relative' }}>
            {getPage(page, index)}
          </Tabs.Panel>
        ))}
      </Tabs>
    );
  }
}
