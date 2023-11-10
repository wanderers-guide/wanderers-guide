import { Stack } from '@mantine/core';
import { setPageTitle } from '@utils/document-change';
import UploadContent from './UploadContent';
import EditContent from './EditContent';
import { useEffect } from 'react';
import { defineEnabledContentSources, getContentStore } from '@content/content-controller';
import { ContentSource } from '@typing/content';

export default function AdminPage() {
  setPageTitle(`Admin Panel`);

  useEffect(() => {
    (async () => {
      // Enable all sources
      const sources = await getContentStore<ContentSource>('content-source');
      defineEnabledContentSources([...sources.values()].map((source) => source.id));
    })();
  }, []);

  return (
    <Stack>
      <UploadContent />
      <EditContent />
    </Stack>
  );
}
