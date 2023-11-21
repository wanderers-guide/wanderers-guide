import {
  Center,
  Group,
  Progress,
  Select,
  Text,
  Title,
  rem,
} from '@mantine/core';
import { IconUpload, IconPhoto, IconX } from '@tabler/icons-react';
import { Dropzone, FileWithPath } from '@mantine/dropzone';
import BlurBox from '@common/BlurBox';
import { getUploadStats, resetUploadStats, uploadContentList } from '@upload/content-upload';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { showNotification } from '@mantine/notifications';
import { AbilityBlockType, ContentType } from '@typing/content';
import { importContent } from '@import/legacy/legacy-import-manager';
import { isAbilityBlockType } from '@content/content-utils';

export default function ImportLegacyContent() {

  return (
    <BlurBox p='sm'>
      <Center p='sm'>
        <Group>
          <Title order={3}>Import Legacy Content</Title>
          <Select
            placeholder='Select content type'
            data={
              [
                { value: 'feat', label: 'Feat' },
                { value: 'trait', label: 'Trait' },
                { value: 'language', label: 'Language' },
              ] satisfies { value: ContentType | AbilityBlockType; label: string }[]
            }
            value=''
            searchValue=''
            onChange={(value) => {
              const content = isAbilityBlockType(value) ? 'ability-block' : (value as ContentType);
              const abilityBlockType = isAbilityBlockType(value) ? value : undefined;

              importContent(content, abilityBlockType);
            }}
          />
        </Group>
      </Center>
    </BlurBox>
  );
}
