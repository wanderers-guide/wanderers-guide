import { cleanContent, fetchCleaningInput } from '@ai/cleaning/cleaning-manager';
import { CleaningLogPanel } from '@ai/cleaning/CleaningLogPanel';
import BlurBox from '@common/BlurBox';
import { Box, Center } from '@mantine/core';
import { setPageTitle } from '@utils/document-change';
import { useEffect, useRef, useState } from 'react';
import { useLoaderData } from 'react-router-dom';

export function Component() {
  const { recordId } = useLoaderData() as { recordId: string };

  const [inputData, setInputData] = useState<ReturnType<typeof fetchCleaningInput>>(null);
  const firstLoad = useRef(true);

  const contentName = (inputData?.content as any)?.name as string | undefined;
  setPageTitle(`Cleaning${contentName ? `: ${contentName}` : ''}`);

  useEffect(() => {
    if (!firstLoad.current) return;
    firstLoad.current = false;

    const data = fetchCleaningInput(recordId);
    if (!data) return;
    setInputData(data);
    cleanContent(recordId, data.type, data.content);
  }, []);

  return (
    <Center py='xl'>
      <Box w='100%' maw={760} px='md'>
        <BlurBox w='100%' p='md'>
          <CleaningLogPanel cleaningRecordId={recordId} inputData={inputData} />
        </BlurBox>
      </Box>
    </Center>
  );
}
