export type RichTextCommand =
  | "bold"
  | "italic"
  | "underline"
  | "strikeThrough"
  | "code"
  | "unorderedList"
  | "orderedList"
  | "indent"
  | "outdent"
  | "alignLeft"
  | "alignCenter"
  | "alignRight";

export interface RichTextState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikeThrough: boolean;
  code: boolean;
  unorderedList: boolean;
  orderedList: boolean;
  align: "left" | "center" | "right";
}

export interface RichTextStylePatch {
  color?: string;
  fontSize?: string;
}

export interface RichTextDocument {
  format: typeof RICH_TEXT_FORMAT;
  version: typeof RICH_TEXT_VERSION;
  html: string;
  plainText: string;
}

export const RICH_TEXT_FORMAT = "rich-html-v1";
export const RICH_TEXT_VERSION = 1;
export const EMPTY_RICH_TEXT_HTML = "<p><br></p>";
export const RICH_TEXT_CARET_MARKER = "\u200b";

export const RICH_TEXT_SIZE_OPTIONS = [
  { label: "Мелкий", value: "0.875rem" },
  { label: "Обычный", value: "1rem" },
  { label: "Средний", value: "1.125rem" },
  { label: "Большой", value: "1.35rem" },
  { label: "Крупный", value: "1.65rem" },
  { label: "Заголовочный", value: "2rem" },
];

const INLINE_TAG_BY_COMMAND: Partial<Record<RichTextCommand, string>> = {
  bold: "strong",
  italic: "em",
  underline: "u",
  strikeThrough: "s",
  code: "code",
};

const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "strong",
  "em",
  "u",
  "s",
  "code",
  "span",
  "ul",
  "ol",
  "li",
  "a",
  "blockquote",
  "pre",
  "h1",
  "h2",
  "h3",
]);

const BLOCK_TAGS = new Set(["p", "li", "blockquote", "pre", "h1", "h2", "h3"]);
const LIST_TAGS = new Set(["ul", "ol"]);
const HARD_BLOCKED_TAGS = new Set(["script", "style", "iframe", "object", "embed", "link", "meta"]);
const ALIGN_VALUES = new Set(["left", "center", "right"]);

const FONT_SIZE_MAP: Record<string, string> = {
  "1": "0.75rem",
  "2": "0.875rem",
  "3": "1rem",
  "4": "1.125rem",
  "5": "1.35rem",
  "6": "1.65rem",
  "7": "2rem",
};

