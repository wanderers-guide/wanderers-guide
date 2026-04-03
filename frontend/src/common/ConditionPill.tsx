import { Button, Indicator, Pill, Text } from '@mantine/core';
import BlurButton from './BlurButton';
import { glassStyle } from '@utils/colors';
import ImprintButton from './ImprintButton';

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
      <ImprintButton radius='xl' size='compact-xs' c='gray.0' fw={400} noBorder onClick={props.onClick}>
        {props.text}
      </ImprintButton>
      {props.amount !== undefined && (
        <ImprintButton
          radius='xl'
          size='compact-xs'
          multiplier={2}
          noBorder
          style={{
            position: 'relative',
          }}
          w={30}
          onClick={props.onClick}
        >
          <Text c='gray.0' fz='xs'>
            {props.amount}
          </Text>
        </ImprintButton>
      )}
    </Button.Group>
  );
}
