import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Anchor, Blockquote, Code, Divider, List, Table, Text, TextProps, Title, useMantineTheme } from '@mantine/core';
import { getContentDataFromHref } from './rich_text_input/ContentLinkExtension';
import { drawerState } from '@atoms/navAtoms';
import { convertContentLink } from '@drawers/drawer-utils';
import { useRecoilState } from 'recoil';
import React from 'react';
import IndentedText from './IndentedText';
import { IconQuote } from '@tabler/icons-react';
import { getAllConditions } from '@conditions/condition-handler';
import { compileExpressions } from '@variables/variable-utils';
import { StoreID } from '@typing/variables';
import _ from 'lodash-es';

interface RichTextProps extends TextProps {
  children: any;
  conditionBlacklist?: string[];
  store?: StoreID;
}

export default function RichText(props: RichTextProps) {
  const theme = useMantineTheme();
  const [_drawer, openDrawer] = useRecoilState(drawerState);
  let convertedChildren = props.children as string | undefined | null;

  if (Array.isArray(convertedChildren)) {
    convertedChildren = convertedChildren.join('');
  }
  if (typeof convertedChildren !== 'string') {
    return null;
  }

  if (convertedChildren && props.store) {
    convertedChildren = compileExpressions(props.store, convertedChildren, true);
  }

  // Convert action symbol text of abbr to code markdown (then convert it back)
  // This is a hack to get around the fact that markdown doesn't really support abbr
  const regex = /<abbr[^>]*class="action-symbol"[^>]*>(\d+)<\/abbr>/gm;
  convertedChildren = convertedChildren?.replace(regex, '`action_symbol_$1`');

  // Convert the string output from editor table format to be read by react-markdown
  convertedChildren = convertedChildren?.replace(/\|\n\n\|/g, '|\n|');

  // Auto-detect conditions and convert to content links
  const conditions = getAllConditions()
    .map((c) => c.name.toLowerCase())
    .filter((c) => !props.conditionBlacklist?.includes(c) && c !== 'persistent damage');
  const conditionRegex = new RegExp(`\\b(${conditions.join('|')})\\b`, 'g');
  convertedChildren = convertedChildren?.replace(conditionRegex, (match) => {
    return `[${match}](link_condition_${match.replace(' ', '~')})`;
  });

  // Auto-detect persistent damage separately
  convertedChildren = convertedChildren?.replace(/persistent (\w*?\s|)damage/gi, (match) => {
    return `[${match}](link_condition_persistent~damage)`;
  });

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
        h1(innerProps) {
          const { children, className } = innerProps;
          return (
            <Title order={1} pt={5} className={className}>
              {children}
            </Title>
          );
        },
        h2(innerProps) {
          const { children, className } = innerProps;
          return (
            <Title order={2} pt={5} className={className}>
              {children}
            </Title>
          );
        },
        h3(innerProps) {
          const { children, className } = innerProps;
          return (
            <Title order={3} pt={5} className={className}>
              {children}
            </Title>
          );
        },
        h4(innerProps) {
          const { children, className } = innerProps;
          return (
            <Title order={4} pt={5} className={className}>
              {children}
            </Title>
          );
        },
        ul(innerProps) {
          const { children, className } = innerProps;
          return <List className={className}>{children}</List>;
        },
        ol(innerProps) {
          const { children, className } = innerProps;
          return (
            <List type='ordered' className={className}>
              {children}
            </List>
          );
        },
        li(innerProps) {
          const { children, className } = innerProps;
          return (
            <List.Item className={className}>
              <Text {...props} mr={25}>
                {children}
              </Text>
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

          if (contentData?.type === 'trait') {
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
                underline='always'
                c='dark.0'
                style={{
                  textDecorationColor: theme.colors['guide'][9],
                }}
                className={className}
                {...props}
              >
                {children}
              </Anchor>
            );
          } else {
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
                // Italicize spell links as done in the books
                fs={contentData?.type === 'spell' ? 'italic' : undefined}
                href={drawerData ? undefined : href}
                target='_blank'
                underline='hover'
                c='guide.0'
                className={className}
                {...props}
              >
                {children}
              </Anchor>
            );
          }
        },
        hr(innerProps) {
          const { className } = innerProps;
          return <Divider className={className} />;
        },
        blockquote(innerProps) {
          const { children, className } = innerProps;
          return (
            <Blockquote className={className} icon={<IconQuote size='1.3rem' />} iconSize={40} ml={5} my={10}>
              {children}
            </Blockquote>
          );
        },
        table(innerProps) {
          const { children, className } = innerProps;
          return (
            <Table striped withTableBorder className={className}>
              {children}
            </Table>
          );
        },
        thead(innerProps) {
          const { children, className } = innerProps;
          return <Table.Thead className={className}>{children}</Table.Thead>;
        },
        tbody(innerProps) {
          const { children, className } = innerProps;
          return <Table.Tbody className={className}>{children}</Table.Tbody>;
        },
        tr(innerProps) {
          const { children, className } = innerProps;
          return <Table.Tr className={className}>{children}</Table.Tr>;
        },
        th(innerProps) {
          const { children, className } = innerProps;
          return (
            <Table.Th ta='center' p={3} className={className}>
              {children}
            </Table.Th>
          );
        },
        td(innerProps) {
          const { children, className } = innerProps;
          return (
            <Table.Td ta='center' p={3} className={className}>
              {children}
            </Table.Td>
          );
        },
      }}
    />
  );
}

function shouldBeIndented(children: React.ReactNode) {
  const childrenArray = React.Children.toArray(children);
  const firstChild = childrenArray.length > 0 ? childrenArray[0] : null;

  if (React.isValidElement(firstChild)) {
    // @ts-ignore
    const contents = _.isString(firstChild.props?.children ?? '') ? ((firstChild.props.children ?? '') as string) : '';
    //console.log(contents, firstChild.type);

    if (firstChild.type === 'strong') {
      if (['Critical Success', 'Success', 'Failure', 'Critical Failure'].includes(contents)) return true;
      if (contents.length <= 45) return true;
    }
    if (contents.startsWith('action_symbol_')) return true;
  }
  return false;
}
