import { mergeAttributes, Node } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { ChevronRight } from 'lucide-react';
import React from 'react';

const ToggleNodeView = (props) => {
  const isOpen = props.node.attrs.open;

  return (
    <NodeViewWrapper 
      className={`toggle-block ${isOpen ? 'is-open' : 'is-closed'}`} 
      data-type="toggle-block"
      style={{ display: 'flex', margin: '0.5rem 0', alignItems: 'flex-start' }}
    >
      <style>{`
        .toggle-block.is-closed .toggle-content > :not(:first-child) {
          display: none !important;
        }
      `}</style>
      <button
        contentEditable={false}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          props.updateAttributes({ open: !isOpen });
        }}
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '2px',
          marginRight: '6px',
          marginTop: '4px', // Align with the first line of text
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          transition: 'transform 0.2s ease',
          transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
          height: '20px',
          width: '20px',
          flexShrink: 0,
          outline: 'none',
          borderRadius: '4px'
        }}
        onMouseOver={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
        onMouseOut={e => e.currentTarget.style.background = 'transparent'}
      >
        <ChevronRight size={18} />
      </button>
      <NodeViewContent 
        className="toggle-content" 
        style={{ flex: 1, minWidth: 0 }}
      />
    </NodeViewWrapper>
  );
};

export const ToggleBlock = Node.create({
  name: 'toggleBlock',
  group: 'block',
  content: 'block+',
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      open: {
        default: true,
        parseHTML: element => {
          const hasAttr = element.hasAttribute('data-open');
          if (!hasAttr) return true;
          return element.getAttribute('data-open') === 'true';
        },
        renderHTML: attributes => {
          return {
            'data-open': attributes.open,
          }
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="toggle-block"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'toggle-block' }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ToggleNodeView);
  },

  addKeyboardShortcuts() {
    return {
      Enter: () => {
        const { state, dispatch } = this.editor.view;
        const { $from } = state.selection;

        let toggleDepth = -1;
        for (let d = $from.depth; d > 0; d--) {
          if ($from.node(d).type.name === 'toggleBlock') {
            toggleDepth = d;
            break;
          }
        }

        if (toggleDepth === -1) {
          return false;
        }

        try {
          const depthToSplit = $from.depth - toggleDepth;
          if (dispatch) {
            dispatch(state.tr.split($from.pos, depthToSplit));
          }
          return true;
        } catch (e) {
          return false;
        }
      }
    };
  },

  addCommands() {
    return {
      setToggleBlock: () => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: { open: true },
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Toggle' }]
            },
            {
              type: 'paragraph' // Empty body placeholder
            }
          ]
        });
      },
    };
  },
});
