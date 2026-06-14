import katex from "katex";
import { useMemo, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AutoResizeTextarea } from "../../components/AutoResizeTextarea";

export function MarkupBlockEditor({
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
    <div className="grid gap-3">
      {previewMode ? (
        <div className="rounded-panel border border-app-border bg-app-surface p-4">{preview}</div>
      ) : (
        <label className="grid gap-2 rounded-panel border border-app-border bg-app-surface p-3">
          <AutoResizeTextarea value={value} placeholder={placeholder} minRows={2} onChange={onChange} />
        </label>
      )}
    </div>
  );
}

export function MarkdownPreview({ source }: { source: string }) {
  if (!source.trim()) {
    return <p className="text-sm text-app-muted">Markdown пуст.</p>;
  }

  return (
    <div className={markdownPreviewClass}>
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
      return `<span data-latex-error="true">${escapeHtml(error instanceof Error ? error.message : "LaTeX error")}</span>`;
    }
  }, [displayMode, source]);

  if (!html) {
    return <p className="text-sm text-app-muted">LaTeX пуст.</p>;
  }

  return <div className="overflow-x-auto text-app-text [&_[data-latex-error='true']]:text-app-danger" dangerouslySetInnerHTML={{ __html: html }} />;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const markdownPreviewClass =
  "text-app-text leading-7 [&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-app-accent [&_blockquote]:bg-app-surface-soft [&_blockquote]:py-2 [&_blockquote]:pl-4 [&_code]:rounded [&_code]:border [&_code]:border-app-border [&_code]:bg-app-surface-strong [&_code]:px-1.5 [&_code]:py-0.5 [&_h1]:mb-3 [&_h1]:text-3xl [&_h1]:font-extrabold [&_h2]:mb-3 [&_h2]:text-2xl [&_h2]:font-extrabold [&_h3]:mb-2 [&_h3]:text-xl [&_h3]:font-extrabold [&_li]:my-1 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-3 [&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-panel [&_pre]:border [&_pre]:border-app-border [&_pre]:bg-app-bg [&_pre]:p-3 [&_pre_code]:border-0 [&_pre_code]:bg-transparent [&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-app-border [&_td]:p-2 [&_th]:border [&_th]:border-app-border [&_th]:bg-app-surface-strong [&_th]:p-2 [&_th]:text-left [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6";
