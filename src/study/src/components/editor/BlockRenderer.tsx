import type {
  CustomBlockTemplate,
  StudyBlock,
  StudyNode,
} from "../../types/study";
import {
  getDefaultCustomValue,
  isBoardBlock,
  isContentBlock,
  isCustomBlock,
  isFileBlock,
  isTableBlock,
} from "../../utils/blocks";
import { resolveInternalLinks } from "../../utils/internalLinks";
import { BoardCanvas } from "../board/BoardCanvas";
import { FileBlock } from "./FileBlock";
import { TextWithInternalLinks } from "./TextWithInternalLinks";
import { MarkdownBlock } from "./MarkdownBlock";
import { CodeBlock } from "./CodeBlock";
import { LatexBlock } from "./LatexBlock";
import { FlexibleTableBlock } from "./FlexibleTableBlock";
import { RichTextEditor, type RichTextActiveMarks, type RichTextCommand } from "./RichTextEditor";
import { getInputStyle, getVisualStyle } from "../../core/editorBlockStyles";
import { CustomFieldRenderer } from "./block-renderers/CustomFieldRenderer";

interface BlockRendererProps {
  block: StudyBlock;
  nodes: StudyNode[];
  templates: CustomBlockTemplate[];
  editable: boolean;
  richTextCommand?: RichTextCommand | null;
  onRichTextMarksChange?: (marks: RichTextActiveMarks) => void;
  onActiveRichTextEditorChange?: (editorId: string) => void;
  onChange: (block: StudyBlock) => void;
  onOpenNode: (nodeId: string) => void;
}

