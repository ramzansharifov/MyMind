import { useEffect, useRef, type ClipboardEvent } from "react";
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
    <div className={`rich-text-shell study-heading-field level-${block.level}`}>
      <div
        ref={editorRef}
        className={`rich-text-editor study-heading-input ${text.trim() ? "" : "is-empty"}`}
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
