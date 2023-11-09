import { Mark, markPasteRule, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { find, registerCustomProtocol, reset } from 'linkifyjs';
import { Editor, getAttributes } from '@tiptap/react';
import {
  combineTransactionSteps,
  findChildrenInRange,
  getChangedRanges,
  getMarksBetween,
  NodeWithPos,
} from '@tiptap/core';
import { MarkType } from '@tiptap/pm/model';
import { ContentType, AbilityBlockType } from '@typing/content';

export interface LinkProtocolOptions {
  scheme: string;
  optionalSlashes?: boolean;
}

export interface LinkOptions {
  /**
   * If enabled, it adds links as you type.
   */
  autolink: boolean;
  /**
   * An array of custom protocols to be registered with linkifyjs.
   */
  protocols: Array<LinkProtocolOptions | string>;
  /**
   * If enabled, links will be opened on click.
   */
  openOnClick: boolean;
  /**
   * Adds a link to the current selection if the pasted content only contains an url.
   */
  linkOnPaste: boolean;
  /**
   * A list of HTML attributes to be rendered.
   */
  HTMLAttributes: Record<string, any>;
  /**
   * A validation function that modifies link verification for the auto linker.
   * @param url - The url to be validated.
   * @returns - True if the url is valid, false otherwise.
   */
  validate?: (url: string) => boolean;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    link: {
      /**
       * Set a link mark
       */
      setLink: (attributes: {
        href: string;
        target?: string | null;
        rel?: string | null;
        class?: string | null;
      }) => ReturnType;
      /**
       * Toggle a link mark
       */
      toggleLink: (attributes: {
        href: string;
        target?: string | null;
        rel?: string | null;
        class?: string | null;
      }) => ReturnType;
      /**
       * Unset a link mark
       */
      unsetLink: () => ReturnType;
    };
  }
}

export const ContentLink = Mark.create<LinkOptions>({
  name: 'link',

  priority: 1000,

  keepOnSplit: false,

  onCreate() {
    this.options.protocols.forEach((protocol) => {
      if (typeof protocol === 'string') {
        registerCustomProtocol(protocol);
        return;
      }
      registerCustomProtocol(protocol.scheme, protocol.optionalSlashes);
    });
  },

  onDestroy() {
    reset();
  },

  inclusive() {
    return this.options.autolink;
  },

  addOptions() {
    return {
      openOnClick: true,
      linkOnPaste: true,
      autolink: true,
      protocols: [],
      HTMLAttributes: {
        target: '_blank',
        rel: 'noopener noreferrer nofollow',
        class: null,
      },
      validate: undefined,
    };
  },

  addAttributes() {
    return {
      href: {
        default: null,
      },
      target: {
        default: this.options.HTMLAttributes.target,
      },
      rel: {
        default: this.options.HTMLAttributes.rel,
      },
      class: {
        default: this.options.HTMLAttributes.class,
      },
    };
  },

  parseHTML() {
    return [{ tag: 'a[href]:not([href *= "javascript:" i])' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['a', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
    // ['code', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0]
  },

  addCommands() {
    return {
      setLink:
        (attributes) =>
        ({ chain }) => {
          return chain().setMark(this.name, attributes).setMeta('preventAutolink', true).run();
        },

      toggleLink:
        (attributes) =>
        ({ chain }) => {
          return chain()
            .toggleMark(this.name, attributes, { extendEmptyMarkRange: true })
            .setMeta('preventAutolink', true)
            .run();
        },

      unsetLink:
        () =>
        ({ chain }) => {
          return chain()
            .unsetMark(this.name, { extendEmptyMarkRange: true })
            .setMeta('preventAutolink', true)
            .run();
        },
    };
  },

  addPasteRules() {
    return [
      markPasteRule({
        find: (text) =>
          find(text)
            .filter((link) => {
              if (this.options.validate) {
                return this.options.validate(link.value);
              }

              return true;
            })
            .filter((link) => link.isLink)
            .map((link) => ({
              text: link.value,
              index: link.start,
              data: link,
            })),
        type: this.type,
        getAttributes: (match, pasteEvent) => {
          const html = pasteEvent?.clipboardData?.getData('text/html');
          const hrefRegex = /href="([^"]*)"/;

          const existingLink = html?.match(hrefRegex);

          if (existingLink) {
            return {
              href: existingLink[1],
            };
          }

          return {
            href: match.data?.href,
          };
        },
      }),
    ];
  },

  addProseMirrorPlugins() {
    const plugins: Plugin[] = [];

    if (this.options.autolink) {
      plugins.push(
        autolink({
          type: this.type,
          validate: this.options.validate,
        })
      );
    }

    if (this.options.openOnClick) {
      plugins.push(
        clickHandler({
          type: this.type,
        })
      );
    }

    if (this.options.linkOnPaste) {
      plugins.push(
        pasteHandler({
          // @ts-ignore
          editor: this.editor,
          type: this.type,
        })
      );
    }

    return plugins;
  },
});




type PasteHandlerOptions = {
  editor: Editor;
  type: MarkType;
};

export function pasteHandler(options: PasteHandlerOptions): Plugin {
  return new Plugin({
    key: new PluginKey('handlePasteLink'),
    props: {
      handlePaste: (view, event, slice) => {
        const { state } = view;
        const { selection } = state;
        const { empty } = selection;

        if (empty) {
          return false;
        }

        let textContent = '';

        slice.content.forEach((node) => {
          textContent += node.textContent;
        });

        const link = find(textContent).find((item) => item.isLink && item.value === textContent);

        if (!textContent || !link) {
          return false;
        }

        const html = event.clipboardData?.getData('text/html');

        const hrefRegex = /href="([^"]*)"/;

        const existingLink = html?.match(hrefRegex);

        const url = existingLink ? existingLink[1] : link.href;

        options.editor.commands.setMark(options.type, {
          href: url,
        });

        return true;
      },
    },
  });
}



