import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Check,
  Code2,
  Indent,
  Italic,
  Link,
  List,
  ListOrdered,
  Outdent,
  Palette,
  Strikethrough,
  Type,
  Underline,
  Unlink,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  applyRichTextCommand,
  applyRichTextLink,
  applyRichTextStyle,
  cleanupRichTextEditorDom,
  EMPTY_RICH_TEXT_HTML,
  getCurrentRichTextLink,
  getRichTextSelectionStyle,
  getRichTextState,
  insertRichTextHtml,
  isRangeInsideRoot,
  isRichTextEmpty,
  normalizeCssColorToHex,
  normalizeRichTextHref,
  normalizeRichTextContent,
  RICH_TEXT_SIZE_OPTIONS,
  removeRichTextLink,
  richTextHtmlToPlainText,
  sanitizeRichTextHtml,
  type RichTextCommand,
  type RichTextState,
} from "./richTextCore";

interface RichTextEditorProps {
  value: unknown;
  placeholder?: string;
  className?: string;
  compact?: boolean;
  showToolbar?: boolean;
  toolbarTarget?: HTMLElement | null;
  onEditorFocus?: () => void;
  onChange: (html: string, plainText: string) => void;
}

interface RichTextViewerProps {
  value: unknown;
  fallback?: string;
}

const emptyState: RichTextState = {
  bold: false,
  italic: false,
  underline: false,
  strikeThrough: false,
  code: false,
  link: false,
  unorderedList: false,
  orderedList: false,
  align: "left",
};

