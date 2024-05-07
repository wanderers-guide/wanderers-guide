import { Stack } from '@mantine/core';
import { setPageTitle } from '@utils/document-change';
import EditContent from './EditContent';
import GenerateEmbeddings from './GenerateEmbeddings';
import ImportLegacyContent from './ImportLegacyContent';
import UploadContent from './UploadContent';
import BackgroundFixer from './BackgroundFixer';
import TraitMerger from './TraitMerger';
import ContentUpdateRetrigger from './ContentUpdateRetrigger';

export function Component() {
  setPageTitle(`Admin Panel`);

  return (
    <Stack>
      <GenerateEmbeddings />
      <UploadContent />
      <EditContent />
      <ImportLegacyContent />
      <BackgroundFixer />
      <ContentUpdateRetrigger />
      <TraitMerger />
    </Stack>
  );
}
