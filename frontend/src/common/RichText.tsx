import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Text, TextProps } from '@mantine/core';

interface RichTextProps extends TextProps {
  children: any;
}

export default function RichText(props: RichTextProps) {
  return (
    <Markdown
      children={props.children}
      remarkPlugins={[remarkGfm]}
      components={{
        p(innerProps) {
          const { children, className } = innerProps;
          return (
            <Text {...props} className={className}>
              {children}
            </Text>
          );
        },
      }}
    />
  );
}
