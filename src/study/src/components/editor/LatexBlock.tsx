import { useState } from "react";
import { LatexView } from "../latex/LatexView";

interface LatexBlockProps {
  value: string;
  editable: boolean;
  onChange: (value: string) => void;
}

export function LatexBlock({
  value,
  editable,
  onChange,
}: LatexBlockProps) {
  const [preview, setPreview] = useState(!editable);

  if (!editable) {
    return (
      <div className="latex-block-view">
        <LatexView code={value} displayMode />
      </div>
    );
  }

  return (
    <div className="border border-black bg-white">
      <div className="flex items-center justify-between border-b border-black bg-neutral-100 px-3 py-2">
        <div>
          <span className="font-bold">LaTeX</span>
          <p className="text-xs text-neutral-600">
            Введи LaTeX-код формулы и переключись в превью.
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
        <div className="p-4">
          <LatexView code={value} displayMode />
        </div>
      ) : (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={5}
          spellCheck={false}
          className="w-full border-0 bg-white px-3 py-2 font-mono text-sm outline-none"
          placeholder={"v = \\frac{s}{t}"}
        />
      )}
    </div>
  );
}
