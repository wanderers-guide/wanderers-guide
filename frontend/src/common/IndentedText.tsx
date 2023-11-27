import { TEXT_INDENT_AMOUNT } from '@constants/data';
import { Text, TextProps } from '@mantine/core';

interface IndentedTextProps extends TextProps {
  disabled?: boolean;
  children: any;
}

export default function IndentedText(props: IndentedTextProps) {
  return (
    <Text
      {...props}
      style={
        props.disabled
          ? {}
          : {
              marginLeft: TEXT_INDENT_AMOUNT,
              textIndent: -1 * TEXT_INDENT_AMOUNT,
            }
      }
    >
      {props.children}
    </Text>
  );
}
