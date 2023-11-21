import { Button, Stack } from '@mantine/core';
import { setPageTitle } from '@utils/document-change';
import UploadContent from './UploadContent';
import EditContent from './EditContent';
import { useEffect } from 'react';
import { defineEnabledContentSources, getAllContentSources } from '@content/content-controller';
import GenerateEmbeddings from './GenerateEmbeddings';
import ImportLegacyContent from './ImportLegacyContent';

export default function AdminPage() {
  setPageTitle(`Admin Panel`);

  useEffect(() => {
    (async () => {
      // Enable all sources
      defineEnabledContentSources(await getAllContentSources());
    })();
  }, []);

  return (
    <Stack>
      <GenerateEmbeddings />
      <UploadContent />
      <EditContent />
      <ImportLegacyContent />
    </Stack>
  );
}
