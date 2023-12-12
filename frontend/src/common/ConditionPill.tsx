import { Button, Indicator, Pill, Text } from '@mantine/core';
import BlurButton from './BlurButton';

export default function ConditionPill(props: { text: string; amount?: number }) {
  return (
    // <Indicator
    //   disabled={!props.amount}
    //   inline
    //   size={20}
    //   offset={6}
    //   position='top-end'
    //   label={`${props.amount}`}
    //   withBorder
    // >
    //   <Pill>{props.text}</Pill>
    // </Indicator>
    <Button.Group>
      <BlurButton size='compact-xs' fw={400}>
        {props.text}
      </BlurButton>
      <Button
        radius='xl'
        variant='light'
        color='dark.5'
        size='compact-xs'
        w={30}
        style={{ position: 'relative' }}
      >
        <Text c='gray.0' fz='xs'>
          {props.amount}
        </Text>
      </Button>
    </Button.Group>
  );
}
