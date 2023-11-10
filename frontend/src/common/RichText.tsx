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
        p(props) {
          const { children, className } = props;
          return <Text className={className}>{children}</Text>;
        },
      }}
    />
  );
}
