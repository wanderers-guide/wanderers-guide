import { ScrollArea, Center, Pagination, Text, Box, Stack, Group, MantineSpacing, MantineSize } from '@mantine/core';
import { chunk } from 'lodash-es';
import { useState, useEffect, useRef } from 'react';

export default function Paginator(props: {
  h?: number;
  records: React.ReactNode[];
  numPerPage?: number;
  numInRow?: number;
  gap?: MantineSpacing;
  pagSize?: MantineSize;
}) {
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

  const recordsOnPage = props.records.slice((activePage - 1) * NUM_PER_PAGE, activePage * NUM_PER_PAGE);

  // Calculate remainder to fill the last row
  const r = (props.numInRow ?? 1) - (props.records.length % (props.numInRow ?? 1));
  const remainder = r === (props.numInRow ?? 1) ? 0 : r;

  const recordsOnPageWithPadding = [...recordsOnPage];
  for (let i = 0; i < remainder; i++) {
    recordsOnPageWithPadding.push(<Box key={`padding-${i}`} w='100%' style={{ visibility: 'hidden' }} />);
  }

  // Chunk into rows
  const rows = chunk(recordsOnPageWithPadding, props.numInRow ?? 1);

  return (
    <>
      <ScrollArea viewportRef={viewport} h={props.h ?? 372} scrollbars='y' style={{ position: 'relative' }}>
        <Stack gap={props.gap ?? 0}>
          {rows.map((row, rowIndex) => (
            <Group key={rowIndex} justify='stretch' wrap='nowrap'>
              {row.map((option, i) => (
                <Box key={i} w='100%'>
                  {option}
                </Box>
              ))}
            </Group>
          ))}
        </Stack>
      </ScrollArea>
      <Center>
        <Pagination
          pt='xs'
          size={props.pagSize ?? 'sm'}
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
