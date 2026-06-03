import { useMemo, useState } from "react";
import hljs from "highlight.js";
import "highlight.js/styles/github.css";
import { normalizeCodeLanguage } from "../../utils/codeLanguages";

interface CodeBlockProps {
  value: string;
  language?: string;
  editable: boolean;
  wrap?: boolean;
  fontSize?: number;
  textColor?: string;
  backgroundColor?: string;
  padding?: number;
  onChange: (value: string) => void;
}

function getHighlightedCode(value: string, language: string): string {
  const normalizedLanguage = normalizeCodeLanguage(language);

  if (!value) {
    return "";
  }

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
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }
}

async function copyToClipboard(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }

    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "-9999px";

    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    const success = document.execCommand("copy");
    textarea.remove();

    return success;
  } catch (error) {
    console.error(error);
    return false;
  }
}

export function CodeBlock({
  value,
  language = "plain",
  editable,
  wrap = true,
  fontSize,
  textColor,
  backgroundColor,
  padding,
  onChange,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const normalizedLanguage = normalizeCodeLanguage(language);

  const highlightedCode = useMemo(() => {
    return getHighlightedCode(value, normalizedLanguage);
  }, [value, normalizedLanguage]);

  async function handleCopy() {
    const success = await copyToClipboard(value);

    if (!success) {
      window.alert("Не удалось скопировать код.");
      return;
    }

    setCopied(true);

    window.setTimeout(() => {
      setCopied(false);
    }, 1200);
  }

  const commonStyle = {
    fontSize: fontSize ? `${fontSize}px` : undefined,
    color: textColor,
    backgroundColor,
    padding: padding !== undefined ? `${padding}px` : undefined,
  };

  return (
    <div className="border border-black bg-white">
      <div className="flex items-center justify-between border-b border-black bg-neutral-100 px-3 py-2">
        <div className="min-w-0">
          <span className="font-bold">Код</span>

          <span className="ml-2 border border-black bg-white px-2 py-0.5 text-xs">
            {normalizedLanguage}
          </span>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="border border-black bg-white px-3 py-1 text-sm hover:bg-black hover:text-white"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      {editable ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          spellCheck={false}
          rows={12}
          className="block w-full border-0 bg-white px-3 py-3 font-mono text-sm outline-none"
          style={{
            ...commonStyle,
            whiteSpace: wrap ? "pre-wrap" : "pre",
            overflowWrap: wrap ? "anywhere" : "normal",
          }}
          placeholder="Напиши код..."
        />
      ) : (
        <pre
          className="overflow-auto"
          style={{
            ...commonStyle,
            margin: 0,
            whiteSpace: wrap ? "pre-wrap" : "pre",
            overflowWrap: wrap ? "anywhere" : "normal",
          }}
        >
          <code
            className={`language-${normalizedLanguage}`}
            dangerouslySetInnerHTML={{ __html: highlightedCode }}
          />
        </pre>
      )}
    </div>
  );
}
