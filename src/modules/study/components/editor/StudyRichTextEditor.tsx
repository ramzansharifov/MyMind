import {
  useEffect,
  useLayoutEffect,
  useRef,
  type ClipboardEvent as ReactClipboardEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import type { StudyNode } from "../../types";
import {
  escapeHtml,
  normalizeUrl,
  plainTextToHtml,
  replaceTextNodesWithInternalLinks,
  sanitizeRichHtml,
  toEditableHtml,
  type RichTextActiveMarks,
  type RichTextCommand,
} from "../../utils/richTextCore";

export type {
  RichTextActiveMarks,
  RichTextCommand,
  RichTextCommandType,
} from "../../utils/richTextCore";

interface RichTextEditorProps {
  editorId: string;
  value: string;
  nodes: StudyNode[];
  placeholder?: string;
  editable: boolean;
  formatCommand?: RichTextCommand | null;
  onChange: (value: string) => void;
  onOpenNode: (nodeId: string) => void;
  onActiveMarksChange?: (marks: RichTextActiveMarks) => void;
  onActiveEditorChange?: (editorId: string) => void;
}

function exec(command: string, value?: string) {
  document.execCommand(command, false, value);
}

function getSelectionInside(editor: HTMLDivElement | null): Selection | null {
  if (!editor) {
    return null;
  }

  const selection = window.getSelection();

  if (!selection || selection.rangeCount === 0) {
    return null;
  }

  const anchorNode = selection.anchorNode;
  const focusNode = selection.focusNode;

  const anchorInside = Boolean(anchorNode && editor.contains(anchorNode));
  const focusInside = Boolean(focusNode && editor.contains(focusNode));

  if (!anchorInside && !focusInside) {
    return null;
  }

  return selection;
}

function findClosestElement(
  editor: HTMLDivElement | null,
  tagNames: string[]
): HTMLElement | null {
  const selection = getSelectionInside(editor);

  if (!selection) {
    return null;
  }

  let node: Node | null = selection.anchorNode;

  if (node?.nodeType === Node.TEXT_NODE) {
    node = node.parentElement;
  }

  while (node && node instanceof HTMLElement && node !== editor) {
    if (tagNames.includes(node.tagName)) {
      return node;
    }

    node = node.parentElement;
  }

  return null;
}

function findClosestListElement(
  editor: HTMLDivElement | null
): HTMLUListElement | HTMLOListElement | null {
  const element = findClosestElement(editor, ["UL", "OL"]);

  if (!element) {
    return null;
  }

  return element as HTMLUListElement | HTMLOListElement;
}

function getDefaultListStyle(list: HTMLUListElement | HTMLOListElement | null): string {
  if (!list) {
    return "disc";
  }

  if (list.dataset.listType === "checkbox") {
    return "checkbox-list";
  }

  if (list.style.listStyleType) {
    return list.style.listStyleType;
  }

  return list.tagName === "OL" ? "decimal" : "disc";
}

function isCheckboxListElement(list: Element | null): boolean {
  if (!(list instanceof HTMLElement)) {
    return false;
  }

  return (
    list.dataset.listType === "checkbox" ||
    list.style.listStyleType.includes("checkbox-list")
  );
}

function findCheckboxListItemFromMouseEvent(
  root: HTMLElement | null,
  target: EventTarget | null,
  clientX: number
): HTMLLIElement | null {
  if (!root || !(target instanceof HTMLElement)) {
    return null;
  }

  if (target.closest("a, button, input, textarea, select")) {
    return null;
  }

  const listItem = target.closest("li");

  if (!(listItem instanceof HTMLLIElement) || !root.contains(listItem)) {
    return null;
  }

  const list = listItem.closest("ul, ol");

  if (!isCheckboxListElement(list)) {
    return null;
  }

  const rect = listItem.getBoundingClientRect();
  const markerZoneWidth = 32;

  if (clientX > rect.left + markerZoneWidth) {
    return null;
  }

  return listItem;
}

function prepareCheckboxList(list: HTMLUListElement | HTMLOListElement) {
  list.dataset.listType = "checkbox";
  list.style.listStyleType = "checkbox-list";

  Array.from(list.children).forEach((child) => {
    if (child instanceof HTMLLIElement && !child.hasAttribute("data-checked")) {
      child.dataset.checked = "false";
    }
  });
}

export function RichTextEditor({
  editorId,
  value,
  nodes,
  placeholder = "Enter text...",
  editable,
  formatCommand,
  onChange,
  onOpenNode,
  onActiveMarksChange,
  onActiveEditorChange,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const lastCommandIdRef = useRef<number | null>(null);
  const initializedRef = useRef(false);
  const lastAppliedHtmlRef = useRef("");

  function getSafeValueHtml(): string {
    return sanitizeRichHtml(toEditableHtml(value));
  }

  function saveFromEditor() {
    const editor = editorRef.current;

    if (!editor || !initializedRef.current) {
      return;
    }

    const nextHtml = sanitizeRichHtml(editor.innerHTML);

    lastAppliedHtmlRef.current = nextHtml;
    onChange(nextHtml);
  }

  function notifyActiveMarks() {
    const editor = editorRef.current;
    const selection = getSelectionInside(editor);

    if (!selection) {
      return;
    }

    const list = findClosestListElement(editor);
    const link = findClosestElement(editor, ["A"]) as HTMLAnchorElement | null;

    onActiveMarksChange?.({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      strikeThrough: document.queryCommandState("strikeThrough"),
      unorderedList: Boolean(list && list.tagName === "UL"),
      orderedList: Boolean(list && list.tagName === "OL"),
      quote: Boolean(findClosestElement(editor, ["BLOCKQUOTE"])),
      link: Boolean(link),
      linkHref: link?.getAttribute("href") ?? "",
      listStyle: getDefaultListStyle(list),
      textColor: document.queryCommandValue("foreColor") || "",
      backgroundColor:
        document.queryCommandValue("hiliteColor") ||
        document.queryCommandValue("backColor") ||
        "",
      textAlign: document.queryCommandValue("justifyCenter")
        ? "center"
        : document.queryCommandValue("justifyRight")
          ? "right"
          : "left",
      fontSize: getCurrentSelectionFontSize(),
    });
  }

  function saveCurrentSelection() {
    const editor = editorRef.current;
    const selection = getSelectionInside(editor);

    if (!selection || selection.rangeCount === 0) {
      return;
    }

    savedRangeRef.current = selection.getRangeAt(0).cloneRange();
    onActiveEditorChange?.(editorId);
    notifyActiveMarks();
  }

  function restoreSelection() {
    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    editor.focus();

    const selection = window.getSelection();

    if (!selection) {
      return;
    }

    selection.removeAllRanges();

    if (savedRangeRef.current) {
      selection.addRange(savedRangeRef.current);
      return;
    }

    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    selection.addRange(range);
    savedRangeRef.current = range.cloneRange();
  }

  function insertHtmlAtSelection(html: string) {
    restoreSelection();

    const cleanHtml = sanitizeRichHtml(html);

    if (!cleanHtml) {
      return;
    }

    exec("insertHTML", cleanHtml);
  }

  function insertTextAtSelection(text: string) {
    restoreSelection();
    exec("insertText", text);
  }

  function applyListStyle(style: string) {
    const list = findClosestListElement(editorRef.current);

    if (!list) {
      return;
    }

    if (style === "checkbox-list") {
      prepareCheckboxList(list);
      return;
    }

    list.removeAttribute("data-list-type");
    list.style.listStyleType = style;

    Array.from(list.children).forEach((child) => {
      if (child instanceof HTMLLIElement) {
        child.removeAttribute("data-checked");
      }
    });
  }

  function applyListCommand(listType: "unordered" | "ordered", style: string) {
    const currentList = findClosestListElement(editorRef.current);
    const wantsOrderedList = listType === "ordered";
    const currentIsOrderedList = currentList?.tagName === "OL";
    const currentIsUnorderedList = currentList?.tagName === "UL";

    if (currentList) {
      const alreadySameListType =
        (wantsOrderedList && currentIsOrderedList) ||
        (!wantsOrderedList && currentIsUnorderedList);

      if (alreadySameListType) {
        applyListStyle(style);
        return;
      }
    }

    exec(wantsOrderedList ? "insertOrderedList" : "insertUnorderedList");

    window.setTimeout(() => {
      applyListStyle(style);
      saveFromEditor();
      saveCurrentSelection();
      notifyActiveMarks();
    }, 0);
  }

  function toggleQuote() {
    const blockquote = findClosestElement(editorRef.current, ["BLOCKQUOTE"]);

    if (blockquote) {
      exec("formatBlock", "p");
      return;
    }

    exec("formatBlock", "blockquote");
  }

  function clearFormatting() {
    exec("removeFormat");

    const blockquote = findClosestElement(editorRef.current, ["BLOCKQUOTE"]);

    if (blockquote) {
      exec("formatBlock", "p");
    }
  }

  function insertInternalLink(title: string) {
    const cleanTitle = title.trim();

    if (!cleanTitle) {
      return;
    }

    insertTextAtSelection(`[[${cleanTitle}]]`);
  }

  function getCurrentSelectionFontSize(): string {
    const editor = editorRef.current;
    const selection = getSelectionInside(editor);

    if (!editor || !selection?.anchorNode) {
      return "";
    }

    const anchorNode = selection.anchorNode;
    const element =
      anchorNode.nodeType === Node.TEXT_NODE
        ? anchorNode.parentElement
        : anchorNode instanceof HTMLElement
          ? anchorNode
          : null;

    if (!element || !editor.contains(element)) {
      return "";
    }

    return window.getComputedStyle(element).fontSize || "";
  }

  function normalizeFontSize(value: string): string {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
      return "";
    }

    const safeValue = Math.max(8, Math.min(72, numericValue));

    return `${safeValue}px`;
  }

  function applyInlineFontSize(value: string) {
    const fontSize = normalizeFontSize(value);

    if (!fontSize) {
      return;
    }

    restoreSelection();

    const editor = editorRef.current;
    const selection = getSelectionInside(editor);

    if (!editor || !selection || selection.rangeCount === 0) {
      return;
    }

    const range = selection.getRangeAt(0);

    if (range.collapsed) {
      const span = document.createElement("span");
      span.style.fontSize = fontSize;
      span.appendChild(document.createTextNode("\u200B"));
      range.insertNode(span);

      const nextRange = document.createRange();
      nextRange.selectNodeContents(span);
      nextRange.collapse(false);

      selection.removeAllRanges();
      selection.addRange(nextRange);
      savedRangeRef.current = nextRange.cloneRange();
      return;
    }

    try {
      const span = document.createElement("span");
      span.style.fontSize = fontSize;
      span.appendChild(range.extractContents());
      range.insertNode(span);

      const nextRange = document.createRange();
      nextRange.selectNodeContents(span);
      nextRange.collapse(false);

      selection.removeAllRanges();
      selection.addRange(nextRange);
      savedRangeRef.current = nextRange.cloneRange();
    } catch {
      exec("fontSize", "4");

      Array.from(editor.querySelectorAll("font[size='4']")).forEach((fontElement) => {
        const span = document.createElement("span");
        span.setAttribute("style", `font-size: ${fontSize}`);
        span.innerHTML = fontElement.innerHTML;
        fontElement.replaceWith(span);
      });
    }
  }

  function clearInlineFontSize() {
    restoreSelection();

    const editor = editorRef.current;
    const selection = getSelectionInside(editor);

    if (!editor || !selection || selection.rangeCount === 0) {
      return;
    }

    const range = selection.getRangeAt(0);

    if (range.collapsed) {
      const anchorNode = selection.anchorNode;
      const element =
        anchorNode?.nodeType === Node.TEXT_NODE
          ? anchorNode.parentElement
          : anchorNode instanceof HTMLElement
            ? anchorNode
            : null;

      if (element && editor.contains(element)) {
        element.style.fontSize = "";

        if (!element.getAttribute("style")) {
          element.removeAttribute("style");
        }
      }

      return;
    }

    Array.from(editor.querySelectorAll("[style]")).forEach((element) => {
      if (!(element instanceof HTMLElement)) {
        return;
      }

      if (!range.intersectsNode(element)) {
        return;
      }

      element.style.fontSize = "";

      if (!element.getAttribute("style")) {
        element.removeAttribute("style");
      }
    });
  }

  function applyInlineTextColor(color: string) {
    const cleanColor = color.trim();

    if (!cleanColor) {
      return;
    }

    restoreSelection();
    exec("foreColor", cleanColor);
  }

  function applyInlineHighlightColor(color: string) {
    const cleanColor = color.trim();

    if (!cleanColor) {
      return;
    }

    restoreSelection();

    try {
      exec("hiliteColor", cleanColor);
    } catch {
      exec("backColor", cleanColor);
    }
  }

  function clearInlineColors() {
    restoreSelection();

    const editor = editorRef.current;
    const selection = getSelectionInside(editor);

    if (!editor || !selection || selection.rangeCount === 0) {
      exec("removeFormat");
      return;
    }

    exec("removeFormat");

    Array.from(editor.querySelectorAll("font")).forEach((fontElement) => {
      const span = document.createElement("span");
      span.innerHTML = fontElement.innerHTML;
      fontElement.replaceWith(span);
    });

    Array.from(editor.querySelectorAll("[style]")).forEach((element) => {
      if (!(element instanceof HTMLElement)) {
        return;
      }

      element.style.color = "";
      element.style.backgroundColor = "";

      if (!element.getAttribute("style")) {
        element.removeAttribute("style");
      }
    });
  }

  function applyParagraphAlign(align: "left" | "center" | "right") {
    restoreSelection();

    if (align === "left") {
      exec("justifyLeft");
    }

    if (align === "center") {
      exec("justifyCenter");
    }

    if (align === "right") {
      exec("justifyRight");
    }
  }

  function applyLink(urlValue: string) {
    const url = normalizeUrl(urlValue);

    if (!url) {
      return;
    }

    restoreSelection();

    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    const existingLink = findClosestElement(editor, ["A"]) as HTMLAnchorElement | null;

    if (existingLink) {
      existingLink.setAttribute("href", url);
      existingLink.setAttribute("target", "_blank");
      existingLink.setAttribute("rel", "noreferrer");

      saveFromEditor();
      notifyActiveMarks();
      return;
    }

    const selection = window.getSelection();

    if (!selection || selection.rangeCount === 0) {
      return;
    }

    const range = selection.getRangeAt(0);

    if (range.collapsed) {
      insertHtmlAtSelection(
        `<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(url)}</a>`
      );
      return;
    }

    exec("createLink", url);

    Array.from(editor.querySelectorAll("a")).forEach((link) => {
      const href = link.getAttribute("href");

      if (href === url || link.href === url) {
        link.setAttribute("target", "_blank");
        link.setAttribute("rel", "noreferrer");
      }
    });
  }

  function applyFormatCommand(command: RichTextCommand) {
    if (command.targetEditorId && command.targetEditorId !== editorId) {
      return;
    }

    restoreSelection();

    if (command.type === "paragraph") {
      exec("formatBlock", "p");
    }

    if (command.type === "bold") {
      exec("bold");
    }

    if (command.type === "italic") {
      exec("italic");
    }

    if (command.type === "underline") {
      exec("underline");
    }

    if (command.type === "strikeThrough") {
      exec("strikeThrough");
    }

    if (command.type === "unorderedList") {
      applyListCommand("unordered", command.value ?? "disc");
    }

    if (command.type === "orderedList") {
      applyListCommand("ordered", command.value ?? "decimal");
    }

    if (command.type === "listStyle") {
      applyListStyle(command.value ?? "disc");
    }

    if (command.type === "quote") {
      toggleQuote();
    }

    if (command.type === "clearFormat") {
      clearFormatting();
    }

    if (command.type === "link") {
      applyLink(command.value ?? "");
    }

    if (command.type === "unlink") {
      exec("unlink");
    }

    if (command.type === "internalLink") {
      insertInternalLink(command.value ?? "");
    }

    if (command.type === "textColor") {
      applyInlineTextColor(command.value ?? "#000000");
    }

    if (command.type === "highlightColor") {
      applyInlineHighlightColor(command.value ?? "#fff3a3");
    }

    if (command.type === "clearColor") {
      clearInlineColors();
    }

    if (command.type === "alignLeft") {
      applyParagraphAlign("left");
    }

    if (command.type === "alignCenter") {
      applyParagraphAlign("center");
    }

    if (command.type === "alignRight") {
      applyParagraphAlign("right");
    }

    if (command.type === "fontSize") {
      applyInlineFontSize(command.value ?? "16");
    }

    if (command.type === "clearFontSize") {
      clearInlineFontSize();
    }

    window.setTimeout(() => {
      saveFromEditor();
      saveCurrentSelection();
      notifyActiveMarks();
    }, 0);
  }

  function handleCheckboxMouseDown(event: ReactMouseEvent<HTMLDivElement>) {
    const root = event.currentTarget;
    const listItem = findCheckboxListItemFromMouseEvent(
      root,
      event.target,
      event.clientX
    );

    if (!listItem) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const checked = listItem.dataset.checked === "true";
    listItem.dataset.checked = checked ? "false" : "true";

    if (editable) {
      saveFromEditor();
      notifyActiveMarks();
    }
  }

  function handlePaste(event: ReactClipboardEvent<HTMLDivElement>) {
    event.preventDefault();

    const html = event.clipboardData.getData("text/html");
    const plainText = event.clipboardData.getData("text/plain");

    if (html.trim()) {
      insertHtmlAtSelection(html);
    } else {
      insertHtmlAtSelection(plainTextToHtml(plainText));
    }

    window.setTimeout(() => {
      saveFromEditor();
      saveCurrentSelection();
      notifyActiveMarks();
    }, 0);
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const key = event.key.toLowerCase();
    const isCommand = event.ctrlKey || event.metaKey;

    if (isCommand && key === "b") {
      event.preventDefault();
      applyFormatCommand({
        id: Date.now(),
        type: "bold",
        targetEditorId: editorId,
      });
      return;
    }

    if (isCommand && key === "i") {
      event.preventDefault();
      applyFormatCommand({
        id: Date.now(),
        type: "italic",
        targetEditorId: editorId,
      });
      return;
    }

    if (isCommand && key === "u") {
      event.preventDefault();
      applyFormatCommand({
        id: Date.now(),
        type: "underline",
        targetEditorId: editorId,
      });
      return;
    }

    if (isCommand && event.shiftKey && key === "x") {
      event.preventDefault();
      applyFormatCommand({
        id: Date.now(),
        type: "strikeThrough",
        targetEditorId: editorId,
      });
      return;
    }

    if (isCommand && event.shiftKey && key === "7") {
      event.preventDefault();
      applyFormatCommand({
        id: Date.now(),
        type: "orderedList",
        value: "decimal",
        targetEditorId: editorId,
      });
      return;
    }

    if (isCommand && event.shiftKey && key === "8") {
      event.preventDefault();
      applyFormatCommand({
        id: Date.now(),
        type: "unorderedList",
        value: "disc",
        targetEditorId: editorId,
      });
      return;
    }

    if (event.key === "Tab" && findClosestListElement(editorRef.current)) {
      event.preventDefault();
      exec(event.shiftKey ? "outdent" : "indent");

      window.setTimeout(() => {
        saveFromEditor();
        saveCurrentSelection();
        notifyActiveMarks();
      }, 0);
    }
  }

  useLayoutEffect(() => {
    const editor = editorRef.current;

    if (!editor || !editable) {
      return;
    }

    const nextHtml = getSafeValueHtml();
    const editorIsFocused = document.activeElement === editor;

    if (!initializedRef.current) {
      editor.innerHTML = nextHtml;
      lastAppliedHtmlRef.current = nextHtml;
      initializedRef.current = true;
      return;
    }

    if (!editorIsFocused && lastAppliedHtmlRef.current !== nextHtml) {
      editor.innerHTML = nextHtml;
      lastAppliedHtmlRef.current = nextHtml;
    }
  }, [value, editable]);

  useEffect(() => {
    if (!editable) {
      return;
    }

    document.execCommand("defaultParagraphSeparator", false, "p");

    function handleSelectionChange() {
      saveCurrentSelection();
    }

    document.addEventListener("selectionchange", handleSelectionChange);

    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [editable]);

  useEffect(() => {
    const preview = previewRef.current;

    if (!preview || editable) {
      return;
    }

    preview.innerHTML = sanitizeRichHtml(toEditableHtml(value));
    replaceTextNodesWithInternalLinks(preview, nodes, onOpenNode);
  }, [value, editable, nodes, onOpenNode]);

  useEffect(() => {
    if (!editable || !formatCommand) {
      return;
    }

    if (lastCommandIdRef.current === formatCommand.id) {
      return;
    }

    lastCommandIdRef.current = formatCommand.id;
    applyFormatCommand(formatCommand);
  }, [formatCommand, editable]);

  if (!editable) {
    return (
      <div
        ref={previewRef}
        onMouseDown={handleCheckboxMouseDown}
        className="study-rich-text-view"
      />
    );
  }

  return (
    <div
      ref={editorRef}
      contentEditable
      suppressContentEditableWarning
      data-placeholder={placeholder}
      onFocus={() => {
        onActiveEditorChange?.(editorId);
        saveCurrentSelection();
      }}
      onMouseDown={() => {
        onActiveEditorChange?.(editorId);
      }}
      onInput={() => {
        saveFromEditor();
        saveCurrentSelection();
      }}
      onBlur={() => {
        saveFromEditor();
        saveCurrentSelection();
      }}
      onKeyDown={handleKeyDown}
      onKeyUp={saveCurrentSelection}
      onMouseUp={saveCurrentSelection}
      onPaste={handlePaste}
      className="study-rich-text-editor"
    />
  );
}