export function RichTextEditor({
  value,
  placeholder = "Начни писать материал...",
  className = "",
  compact = false,
  showToolbar = true,
  toolbarTarget = null,
  onEditorFocus,
  onChange,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const linkInputRef = useRef<HTMLInputElement | null>(null);
  const lastHtmlRef = useRef("");
  const savedRangeRef = useRef<Range | null>(null);
  const emitTimerRef = useRef<number | null>(null);
  const composingRef = useRef(false);

  const [selectionState, setSelectionState] = useState<RichTextState>(emptyState);
  const [selectedColor, setSelectedColor] = useState("#e5e7eb");
  const [selectedSize, setSelectedSize] = useState("1rem");
  const [linkEditorOpen, setLinkEditorOpen] = useState(false);
  const [linkDraft, setLinkDraft] = useState("");

  const normalizedValue = useMemo(() => normalizeRichTextContent(value), [value]);
  const isEmpty = isRichTextEmpty(normalizedValue);

  const clearPendingEmit = useCallback(() => {
    if (emitTimerRef.current === null) return;
    window.clearTimeout(emitTimerRef.current);
    emitTimerRef.current = null;
  }, []);

  const getValidSavedRange = useCallback(() => {
    const editor = editorRef.current;
    const range = savedRangeRef.current;

    if (!editor || !range || !isRangeInsideRoot(editor, range)) {
      savedRangeRef.current = null;
      return null;
    }

    return range;
  }, []);

  const emitChange = useCallback(
    (mode: "debounced" | "immediate" = "debounced") => {
      const editor = editorRef.current;
      if (!editor || composingRef.current) return;

      const run = () => {
        if (document.activeElement !== editor) {
          cleanupRichTextEditorDom(editor);
        }

        const sanitized = sanitizeRichTextHtml(editor.innerHTML || EMPTY_RICH_TEXT_HTML);

        lastHtmlRef.current = sanitized;
        onChange(sanitized, richTextHtmlToPlainText(sanitized));
      };

      clearPendingEmit();

      if (mode === "immediate") {
        run();
        return;
      }

      emitTimerRef.current = window.setTimeout(run, 140);
    },
    [clearPendingEmit, onChange],
  );

  const syncSelectionState = useCallback(() => {
    const editor = editorRef.current;
    const selection = window.getSelection();

    if (!editor || !selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);

    if (!isRangeInsideRoot(editor, range)) return;

    savedRangeRef.current = range.cloneRange();
    setSelectionState(getRichTextState(editor));

    const style = getRichTextSelectionStyle(editor);
    const color = style.color ? normalizeCssColorToHex(style.color) : null;

    if (color) setSelectedColor(color);
    if (style.fontSize) setSelectedSize(style.fontSize);
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const shouldReplaceDom = lastHtmlRef.current !== normalizedValue && document.activeElement !== editor;

    if (shouldReplaceDom) {
      editor.innerHTML = normalizedValue;
      lastHtmlRef.current = normalizedValue;
      savedRangeRef.current = null;
      setSelectionState(emptyState);
    }
  }, [normalizedValue]);

  useEffect(() => {
    document.addEventListener("selectionchange", syncSelectionState);

    return () => {
      document.removeEventListener("selectionchange", syncSelectionState);
    };
  }, [syncSelectionState]);

  useEffect(() => {
    return () => {
      clearPendingEmit();
    };
  }, [clearPendingEmit]);

  useEffect(() => {
    if (!linkEditorOpen) return;

    window.setTimeout(() => {
      linkInputRef.current?.focus();
      linkInputRef.current?.select();
    }, 0);
  }, [linkEditorOpen]);

  function restoreSelection() {
    const editor = editorRef.current;
    const range = getValidSavedRange();
    const selection = window.getSelection();

    if (!editor || !range || !selection) return false;

    editor.focus();
    selection.removeAllRanges();
    selection.addRange(range);
    return true;
  }

  function saveSelection() {
    const editor = editorRef.current;
    const selection = window.getSelection();

    if (!editor || !selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);

    if (!isRangeInsideRoot(editor, range)) return;

    savedRangeRef.current = range.cloneRange();
  }

  function runCommand(command: RichTextCommand) {
    const editor = editorRef.current;
    if (!editor) return;

    restoreSelection();

    if (applyRichTextCommand(editor, command)) {
      emitChange("immediate");
      setSelectionState(getRichTextState(editor));
      saveSelection();
    }
  }

  function runColorChange(color: string) {
    const editor = editorRef.current;
    if (!editor) return;

    setSelectedColor(color);
    restoreSelection();

    if (applyRichTextStyle(editor, { color })) {
      emitChange("immediate");
      saveSelection();
    }
  }

  function runSizeChange(fontSize: string) {
    const editor = editorRef.current;
    if (!editor) return;

    setSelectedSize(fontSize);
    restoreSelection();

    if (applyRichTextStyle(editor, { fontSize })) {
      emitChange("immediate");
      saveSelection();
    }
  }

  function openLinkEditor() {
    const editor = editorRef.current;
    if (!editor) return;

    saveSelection();
    restoreSelection();

    const currentHref = getCurrentRichTextLink(editor);
    setLinkDraft(currentHref);
    setLinkEditorOpen(true);
    setSelectionState(getRichTextState(editor));
    saveSelection();
  }

  function applyLinkFromDraft() {
    const editor = editorRef.current;
    if (!editor) return;

    restoreSelection();

    if (!linkDraft.trim()) {
      if (removeRichTextLink(editor)) {
        emitChange("immediate");
        setSelectionState(getRichTextState(editor));
      }

      setLinkEditorOpen(false);
      saveSelection();
      return;
    }

    if (!normalizeRichTextHref(linkDraft)) {
      saveSelection();
      return;
    }

    if (applyRichTextLink(editor, linkDraft)) {
      emitChange("immediate");
      setSelectionState(getRichTextState(editor));
      setLinkEditorOpen(false);
      saveSelection();
    }
  }

  function runUnlink() {
    const editor = editorRef.current;
    if (!editor) return;

    saveSelection();
    restoreSelection();

    if (removeRichTextLink(editor)) {
      emitChange("immediate");
      setSelectionState(getRichTextState(editor));
      setLinkDraft("");
      setLinkEditorOpen(false);
      saveSelection();
    }
  }

  function handleLinkInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      applyLinkFromDraft();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setLinkEditorOpen(false);
      restoreSelection();
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    const editor = editorRef.current;
    if (!editor) return;

    event.preventDefault();
    restoreSelection();

    const html = event.clipboardData.getData("text/html");
    const text = event.clipboardData.getData("text/plain");
    const safeHtml = normalizeRichTextContent(html || text);

    if (insertRichTextHtml(editor, safeHtml)) {
      emitChange("immediate");
      saveSelection();
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const isModifier = event.ctrlKey || event.metaKey;

    if (event.key === "Tab") {
      event.preventDefault();
      runCommand(event.shiftKey ? "outdent" : "indent");
      return;
    }

    if (!isModifier) return;

    const key = event.key.toLowerCase();
    const commandByKey: Partial<Record<string, RichTextCommand>> = {
      b: "bold",
      i: "italic",
      u: "underline",
      "`": "code",
    };

    if (event.shiftKey && key === "7") {
      event.preventDefault();
      runCommand("orderedList");
      return;
    }

    if (event.shiftKey && key === "8") {
      event.preventDefault();
      runCommand("unorderedList");
      return;
    }

    if (key === "k") {
      event.preventDefault();
      openLinkEditor();
      return;
    }

    const command = commandByKey[key];

    if (!command) return;

    event.preventDefault();
    runCommand(command);
  }

  const toolbar = (
      <div className="rich-text-toolbar" aria-label="Панель форматирования текста">
        <ToolbarButton label="Жирный" active={selectionState.bold} onClick={() => runCommand("bold")}>
          <Bold size={16} />
        </ToolbarButton>

        <ToolbarButton label="Курсив" active={selectionState.italic} onClick={() => runCommand("italic")}>
          <Italic size={16} />
        </ToolbarButton>

        <ToolbarButton label="Подчёркивание" active={selectionState.underline} onClick={() => runCommand("underline")}>
          <Underline size={16} />
        </ToolbarButton>

        <ToolbarButton label="Зачёркивание" active={selectionState.strikeThrough} onClick={() => runCommand("strikeThrough")}>
          <Strikethrough size={16} />
        </ToolbarButton>

        <ToolbarButton label="Моноширный" active={selectionState.code} onClick={() => runCommand("code")}>
          <Code2 size={16} />
        </ToolbarButton>

        <ToolbarButton label="Ссылка" active={selectionState.link || linkEditorOpen} onClick={openLinkEditor}>
          <Link size={16} />
        </ToolbarButton>

        {linkEditorOpen ? (
          <div className="rich-text-link-control" onMouseDown={(event) => event.stopPropagation()}>
            <input
              ref={linkInputRef}
              type="url"
              value={linkDraft}
              placeholder="https://example.com"
              aria-label="Ссылка"
              onMouseDown={saveSelection}
              onPointerDown={saveSelection}
              onChange={(event) => setLinkDraft(event.target.value)}
              onKeyDown={handleLinkInputKeyDown}
            />
            <ToolbarButton label="Применить ссылку" onClick={applyLinkFromDraft}>
              <Check size={16} />
            </ToolbarButton>
            <ToolbarButton label="Убрать ссылку" onClick={runUnlink}>
              <Unlink size={16} />
            </ToolbarButton>
            <ToolbarButton
              label="Закрыть"
              onClick={() => {
                setLinkEditorOpen(false);
                restoreSelection();
              }}
            >
              <X size={16} />
            </ToolbarButton>
          </div>
        ) : null}

        <span className="rich-text-toolbar-divider" />

        <label className="rich-text-color-control" title="Цвет текста">
          <Palette size={15} />
          <input
            type="color"
            value={selectedColor}
            aria-label="Цвет текста"
            onMouseDown={saveSelection}
            onPointerDown={saveSelection}
            onInput={(event) => runColorChange((event.currentTarget as HTMLInputElement).value)}
            onChange={(event) => runColorChange(event.target.value)}
          />
        </label>

        <label className="rich-text-size-control" title="Размер текста">
          <Type size={15} />
          <select
            value={selectedSize}
            aria-label="Размер текста"
            onMouseDown={saveSelection}
            onPointerDown={saveSelection}
            onChange={(event) => runSizeChange(event.target.value)}
          >
            {RICH_TEXT_SIZE_OPTIONS.map((option) => (
              <option value={option.value} key={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <span className="rich-text-toolbar-divider" />

        <ToolbarButton label="Маркированный список" active={selectionState.unorderedList} onClick={() => runCommand("unorderedList")}>
          <List size={16} />
        </ToolbarButton>

        <ToolbarButton label="Нумерованный список" active={selectionState.orderedList} onClick={() => runCommand("orderedList")}>
          <ListOrdered size={16} />
        </ToolbarButton>

        <ToolbarButton label="Уменьшить вложенность" onClick={() => runCommand("outdent")}>
          <Outdent size={16} />
        </ToolbarButton>

        <ToolbarButton label="Увеличить вложенность" onClick={() => runCommand("indent")}>
          <Indent size={16} />
        </ToolbarButton>

        <span className="rich-text-toolbar-divider" />

        <ToolbarButton label="По левому краю" active={selectionState.align === "left"} onClick={() => runCommand("alignLeft")}>
          <AlignLeft size={16} />
        </ToolbarButton>

        <ToolbarButton label="По центру" active={selectionState.align === "center"} onClick={() => runCommand("alignCenter")}>
          <AlignCenter size={16} />
        </ToolbarButton>

        <ToolbarButton label="По правому краю" active={selectionState.align === "right"} onClick={() => runCommand("alignRight")}>
          <AlignRight size={16} />
        </ToolbarButton>
      </div>
  );

  return (
    <div className={`rich-text-shell ${compact ? "rich-text-shell-compact" : ""} ${className}`}>
      {showToolbar ? (toolbarTarget ? createPortal(toolbar, toolbarTarget) : toolbar) : null}

      <div
        ref={editorRef}
        className={`rich-text-editor ${isEmpty ? "is-empty" : ""}`}
        contentEditable
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder}
        suppressContentEditableWarning
        onInput={() => emitChange("debounced")}
        onBlur={() => emitChange("immediate")}
        onFocus={() => {
          saveSelection();
          onEditorFocus?.();
        }}
        onMouseUp={saveSelection}
        onKeyUp={saveSelection}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        onCompositionStart={() => {
          composingRef.current = true;
        }}
        onCompositionEnd={() => {
          composingRef.current = false;
          emitChange("immediate");
        }}
      />
    </div>
  );
}

export function RichTextViewer({ value, fallback = "Материал пока пуст." }: RichTextViewerProps) {
  const safeHtml = useMemo(() => normalizeRichTextContent(value), [value]);
  const empty = isRichTextEmpty(safeHtml);

  if (empty) {
    return <p className="muted-text">{fallback}</p>;
  }

  return <div className="rich-text-viewer" dangerouslySetInnerHTML={{ __html: safeHtml }} />;
}

function ToolbarButton({
  label,
  active = false,
  children,
  onClick,
}: {
  label: string;
  active?: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className={`rich-text-toolbar-button ${active ? "active" : ""}`}
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
