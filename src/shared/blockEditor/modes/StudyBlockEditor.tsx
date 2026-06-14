import {
  ArrowDown,
  ArrowUp,
  Code2,
  Eye,
  Plus,
  GripVertical,
  Heading,
  Sigma,
  Trash2,
  Type,
  type LucideIcon,
} from "lucide-react";
import { Fragment, useMemo, useState, type ReactNode } from "react";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { cn } from "../../utils/classNames";
import { CodeBlockEditor, CODE_LANGUAGE_OPTIONS } from "../blocks/code/CodeBlockEditor";
import { HeadingBlockEditor } from "../blocks/heading/HeadingBlockEditor";
import { LatexPreview, MarkdownPreview, MarkupBlockEditor } from "../blocks/markup/MarkupBlock";
import { RichTextEditor } from "../blocks/richText/RichTextEditor";
import { createRichTextDocument } from "../blocks/richText/richTextCore";
import {
  createStudyBlockDocument,
  createStudyCodeBlock,
  createStudyHeadingBlock,
  createStudyLatexBlock,
  createStudyMarkdownBlock,
  createStudyTextBlock,
  normalizeStudyBlockDocument,
  type StudyBlockDocument,
  type StudyContentBlock,
  type StudyHeadingLevel,
} from "../core/blockCore";
import { StudyReadTree } from "./readMode";

interface StudyBlockEditorProps {
  value: unknown;
  mode: "edit" | "read";
  onChange: (document: StudyBlockDocument, plainText: string) => void;
  sidebarFooter?: ReactNode;
}

const HEADING_LEVEL_OPTIONS = [1, 2, 3, 4, 5] as const;
const END_INSERT_SLOT_ID = "__study-block-end__";
const BLOCK_INSERT_OPTIONS: Array<{ type: StudyContentBlock["type"]; label: string; icon: LucideIcon }> = [
  { type: "text", label: "Текст", icon: Type },
  { type: "heading", label: "Заголовок", icon: Heading },
  { type: "markdown", label: "Markdown", icon: Code2 },
  { type: "latex", label: "LaTeX", icon: Sigma },
  { type: "code", label: "Code", icon: Code2 },
];

