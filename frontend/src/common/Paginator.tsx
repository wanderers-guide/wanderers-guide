import { ScrollArea, Center, Pagination, Text, Box, Stack } from '@mantine/core';
import { pluralize } from '@utils/strings';
import { useState, useEffect, useRef } from 'react';

export default function Paginator(props: { h?: number; records: React.ReactNode[]; numPerPage?: number }) {
  const NUM_PER_PAGE = props.numPerPage ?? 20;
  const [activePage, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
    scrollToTop();
  }, [props.records.length]);

  const viewport = useRef<HTMLDivElement>(null);
  const scrollToTop = () => viewport.current?.scrollTo({ top: 0 });

  if (props.records.length === 0) {
    return (
      <Box pt='lg'>
        <Text fz='md' c='dimmed' ta='center' fs='italic'>
          No records found!
        </Text>
      </Box>
    );
  }

  return (
    <>
      <ScrollArea viewportRef={viewport} h={props.h ?? 372} scrollbars='y' style={{ position: 'relative' }}>
        <Stack gap={0}>
          {props.records.slice((activePage - 1) * NUM_PER_PAGE, activePage * NUM_PER_PAGE).map((option, i) => (
            <Box key={i}>{option}</Box>
          ))}
        </Stack>
      </ScrollArea>
      <Center>
        <Pagination
          size='sm'
          total={Math.ceil(props.records.length / NUM_PER_PAGE)}
          value={activePage}
          onChange={(value) => {
            setPage(value);
            scrollToTop();
          }}
        />
      </Center>
    </>
  );
}
