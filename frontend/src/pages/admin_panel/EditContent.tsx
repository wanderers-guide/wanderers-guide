import BlurBox from '@common/BlurBox';
import { selectContent } from '@common/select/SelectContent';
import { Center, Group, Title, Select } from '@mantine/core';
import { CreateAbilityBlockModal } from '@modals/CreateAbilityBlockModal';
import { AbilityBlockType, ContentType } from '@typing/content';
import { isAbilityBlockType } from '@variables/variable-utils';
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
                const type = isAbilityBlockType(value) ? 'ability-block' : (value as ContentType);
                const abilityBlockType = isAbilityBlockType(value) ? value : undefined;
                selectContent(
                  type,
                  (option) => {
                    setId(option.id);
                  },
                  {
                    abilityBlockType,
                    groupBySource: false,
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
        <CreateAbilityBlockModal
          opened={contentType === 'feat'}
          type='feat'
          editId={id}
          onComplete={(feat) => {
            console.log(feat);

            handleReset();
          }}
          onCancel={() => handleReset()}
        />
      )}
    </>
  );
}
