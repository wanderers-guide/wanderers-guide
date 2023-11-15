import { Text, TextProps } from '@mantine/core';
import { ActionCost } from '@typing/content';

interface ActionStructureProps extends TextProps {
  symbol: number;
}

function ActionStructure(props: ActionStructureProps) {
  const size = props.size || 25;

  const defaultMx = props.symbol === 2 ? 12 : (props.symbol === 3 ? 17 : 8);
  const mx = props.mx || defaultMx;
  return (
    <Text pos='relative' mx={mx}>
      <Text
        {...props}
        fz={size}
        ff='ActionIcons, sans-serif'
        c='gray.5'
        style={{
          position: 'absolute',
          top: -1,
          left: 0,
          transform: 'translate(-50%, -50%)',
        }}
      >
        {props.symbol}
      </Text>
    </Text>
  );
}

interface ActionSymbolProps extends TextProps {
  cost: ActionCost;
}

export function ActionSymbol(props: ActionSymbolProps) {
  const { cost, ...rest } = props;
  switch (cost) {
    case 'ONE-ACTION':
      return <ActionStructure symbol={1} {...rest} />;
    case 'TWO-ACTIONS':
      return <ActionStructure symbol={2} {...rest} />;
    case 'THREE-ACTIONS':
      return <ActionStructure symbol={3} {...rest} />;
    case 'FREE-ACTION':
      return <ActionStructure symbol={4} {...rest} />;
    case 'REACTION':
      return <ActionStructure symbol={5} {...rest} />;
    case 'ONE-TO-TWO-ACTIONS':
      return (
        <Text {...rest}>
          <ActionStructure symbol={1} {...rest} /> to <ActionStructure symbol={2} {...rest} />
        </Text>
      );
    case 'ONE-TO-THREE-ACTIONS':
      return (
        <Text {...rest}>
          <ActionStructure symbol={1} {...rest} /> to <ActionStructure symbol={3} {...rest} />
        </Text>
      );
    case 'TWO-TO-THREE-ACTIONS':
      return (
        <Text {...rest}>
          <ActionStructure symbol={2} {...rest} /> to <ActionStructure symbol={3} {...rest} />
        </Text>
      );
    case 'TWO-TO-TWO-ROUNDS':
      return (
        <Text {...rest}>
          <ActionStructure symbol={2} {...rest} /> to 2 rounds
        </Text>
      );
    case 'THREE-TO-TWO-ROUNDS':
      return (
        <Text {...rest}>
          <ActionStructure symbol={3} {...rest} /> to 2 rounds
        </Text>
      );
    case 'TWO-TO-THREE-ROUNDS':
      return (
        <Text {...rest}>
          <ActionStructure symbol={2} {...rest} /> to 3 rounds
        </Text>
      );
    case 'THREE-TO-THREE-ROUNDS':
      return (
        <Text {...rest}>
          <ActionStructure symbol={3} {...rest} /> to 3 rounds
        </Text>
      );
    default:
      return null;
  }
}