export function BlockRenderer({
  block,
  nodes,
  templates,
  editable,
  richTextCommand,
  onRichTextMarksChange,
  onActiveRichTextEditorChange,
  onChange,
  onOpenNode,
}: BlockRendererProps) {
  const visualStyle = getVisualStyle(block);

  if (isContentBlock(block)) {
    if (!editable) {
      if (block.type === "heading") {
        return (
          <div style={visualStyle}>
            {block.content}
          </div>
        );
      }

      if (block.type === "latex") {
        return (
          <div style={visualStyle}>
            <LatexBlock
              value={block.content}
              editable={false}
              onChange={() => {}}
            />
          </div>
        );
      }

      if (block.type === "markdown") {
        return (
          <div style={visualStyle}>
            <MarkdownBlock
              value={block.content}
              editable={false}
              onChange={() => {}}
            />
          </div>
        );
      }

      if (block.type === "code") {
        return (
          <div style={visualStyle}>
            <CodeBlock
              value={block.content}
              language={block.settings?.codeLanguage ?? "plain"}
              editable={false}
              wrap={Boolean(block.settings?.codeWrap)}
              fontSize={block.settings?.fontSize}
              textColor={block.settings?.textColor}
              backgroundColor={block.settings?.backgroundColor}
              padding={block.settings?.padding}
              onChange={() => {}}
            />
          </div>
        );
      }

      if (block.type === "text") {
        return (
          <div style={visualStyle}>
            <RichTextEditor
              editorId={block.id}
              value={block.content}
              nodes={nodes}
              editable={false}
              onChange={() => {}}
              onOpenNode={onOpenNode}
            />
          </div>
        );
      }

      return (
        <div className="whitespace-pre-wrap leading-8" style={visualStyle}>
          <TextWithInternalLinks
            text={block.content}
            nodes={nodes}
            onOpenNode={onOpenNode}
          />
        </div>
      );
    }

    return (
      <div style={visualStyle}>
        {block.type === "heading" ? (
          <input
            value={block.content}
            onChange={(event) =>
              onChange({
                ...block,
                content: event.target.value,
              })
            }
            style={getInputStyle(block)}
            className="w-full border border-black bg-white px-3 py-2 font-bold outline-none"
          />
        ) : block.type === "text" ? (
          <RichTextEditor
            editorId={block.id}
            value={block.content}
            nodes={nodes}
            placeholder="Текст блока. Можно выделять части текста и форматировать их. Внутренняя ссылка: [[Название материала]]"
            editable
            formatCommand={richTextCommand}
            onActiveMarksChange={onRichTextMarksChange}
            onActiveEditorChange={onActiveRichTextEditorChange}
            onChange={(nextContent) =>
              onChange({
                ...block,
                content: nextContent,
              })
            }
            onOpenNode={onOpenNode}
          />
        ) : block.type === "latex" ? (
          <LatexBlock
            value={block.content}
            editable
            onChange={(nextContent) =>
              onChange({
                ...block,
                content: nextContent,
              })
            }
          />
        ) : block.type === "markdown" ? (
          <MarkdownBlock
            value={block.content}
            editable
            onChange={(nextContent) =>
              onChange({
                ...block,
                content: nextContent,
              })
            }
          />
        ) : block.type === "code" ? (
          <CodeBlock
            value={block.content}
            language={block.settings?.codeLanguage ?? "plain"}
            editable
            wrap={Boolean(block.settings?.codeWrap)}
            fontSize={block.settings?.fontSize}
            textColor={block.settings?.textColor}
            backgroundColor={block.settings?.backgroundColor}
            padding={block.settings?.padding}
            onChange={(nextContent) =>
              onChange({
                ...block,
                content: nextContent,
              })
            }
          />
        ) : (
          <textarea
            value={block.content}
            onChange={(event) =>
              onChange({
                ...block,
                content: event.target.value,
              })
            }
            rows={6}
            placeholder="Текст блока. Внутренняя ссылка: [[Название материала]]"
            style={getInputStyle(block)}
            className="w-full border border-black bg-white px-3 py-2 outline-none"
          />
        )}

        {block.content.includes("[[") && (
          <div className="mt-3 border border-black bg-neutral-100 p-3 text-sm">
            <p className="font-bold">Внутренние ссылки:</p>

            <div className="mt-2 flex flex-wrap gap-2">
              {resolveInternalLinks(block.content, nodes).map((link) => (
                <span
                  key={`${link.label}_${link.found}`}
                  className={[
                    "border border-black px-2 py-1",
                    link.found ? "bg-black text-white" : "bg-white text-black line-through",
                  ].join(" ")}
                >
                  [[{link.label}]] {link.found ? "найдена" : "не найдена"}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (isTableBlock(block)) {
    return (
      <div style={visualStyle}>
        <FlexibleTableBlock
          block={block}
          nodes={nodes}
          editable={editable}
          formatCommand={richTextCommand}
          onChange={onChange}
          onOpenNode={onOpenNode}
          onRichTextMarksChange={onRichTextMarksChange}
          onActiveRichTextEditorChange={onActiveRichTextEditorChange}
        />
      </div>
    );
  }

  if (isBoardBlock(block)) {
    return (
      <div style={visualStyle}>
        {editable ? (
          <input
            value={block.title}
            onChange={(event) =>
              onChange({
                ...block,
                title: event.target.value,
              })
            }
            style={getInputStyle(block)}
            className="mb-3 w-full border border-black bg-white px-3 py-2 font-bold outline-none"
          />
        ) : (
          <h3 className="mb-3 font-bold">{block.title}</h3>
        )}

        <BoardCanvas
          title={block.title}
          strokes={block.strokes}
          editable={editable}
          onChange={(strokes) =>
            onChange({
              ...block,
              strokes,
            })
          }
        />
      </div>
    );
  }

  if (isFileBlock(block)) {
    return (
      <div style={visualStyle}>
        <FileBlock
          block={block}
          editable={editable}
          onChange={onChange}
        />
      </div>
    );
  }

  if (block.type === "divider") {
    return <hr className="border-black" />;
  }

  if (isCustomBlock(block)) {
    const template = templates.find((item) => item.id === block.templateId);

    if (!template) {
      return (
        <div className="border border-black bg-white p-4" style={visualStyle}>
          <p className="font-bold">Кастомный блок</p>
          <p className="mt-2 text-sm text-neutral-600">
            Шаблон не найден. ID шаблона: {block.templateId}
          </p>

          <div className="mt-4 space-y-3">
            {Object.entries(block.values).map(([key, value]) => (
              <div key={key} className="border border-black bg-neutral-100 p-3">
                <p className="text-sm font-bold">{key}</p>
                <p className="mt-1">{String(value) || "—"}</p>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div style={visualStyle}>
        <div className="mb-4 border border-black bg-neutral-100 p-3">
          <p className="font-bold">
            [{template.icon || "B"}] {template.name}
          </p>

          {template.description && (
            <p className="mt-1 text-sm text-neutral-600">
              {template.description}
            </p>
          )}
        </div>

        <div className="space-y-3">
          {template.fields.map((field) => {
            const value = block.values[field.id] ?? getDefaultCustomValue(field.type);

            return (
              <CustomFieldRenderer
                key={field.id}
                field={field}
                value={value}
                editable={editable}
                nodes={nodes}
                onOpenNode={onOpenNode}
                onChange={(nextValue) =>
                  onChange({
                    ...block,
                    values: {
                      ...block.values,
                      [field.id]: nextValue,
                    },
                  })
                }
              />
            );
          })}
        </div>
      </div>
    );
  }

  return null;
}
