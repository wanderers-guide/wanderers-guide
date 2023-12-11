import { Box, Text, Group, Stack } from '@mantine/core';
import { motion } from 'framer-motion';

export default function D20Loader(props: { size: number; color: string; percentage: number }) {
  const percent = Math.min(Math.max(props.percentage, 0), 100);
  return (
    <Stack gap={10}>
      <Group align='flex-end' justify='center' w={props.size} h={props.size}>
        <motion.svg
          width={props.size}
          height={props.size * (percent / 100)}
          xmlns='http://www.w3.org/2000/svg'
          viewBox={`0 0 512 ${512 * (percent / 100)}`}
          transform={`rotate(180)`}
        >
          <g className='layer'>
            <title>D20 Loader</title>
            <g id='svg_1'>
              <path
                transform='rotate(180 256 256)'
                d='m138.9,220l-92.8,137c-2.7,4.4 0.1,10.1 5.2,10.7l183,19.4l-95.4,-167.1l0,0zm-87.3,88.2l66.2,-107.5l-67.4,-40.4c-2.3,-1.4 -5.3,0.3 -5.3,3l0,143.1c0,3.5 4.6,4.9 6.5,1.8zm9.5,95.1l170.9,77c4.7,2.2 10,-1.3 10,-6.4l0,-57.7l-179,-19.6c-3.9,-0.4 -5.4,5 -1.9,6.7l0,0zm71.4,-226.6l70.3,-125.6c3.8,-6.2 -3.2,-13.4 -9.5,-9.8l-132.6,86.7c-2.2,1.4 -2.1,4.6 0.1,6l71.7,42.7l0,0zm123.5,9l96,0l-84,-148c-2.8,-4.5 -7.4,-6.7 -12,-6.7c-4.6,0 -9.2,2.2 -12,6.7l-84,148l96,0zm205.6,-25.4l-67.4,40.4l66.2,107.5c1.9,3 6.5,1.7 6.5,-1.8l0,-143.1c0,-2.7 -2.9,-4.4 -5.3,-3zm-82.1,16.4l71.7,-42.8c2.2,-1.3 2.3,-4.5 0.1,-6l-132.6,-86.6c-6.3,-3.6 -13.3,3.6 -9.5,9.8l70.3,125.6zm69.5,219.9l-178.9,19.6l0,57.8c0,5.1 5.3,8.5 10,6.4l170.9,-77c3.4,-1.8 1.9,-7.2 -2,-6.8l0,0zm-75.9,-176.6l-95.5,167.1l183,-19.4c5.1,-0.6 7.9,-6.3 5.2,-10.7l-92.7,-137l0,0zm-117.1,-6.2l-88.3,0l88.3,154.5l88.3,-154.5l-88.3,0z'
                fill={props.color}
                id='svg_2'
              />
            </g>
          </g>
        </motion.svg>
      </Group>
      <Text fz='sm' ta='center' fs='italic' c='gray.2'>
        Loading...
      </Text>
    </Stack>
  );
}
