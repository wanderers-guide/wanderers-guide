import { Text, Stack, Button, Group, Loader, Avatar, Modal, Title, Box, useMantineTheme, Anchor } from '@mantine/core';
import { AbilityBlockType, ContentSource, ContentType } from '@typing/content';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { IconBook2, IconHash } from '@tabler/icons-react';
import { convertToContentType, getIconFromContentType } from '@content/content-utils';
import {
  defineDefaultSources,
  fetchAbilityBlockByName,
  fetchContentById,
  fetchCreatureByName,
  fetchItemByName,
  fetchSpellByName,
  fetchTraitByName,
} from '@content/content-store';
import { CreateAbilityBlockModal } from './CreateAbilityBlockModal';
import { hideNotification, showNotification } from '@mantine/notifications';
import { CreateAncestryModal } from './CreateAncestryModal';
import { CreateBackgroundModal } from './CreateBackgroundModal';
import { CreateClassModal } from './CreateClassModal';
import { CreateItemModal } from './CreateItemModal';
import { CreateLanguageModal } from './CreateLanguageModal';
import { CreateSpellModal } from './CreateSpellModal';
import { CreateTraitModal } from './CreateTraitModal';
import { submitContentUpdate } from '@content/content-update';
import { displayError } from '@utils/notifications';
import { CreateCreatureModal } from './CreateCreatureModal';
import { CreateArchetypeModal } from './CreateArchetypeModal';
import { CreateVersatileHeritageModal } from './CreateVersatileHeritageModal';
import { CreateContentSourceOnlyModal } from './CreateContentSourceModal';
import { cloneDeep } from 'lodash-es';

