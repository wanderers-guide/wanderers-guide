import BlurBox from '@common/BlurBox';
import { selectContent } from '@common/select/SelectContent';
import { upsertAbilityBlock, upsertSpell } from '@content/content-creation';
import { convertToContentType, isAbilityBlockType } from '@content/content-utils';
import { Center, Group, Title, Select } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { CreateAbilityBlockModal } from '@modals/CreateAbilityBlockModal';
import { CreateSpellModal } from '@modals/CreateSpellModal';
import { AbilityBlockType, ContentType } from '@typing/content';
import { useState } from 'react';

export default function EditContent() {

  const [id, setId] = useState<number | null>(null);
  const [contentType, openContentType] = useState<ContentType | AbilityBlockType | null>(null);

  const handleReset = () => {
    openContentType(null);
    setId(null);
  }

  return (
    <>
      <BlurBox p='sm'>
        <Center p='sm'>
          <Group>
            <Title order={3}>Edit Content</Title>
            <Select
              placeholder='Select content type'
              data={[
                { value: 'action', label: 'Action' },
                { value: 'feat', label: 'Feat' },
                { value: 'class-feature', label: 'Class Feature' },
                { value: 'spell', label: 'Spell' },
                { value: 'item', label: 'Item' },
                { value: 'creature', label: 'Creature' },
                { value: 'heritage', label: 'Heritage' },
                { value: 'background', label: 'Background' },
              ]}
              value=''
              searchValue=''
              onChange={(value) => {
                if (!value) return handleReset();

                // Select content for id
                const type = convertToContentType(value as ContentType | AbilityBlockType);
                const abilityBlockType = isAbilityBlockType(value) ? value : undefined;
                selectContent(
                  type,
                  (option) => {
                    setId(option.id);
                  },
                  {
                    abilityBlockType,
                    groupBySource: true,
                  }
                );

                // Set selected content type for modal
                openContentType(value as ContentType | AbilityBlockType | null);
              }}
            />
          </Group>
        </Center>
      </BlurBox>
      {id && contentType && (
        <>
          <CreateAbilityBlockModal
            opened={contentType === 'feat'}
            type='feat'
            editId={id}
            onComplete={async (abilityBlock) => {
              const result = await upsertAbilityBlock(abilityBlock);

              if (result) {
                showNotification({
                  title: `Updated ${result.name}`,
                  message: `Successfully updated ${result.type}.`,
                  autoClose: 3000,
                });
              }

              handleReset();
            }}
            onCancel={() => handleReset()}
          />
          <CreateSpellModal
            opened={contentType === 'spell'}
            editId={id}
            onComplete={async (spell) => {
              const result = await upsertSpell(spell);

              if (result) {
                showNotification({
                  title: `Updated ${result.name}`,
                  message: `Successfully updated spell.`,
                  autoClose: 3000,
                });
              }

              handleReset();
            }}
            onCancel={() => handleReset()}
          />
        </>
      )}
    </>
  );
}
