import { Stack } from "@mantine/core";
import { setPageTitle } from "@utils/document-change";
import EditContent from "./EditContent";
import GenerateEmbeddings from "./GenerateEmbeddings";
import ImportLegacyContent from "./ImportLegacyContent";
import UploadContent from "./UploadContent";

export function Component() {
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
