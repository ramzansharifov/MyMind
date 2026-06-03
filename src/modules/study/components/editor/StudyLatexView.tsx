import katex from 'katex';
import 'katex/dist/katex.min.css';

interface StudyLatexViewProps {
  code: string;
  displayMode?: boolean;
}

function normalizeLatexCode(code: string): string {
  let result = code.trim();

  if (result.startsWith('$$') && result.endsWith('$$')) {
    result = result.slice(2, -2).trim();
  }

  if (result.startsWith('\\[') && result.endsWith('\\]')) {
    result = result.slice(2, -2).trim();
  }

  if (result.startsWith('\\(') && result.endsWith('\\)')) {
    result = result.slice(2, -2).trim();
  }

  if (result.startsWith('$') && result.endsWith('$')) {
    result = result.slice(1, -1).trim();
  }

  return result;
}

export function StudyLatexView({ code, displayMode = true }: StudyLatexViewProps) {
  const normalizedCode = normalizeLatexCode(code);

  if (!normalizedCode) {
    return (
      <div className="study-latex-empty">
        Empty formula
      </div>
    );
  }

  try {
    const html = katex.renderToString(normalizedCode, {
      displayMode,
      throwOnError: false,
      strict: false,
      output: 'html',
    });

    return (
      <div className="study-latex-result">
        <div
          className="text-black"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    );
  } catch (error) {
    return (
      <div className="study-latex-error">
        <p className="font-bold">LaTeX Error</p>
        <pre>{normalizedCode}</pre>
      </div>
    );
  }
}
