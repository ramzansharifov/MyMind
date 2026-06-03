import { useState } from 'react';
import {
  RichTextEditor,
  type RichTextActiveMarks,
  type RichTextCommand,
} from "./StudyRichTextEditor";
import type { StudyBlock, StudyContentBlock, StudyNode } from "../../types";
import { StudyLatexView } from './StudyLatexView';

interface StudyContentEditorProps {
  block: StudyContentBlock;
  nodes: StudyNode[];
  formatCommand?: RichTextCommand | null;
  onChange: (update: (block: StudyBlock) => StudyBlock) => void;
  onOpenNode: (nodeId: string) => void;
  onRichTextMarksChange?: (marks: RichTextActiveMarks) => void;
  onActiveRichTextEditorChange?: (editorId: string) => void;
}

export function StudyContentEditor({
  block,
  nodes,
  formatCommand,
  onChange,
  onOpenNode,
  onRichTextMarksChange,
  onActiveRichTextEditorChange,
}: StudyContentEditorProps) {
  function updateContent(content: string) {
    onChange((item) => ({ ...(item as StudyContentBlock), content }));
  }

  if (block.type === "heading") {
    const style = block.settings?.headingStyle ?? "h1";
    const HeadingTag = style as "h1" | "h2" | "h3";

    return (
      <HeadingTag className="study-heading-editor">
        <RichTextEditor
          editorId={block.id}
          value={block.content}
          nodes={nodes}
          editable
          formatCommand={formatCommand}
          onChange={updateContent}
          onOpenNode={onOpenNode}
          onActiveMarksChange={onRichTextMarksChange}
          onActiveEditorChange={onActiveRichTextEditorChange}
        />
      </HeadingTag>
    );
  }

  const [latexPreview, setLatexPreview] = useState(false);

  if (block.type === "code") {
    return (
      <textarea
        value={block.content}
        onChange={(event) => updateContent(event.target.value)}
        className="study-raw-editor"
        placeholder="Paste code here..."
      />
    );
  }

  if (block.type === "latex") {
    return (
      <div className="study-latex-editor-wrap">
        <div className="study-latex-toolbar">
          <button
            type="button"
            className="button ghost"
            onClick={() => setLatexPreview(!latexPreview)}
          >
            {latexPreview ? 'Edit' : 'Preview'}
          </button>
        </div>
        {latexPreview ? (
          <StudyLatexView code={block.content} />
        ) : (
          <textarea
            value={block.content}
            onChange={(event) => updateContent(event.target.value)}
            className="study-raw-editor"
            placeholder="Paste LaTeX here..."
          />
        )}
      </div>
    );
  }

  return (
    <div className="study-content-rich-editor">
      <RichTextEditor
        editorId={block.id}
        value={block.content}
        nodes={nodes}
        editable
        formatCommand={formatCommand}
        onChange={updateContent}
        onOpenNode={onOpenNode}
        onActiveMarksChange={onRichTextMarksChange}
        onActiveEditorChange={onActiveRichTextEditorChange}
      />
    </div>
  );
}
