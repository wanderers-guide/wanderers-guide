import { Button, Stack } from '@mantine/core';
import { setPageTitle } from '@utils/document-change';
import UploadContent from './UploadContent';
import EditContent from './EditContent';
import { useEffect } from 'react';
import GenerateEmbeddings from './GenerateEmbeddings';
import ImportLegacyContent from './ImportLegacyContent';

export default function AdminPage() {
  setPageTitle(`Admin Panel`);

  return (
    <Stack>
      <GenerateEmbeddings />
      <UploadContent />
      <EditContent />
      <ImportLegacyContent />
    </Stack>
  );
}