type ClickHandlerOptions = {
  type: MarkType;
};

export function clickHandler(options: ClickHandlerOptions): Plugin {
  return new Plugin({
    key: new PluginKey('handleClickLink'),
    props: {
      handleClick: (view, pos, event) => {
        if (event.button !== 0) {
          return false;
        }

        const eventTarget = event.target as HTMLElement;

        if (eventTarget.nodeName !== 'A') {
          return false;
        }

        const attrs = getAttributes(view.state, options.type.name);
        const link = event.target as HTMLLinkElement;

        const href = link?.href ?? attrs.href;
        const target = link?.target ?? attrs.target;
        const rel = link?.rel ?? attrs.rel;

        if (link && href) {

          // Content link
          const contentData = getContentDataFromHref(href);
          if (target === '_self' && rel === 'tag' && contentData) {

            console.log('content link', contentData);

            event.preventDefault();
            return true;
          }

          // Normal link
          if (view.editable) {
            //window.open(href, target);
          }

          return true;
        }

        return false;
      },
    },
  });
}


type AutolinkOptions = {
  type: MarkType;
  validate?: (url: string) => boolean;
};

export function autolink(options: AutolinkOptions): Plugin {
  return new Plugin({
    key: new PluginKey('autolink'),
    appendTransaction: (transactions, oldState, newState) => {
      const docChanges =
        transactions.some((transaction) => transaction.docChanged) &&
        !oldState.doc.eq(newState.doc);
      const preventAutolink = transactions.some((transaction) =>
        transaction.getMeta('preventAutolink')
      );

      if (!docChanges || preventAutolink) {
        return;
      }

      const { tr } = newState;
      const transform = combineTransactionSteps(oldState.doc, [...transactions]);
      const changes = getChangedRanges(transform);

      changes.forEach(({ newRange }) => {
        // Now let’s see if we can add new links.
        const nodesInChangedRanges = findChildrenInRange(
          newState.doc,
          newRange,
          (node) => node.isTextblock
        );

        let textBlock: NodeWithPos | undefined;
        let textBeforeWhitespace: string | undefined;

        if (nodesInChangedRanges.length > 1) {
          // Grab the first node within the changed ranges (ex. the first of two paragraphs when hitting enter).
          textBlock = nodesInChangedRanges[0];
          textBeforeWhitespace = newState.doc.textBetween(
            textBlock.pos,
            textBlock.pos + textBlock.node.nodeSize,
            undefined,
            ' '
          );
        } else if (
          nodesInChangedRanges.length &&
          // We want to make sure to include the block seperator argument to treat hard breaks like spaces.
          newState.doc.textBetween(newRange.from, newRange.to, ' ', ' ').endsWith(' ')
        ) {
          textBlock = nodesInChangedRanges[0];
          textBeforeWhitespace = newState.doc.textBetween(
            textBlock.pos,
            newRange.to,
            undefined,
            ' '
          );
        }

        if (textBlock && textBeforeWhitespace) {
          const wordsBeforeWhitespace = textBeforeWhitespace.split(' ').filter((s) => s !== '');

          if (wordsBeforeWhitespace.length <= 0) {
            return false;
          }

          const lastWordBeforeSpace = wordsBeforeWhitespace[wordsBeforeWhitespace.length - 1];
          const lastWordAndBlockOffset =
            textBlock.pos + textBeforeWhitespace.lastIndexOf(lastWordBeforeSpace);

          if (!lastWordBeforeSpace) {
            return false;
          }

          find(lastWordBeforeSpace)
            .filter((link) => link.isLink)
            // Calculate link position.
            .map((link) => ({
              ...link,
              from: lastWordAndBlockOffset + link.start + 1,
              to: lastWordAndBlockOffset + link.end + 1,
            }))
            // ignore link inside code mark
            .filter((link) => {
              if (!newState.schema.marks.code) {
                return true;
              }

              return !newState.doc.rangeHasMark(link.from, link.to, newState.schema.marks.code);
            })
            // validate link
            .filter((link) => {
              if (options.validate) {
                return options.validate(link.value);
              }
              return true;
            })
            // Add link mark.
            .forEach((link) => {
              if (
                getMarksBetween(link.from, link.to, newState.doc).some(
                  (item) => item.mark.type === options.type
                )
              ) {
                return;
              }

              tr.addMark(
                link.from,
                link.to,
                options.type.create({
                  href: link.href,
                })
              );
            });
        }
      });

      if (!tr.steps.length) {
        return;
      }

      return tr;
    },
  });
}

export function getContentDataFromHref(href: string) {
  // Get last part of url
  const urlParts = href.split('/');
  const lastPart = urlParts.length > 0 ? urlParts[urlParts.length - 1] : href;

  // Check if it is a content link
  if (!lastPart.startsWith('link_')) return null;

  // Get content data
  const [link, type, id] = lastPart.split('_');
  return { type: type as ContentType | AbilityBlockType, id: parseInt(id) };
}

export function buildHrefFromContentData(type: ContentType | AbilityBlockType, id: number) {
  return `link_${type}_${id}`;
}
