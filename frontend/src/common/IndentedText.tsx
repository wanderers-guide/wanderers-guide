import { TEXT_INDENT_AMOUNT } from '@constants/data';
import { Text, TextProps } from '@mantine/core';

interface IndentedTextProps extends TextProps {
  children: any;
}

export default function IndentedText(props: IndentedTextProps) {
  return (
    <Text
      {...props}
      style={{
        marginLeft: TEXT_INDENT_AMOUNT,
        textIndent: -1 * TEXT_INDENT_AMOUNT,
      }}
    >
      {props.children}
    </Text>
  );
}
