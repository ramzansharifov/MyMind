import katex from "katex";
import "katex/dist/katex.min.css";
import { useMemo, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AutoResizeTextarea } from "../../components/AutoResizeTextarea";

export function MarkupBlockEditor({
  label,
  value,
  placeholder,
  preview,
  previewMode,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  preview: ReactNode;
  previewMode: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="study-markup-block">
      {previewMode ? (
        <div className="study-markup-preview">{preview}</div>
      ) : (
        <label className="study-markup-source">
          <span>{label}</span>
          <AutoResizeTextarea value={value} placeholder={placeholder} minRows={2} onChange={onChange} />
        </label>
      )}
    </div>
  );
}

export function MarkdownPreview({ source }: { source: string }) {
  if (!source.trim()) {
    return <p className="muted-text">Markdown пуст.</p>;
  }

  return (
    <div className="study-markdown-preview">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{source}</ReactMarkdown>
    </div>
  );
}

export function LatexPreview({ source, displayMode }: { source: string; displayMode: boolean }) {
  const html = useMemo(() => {
    if (!source.trim()) return "";

    try {
      return katex.renderToString(source, {
        displayMode,
        output: "html",
        throwOnError: false,
        strict: false,
        trust: false,
      });
    } catch (error) {
      return `<span class="study-latex-error">${escapeHtml(error instanceof Error ? error.message : "LaTeX error")}</span>`;
    }
  }, [displayMode, source]);

  if (!html) {
    return <p className="muted-text">LaTeX пуст.</p>;
  }

  return <div className="study-latex-preview" dangerouslySetInnerHTML={{ __html: html }} />;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
