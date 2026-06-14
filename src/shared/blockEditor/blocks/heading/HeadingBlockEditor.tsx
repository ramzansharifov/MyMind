import { useEffect, useRef, type ClipboardEvent } from "react";
import { cn } from "../../../utils/classNames";
import type { StudyHeadingBlock } from "../../core/blockCore";

export function HeadingBlockEditor({
  block,
  onChange,
}: {
  block: StudyHeadingBlock;
  onChange: (text: string) => void;
}) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const text = block.text ?? "";

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || editor.textContent === text) return;

    editor.textContent = text;
  }, [text]);

  function emitChange() {
    onChange(editorRef.current?.textContent ?? "");
  }

  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    event.preventDefault();
    const pastedText = event.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, pastedText);
    emitChange();
  }

  return (
    <div className="grid gap-2">
      <div
        ref={editorRef}
        className={cn(headingEditorClass, headingLevelClasses[block.level], !text.trim() && headingPlaceholderClass)}
        contentEditable
        role="textbox"
        aria-multiline="false"
        data-placeholder="Название раздела"
        suppressContentEditableWarning
        onInput={emitChange}
        onBlur={emitChange}
        onPaste={handlePaste}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
          }
        }}
      />
    </div>
  );
}

const headingEditorClass =
  "relative min-h-[58px] w-full rounded-panel border border-app-border bg-app-surface px-4 py-3 text-app-text outline-none transition-colors focus:border-[color-mix(in_srgb,var(--accent)_56%,var(--border))] focus:shadow-[0_0_0_1px_color-mix(in_srgb,var(--accent)_38%,transparent)]";
const headingPlaceholderClass =
  "before:pointer-events-none before:absolute before:left-4 before:top-3 before:text-app-muted before:content-[attr(data-placeholder)]";
const headingLevelClasses: Record<StudyHeadingBlock["level"], string> = {
  1: "text-[30px] font-extrabold leading-tight",
  2: "text-[26px] font-extrabold leading-tight",
  3: "text-[22px] font-extrabold leading-tight",
  4: "text-[18px] font-extrabold leading-tight",
  5: "text-[16px] font-extrabold leading-tight",
};
