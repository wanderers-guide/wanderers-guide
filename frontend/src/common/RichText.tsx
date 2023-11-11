import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Anchor, List, Text, TextProps } from '@mantine/core';
import { getContentDataFromHref } from './rich_text_input/ContentLinkExtension';
import { drawerState } from '@atoms/navAtoms';
import { convertContentLink } from '@drawers/drawer-utils';
import { useRecoilState } from 'recoil';

interface RichTextProps extends TextProps {
  children: any;
}

export default function RichText(props: RichTextProps) {
  const [_drawer, openDrawer] = useRecoilState(drawerState);

  return (
    <Markdown
      children={props.children}
      remarkPlugins={[remarkGfm]}
      components={{
        // Override the default html tags with Mantine components
        p(innerProps) {
          const { children, className } = innerProps;
          return (
            <Text {...props} className={className}>
              {children}
            </Text>
          );
        },
        span(innerProps) {
          const { children, className } = innerProps;
          return (
            <Text {...props} className={className} span>
              {children}
            </Text>
          );
        },
        ul(innerProps) {
          const { children, className } = innerProps;
          return <List className={className}>{children}</List>;
        },
        li(innerProps) {
          const { children, className } = innerProps;
          return <List.Item className={className}>{children}</List.Item>;
        },
        a(innerProps) {
          const { children, className, href } = innerProps;

          // Override for content links
          const contentData = getContentDataFromHref(href ?? '');
          const drawerData = contentData ? convertContentLink(contentData) : null;

          return (
            <Anchor
              onClick={(e) => {
                if (drawerData) {
                  openDrawer({
                    type: drawerData.type,
                    data: drawerData.data,
                    extra: { addToHistory: true },
                  });
                  e.preventDefault();
                }
              }}
              href={drawerData ? undefined : href}
              target='_blank'
              underline='hover'
              className={className}
            >
              {children}
            </Anchor>
          );
        },
      }}
    />
  );
}