export default function ContentFeedbackModal(props: {
  opened: boolean;
  onCancel: () => void;
  onStartFeedback: () => void;
  onCompleteFeedback: () => void;
  type: ContentType | AbilityBlockType;
  data: { id?: number; contentSourceId?: number };
}) {
  const [submitUpdate, setSubmitUpdate] = useState<{ id: number | undefined; content: any } | null>(null);

  useEffect(() => {
    if (props.data.id === -1 && submitUpdate === null) {
      props.onStartFeedback();
      setSubmitUpdate({ id: undefined, content: props.type });

      // Add the content source to make sure we can reference it's content
      defineDefaultSources('INFO', props.data.contentSourceId ? [props.data.contentSourceId] : 'ALL-USER-ACCESSIBLE');
    }
  }, []);

  const handleReset = () => {
    setSubmitUpdate(null);
    props.onCancel();
  };

  const handleComplete = async (refId: number, contentSourceId: number, data: Record<string, any>) => {
    setSubmitUpdate(null);
    props.onCompleteFeedback();

    showNotification({
      id: 'submit-content-update',
      title: `Submitting Content Update...`,
      message: `This may take a couple seconds, please wait.`,
      autoClose: false,
      loading: true,
    });

    const result = await submitContentUpdate(
      convertToContentType(props.type),
      props.data.id === -1 ? 'CREATE' : 'UPDATE',
      data,
      contentSourceId === -1 ? (props.data.contentSourceId ?? -1) : contentSourceId,
      refId === -1 ? undefined : refId
    );

    hideNotification('submit-content-update');
    if (!result) {
      displayError('Sorry, something went wrong, please try again later :(');
      return;
    } else {
      showNotification({
        id: 'submit-content-update',
        title: (
          <Anchor
            href='/content-update-overview'
            target='_blank'
            variant='gradient'
            gradient={{ from: 'green', to: 'guide' }}
          >
            Content Update Submitted 🎉
          </Anchor>
        ),
        message: (
          <Text fz='sm'>
            Thanks for helping improve the site, please check our{' '}
            <Anchor
              fz='sm'
              href={`https://discord.com/channels/735260060682289254/1220411970654830743/${result.discord_msg_id}`}
              target='_blank'
            >
              Discord
            </Anchor>{' '}
            for updates on your submission :)
          </Text>
        ),
        color: 'green',
        autoClose: 8000,
      });
    }
  };

  return (
    <>
      <Modal
        opened={props.opened && !submitUpdate && !!props.data.id && props.data.id !== -1}
        onClose={() => {
          props.onCancel();
        }}
        title={<Title order={3}>Content Details</Title>}
        size={'sm'}
        zIndex={1000}
      >
        <Box style={{ position: 'relative', minHeight: 150 }}>
          <ContentFeedbackSection
            type={convertToContentType(props.type)}
            data={props.data}
            onSubmitUpdate={(id, content) => {
              props.onStartFeedback();
              setSubmitUpdate({ id, content });
            }}
          />
        </Box>
      </Modal>
      {submitUpdate && (
        <Box>
          {convertToContentType(props.type) === 'ability-block' && (
            <CreateAbilityBlockModal
              opened={true}
              type={props.type as AbilityBlockType}
              editId={submitUpdate.id}
              onComplete={async (abilityBlock) => {
                await handleComplete(abilityBlock.id, abilityBlock.content_source_id, abilityBlock);
              }}
              onCancel={() => handleReset()}
              onNameBlur={async (name) => {
                if (!props.data.contentSourceId || props.data.contentSourceId === -1) return;
                const ab = await fetchAbilityBlockByName(name, [props.data.contentSourceId]);
                if (ab) {
                  showNotification({
                    id: 'record-exists',
                    title: 'Already Exists',
                    message: `A record with the name "${name}" already exists.`,
                    color: 'red',
                  });
                }
              }}
            />
          )}

          {props.type === 'spell' && (
            <CreateSpellModal
              opened={true}
              editId={submitUpdate.id}
              onComplete={async (spell) => {
                await handleComplete(spell.id, spell.content_source_id, spell);
              }}
              onCancel={() => handleReset()}
              onNameBlur={async (name) => {
                if (!props.data.contentSourceId || props.data.contentSourceId === -1) return;
                const spell = await fetchSpellByName(name, [props.data.contentSourceId]);
                if (spell) {
                  showNotification({
                    id: 'record-exists',
                    title: 'Already Exists',
                    message: `A spell with the name "${name}" already exists.`,
                    color: 'red',
                  });
                }
              }}
            />
          )}

          {props.type === 'class' && (
            <CreateClassModal
              opened={true}
              editId={submitUpdate.id}
              onComplete={async (class_) => {
                await handleComplete(class_.id, class_.content_source_id, class_);
              }}
              onCancel={() => handleReset()}
            />
          )}

          {props.type === 'archetype' && (
            <CreateArchetypeModal
              opened={true}
              editId={submitUpdate.id}
              onComplete={async (archetype) => {
                await handleComplete(archetype.id, archetype.content_source_id, archetype);
              }}
              onCancel={() => handleReset()}
            />
          )}

          {props.type === 'versatile-heritage' && (
            <CreateVersatileHeritageModal
              opened={true}
              editId={submitUpdate.id}
              onComplete={async (versHeritage) => {
                await handleComplete(versHeritage.id, versHeritage.content_source_id, versHeritage);
              }}
              onCancel={() => handleReset()}
            />
          )}

          {props.type === 'ancestry' && (
            <CreateAncestryModal
              opened={true}
              editId={submitUpdate.id}
              onComplete={async (ancestry) => {
                await handleComplete(ancestry.id, ancestry.content_source_id, ancestry);
              }}
              onCancel={() => handleReset()}
            />
          )}

          {props.type === 'background' && (
            <CreateBackgroundModal
              opened={true}
              editId={submitUpdate.id}
              onComplete={async (background) => {
                await handleComplete(background.id, background.content_source_id, background);
              }}
              onCancel={() => handleReset()}
            />
          )}

          {props.type === 'trait' && (
            <CreateTraitModal
              opened={true}
              editId={submitUpdate.id}
              onComplete={async (trait) => {
                await handleComplete(trait.id, trait.content_source_id, trait);
              }}
              onCancel={() => handleReset()}
              onNameBlur={async (name) => {
                if (!props.data.contentSourceId || props.data.contentSourceId === -1) return;
                const trait = await fetchTraitByName(name, [props.data.contentSourceId]);
                if (trait) {
                  showNotification({
                    id: 'record-exists',
                    title: 'Already Exists',
                    message: `A trait with the name "${name}" already exists.`,
                    color: 'red',
                  });
                }
              }}
            />
          )}

          {props.type === 'language' && (
            <CreateLanguageModal
              opened={true}
              editId={submitUpdate.id}
              onComplete={async (language) => {
                await handleComplete(language.id, language.content_source_id, language);
              }}
              onCancel={() => handleReset()}
            />
          )}

          {props.type === 'item' && (
            <CreateItemModal
              opened={true}
              editId={submitUpdate.id}
              onComplete={async (item) => {
                await handleComplete(item.id, item.content_source_id, item);
              }}
              onCancel={() => handleReset()}
              onNameBlur={async (name) => {
                if (!props.data.contentSourceId || props.data.contentSourceId === -1) return;
                const item = await fetchItemByName(name, [props.data.contentSourceId]);
                if (item) {
                  showNotification({
                    id: 'record-exists',
                    title: 'Already Exists',
                    message: `An item with the name "${name}" already exists.`,
                    color: 'red',
                  });
                }
              }}
            />
          )}

          {props.type === 'creature' && (
            <CreateCreatureModal
              opened={true}
              editId={submitUpdate.id}
              onComplete={async (creature) => {
                console.log('WDdwwd', submitUpdate.id, creature.content_source_id);

                await handleComplete(creature.id, creature.content_source_id, creature);
              }}
              onCancel={() => handleReset()}
              onNameBlur={async (name) => {
                if (!props.data.contentSourceId || props.data.contentSourceId === -1) return;
                const creature = await fetchCreatureByName(name, [props.data.contentSourceId]);
                if (creature) {
                  showNotification({
                    id: 'record-exists',
                    title: 'Already Exists',
                    message: `A creature with the name "${name}" already exists.`,
                    color: 'red',
                  });
                }
              }}
            />
          )}

          {props.type === 'content-source' && submitUpdate.id && (
            <CreateContentSourceOnlyModal
              opened={true}
              editId={submitUpdate.id}
              onComplete={async (source) => {
                await handleComplete(source.id, submitUpdate.id!, source);
              }}
              onCancel={() => handleReset()}
            />
          )}
        </Box>
      )}
    </>
  );
}

