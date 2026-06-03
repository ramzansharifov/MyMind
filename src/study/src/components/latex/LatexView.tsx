import katex from "katex";
import "katex/dist/katex.min.css";

interface LatexViewProps {
  code: string;
  displayMode?: boolean;
}

function normalizeLatexCode(code: string): string {
  let result = code.trim();

  if (result.startsWith("$$") && result.endsWith("$$")) {
    result = result.slice(2, -2).trim();
  }

  if (result.startsWith("\\[") && result.endsWith("\\]")) {
    result = result.slice(2, -2).trim();
  }

  if (result.startsWith("\\(") && result.endsWith("\\)")) {
    result = result.slice(2, -2).trim();
  }

  if (result.startsWith("$") && result.endsWith("$")) {
    result = result.slice(1, -1).trim();
  }

  return result;
}

export function LatexView({ code, displayMode = true }: LatexViewProps) {
  const normalizedCode = normalizeLatexCode(code);

  if (!normalizedCode) {
    return (
      <div className="border border-black bg-white p-3 font-mono text-sm text-neutral-600">
        Пустая формула
      </div>
    );
  }

  try {
    const html = katex.renderToString(normalizedCode, {
      displayMode,
      throwOnError: false,
      strict: false,
      trust: false,
      output: "html",
    });

    return (
      <div className="border border-black bg-white p-4 overflow-auto">
        <div
          className="text-black"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    );
  } catch (error) {
    return (
      <div className="border border-black bg-white p-4">
        <p className="mb-2 font-bold">Ошибка LaTeX</p>
        <pre className="overflow-auto border border-black bg-neutral-100 p-3 text-sm">
          {normalizedCode}
        </pre>
      </div>
    );
  }
}
