import { useMemo, useState } from "react";
import hljs from "highlight.js";
import "highlight.js/styles/github.css";
import { Copy, Check } from 'lucide-react';
import { normalizeCodeLanguage } from "../../utils/codeLanguages";

interface StudyCodeBlockProps {
  value: string;
  language?: string;
  editable: boolean;
  wrap?: boolean;
  fontSize?: number;
  textColor?: string;
  backgroundColor?: string;
  padding?: number;
  onChange?: (value: string) => void;
}

function getHighlightedCode(value: string, language: string): string {
  const normalizedLanguage = normalizeCodeLanguage(language);
  if (!value) return "";

  try {
    if (normalizedLanguage !== "plain" && hljs.getLanguage(normalizedLanguage)) {
      return hljs.highlight(value, {
        language: normalizedLanguage,
        ignoreIllegals: true,
      }).value;
    }
    return hljs.highlightAuto(value).value;
  } catch (error) {
    console.error(error);
    return value
      .split("&").join("&amp;")
      .split("<").join("&lt;")
      .split(">").join("&gt;");
  }
}

export function StudyCodeBlock({
  value,
  language = "plain",
  editable,
  wrap = true,
  fontSize,
  textColor,
  backgroundColor,
  padding,
  onChange,
}: StudyCodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const normalizedLanguage = normalizeCodeLanguage(language);
  const highlightedCode = useMemo(() => getHighlightedCode(value, normalizedLanguage), [value, normalizedLanguage]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const commonStyle = {
    fontSize: fontSize ? `${fontSize}px` : undefined,
    color: textColor,
    backgroundColor: backgroundColor || 'var(--surface-soft)',
    padding: padding !== undefined ? `${padding}px` : '12px',
    whiteSpace: wrap ? "pre-wrap" : "pre",
    wordBreak: wrap ? "break-all" : "normal",
  } as React.CSSProperties;

  return (
    <div className="study-code-block-wrap glass-panel">
      <div className="study-code-header">
        <span className="study-code-lang">{normalizedLanguage}</span>
        <button className="icon-button subtle" onClick={handleCopy}>
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
      {editable ? (
        <textarea
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          className="study-code-editor"
          style={commonStyle}
          spellCheck={false}
        />
      ) : (
        <pre className="study-code-pre" style={commonStyle}>
          <code dangerouslySetInnerHTML={{ __html: highlightedCode }} />
        </pre>
      )}
    </div>
  );
}
