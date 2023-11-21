import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Anchor, Blockquote, Code, Divider, List, Text, TextProps } from '@mantine/core';
import { getContentDataFromHref } from './rich_text_input/ContentLinkExtension';
import { drawerState } from '@atoms/navAtoms';
import { convertContentLink } from '@drawers/drawer-utils';
import { useRecoilState } from 'recoil';
import React from 'react';
import IndentedText from './IndentedText';
import { IconQuote } from '@tabler/icons-react';

interface RichTextProps extends TextProps {
  children: any;
}

export default function RichText(props: RichTextProps) {
  const [_drawer, openDrawer] = useRecoilState(drawerState);

  // Convert action symbol text of abbr to code markdown (then convert it back)
  // This is a hack to get around the fact that markdown doesn't really support abbr
  const regex = /<abbr[^>]*class="action-symbol"[^>]*>(\d+)<\/abbr>/gm;
  const convertedChildren = props.children.replace(regex, '`action_symbol_$1`');

  return (
    <Markdown
      children={convertedChildren}
      remarkPlugins={[remarkGfm]}
      components={{
        // Override the default html tags with Mantine components
        p(innerProps) {
          const { children, className } = innerProps;
          if (shouldBeIndented(children)) {
            return (
              <IndentedText {...props} className={className}>
                {children}
              </IndentedText>
            );
          } else {
            return (
              <Text {...props} className={className}>
                {children}
              </Text>
            );
          }
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
          return (
            <List.Item className={className}>
              <Text>{children}</Text>
            </List.Item>
          );
        },
        code(innerProps) {
          const { children, className } = innerProps;
          // Convert code back to action symbol text as abbr
          if (children?.toString().startsWith('action_symbol_')) {
            const symbol = children.toString().replace('action_symbol_', '');
            return <abbr className='action-symbol'>{symbol}</abbr>;
          } else {
            return <Code className={className}>{children}</Code>;
          }
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
        hr(innerProps) {
          const { className } = innerProps;
          return <Divider className={className} />;
        },
        blockquote(innerProps) {
          const { children, className } = innerProps;
          return (
            <Blockquote
              className={className}
              icon={<IconQuote size='1.3rem' />}
              iconSize={40}
              ml={5}
              my={10}
            >
              {children}
            </Blockquote>
          );
        },
      }}
    />
  );
}

function shouldBeIndented(children: React.ReactNode) {
  const childrenArray = React.Children.toArray(children);
  const firstChild = childrenArray.length > 0 ? childrenArray[0] : null;

  if (React.isValidElement(firstChild) && firstChild.type === 'strong') {
    // @ts-ignore
    const contents = (firstChild.props?.children ?? '') as string;
    return ['Critical Success', 'Success', 'Failure', 'Critical Failure'].includes(contents);
  }
  return false;
}
