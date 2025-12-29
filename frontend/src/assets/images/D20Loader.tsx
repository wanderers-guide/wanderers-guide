import { Text, Group, Stack } from '@mantine/core';
import { motion } from 'framer-motion';

const D20_FACES = [
  // Center
  'm256,213.8l-88.3,0l88.3,154.5l88.3,-154.5l-88.3,0z',
  // Right bottom center
  'm373,220l-95.5,167.1l183,-19.4c5.1,-0.6 7.9,-6.3 5.2,-10.7l-92.7,-137z',
  // Top center
  'm256,185.7l96,0l-84,-148c-2.8,-4.5 -7.4,-6.7 -12,-6.7c-4.6,0 -9.2,2.2 -12,6.7l-84,148l96,0z',
  // Left bottom center
  'm138.9,220l-92.8,137c-2.7,4.4 0.1,10.1 5.2,10.7l183,19.4l-95.4,-167.1z',
  // Right side
  'm461.6,160.3l-67.4,40.4l66.2,107.5c1.9,3 6.5,1.7 6.5,-1.8l0,-143.1c0,-2.7 -2.9,-4.4 -5.3,-3z',
  // Left side
  'm51.6,308.2l66.2,-107.5l-67.4,-40.4c-2.3,-1.4 -5.3,0.3 -5.3,3l0,143.1c0,3.5 4.6,4.9 6.5,1.8z',
  // Top right
  'm379.5,176.7l71.7,-42.8c2.2,-1.3 2.3,-4.5 0.1,-6l-132.6,-86.6c-6.3,-3.6 -13.3,3.6 -9.5,9.8l70.3,125.6z',
  // Bottom left
  'm61.1,403.3l170.9,77c4.7,2.2 10,-1.3 10,-6.4l0,-57.7l-179,-19.6c-3.9,-0.4 -5.4,5 -1.9,6.7z',
  // Top left
  'm132.5,176.7l70.3,-125.6c3.8,-6.2 -3.2,-13.4 -9.5,-9.8l-132.6,86.7c-2.2,1.4 -2.1,4.6 0.1,6l71.7,42.7z',
  // Bottom right
  'm448.9,396.6l-178.9,19.6l0,57.8c0,5.1 5.3,8.5 10,6.4l170.9,-77c3.4,-1.8 1.9,-7.2 -2,-6.8z',
];

export default function D20Loader(props: { size: number; color: string; percentage: number; status: string }) {
  const percent = Math.min(Math.max(props.percentage, 0), 100);
  const safePercent = percent > 95 ? 100 : percent;
  const activeFaces = Math.floor((safePercent / 100) * D20_FACES.length);
  const isOverLoaded = props.percentage > percent;

  return (
    <Stack gap={20}>
      <Group align='flex-end' justify='center' w={props.size} h={props.size}>
        <svg width={props.size} height={props.size} viewBox='0 0 512 512'>
          {D20_FACES.map((d, i) => (
            <motion.path
              key={i}
              d={d}
              fill={props.color}
              initial={{ opacity: 0 }}
              animate={{
                opacity: i < activeFaces ? 1 : 0.15,
                // scale only pulses on progress advance
                scale: i === activeFaces - 1 && !isOverLoaded ? 1.1 : 1,
                // fill can change freely
                fill: i < activeFaces ? props.color : 'rgba(255,255,255,0.15)',
              }}
              transition={{
                opacity: { duration: 0.6, ease: 'easeOut' },
                scale: { duration: 0.3, ease: 'easeOut' },
                fill: { duration: 0.3, ease: 'easeOut' },
              }}
            />
          ))}
        </svg>
      </Group>

      <Text
        fz='sm'
        ta='center'
        fs='italic'
        c='gray.0'
        style={{
          backdropFilter: 'blur(6px)',
          borderRadius: '25px',
          borderBottom: '1px solid #fff',
        }}
      >
        {props.status}
      </Text>
    </Stack>
  );
}
