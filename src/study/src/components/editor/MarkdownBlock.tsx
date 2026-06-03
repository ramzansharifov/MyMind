import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownBlockProps {
  value: string;
  editable: boolean;
  onChange: (value: string) => void;
}

export function MarkdownBlock({
  value,
  editable,
  onChange,
}: MarkdownBlockProps) {
  const [preview, setPreview] = useState(!editable);

  const markdownPreview = (
    <div className="markdown-view">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {value}
      </ReactMarkdown>
    </div>
  );

  if (!editable) {
    return markdownPreview;
  }

  return (
    <div className="border border-black bg-white">
      <div className="flex items-center justify-between border-b border-black bg-neutral-100 px-3 py-2">
        <div>
          <span className="font-bold">Markdown</span>
          <p className="text-xs text-neutral-600">
            Поддерживает GFM: таблицы, чекбоксы, зачёркивание, ссылки, списки и code blocks.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setPreview((previous) => !previous)}
          className="border border-black bg-white px-3 py-1 text-sm hover:bg-black hover:text-white"
        >
          {preview ? "Редактировать" : "Превью"}
        </button>
      </div>

      {preview ? (
        <div className="p-3">
          {markdownPreview}
        </div>
      ) : (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={12}
          spellCheck={false}
          className="w-full border-0 bg-white px-3 py-2 font-mono text-sm outline-none"
          placeholder={"# Заголовок\n\nТекст с **жирным**, *курсивом*, ~~зачёркиванием~~.\n\n- пункт\n- пункт\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n- [ ] задача\n- [x] готово"}
        />
      )}
    </div>
  );
}
