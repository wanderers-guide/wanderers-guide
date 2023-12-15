import { Button, Indicator, Pill, Text } from '@mantine/core';
import BlurButton from './BlurButton';

export default function ConditionPill(props: {
  text: string;
  amount?: number;
  onClick: () => void;
}) {
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
      <BlurButton size='compact-xs' c='gray.0' fw={400} onClick={props.onClick}>
        {props.text}
      </BlurButton>
      {props.amount !== undefined && (
        <Button
          radius='xl'
          variant='light'
          color='dark.2'
          size='compact-xs'
          w={30}
          style={{ position: 'relative' }}
          onClick={props.onClick}
        >
          <Text c='gray.0' fz='xs'>
            {props.amount}
          </Text>
        </Button>
      )}
    </Button.Group>
  );
}