function ContentFeedbackSection(props: {
  type: ContentType;
  data: { id?: number };
  onSubmitUpdate: (id: number, content: any) => void;
}) {
  const theme = useMantineTheme();
  const contentId = props.data.id;

  const { data, isFetching } = useQuery({
    queryKey: [`find-content-${props.type}-${contentId}`],
    queryFn: async () => {
      const content = await fetchContentById(props.type, contentId!);
      const source = content
        ? await fetchContentById<ContentSource>('content-source', content.content_source_id ?? contentId)
        : null;
      return {
        content,
        source,
      };
    },
    enabled: !!contentId,
  });

  if (!data || isFetching)
    return (
      <Loader
        type='bars'
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />
    );

  if (!data.content || !data.source) return <Text>Content not found</Text>;

  return (
    <Stack style={{ position: 'relative' }}>
      <div>
        <Group wrap='nowrap'>
          <Avatar size={94} radius='md' src={data.content?.meta_data?.image_url}>
            {getIconFromContentType(props.type, '4.5rem')}
          </Avatar>
          <div>
            <Text fz='xs' tt='uppercase' fw={700} c='dimmed'>
              {data.content.type || props.type}
            </Text>

            <Text fz='lg' fw={500}>
              {data.content.name}
            </Text>

            <Group wrap='nowrap' gap={10} mt={3}>
              <IconBook2 stroke={1.5} size='1rem' />
              <Text fz='xs' c='dimmed'>
                {data.source.name}
              </Text>
            </Group>

            <Group wrap='nowrap' gap={10} mt={5}>
              <IconHash stroke={1.5} size='1rem' />
              <Text fz='xs' c='dimmed'>
                {data.content.id}
              </Text>
            </Group>
          </div>
        </Group>
      </div>
      {data.source.user_id ? (
        <Group
          justify='center'
          p='xs'
          style={{ border: `1px solid ${theme.colors.gray[6]}`, borderRadius: theme.radius.md }}
        >
          <Text fz='sm'>
            <b>Contact Info:</b> {data.source.contact_info || 'Not Provided'}
          </Text>
        </Group>
      ) : (
        <Group justify='center'>
          <Button
            fullWidth
            variant='light'
            onClick={() => {
              if (!data.content) return;
              props.onSubmitUpdate(data.content.id, cloneDeep(data.content));
            }}
          >
            Submit Content Update
          </Button>
        </Group>
      )}
    </Stack>
  );
}
