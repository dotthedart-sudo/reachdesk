import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { ReactRenderer } from '@tiptap/react';
import tippy from 'tippy.js';
import { SlashCommandList } from './SlashCommandList';
import { Type, CheckSquare, ChevronRight, Table as TableIcon } from 'lucide-react';

export const SlashCommand = Extension.create({
  name: 'slashCommand',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        command: ({ editor, range, props }) => {
          props.command({ editor, range });
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});

export const getSuggestionOptions = () => {
  return {
    items: ({ query }) => {
      const allItems = [
        {
          title: 'Text',
          description: 'Just start typing with plain text.',
          icon: Type,
          command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).setNode('paragraph').run();
          },
        },
        {
          title: 'To-do list',
          description: 'Track tasks with a to-do list.',
          icon: CheckSquare,
          command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).toggleTaskList().run();
          },
        },
        {
          title: 'Toggle list',
          description: 'Toggles can hide and show content inside.',
          icon: ChevronRight,
          command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).setToggleBlock().run();
          },
        },
        {
          title: 'Database',
          description: 'Add a typed database table.',
          icon: TableIcon,
          command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).setDatabaseBlock().run();
          },
        },
      ];

      return allItems.filter(item => item.title.toLowerCase().startsWith(query.toLowerCase())).slice(0, 10);
    },

    render: () => {
      let component;
      let popup;

      return {
        onStart: props => {
          component = new ReactRenderer(SlashCommandList, {
            props,
            editor: props.editor,
          });

          if (!props.clientRect) {
            return;
          }

          popup = tippy('body', {
            getReferenceClientRect: props.clientRect,
            appendTo: () => document.body,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: 'manual',
            placement: 'bottom-start',
            theme: 'light',
            animation: 'shift-away',
          });
        },

        onUpdate(props) {
          component.updateProps(props);

          if (!props.clientRect) {
            return;
          }

          popup[0].setProps({
            getReferenceClientRect: props.clientRect,
          });
        },

        onKeyDown(props) {
          if (props.event.key === 'Escape') {
            popup[0].hide();
            return true;
          }

          return component.ref?.onKeyDown(props);
        },

        onExit() {
          if (popup && popup[0]) {
            popup[0].destroy();
          }
          if (component) {
            component.destroy();
          }
        },
      };
    },
  };
};
