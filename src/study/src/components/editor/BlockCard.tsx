import type { ReactNode } from "react";
import type {
  CustomBlockTemplate,
  StudyBlock,
  StudyNode,
} from "../../types/study";
import { getBlockTitle } from "../../utils/blocks";
import { BlockRenderer } from "./BlockRenderer";
import type { RichTextActiveMarks, RichTextCommand } from "./RichTextEditor";

interface BlockCardProps {
  block: StudyBlock;
  index: number;
  level: number;
  nodes: StudyNode[];
  templates: CustomBlockTemplate[];
  editable: boolean;
  selected: boolean;
  isCollapsed: boolean;
  richTextCommand?: RichTextCommand | null;
  nestedContent?: ReactNode;
  onRichTextMarksChange?: (marks: RichTextActiveMarks) => void;
  onActiveRichTextEditorChange?: (editorId: string) => void;
  onSelect: () => void;
  onToggleCollapse: () => void;
  onChange: (block: StudyBlock) => void;
  onOpenNode: (nodeId: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onNest: () => void;
  onUnnest: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function BlockCard({
  block,
  index,
  level,
  nodes,
  templates,
  editable,
  selected,
  isCollapsed,
  richTextCommand,
  nestedContent,
  onRichTextMarksChange,
  onActiveRichTextEditorChange,
  onSelect,
  onToggleCollapse,
  onChange,
  onOpenNode,
  onMoveUp,
  onMoveDown,
  onNest,
  onUnnest,
  onDuplicate,
  onDelete,
}: BlockCardProps) {
  const childrenCount = block.children?.length ?? 0;
  const hasChildren = childrenCount > 0;

  function handleBlockMouseDown(event: React.MouseEvent<HTMLElement>) {
    const target = event.target as HTMLElement;
    const closestBlock = target.closest("[data-study-block-id]");

    if (closestBlock !== event.currentTarget) {
      return;
    }

    const clickedControl = target.closest(
      "button, select, a"
    );

    if (clickedControl) {
      return;
    }

    const clickedEditableContent = target.closest(
      "input, textarea, [contenteditable='true'], .rich-text-editor, .table-rich-cell, .markdown-view, .latex-block-view"
    );

    if (clickedEditableContent) {
      if (!selected) {
        onSelect();
      }

      return;
    }

    const clickedHeader = target.closest("[data-block-card-header]");

    if (clickedHeader) {
      onSelect();
      return;
    }

    if (!selected) {
      onSelect();
      return;
    }

    onSelect();
  }

  return (
    <section
      data-study-block-id={block.id}
      onMouseDown={handleBlockMouseDown}
      className={[
        selected ? "border-2 border-black bg-white" : "border border-black bg-white",
        level > 0 ? "ml-4" : "",
      ].join(" ")}
    >
      <header
        data-block-card-header
        className="flex items-center justify-between border-b border-black bg-neutral-100 px-4 py-3"
      >
        <div className="flex min-w-0 items-center gap-2 font-bold">
          {hasChildren ? (
            <button
              type="button"
              onMouseDown={(event) => event.stopPropagation()}
              onClick={onToggleCollapse}
              className="border border-black bg-white px-2 py-1 text-xs hover:bg-black hover:text-white"
              title={isCollapsed ? "Развернуть дочерние блоки" : "Свернуть дочерние блоки"}
            >
              {isCollapsed ? "+" : "-"}
            </button>
          ) : (
            <span className="w-7" />
          )}

          <span className="min-w-0">
            {level > 0 && <span className="mr-2 text-xs">LEVEL {level}</span>}
            {getBlockTitle(block, templates)} #{index + 1}
            {selected && <span className="ml-2 text-xs">SELECTED</span>}
            {hasChildren && (
              <span className="ml-2 text-xs">
                CHILDREN: {childrenCount}
              </span>
            )}
          </span>
        </div>

        {editable && (
          <div
            className="flex shrink-0 flex-wrap justify-end gap-1"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="border border-black bg-white px-2 py-1 text-sm hover:bg-black hover:text-white"
              onClick={onMoveUp}
              title="Переместить выше на этом уровне"
            >
              Up
            </button>

            <button
              type="button"
              className="border border-black bg-white px-2 py-1 text-sm hover:bg-black hover:text-white"
              onClick={onMoveDown}
              title="Переместить ниже на этом уровне"
            >
              Down
            </button>

            <button
              type="button"
              className="border border-black bg-white px-2 py-1 text-sm hover:bg-black hover:text-white"
              onClick={onNest}
              title="Вложить этот блок внутрь предыдущего блока"
            >
              In
            </button>

            <button
              type="button"
              className="border border-black bg-white px-2 py-1 text-sm hover:bg-black hover:text-white"
              onClick={onUnnest}
              title="Вынести этот блок наружу"
            >
              Out
            </button>

            <button
              type="button"
              className="border border-black bg-white px-2 py-1 text-sm hover:bg-black hover:text-white"
              onClick={onDuplicate}
              title="Дублировать блок"
            >
              Copy
            </button>

            <button
              type="button"
              className="border border-black bg-black px-2 py-1 text-sm text-white"
              onClick={onDelete}
              title="Удалить блок"
            >
              Delete
            </button>
          </div>
        )}
      </header>

      <div className="p-4">
        <BlockRenderer
          block={block}
          nodes={nodes}
          templates={templates}
          editable={editable}
          richTextCommand={richTextCommand}
          onRichTextMarksChange={onRichTextMarksChange}
          onActiveRichTextEditorChange={onActiveRichTextEditorChange}
          onChange={onChange}
          onOpenNode={onOpenNode}
        />

        {hasChildren && isCollapsed && (
          <div className="mt-4 border border-dashed border-black bg-neutral-100 px-3 py-2 text-sm text-neutral-700">
            Дочерние блоки скрыты: {childrenCount}
          </div>
        )}

        {nestedContent && !isCollapsed && (
          <div className="mt-4 border-l border-black pl-4">
            {nestedContent}
          </div>
        )}
      </div>
    </section>
  );
}