export function StudyBlockEditor({ value, mode, onChange, sidebarFooter }: StudyBlockEditorProps) {
  const document = useMemo(() => normalizeStudyBlockDocument(value), [value]);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [activeTextEditorId, setActiveTextEditorId] = useState<string | null>(null);
  const [previewBlockIds, setPreviewBlockIds] = useState<Record<string, boolean>>({});
  const [insertSlotAfterId, setInsertSlotAfterId] = useState<string | null>(null);
  const [insertMenuAfterId, setInsertMenuAfterId] = useState<string | null>(null);
  const [blockPendingDelete, setBlockPendingDelete] = useState<StudyContentBlock | null>(null);
  const [textToolbarTarget, setTextToolbarTarget] = useState<HTMLDivElement | null>(null);
  const activeBlock = document.blocks.find((block) => block.id === activeBlockId) ?? null;
  const ActiveBlockIcon = activeBlock ? blockTypeIcon(activeBlock.type) : Type;

  function emitBlocks(blocks: StudyContentBlock[]) {
    const nextDocument = createStudyBlockDocument(blocks);
    onChange(nextDocument, nextDocument.plainText);
  }

  function updateBlock(blockId: string, update: (block: StudyContentBlock) => StudyContentBlock) {
    emitBlocks(document.blocks.map((block) => (block.id === blockId ? update(block) : block)));
  }

  async function addBlock(type: StudyContentBlock["type"], afterId?: string) {
    const block = await createBlock(type);
    const index = afterId ? document.blocks.findIndex((item) => item.id === afterId) : document.blocks.length - 1;
    const insertAt = index >= 0 ? index + 1 : document.blocks.length;

    emitBlocks([...document.blocks.slice(0, insertAt), block, ...document.blocks.slice(insertAt)]);
    setActiveBlockId(block.id);
    setActiveTextEditorId(type === "text" ? `text:${block.id}` : null);
    setInsertSlotAfterId(null);
    setInsertMenuAfterId(null);
  }

  async function createBlock(type: StudyContentBlock["type"]): Promise<StudyContentBlock> {
    if (type === "heading") return createStudyHeadingBlock();
    if (type === "markdown") return createStudyMarkdownBlock();
    if (type === "latex") return createStudyLatexBlock();
    if (type === "code") return createStudyCodeBlock();

    return createStudyTextBlock();
  }

  function removeBlock(blockId: string) {
    if (document.blocks.length <= 1) {
      emitBlocks([createStudyTextBlock()]);
      return;
    }

    emitBlocks(document.blocks.filter((block) => block.id !== blockId));
    setActiveBlockId(null);
    setActiveTextEditorId(null);
    setInsertSlotAfterId(null);
    setInsertMenuAfterId(null);
  }

  function moveBlock(blockId: string, direction: -1 | 1) {
    const index = document.blocks.findIndex((block) => block.id === blockId);
    const nextIndex = index + direction;

    if (index < 0 || nextIndex < 0 || nextIndex >= document.blocks.length) return;

    const blocks = [...document.blocks];
    const [block] = blocks.splice(index, 1);
    blocks.splice(nextIndex, 0, block);
    emitBlocks(blocks);
  }

  function toggleBlockPreview(blockId: string) {
    setPreviewBlockIds((current) => ({
      ...current,
      [blockId]: !current[blockId],
    }));
  }

  if (mode === "read") {
    return <StudyReadTree blocks={document.blocks} />;
  }

  return (
    <div className="min-w-0">
      <div className="grid grid-cols-[minmax(0,1fr)_340px] items-start gap-4 max-[1100px]:grid-cols-1">
        <div className="min-w-0">
          <div className="grid gap-3">
            {document.blocks.map((block, index) => (
              <Fragment key={block.id}>
                <section
                  className={cn(studyContentBlockClass, activeBlockId === block.id && studyContentBlockActiveClass)}
                  onMouseDown={() => {
                    setActiveBlockId(block.id);
                    setInsertSlotAfterId(null);
                    setInsertMenuAfterId(null);
                    if (block.type !== "text") {
                      setActiveTextEditorId(null);
                    }
                  }}
                >
                  <div className="mb-3 flex items-center gap-2">
                    <GripVertical className="text-app-muted" size={16} />
                    <span className="mr-auto text-sm font-extrabold text-app-text">{blockTypeLabel(block.type)}</span>
                    {isPreviewableBlock(block.type) ? (
                      <button
                        className={cn(iconButtonClass, previewBlockIds[block.id] && iconButtonActiveClass)}
                        type="button"
                        onClick={() => toggleBlockPreview(block.id)}
                        aria-label="Предпросмотр блока"
                        title="Предпросмотр"
                      >
                        <Eye size={16} />
                      </button>
                    ) : null}
                    <button
                      className={iconButtonClass}
                      type="button"
                      onClick={() => moveBlock(block.id, -1)}
                      disabled={index === 0}
                      aria-label="Переместить блок вверх"
                    >
                      <ArrowUp size={16} />
                    </button>
                    <button
                      className={iconButtonClass}
                      type="button"
                      onClick={() => moveBlock(block.id, 1)}
                      disabled={index === document.blocks.length - 1}
                      aria-label="Переместить блок вниз"
                    >
                      <ArrowDown size={16} />
                    </button>
                  <button
                    className={dangerIconButtonClass}
                    type="button"
                    onClick={() => setBlockPendingDelete(block)}
                    aria-label="Удалить блок"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                  {block.type === "heading" ? (
                    <HeadingBlockEditor
                      block={block}
                      onChange={(text) =>
                        updateBlock(block.id, (current) =>
                          current.type === "heading"
                            ? {
                                ...current,
                                text,
                              }
                            : current,
                        )
                      }
                    />
                  ) : block.type === "text" ? (
                    <RichTextEditor
                      value={block.content}
                      showToolbar={activeTextEditorId === `text:${block.id}` && Boolean(textToolbarTarget)}
                      toolbarTarget={textToolbarTarget}
                      onEditorFocus={() => {
                        setActiveBlockId(block.id);
                        setActiveTextEditorId(`text:${block.id}`);
                      }}
                      onChange={(html, plainText) =>
                        updateBlock(block.id, (current) =>
                          current.type === "text"
                            ? {
                                ...current,
                                content: createRichTextDocument(html, plainText),
                              }
                            : current,
                        )
                      }
                    />
                  ) : block.type === "markdown" ? (
                    <MarkupBlockEditor
                      label="Markdown"
                      value={block.source}
                      placeholder="# Заголовок&#10;&#10;- пункт списка&#10;- **важный** текст"
                      preview={<MarkdownPreview source={block.source} />}
                      previewMode={Boolean(previewBlockIds[block.id])}
                      onChange={(source) =>
                        updateBlock(block.id, (current) =>
                          current.type === "markdown"
                            ? {
                                ...current,
                                source,
                              }
                            : current,
                        )
                      }
                    />
                  ) : block.type === "latex" ? (
                    <MarkupBlockEditor
                      label="LaTeX"
                      value={block.source}
                      placeholder="E = mc^2"
                      preview={<LatexPreview source={block.source} displayMode={block.displayMode} />}
                      previewMode={Boolean(previewBlockIds[block.id])}
                      onChange={(source) =>
                        updateBlock(block.id, (current) =>
                          current.type === "latex"
                            ? {
                                ...current,
                                source,
                              }
                            : current,
                        )
                      }
                    />
                  ) : (
                    <CodeBlockEditor
                      block={block}
                      previewMode={Boolean(previewBlockIds[block.id])}
                      onChangeSource={(source) =>
                        updateBlock(block.id, (current) =>
                          current.type === "code"
                            ? {
                                ...current,
                                source,
                              }
                            : current,
                        )
                      }
                    />
                  )}
                </section>

                {index < document.blocks.length - 1 ? (
                  <BlockInsertDivider
                    isActive={insertSlotAfterId === block.id || insertMenuAfterId === block.id}
                    isOpen={insertMenuAfterId === block.id}
                    onActivate={() => {
                      setInsertSlotAfterId(block.id);
                      setInsertMenuAfterId(null);
                    }}
                    onToggle={() => {
                      setInsertSlotAfterId(block.id);
                      setInsertMenuAfterId((current) => (current === block.id ? null : block.id));
                    }}
                    onPick={(type) => void addBlock(type, block.id)}
                  />
                ) : null}
              </Fragment>
            ))}
          </div>

          <BlockInsertDivider
            isActive={insertSlotAfterId === END_INSERT_SLOT_ID || insertMenuAfterId === END_INSERT_SLOT_ID}
            isOpen={insertMenuAfterId === END_INSERT_SLOT_ID}
            onActivate={() => {
              setInsertSlotAfterId(END_INSERT_SLOT_ID);
              setInsertMenuAfterId(null);
            }}
            onToggle={() => {
              setInsertSlotAfterId(END_INSERT_SLOT_ID);
              setInsertMenuAfterId((current) => (current === END_INSERT_SLOT_ID ? null : END_INSERT_SLOT_ID));
            }}
            onPick={(type) => void addBlock(type)}
          />
        </div>

        <div className="sticky top-4 grid gap-3 max-[1100px]:static">
          <aside className="grid gap-3 rounded-panel border border-[var(--glass-border)] bg-[var(--panel-bg)] p-4 text-app-text [backdrop-filter:var(--glass-blur)] shadow-panel" aria-label="Настройки активного блока">
            <div className="border-b border-app-border pb-3">
              <strong className="text-base font-extrabold text-app-text">Настройки</strong>
            </div>

            <div className="grid gap-2 border-b border-app-border pb-3">
              <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-app-muted">Тип</span>
              <div className="inline-flex w-fit items-center gap-2 rounded-control border border-[color-mix(in_srgb,var(--accent)_28%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_10%,var(--surface-strong))] px-3 py-2 text-sm font-extrabold text-app-accent-strong">
                <ActiveBlockIcon size={16} />
                <span>{activeBlock ? blockTypeLabel(activeBlock.type) : "Блок не выбран"}</span>
              </div>
            </div>

            <div className="grid gap-2 border-b border-app-border pb-3">
              <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-app-muted">Форматирование</span>
              <div className="min-h-[44px]" ref={setTextToolbarTarget}>
                {!activeTextEditorId ? <span className="text-sm text-app-muted">Выбери текстовый блок</span> : null}
              </div>
            </div>

            {activeBlock?.type === "heading" || activeBlock?.type === "code" ? (
              <div className="grid gap-2">
                <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-app-muted">Разметка</span>

                {activeBlock.type === "heading" ? (
                  <label className={settingsLabelClass}>
                    <span>Уровень</span>
                    <select
                      value={activeBlock.level}
                      onChange={(event) =>
                        updateBlock(activeBlock.id, (current) =>
                          current.type === "heading"
                            ? {
                                ...current,
                                level: Number(event.target.value) as StudyHeadingLevel,
                              }
                            : current,
                        )
                      }
                    >
                      {HEADING_LEVEL_OPTIONS.map((level) => (
                        <option value={level} key={level}>
                          H{level}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}

                {activeBlock.type === "code" ? (
                  <label className={settingsLabelClass}>
                    <span>Язык</span>
                    <select
                      value={activeBlock.language || "auto"}
                      onChange={(event) =>
                        updateBlock(activeBlock.id, (current) =>
                          current.type === "code"
                            ? {
                                ...current,
                                language: event.target.value,
                              }
                            : current,
                        )
                      }
                    >
                      {CODE_LANGUAGE_OPTIONS.map((option) => (
                        <option value={option.value} key={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
              </div>
            ) : null}
          </aside>

          {sidebarFooter ? <div>{sidebarFooter}</div> : null}
        </div>
      </div>

      {blockPendingDelete ? (
        <ConfirmDialog
          title={`Удалить блок «${blockTypeLabel(blockPendingDelete.type)}»?`}
          message={
            document.blocks.length <= 1
              ? "Блок будет очищен и заменён пустым текстовым блоком."
              : "Это действие нельзя отменить."
          }
          confirmLabel="Удалить"
          confirmVariant="danger"
          action="delete"
          onCancel={() => setBlockPendingDelete(null)}
          onConfirm={() => {
            const blockId = blockPendingDelete.id;
            setBlockPendingDelete(null);
            removeBlock(blockId);
          }}
        />
      ) : null}
    </div>
  );
}

function BlockInsertDivider({
  isActive,
  isOpen,
  onActivate,
  onToggle,
  onPick,
}: {
  isActive: boolean;
  isOpen: boolean;
  onActivate: () => void;
  onToggle: () => void;
  onPick: (type: StudyContentBlock["type"]) => void;
}) {
  return (
    <div
      className={cn(blockInsertDividerClass, (isActive || isOpen) && blockInsertDividerActiveClass)}
      onClick={() => {
        if (isActive) {
          onToggle();
          return;
        }

        onActivate();
      }}
    >
      <span
        className={cn(blockInsertToggleClass, (isActive || isOpen) && "opacity-100 scale-100")}
        title="Добавить блок"
        aria-hidden="true"
      >
        <Plus size={15} />
      </span>

      {isOpen ? (
        <div className="absolute left-1/2 top-[calc(100%+8px)] z-20 flex -translate-x-1/2 flex-wrap items-center gap-2 rounded-panel border border-[var(--glass-border)] bg-[var(--panel-bg)] p-2 [backdrop-filter:var(--glass-blur)] shadow-modal" onClick={(event) => event.stopPropagation()}>
          <BlockTypeButtons className={blockInsertOptionClass} onPick={onPick} />
        </div>
      ) : null}
    </div>
  );
}

function BlockTypeButtons({
  className,
  onPick,
}: {
  className: string;
  onPick: (type: StudyContentBlock["type"]) => void;
}) {
  return (
    <>
      {BLOCK_INSERT_OPTIONS.map(({ type, label, icon: Icon }) => (
        <button className={className} type="button" onClick={() => onPick(type)} key={type}>
          <Icon size={16} />
          {label}
        </button>
      ))}
    </>
  );
}

function isPreviewableBlock(type: StudyContentBlock["type"]) {
  return type === "markdown" || type === "latex" || type === "code";
}

function blockTypeLabel(type: StudyContentBlock["type"]) {
  if (type === "heading") return "Заголовок";
  if (type === "markdown") return "Markdown";
  if (type === "latex") return "LaTeX";
  if (type === "code") return "Code";
  return "Текст";
}

function blockTypeIcon(type: StudyContentBlock["type"]) {
  return BLOCK_INSERT_OPTIONS.find((option) => option.type === type)?.icon ?? Type;
}

const studyContentBlockClass =
  "rounded-panel border border-app-border bg-app-surface-soft p-4 text-app-text transition-colors";
const studyContentBlockActiveClass =
  "border-[color-mix(in_srgb,var(--accent)_50%,var(--border))] shadow-[0_0_0_1px_color-mix(in_srgb,var(--accent)_28%,transparent)]";
const iconButtonClass =
  "inline-flex h-9 w-9 items-center justify-center rounded-control border border-app-border bg-app-surface-strong text-app-muted transition-colors hover:border-[color-mix(in_srgb,var(--accent)_42%,var(--border))] hover:text-app-accent-strong disabled:cursor-not-allowed disabled:opacity-45";
const iconButtonActiveClass =
  "border-[color-mix(in_srgb,var(--accent)_56%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_16%,var(--surface-strong))] text-app-accent-strong";
const dangerIconButtonClass =
  "inline-flex h-9 w-9 items-center justify-center rounded-control border border-[color-mix(in_srgb,var(--danger)_46%,var(--border))] bg-[color-mix(in_srgb,var(--danger)_12%,var(--surface-strong))] text-app-danger transition-colors hover:border-app-danger hover:bg-[color-mix(in_srgb,var(--danger)_18%,var(--surface-strong))]";
const settingsLabelClass =
  "grid gap-1.5 text-xs font-extrabold uppercase tracking-[0.08em] text-app-muted [&_select]:min-h-control [&_select]:w-full [&_select]:px-3 [&_select]:text-sm [&_select]:font-bold [&_select]:normal-case [&_select]:tracking-normal";
const blockInsertDividerClass =
  "group relative my-1 grid h-5 cursor-pointer place-items-center transition-[height] duration-150 hover:h-10";
const blockInsertDividerActiveClass = "h-10";
const blockInsertToggleClass =
  "grid h-7 w-7 scale-90 place-items-center rounded-full border border-[color-mix(in_srgb,var(--accent)_45%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_14%,var(--surface-strong))] text-app-accent-strong opacity-0 shadow-panel transition-all group-hover:opacity-100";
const blockInsertOptionClass =
  "inline-flex min-h-control items-center gap-2 rounded-control border border-app-border bg-app-surface-strong px-3 py-2 text-sm font-bold text-app-text transition-colors hover:border-[color-mix(in_srgb,var(--accent)_42%,var(--border))] hover:text-app-accent-strong";
