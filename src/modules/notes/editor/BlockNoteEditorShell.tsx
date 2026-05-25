import { filterSuggestionItems, insertOrUpdateBlockForSlashMenu } from '@blocknote/core';
import { BlockNoteView } from '@blocknote/mantine';
import { getDefaultReactSlashMenuItems, SideMenu, SideMenuController, SuggestionMenuController } from '@blocknote/react';
import { Brush, Code2 } from 'lucide-react';
import type { FC, KeyboardEvent, MouseEvent } from 'react';
import { BLOCKS_WITH_LIBRARY_ENTER } from './constants';
import { findBlockById, getCurrentBlock, insertHardBreak } from './blockActions';
import { createEmptyBlock } from './contentSanitizer';
import type { AnyBlock, AnyEditor } from './types';

interface BlockNoteEditorShellProps {
  editor: AnyEditor;
  readOnly: boolean;
  onChange: () => void;
  onSelectionChange: () => void;
  onBlockActivate: (block: AnyBlock) => void;
}

export function BlockNoteEditorShell({ editor, readOnly, onChange, onSelectionChange, onBlockActivate }: BlockNoteEditorShellProps) {
  function handleEditorKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (readOnly || event.key !== 'Enter' || event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (!target?.closest('.mymind-blocknote-editor')) {
      return;
    }

    const currentBlock = getCurrentBlock(editor);
    if (!currentBlock || BLOCKS_WITH_LIBRARY_ENTER.has(currentBlock.type)) {
      return;
    }

    if (!insertHardBreak(editor)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    onChange();
  }

  function handleBlockMouseDown(event: MouseEvent<HTMLDivElement>) {
    if (readOnly) {
      return;
    }

    const target = event.target as HTMLElement | null;
    const blockElement = target?.closest<HTMLElement>('.bn-block-outer[data-id]');
    const blockId = blockElement?.dataset.id;
    if (!blockId) {
      return;
    }

    const block = findBlockById(editor.document as AnyBlock[], blockId);
    if (block) {
      onBlockActivate(block);
    }
  }

  return (
    <div
      className={`mymind-blocknote-shell${readOnly ? ' read-only' : ''}`}
      onKeyDownCapture={handleEditorKeyDown}
      onMouseDownCapture={handleBlockMouseDown}
    >
      <BlockNoteView
        editor={editor}
        theme="dark"
        editable={!readOnly}
        formattingToolbar={false}
        linkToolbar={false}
        slashMenu={false}
        sideMenu={false}
        filePanel={!readOnly}
        tableHandles={!readOnly}
        emojiPicker={false}
        onChange={onChange}
        onSelectionChange={onSelectionChange}
      >
        {!readOnly ? (
          <>
            <CustomSlashMenu editor={editor} />
            <SideMenuController
              sideMenu={NoteBlockSideMenu}
              floatingUIOptions={{
                useFloatingOptions: { placement: 'bottom-start' },
                elementProps: { className: 'note-block-side-menu-popover' },
              }}
            />
          </>
        ) : null}
      </BlockNoteView>
    </div>
  );
}

function NoteBlockSideMenu(props: { dragHandleMenu?: FC }) {
  return <SideMenu {...props} dragHandleMenu={EmptyDragHandleMenu} />;
}

function EmptyDragHandleMenu() {
  return null;
}

function CustomSlashMenu({ editor }: { editor: AnyEditor }) {
  return (
    <SuggestionMenuController
      triggerCharacter="/"
      getItems={async (query) =>
        filterSuggestionItems(
          [
            ...getDefaultReactSlashMenuItems(editor as any),
            {
              key: 'drawing' as any,
              title: 'Drawing',
              subtext: 'Sketch directly in the note',
              aliases: ['draw', 'canvas', 'sketch'],
              group: 'Basic blocks',
              icon: <Brush size={18} />,
              onItemClick: () => insertOrUpdateBlockForSlashMenu(editor as any, createEmptyBlock('drawing') as any),
            },
            {
              key: 'markdown' as any,
              title: 'Markdown',
              subtext: 'Write a markdown block',
              aliases: ['md', 'markdown'],
              group: 'Basic blocks',
              icon: <Code2 size={18} />,
              onItemClick: () => insertOrUpdateBlockForSlashMenu(editor as any, createEmptyBlock('markdown') as any),
            },
          ],
          query,
        )
      }
    />
  );
}
