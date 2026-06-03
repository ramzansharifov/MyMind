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

  return (
    <article
      className={`study-block glass-panel${isSelected ? ' active' : ''}`}
      data-study-block-id={block.id}
      onMouseDown={handleBlockMouseDown}
      style={getVisualStyle(block)}
    >
      <div className="study-block-grip">
        <GripVertical size={16} aria-hidden />
      </div>

      <div className="study-block-head">
        <div className="study-block-info">
            <button className="study-collapse-button" type="button" onClick={() => onToggleCollapsed(block.id)}>
            {hasChildren ? (isCollapsed ? <ChevronRight size={16} aria-hidden /> : <ChevronDown size={16} aria-hidden />) : <span className="spacer">·</span>}
            </button>
            <span className="study-block-type-chip">
                {level > 0 && <span className="study-block-level">LEVEL {level}</span>}
                {getStudyBlockLabel(block.type)} #{index + 1}
                {isSelected && <span className="study-block-selected-badge">SELECTED</span>}
                {hasChildren && <span className="study-block-children-count">CHILDREN: {block.children?.length}</span>}
            </span>
        </div>
        <div className="study-block-actions">
          <button className="study-tree-action-btn" title="Move up" onClick={() => onMove(block.id, -1)}>Up</button>
          <button className="study-tree-action-btn" title="Move down" onClick={() => onMove(block.id, 1)}>Down</button>
          <button className="study-tree-action-btn" title="In" onClick={() => onNest(block.id)}>In</button>
          {level > 0 && <button className="study-tree-action-btn" title="Out" onClick={() => onUnnest(block.id)}>Out</button>}
          <button className="study-tree-action-btn" title="Copy" onClick={() => onDuplicate(block.id)}>Copy</button>
          <button className="study-tree-action-btn danger" title="Delete" onClick={() => onDelete(block.id)}>Delete</button>
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
