import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import css from "highlight.js/lib/languages/css";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import markdown from "highlight.js/lib/languages/markdown";
import python from "highlight.js/lib/languages/python";
import sql from "highlight.js/lib/languages/sql";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import { useMemo } from "react";
import { AutoResizeTextarea } from "../../components/AutoResizeTextarea";
import type { StudyCodeBlock } from "../../core/blockCore";

export const CODE_LANGUAGE_OPTIONS = [
  { value: "auto", label: "Auto" },
  { value: "typescript", label: "TypeScript" },
  { value: "javascript", label: "JavaScript" },
  { value: "tsx", label: "TSX" },
  { value: "jsx", label: "JSX" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "json", label: "JSON" },
  { value: "python", label: "Python" },
  { value: "bash", label: "Bash" },
  { value: "sql", label: "SQL" },
  { value: "markdown", label: "Markdown" },
];

const HIGHLIGHT_LANGUAGES = [
  ["bash", bash],
  ["css", css],
  ["html", xml],
  ["javascript", javascript],
  ["jsx", typescript],
  ["json", json],
  ["markdown", markdown],
  ["python", python],
  ["sql", sql],
  ["tsx", typescript],
  ["typescript", typescript],
] as const;

HIGHLIGHT_LANGUAGES.forEach(([name, language]) => {
  if (!hljs.getLanguage(name)) {
    hljs.registerLanguage(name, language);
  }
});

export function CodeBlockEditor({
  block,
  previewMode,
  onChangeSource,
}: {
  block: StudyCodeBlock;
  previewMode: boolean;
  onChangeSource: (source: string) => void;
}) {
  return (
    <div className="grid gap-3">
      {previewMode ? (
        <div className="rounded-panel border border-app-border bg-app-surface p-3">
          <CodePreview source={block.source} language={block.language} />
        </div>
      ) : (
        <div className="grid gap-2 rounded-panel border border-app-border bg-app-surface p-3">
          <AutoResizeTextarea
            value={block.source}
            placeholder={'function hello() {\n  return "world";\n}'}
            minRows={2}
            spellCheck={false}
            onChange={onChangeSource}
          />
        </div>
      )}
    </div>
  );
}

export function CodePreview({ source, language }: { source: string; language: string }) {
  const html = useMemo(() => {
    if (!source.trim()) return "";

    try {
      if (language && language !== "auto" && hljs.getLanguage(language)) {
        return hljs.highlight(source, {
          language,
          ignoreIllegals: true,
        }).value;
      }

      return hljs.highlightAuto(source).value;
    } catch {
      return escapeHtml(source);
    }
  }, [language, source]);

  if (!html) {
    return <p className="text-sm text-app-muted">Code is empty.</p>;
  }

  return (
    <pre className="m-0 max-w-full overflow-x-auto rounded-panel border border-app-border bg-[#0d1117] p-4 text-sm leading-6 text-[#e6edf3]">
      <code
        className={`hljs ${language && language !== "auto" ? `language-${language}` : ""}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </pre>
  );
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
