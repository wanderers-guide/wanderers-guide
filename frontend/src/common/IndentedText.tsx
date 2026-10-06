import { TEXT_INDENT_AMOUNT } from '@constants/data';
import { Text, TextProps } from '@mantine/core';

interface IndentedTextProps extends TextProps {
  disabled?: boolean;
  indentMod?: number;
  component?: 'p' | 'div';
  children: any;
}

export default function IndentedText(props: IndentedTextProps) {
  const { children, component = 'p', disabled, indentMod = 1, ...textProps } = props;
  return (
    <Text
      {...textProps}
      component={component}
      style={
        disabled
          ? {}
          : {
              marginTop: 5,
              marginLeft: TEXT_INDENT_AMOUNT * indentMod,
              textIndent: -1 * TEXT_INDENT_AMOUNT * indentMod,
            }
      }
    >
      {children}
    </Text>
  );
}
