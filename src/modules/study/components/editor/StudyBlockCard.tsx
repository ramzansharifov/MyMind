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
}

export function EditableBlockCard({
  block,
  level,
  nodes,
  templates,
  selectedBlockId,
  collapsedBlockIds,
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

    onSelect(block.id);
  }

  return (
    <article
      className={`study-block glass-panel${isSelected ? ' active' : ''}`}
      data-study-block-id={block.id}
      onMouseDown={handleBlockMouseDown}
      style={{
        color: block.settings?.textColor,
        background: block.settings?.backgroundColor,
        padding: block.settings?.padding,
        textAlign: block.settings?.textAlign,
        fontSize: block.settings?.fontSize,
      }}
    >
      <div className="study-block-grip">
        <GripVertical size={16} aria-hidden />
      </div>

      <div className="study-block-head">
        <button className="study-collapse-button" type="button" onClick={() => onToggleCollapsed(block.id)}>
          {hasChildren ? (isCollapsed ? <ChevronRight size={16} aria-hidden /> : <ChevronDown size={16} aria-hidden />) : <span />}
        </button>
        <span className="study-block-type-chip">
          {getStudyBlockLabel(block.type)}
        </span>
        <div className="study-block-actions">
          <Tooltip content="Move up">
            <button className="icon-button subtle" type="button" onClick={() => onMove(block.id, -1)}>
              <ArrowUp size={15} aria-hidden />
            </button>
          </Tooltip>
          <Tooltip content="Move down">
            <button className="icon-button subtle" type="button" onClick={() => onMove(block.id, 1)}>
              <ArrowDown size={15} aria-hidden />
            </button>
          </Tooltip>
          <Tooltip content="Nest into previous block">
            <button className="icon-button subtle" type="button" onClick={() => onNest(block.id)}>
              <ListPlus size={15} aria-hidden />
            </button>
          </Tooltip>
          {level > 0 ? (
            <Tooltip content="Move out">
              <button className="icon-button subtle" type="button" onClick={() => onUnnest(block.id)}>
                <SplitSquareHorizontal size={15} aria-hidden />
              </button>
            </Tooltip>
          ) : null}
          <Tooltip content="Duplicate">
            <button className="icon-button subtle" type="button" onClick={() => onDuplicate(block.id)}>
              <Copy size={15} aria-hidden />
            </button>
          </Tooltip>
          <Tooltip content="Delete">
            <button className="icon-button danger" type="button" onClick={() => onDelete(block.id)}>
              <Trash2 size={15} aria-hidden />
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
