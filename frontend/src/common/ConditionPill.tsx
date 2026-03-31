import { Button, Indicator, Pill, Text } from '@mantine/core';
import BlurButton from './BlurButton';
import { glassStyle } from '@utils/colors';

export default function ConditionPill(props: { text: string; amount?: number; onClick: () => void }) {
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
      <BlurButton size='compact-xs' bgColorHover='#ffffff09' c='gray.0' fw={400} onClick={props.onClick}>
        {props.text}
      </BlurButton>
      {props.amount !== undefined && (
        <Button
          radius='xl'
          variant='light'
          color='dark.8'
          size='compact-xs'
          style={{
            ...glassStyle(),
            position: 'relative',
          }}
          w={30}
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
