import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  ArrowUp,
  ArrowDown,
  ListPlus,
  SplitSquareHorizontal,
  Copy,
  Trash2,
} from 'lucide-react';
import type { ReactNode } from 'react';
import type { StudyBlock, StudyCustomBlockTemplate, StudyNode } from '../../types';
import { getStudyBlockLabel } from '../../studyUtils';
import { Tooltip } from '../../../../shared/components/Tooltip';
import { getVisualStyle } from '../../utils/editorBlockStyles';
import type { RichTextActiveMarks, RichTextCommand } from './StudyRichTextEditor';
import { BlockEditorContent } from './StudyBlockEditors';

interface EditableBlockCardProps {
  block: StudyBlock;
  level: number;
  nodes: StudyNode[];
  templates: StudyCustomBlockTemplate[];
  selectedBlockId: string | null;
  collapsedBlockIds: Set<string>;
  richTextCommand?: RichTextCommand | null;
  onRichTextMarksChange?: (marks: RichTextActiveMarks) => void;
  onActiveRichTextEditorChange?: (editorId: string) => void;
  onSelect: (blockId: string) => void;
  onUpdate: (blockId: string, update: (block: StudyBlock) => StudyBlock) => void;
  onDelete: (blockId: string) => void;
  onDuplicate: (blockId: string) => void;
  onMove: (blockId: string, direction: -1 | 1) => void;
  onNest: (blockId: string) => void;
  onUnnest: (blockId: string) => void;
  onToggleCollapsed: (blockId: string) => void;
  onOpenNode: (nodeId: string) => void;
  nestedContent?: ReactNode;
  index: number;
}

export function EditableBlockCard({
  block,
  level,
  nodes,
  templates,
  selectedBlockId,
  collapsedBlockIds,
  index,
  richTextCommand,
  onRichTextMarksChange,
  onActiveRichTextEditorChange,
  onSelect,
  onUpdate,
  onDelete,
  onDuplicate,
  onMove,
  onNest,
  onUnnest,
  onToggleCollapsed,
  onOpenNode,
  nestedContent,
}: EditableBlockCardProps) {
  const isSelected = selectedBlockId === block.id;
  const isCollapsed = collapsedBlockIds.has(block.id) || Boolean(block.collapsed);
  const hasChildren = (block.children ?? []).length > 0;

  function handleBlockMouseDown(event: React.MouseEvent<HTMLElement>) {
    const target = event.target as HTMLElement;
    const closestBlock = target.closest('[data-study-block-id]');

    if (closestBlock !== event.currentTarget) {
      return;
    }

    const clickedControl = target.closest('button, select, a');
    if (clickedControl) {
      return;
    }

    const clickedEditableContent = target.closest(
      'input, textarea, [contenteditable="true"], .study-rich-text-editor, .study-table-rich-cell'
    );

    if (clickedEditableContent) {
      if (!isSelected) {
        onSelect(block.id);
      }
      return;
    }

    const clickedHead = target.closest('.study-block-head');
    if (clickedHead) {
        onSelect(block.id);
        return;
    }

    onSelect(block.id);
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    const isCommand = event.ctrlKey || event.metaKey;

    if (event.key === 'Tab') {
      const target = event.target as HTMLElement;
      if (target.closest('.study-rich-text-editor, .study-code-editor, .study-table-rich-cell')) {
        return;
      }

      event.preventDefault();
      if (event.shiftKey) {
        onUnnest(block.id);
      } else {
        onNest(block.id);
      }
      return;
    }

    if (isCommand && event.key === 'ArrowUp') {
        event.preventDefault();
        onMove(block.id, -1);
        return;
    }
    if (isCommand && event.key === 'ArrowDown') {
        event.preventDefault();
        onMove(block.id, 1);
        return;
    }
    if (isCommand && event.key === 'd') {
        event.preventDefault();
        onDuplicate(block.id);
        return;
    }
    if (isCommand && event.key === 'Backspace' && isSelected) {
        // Only delete if not in an input/editor
        const target = event.target as HTMLElement;
        if (!target.closest('input, textarea, [contenteditable="true"]')) {
            event.preventDefault();
            onDelete(block.id);
        }
    }
  }

  return (
    <article
      className={`study-block glass-panel${isSelected ? ' active' : ''} level-${level}`}
      data-study-block-id={block.id}
      onMouseDown={handleBlockMouseDown}
      onKeyDown={handleKeyDown}
      style={getVisualStyle(block)}
      tabIndex={0}
    >
      <div className="study-block-head">
        <div className="study-block-info">
            <button className="study-collapse-button" type="button" onClick={() => onToggleCollapsed(block.id)}>
            {hasChildren ? (
              isCollapsed ? <ChevronRight size={16} aria-hidden /> : <ChevronDown size={16} aria-hidden />
            ) : (
              <span className="study-block-collapse-spacer" aria-hidden />
            )}
            </button>
            <span className="study-block-type-chip">
                <span className="study-block-index">#{index + 1}</span>
                <span>{getStudyBlockLabel(block.type)}</span>
                {level > 0 && <span className="study-block-level">L{level}</span>}
                {isSelected && <span className="study-block-selected-badge" aria-label="Selected block" />}
                {hasChildren && <span className="study-block-children-count">{block.children?.length}</span>}
            </span>
        </div>
        <div className="study-block-actions">
          <Tooltip content="Move up">
            <button className="study-tree-action-btn" type="button" onClick={() => onMove(block.id, -1)}>
              <ArrowUp size={14} aria-hidden />
            </button>
          </Tooltip>
          <Tooltip content="Move down">
            <button className="study-tree-action-btn" type="button" onClick={() => onMove(block.id, 1)}>
              <ArrowDown size={14} aria-hidden />
            </button>
          </Tooltip>
          <Tooltip content="Nest under previous block">
            <button className="study-tree-action-btn" type="button" onClick={() => onNest(block.id)}>
              <ListPlus size={14} aria-hidden />
            </button>
          </Tooltip>
          {level > 0 && (
            <Tooltip content="Move out">
              <button className="study-tree-action-btn" type="button" onClick={() => onUnnest(block.id)}>
                <SplitSquareHorizontal size={14} aria-hidden />
              </button>
            </Tooltip>
          )}
          <Tooltip content="Duplicate">
            <button className="study-tree-action-btn" type="button" onClick={() => onDuplicate(block.id)}>
              <Copy size={14} aria-hidden />
            </button>
          </Tooltip>
          <Tooltip content="Delete">
            <button className="study-tree-action-btn danger" type="button" onClick={() => onDelete(block.id)}>
              <Trash2 size={14} aria-hidden />
            </button>
          </Tooltip>
        </div>
      </div>

      <BlockEditorContent
        block={block}
        nodes={nodes}
        templates={templates}
        formatCommand={isSelected ? richTextCommand : null}
        onChange={(update) => onUpdate(block.id, update)}
        onOpenNode={onOpenNode}
        onRichTextMarksChange={onRichTextMarksChange}
        onActiveRichTextEditorChange={onActiveRichTextEditorChange}
      />

      {!isCollapsed && nestedContent && (
        <div className="study-nested-blocks">
          {nestedContent}
        </div>
      )}
    </article>
  );
}