function canUseDom() {
  return typeof document !== "undefined";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

function decodeHtmlEntities(value: string) {
  if (!canUseDom()) {
    return value
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'");
  }

  const textarea = document.createElement("textarea");
  textarea.innerHTML = value;
  return textarea.value;
}

function stripHtml(value: string) {
  return decodeHtmlEntities(
    value
      .replace(/<\s*br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|h[1-6]|blockquote|pre)>/gi, "\n")
      .replace(/<[^>]*>/g, ""),
  )
    .replace(/\u200b/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function looksLikeHtml(value: string) {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

function plainTextToHtml(value: string) {
  const paragraphs = value
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) return EMPTY_RICH_TEXT_HTML;

  return paragraphs
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function extractLegacyEditorText(content: unknown): string {
  if (!Array.isArray(content)) return "";

  const parts: string[] = [];

  const visit = (blocks: unknown[]) => {
    blocks.forEach((block) => {
      const item = block as { content?: unknown; children?: unknown };

      if (Array.isArray(item.content)) {
        const text = item.content
          .map((leaf) => ((leaf as { text?: unknown }).text ?? "").toString())
          .join("");

        if (text.trim()) parts.push(text.trim());
      }

      if (Array.isArray(item.children)) visit(item.children);
    });
  };

  visit(content);
  return parts.join("\n\n").trim();
}

function normalizeTagName(tagName: string) {
  const tag = tagName.toLowerCase();

  if (tag === "b") return "strong";
  if (tag === "i") return "em";
  if (tag === "strike" || tag === "del") return "s";
  if (tag === "font") return "span";
  if (tag === "div" || tag === "section" || tag === "article") return "p";
  if (/^h[1-3]$/.test(tag)) return tag;
  if (/^h[4-6]$/.test(tag)) return "h3";

  return tag;
}

function isSafeCssValue(value: string) {
  const unsafe = /url\s*\(|expression\s*\(|javascript:|data:|[{};]/i;
  return value.length <= 80 && !unsafe.test(value);
}

function isSafeColor(value: string) {
  const color = value.trim();

  if (!isSafeCssValue(color)) return false;
  if (/^#[0-9a-f]{3,8}$/i.test(color)) return true;
  if (/^rgb(a)?\([\d\s.,%]+\)$/i.test(color)) return true;
  if (/^hsl(a)?\([\d\s.,%]+\)$/i.test(color)) return true;
  if (typeof CSS !== "undefined" && CSS.supports?.("color", color)) return true;

  return false;
}

function isSafeFontSize(value: string) {
  const fontSize = value.trim();

  if (!isSafeCssValue(fontSize)) return false;
  return /^\d+(\.\d+)?(px|rem|em|%)$/i.test(fontSize);
}

function isSafeHref(value: string) {
  try {
    const url = new URL(value, window.location.origin);
    return ["http:", "https:", "mailto:"].includes(url.protocol);
  } catch {
    return false;
  }
}

function copySafeAlignment(from: HTMLElement, to: HTMLElement) {
  const rawAlign = from.style.textAlign || from.getAttribute("align") || "";
  const align = rawAlign.trim().toLowerCase();

  if (ALIGN_VALUES.has(align)) {
    to.style.textAlign = align;
  }
}

function copySafeInlineStyles(from: HTMLElement, to: HTMLElement) {
  const rawColor = from.style.color || from.getAttribute("color") || "";
  const rawFontSize = from.style.fontSize || from.getAttribute("data-font-size") || "";
  const fontAttributeSize = from.getAttribute("size");
  const mappedFontSize = fontAttributeSize ? FONT_SIZE_MAP[fontAttributeSize] : "";

  const color = rawColor.trim();
  const fontSize = (rawFontSize || mappedFontSize).trim();

  if (color && isSafeColor(color)) {
    to.style.color = color;
  }

  if (fontSize && isSafeFontSize(fontSize)) {
    to.style.fontSize = fontSize;
  }
}

function copySafeLinkAttributes(from: HTMLElement, to: HTMLElement) {
  const href = from.getAttribute("href")?.trim() ?? "";

  if (!href || !isSafeHref(href)) return;

  to.setAttribute("href", href);
  to.setAttribute("target", "_blank");
  to.setAttribute("rel", "noreferrer");
}

function cleanNode(node: Node): Node | null {
  if (node.nodeType === Node.TEXT_NODE) {
    return document.createTextNode((node.textContent ?? "").replace(/\u200b/g, ""));
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const element = node as HTMLElement;
  const originalTag = element.tagName.toLowerCase();

  if (HARD_BLOCKED_TAGS.has(originalTag)) {
    return null;
  }

  const tag = normalizeTagName(originalTag);

  if (!ALLOWED_TAGS.has(tag)) {
    const fragment = document.createDocumentFragment();

    Array.from(element.childNodes).forEach((child) => {
      const cleaned = cleanNode(child);
      if (cleaned) fragment.appendChild(cleaned);
    });

    return fragment;
  }

  const safeElement = document.createElement(tag);

  if (BLOCK_TAGS.has(tag)) {
    copySafeAlignment(element, safeElement);
  }

  if (tag === "span") {
    copySafeInlineStyles(element, safeElement);
  }

  if (tag === "a") {
    copySafeLinkAttributes(element, safeElement);
  }

  Array.from(element.childNodes).forEach((child) => {
    const cleaned = cleanNode(child);
    if (cleaned) safeElement.appendChild(cleaned);
  });

  if (tag === "span" && !safeElement.getAttribute("style")) {
    return moveChildrenToFragment(safeElement);
  }

  if (tag === "a" && !safeElement.getAttribute("href")) {
    return moveChildrenToFragment(safeElement);
  }

  return safeElement;
}

function moveChildrenToFragment(element: HTMLElement) {
  const fragment = document.createDocumentFragment();

  while (element.firstChild) {
    fragment.appendChild(element.firstChild);
  }

  return fragment;
}

function normalizeRootHtml(root: HTMLElement) {
  const normalized = document.createElement("div");
  let inlineBucket: HTMLParagraphElement | null = null;

  const flushInlineBucket = () => {
    if (!inlineBucket) return;

    if ((inlineBucket.textContent ?? "").trim() || inlineBucket.querySelector("br,img")) {
      normalized.appendChild(inlineBucket);
    }

    inlineBucket = null;
  };

  Array.from(root.childNodes).forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE && !(node.textContent ?? "").trim()) {
      return;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = (node as HTMLElement).tagName.toLowerCase();

      if (BLOCK_TAGS.has(tag) || LIST_TAGS.has(tag)) {
        flushInlineBucket();
        normalized.appendChild(node.cloneNode(true));
        return;
      }
    }

    inlineBucket ??= document.createElement("p");
    inlineBucket.appendChild(node.cloneNode(true));
  });

  flushInlineBucket();

  const html = normalized.innerHTML.trim();
  return html || EMPTY_RICH_TEXT_HTML;
}

export function sanitizeRichTextHtml(value: unknown): string {
  if (typeof value !== "string") return EMPTY_RICH_TEXT_HTML;

  const source = value.trim();
  if (!source) return EMPTY_RICH_TEXT_HTML;

  if (!canUseDom()) {
    return looksLikeHtml(source) ? plainTextToHtml(stripHtml(source)) : plainTextToHtml(source);
  }

  const wrapper = document.createElement("div");
  wrapper.innerHTML = source;

  const safeRoot = document.createElement("div");

  Array.from(wrapper.childNodes).forEach((child) => {
    const cleaned = cleanNode(child);
    if (cleaned) safeRoot.appendChild(cleaned);
  });

  return normalizeRootHtml(safeRoot);
}

function isRichTextDocument(value: unknown): value is RichTextDocument {
  const source = value as Partial<RichTextDocument> | null;
  return source?.format === RICH_TEXT_FORMAT && typeof source.html === "string";
}

export function normalizeRichTextContent(content: unknown, fallbackPlainText = ""): string {
  if (isRichTextDocument(content)) {
    return normalizeRichTextContent(content.html, content.plainText || fallbackPlainText);
  }

  if (typeof content === "string") {
    if (!content.trim() && fallbackPlainText.trim()) {
      return plainTextToHtml(fallbackPlainText);
    }

    return looksLikeHtml(content) ? sanitizeRichTextHtml(content) : plainTextToHtml(content);
  }

  const legacyText = extractLegacyEditorText(content);

  if (legacyText) return plainTextToHtml(legacyText);
  if (fallbackPlainText.trim()) return plainTextToHtml(fallbackPlainText);

  return EMPTY_RICH_TEXT_HTML;
}

export function createRichTextDocument(content: unknown, fallbackPlainText = ""): RichTextDocument {
  const html = normalizeRichTextContent(content, fallbackPlainText);
  const plainText = richTextHtmlToPlainText(html);

  return {
    format: RICH_TEXT_FORMAT,
    version: RICH_TEXT_VERSION,
    html,
    plainText,
  };
}

export function richTextHtmlToPlainText(value: unknown): string {
  const html = isRichTextDocument(value) ? value.html : value;

  if (typeof html !== "string") return "";

  if (!canUseDom()) {
    return looksLikeHtml(html) ? stripHtml(html) : html.trim();
  }

  const wrapper = document.createElement("div");
  wrapper.innerHTML = sanitizeRichTextHtml(html);

  const parts: string[] = [];

  const visit = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      parts.push((node.textContent ?? "").replace(/\u200b/g, ""));
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const element = node as HTMLElement;
    const tag = element.tagName.toLowerCase();

    if (tag === "br") {
      parts.push("\n");
      return;
    }

    const shouldWrap = BLOCK_TAGS.has(tag) || LIST_TAGS.has(tag);
    if (shouldWrap && parts.length > 0 && !parts.join("").endsWith("\n")) parts.push("\n");

    if (tag === "li") parts.push("- ");

    Array.from(element.childNodes).forEach(visit);

    if (shouldWrap && !parts.join("").endsWith("\n")) parts.push("\n");
  };

  Array.from(wrapper.childNodes).forEach(visit);

  return parts
    .join("")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function isRichTextEmpty(value: unknown): boolean {
  return richTextHtmlToPlainText(value).length === 0;
}

export function isRangeInsideRoot(root: HTMLElement, range: Range | null) {
  if (!range) return false;

  return root.contains(range.startContainer) && root.contains(range.endContainer);
}

export function getScopedSelectionRange(root: HTMLElement) {
  const selection = window.getSelection();

  if (!selection || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);
  return isRangeInsideRoot(root, range) ? range : null;
}

function getElementFromRange(range: Range) {
  const node = range.startContainer;
  return node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node.parentElement;
}

function closestInRoot(element: HTMLElement | null, selector: string, root: HTMLElement) {
  const match = element?.closest<HTMLElement>(selector);
  return match && root.contains(match) ? match : null;
}

function getSelectedBlocks(root: HTMLElement, range: Range) {
  const blocks = Array.from(root.querySelectorAll<HTMLElement>("p, li, blockquote, pre, h1, h2, h3")).filter((block) =>
    range.intersectsNode(block),
  );

  if (blocks.length > 0) return blocks;

  const fallback = closestInRoot(getElementFromRange(range), "p, li, blockquote, pre, h1, h2, h3", root);
  return fallback ? [fallback] : [];
}

function unwrapElement(element: HTMLElement) {
  const parent = element.parentNode;
  if (!parent) return;

  while (element.firstChild) {
    parent.insertBefore(element.firstChild, element);
  }

  parent.removeChild(element);
}

function placeCaretInside(element: HTMLElement) {
  const range = document.createRange();
  const selection = window.getSelection();

  if (!selection) return;

  const textNode = element.firstChild;

  if (textNode?.nodeType === Node.TEXT_NODE) {
    range.setStart(textNode, textNode.textContent?.length ?? 0);
  } else {
    range.selectNodeContents(element);
    range.collapse(false);
  }

  selection.removeAllRanges();
  selection.addRange(range);
}

function insertNodeAtRange(range: Range, node: Node) {
  range.deleteContents();
  range.insertNode(node);

  if (node.nodeType === Node.ELEMENT_NODE) {
    placeCaretInside(node as HTMLElement);
    return;
  }

  const selection = window.getSelection();
  if (!selection) return;

  range.setStartAfter(node);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

function wrapSelection(root: HTMLElement, range: Range, tagName: string, style?: RichTextStylePatch) {
  const element = document.createElement(tagName);

  if (tagName === "span" && style) {
    applyStylePatchToElement(element, style);
  }

  if (range.collapsed) {
    element.textContent = RICH_TEXT_CARET_MARKER;
    insertNodeAtRange(range, element);
    return;
  }

  const contents = range.extractContents();
  element.appendChild(contents);
  range.insertNode(element);

  const selection = window.getSelection();
  if (!selection) return;

  const nextRange = document.createRange();
  nextRange.selectNodeContents(element);
  selection.removeAllRanges();
  selection.addRange(nextRange);

  root.normalize();
}

function applyStylePatchToElement(element: HTMLElement, style: RichTextStylePatch) {
  if (style.color && isSafeColor(style.color)) {
    element.style.color = style.color.trim();
  }

  if (style.fontSize && isSafeFontSize(style.fontSize)) {
    element.style.fontSize = style.fontSize.trim();
  }
}

export function applyRichTextStyle(root: HTMLElement, style: RichTextStylePatch) {
  const range = getScopedSelectionRange(root);
  if (!range) return false;

  const existing = closestInRoot(getElementFromRange(range), "span[style]", root);

  if (existing && range.collapsed) {
    applyStylePatchToElement(existing, style);
    return true;
  }

  wrapSelection(root, range, "span", style);
  return true;
}

function applyInlineCommand(root: HTMLElement, range: Range, command: RichTextCommand) {
  const tag = INLINE_TAG_BY_COMMAND[command];
  if (!tag) return;

  const current = closestInRoot(getElementFromRange(range), tag, root);

  if (current && range.collapsed) {
    unwrapElement(current);
    return;
  }

  wrapSelection(root, range, tag);
}

function blocksToList(root: HTMLElement, blocks: HTMLElement[], listTag: "ul" | "ol") {
  if (blocks.length === 0) return;

  const list = document.createElement(listTag);
  const firstBlock = blocks[0];

  blocks.forEach((block) => {
    const li = document.createElement("li");
    li.innerHTML = block.innerHTML || "<br>";
    copySafeAlignment(block, li);
    list.appendChild(li);
  });

  firstBlock.parentNode?.insertBefore(list, firstBlock);
  blocks.forEach((block) => block.remove());

  const firstLi = list.querySelector("li");
  if (firstLi) placeCaretInside(firstLi);

  root.normalize();
}

function listToParagraphs(list: HTMLElement) {
  const fragment = document.createDocumentFragment();

  Array.from(list.children).forEach((child) => {
    if (child.tagName.toLowerCase() !== "li") return;

    const paragraph = document.createElement("p");
    paragraph.innerHTML = child.innerHTML || "<br>";
    fragment.appendChild(paragraph);
  });

  list.replaceWith(fragment);
}

function toggleList(root: HTMLElement, range: Range, listTag: "ul" | "ol") {
  const currentList = closestInRoot(getElementFromRange(range), "ul, ol", root);

  if (currentList) {
    if (currentList.tagName.toLowerCase() === listTag) {
      listToParagraphs(currentList);
      return;
    }

    const replacement = document.createElement(listTag);
    replacement.innerHTML = currentList.innerHTML;
    currentList.replaceWith(replacement);
    return;
  }

  const blocks = getSelectedBlocks(root, range).filter((block) => block.tagName.toLowerCase() !== "li");
  blocksToList(root, blocks, listTag);
}

function indentListItem(root: HTMLElement, range: Range) {
  const li = closestInRoot(getElementFromRange(range), "li", root);
  const previous = li?.previousElementSibling;

  if (!li || !previous || previous.tagName.toLowerCase() !== "li") return;

  const parentListTag = li.parentElement?.tagName.toLowerCase() === "ol" ? "ol" : "ul";
  let nested = Array.from(previous.children).find((child) => child.tagName.toLowerCase() === parentListTag) as HTMLElement | undefined;

  if (!nested) {
    nested = document.createElement(parentListTag);
    previous.appendChild(nested);
  }

  nested.appendChild(li);
  placeCaretInside(li);
  root.normalize();
}

function outdentListItem(root: HTMLElement, range: Range) {
  const li = closestInRoot(getElementFromRange(range), "li", root);
  const list = li?.parentElement;
  const parentLi = list?.parentElement?.closest("li");

  if (!li || !list || !parentLi || !root.contains(parentLi)) return;

  parentLi.insertAdjacentElement("afterend", li);

  if (list.children.length === 0) list.remove();

  placeCaretInside(li);
  root.normalize();
}

function alignSelection(root: HTMLElement, range: Range, align: RichTextState["align"]) {
  const blocks = getSelectedBlocks(root, range);

  blocks.forEach((block) => {
    if (align === "left") {
      block.style.removeProperty("text-align");
    } else {
      block.style.textAlign = align;
    }
  });
}

export function applyRichTextCommand(root: HTMLElement, command: RichTextCommand) {
  const range = getScopedSelectionRange(root);
  if (!range) return false;

  switch (command) {
    case "bold":
    case "italic":
    case "underline":
    case "strikeThrough":
    case "code":
      applyInlineCommand(root, range, command);
      break;

    case "unorderedList":
      toggleList(root, range, "ul");
      break;

    case "orderedList":
      toggleList(root, range, "ol");
      break;

    case "indent":
      indentListItem(root, range);
      break;

    case "outdent":
      outdentListItem(root, range);
      break;

    case "alignLeft":
      alignSelection(root, range, "left");
      break;

    case "alignCenter":
      alignSelection(root, range, "center");
      break;

    case "alignRight":
      alignSelection(root, range, "right");
      break;

    default:
      return false;
  }

  return true;
}

export function insertRichTextHtml(root: HTMLElement, html: string) {
  const range = getScopedSelectionRange(root);
  if (!range) return false;

  const template = document.createElement("template");
  template.innerHTML = sanitizeRichTextHtml(html);

  const fragment = template.content.cloneNode(true);
  const lastNode = fragment.lastChild;

  range.deleteContents();
  range.insertNode(fragment);

  if (lastNode) {
    const selection = window.getSelection();
    const nextRange = document.createRange();

    nextRange.setStartAfter(lastNode);
    nextRange.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(nextRange);
  }

  root.normalize();
  return true;
}

export function cleanupRichTextEditorDom(root: HTMLElement) {
  root.querySelectorAll("span").forEach((span) => {
    span.textContent = span.textContent?.replace(/\u200b/g, "") ?? "";

    if (!span.getAttribute("style")) {
      unwrapElement(span);
    }
  });

  root.querySelectorAll("strong, em, u, s, code").forEach((element) => {
    element.textContent = element.textContent?.replace(/\u200b/g, "") ?? "";

    if (!(element.textContent ?? "").trim() && element.children.length === 0) {
      element.remove();
    }
  });

  if (!root.innerHTML.trim()) {
    root.innerHTML = EMPTY_RICH_TEXT_HTML;
  }
}

export function getRichTextState(root: HTMLElement): RichTextState {
  const range = getScopedSelectionRange(root);
  const element = range ? getElementFromRange(range) : null;
  const block = closestInRoot(element, "p, li, blockquote, pre, h1, h2, h3", root);
  const textAlign = block?.style.textAlign;

  let align: RichTextState["align"] = "left";

  if (textAlign === "center") align = "center";
  if (textAlign === "right") align = "right";

  return {
    bold: Boolean(closestInRoot(element, "strong", root)),
    italic: Boolean(closestInRoot(element, "em", root)),
    underline: Boolean(closestInRoot(element, "u", root)),
    strikeThrough: Boolean(closestInRoot(element, "s", root)),
    code: Boolean(closestInRoot(element, "code", root)),
    unorderedList: Boolean(closestInRoot(element, "ul", root)),
    orderedList: Boolean(closestInRoot(element, "ol", root)),
    align,
  };
}

export function getRichTextSelectionStyle(root: HTMLElement) {
  const range = getScopedSelectionRange(root);
  const element = range ? getElementFromRange(range) : null;
  const styled = closestInRoot(element, "span[style]", root);

  return {
    color: styled?.style.color || "",
    fontSize: styled?.style.fontSize || "",
  };
}

export function normalizeCssColorToHex(value: string) {
  const color = value.trim();

  if (/^#[0-9a-f]{6}$/i.test(color)) return color.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(color)) {
    return `#${color
      .slice(1)
      .split("")
      .map((part) => part + part)
      .join("")}`.toLowerCase();
  }

  const rgba = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)$/i);

  if (!rgba) return null;

  const [, r, g, b] = rgba;

  return `#${[r, g, b].map((channel) => Number(channel).toString(16).padStart(2, "0")).join("")}`;
}
