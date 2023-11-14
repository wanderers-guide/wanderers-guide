import { mergeAttributes, Node } from '@tiptap/core';
import { ActionCost } from '@typing/content';

export interface ActionSymbolOptions {
  keepMarks: boolean;
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    actionSymbol: {
      /**
       * Add an action symbol
       */
      setActionSymbol: (cost: ActionCost) => ReturnType;
    };
  }
}

export const ActionSymbol = Node.create<ActionSymbolOptions>({
  name: 'actionSymbol',

  addOptions() {
    return {
      keepMarks: true,
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      cost: {
        default: null,
      },
    };
  },

  inline: true,

  group: 'inline',

  selectable: false,

  parseHTML() {
    return [{ tag: 'abbr[class="action-symbol"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const convertCost = (cost: ActionCost) => {
      switch (cost) {
        case 'ONE-ACTION':
          return '1';
        case 'TWO-ACTIONS':
          return '2';
        case 'THREE-ACTIONS':
          return '3';
        case 'FREE-ACTION':
          return '4';
        case 'REACTION':
          return '5';
        default:
          return '1';
      }
    }
    return [
      'abbr',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: 'action-symbol',
      }),
      convertCost(HTMLAttributes.cost),
    ];
  },

  addCommands() {
    return {
      setActionSymbol:
        (cost: ActionCost) =>
        ({ commands, chain, state, editor }) => {
          return commands.first([
            () => commands.exitCode(),
            () =>
              commands.command(() => {
                const { selection, storedMarks } = state;

                if (selection.$from.parent.type.spec.isolating) {
                  return false;
                }

                const { keepMarks } = this.options;
                const { splittableMarks } = editor.extensionManager;
                const marks =
                  storedMarks || (selection.$to.parentOffset && selection.$from.marks());

                return chain()
                  .insertContent({ type: this.name, attrs: { cost } })
                  .command(({ tr, dispatch }) => {
                    if (dispatch && marks && keepMarks) {
                      const filteredMarks = marks.filter((mark) =>
                        splittableMarks.includes(mark.type.name)
                      );

                      tr.ensureMarks(filteredMarks);
                    }

                    return true;
                  })
                  .run();
              }),
          ]);
        },
    };
  },
});
