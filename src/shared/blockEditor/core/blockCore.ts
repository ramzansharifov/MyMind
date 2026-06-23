import {
  createRichTextDocument,
  richTextHtmlToPlainText,
  type RichTextDocument,
} from "../blocks/richText/richTextCore";

export type StudyHeadingLevel = 1 | 2 | 3 | 4 | 5;
export type StudyFileKind = "image" | "video" | "audio" | "file";
export type StudyLinkKind = "image" | "video" | "audio" | "pdf" | "link";
export type StudyBlockType = "text" | "heading" | "markdown" | "latex" | "code" | "divider" | "file" | "link";

export interface StudyTextBlock {
  id: string;
  type: "text";
  content: RichTextDocument;
}

export interface StudyHeadingBlock {
  id: string;
  type: "heading";
  text: string;
  level: StudyHeadingLevel;
  collapsible: boolean;
}

export interface StudyMarkdownBlock {
  id: string;
  type: "markdown";
  source: string;
}

export interface StudyLatexBlock {
  id: string;
  type: "latex";
  source: string;
  displayMode: boolean;
}

export interface StudyCodeBlock {
  id: string;
  type: "code";
  source: string;
  language: string;
}

export interface StudyDividerBlock {
  id: string;
  type: "divider";
  thickness: number;
  color: string;
}

export interface StudyFileBlock {
  id: string;
  type: "file";
  name: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  kind: StudyFileKind;
}

export interface StudyLinkBlock {
  id: string;
  type: "link";
  title: string;
  url: string;
  kind: StudyLinkKind;
}

export type StudyContentBlock =
  | StudyTextBlock
  | StudyHeadingBlock
  | StudyMarkdownBlock
  | StudyLatexBlock
  | StudyCodeBlock
  | StudyDividerBlock
  | StudyFileBlock
  | StudyLinkBlock;

export interface StudyBlockDocument {
  format: typeof STUDY_BLOCK_DOCUMENT_FORMAT;
  version: typeof STUDY_BLOCK_DOCUMENT_VERSION;
  blocks: StudyContentBlock[];
  plainText: string;
}

export const STUDY_BLOCK_DOCUMENT_FORMAT = "study-blocks-v1";
export const STUDY_BLOCK_DOCUMENT_VERSION = 1;
export const STUDY_DIVIDER_DEFAULT_THICKNESS = 1;
export const STUDY_DIVIDER_MIN_THICKNESS = 1;
export const STUDY_DIVIDER_MAX_THICKNESS = 12;
export const STUDY_DIVIDER_DEFAULT_COLOR = "#2dd4bf";

export function createStudyBlockDocument(content?: unknown, fallbackPlainText = ""): StudyBlockDocument {
  const blocks = normalizeStudyBlocks(content, fallbackPlainText);

  return {
    format: STUDY_BLOCK_DOCUMENT_FORMAT,
    version: STUDY_BLOCK_DOCUMENT_VERSION,
    blocks,
    plainText: studyBlocksToPlainText(blocks),
  };
}

export function normalizeStudyBlockDocument(content: unknown, fallbackPlainText = ""): StudyBlockDocument {
  if (isStudyBlockDocument(content)) {
    return createStudyBlockDocument(content.blocks, content.plainText || fallbackPlainText);
  }

  return createStudyBlockDocument(content, fallbackPlainText);
}

export function createStudyTextBlock(content: unknown = ""): StudyTextBlock {
  return {
    id: createStudyBlockId("text"),
    type: "text",
    content: createRichTextDocument(content),
  };
}

export function createStudyHeadingBlock(text = "", level: StudyHeadingLevel = 1, collapsible = true): StudyHeadingBlock {
  return {
    id: createStudyBlockId("heading"),
    type: "heading",
    text,
    level,
    collapsible,
  };
}

export function createStudyMarkdownBlock(source = ""): StudyMarkdownBlock {
  return {
    id: createStudyBlockId("markdown"),
    type: "markdown",
    source,
  };
}

export function createStudyLatexBlock(source = ""): StudyLatexBlock {
  return {
    id: createStudyBlockId("latex"),
    type: "latex",
    source,
    displayMode: true,
  };
}

export function createStudyCodeBlock(source = "", language = "auto"): StudyCodeBlock {
  return {
    id: createStudyBlockId("code"),
    type: "code",
    source,
    language,
  };
}

export function createStudyDividerBlock(options: Partial<Pick<StudyDividerBlock, "thickness" | "color">> = {}): StudyDividerBlock {
  return {
    id: createStudyBlockId("divider"),
    type: "divider",
    thickness: normalizeStudyDividerThickness(options.thickness),
    color: normalizeStudyDividerColor(options.color),
  };
}

export function createStudyFileBlock(options: Partial<Omit<StudyFileBlock, "id" | "type">> = {}): StudyFileBlock {
  return {
    id: createStudyBlockId("file"),
    type: "file",
    name: normalizeStudyFileName(options.name),
    mimeType: typeof options.mimeType === "string" ? options.mimeType : "",
    sizeBytes: normalizeStudyFileSize(options.sizeBytes),
    url: typeof options.url === "string" ? options.url : "",
    kind: normalizeStudyFileKind(options.kind, options.mimeType, options.name),
  };
}

export function createStudyLinkBlock(options: Partial<Omit<StudyLinkBlock, "id" | "type">> = {}): StudyLinkBlock {
  const url = normalizeStudyLinkUrl(options.url);

  return {
    id: createStudyBlockId("link"),
    type: "link",
    title: normalizeStudyLinkTitle(options.title),
    url,
    kind: normalizeStudyLinkKind(options.kind, url),
  };
}

export function duplicateStudyBlock(block: StudyContentBlock): StudyContentBlock {
  if (block.type === "text") {
    return createStudyTextBlock(block.content);
  }

  if (block.type === "heading") {
    return createStudyHeadingBlock(block.text, block.level, block.collapsible);
  }

  if (block.type === "markdown") {
    return createStudyMarkdownBlock(block.source);
  }

  if (block.type === "latex") {
    return {
      ...createStudyLatexBlock(block.source),
      displayMode: block.displayMode,
    };
  }

  if (block.type === "divider") {
    return createStudyDividerBlock({
      thickness: block.thickness,
      color: block.color,
    });
  }

  if (block.type === "file") {
    return createStudyFileBlock({
      name: block.name,
      mimeType: block.mimeType,
      sizeBytes: block.sizeBytes,
      url: block.url,
      kind: block.kind,
    });
  }

  if (block.type === "link") {
    return createStudyLinkBlock({
      title: block.title,
      url: block.url,
      kind: block.kind,
    });
  }

  return createStudyCodeBlock(block.source, block.language);
}

export function studyBlocksToPlainText(blocks: StudyContentBlock[]) {
  return blocks
    .map((block) => {
      if (block.type === "text") return richTextHtmlToPlainText(block.content);
      if (block.type === "heading") return block.text.trim();
      if (block.type === "markdown" || block.type === "latex" || block.type === "code") return block.source.trim();
      if (block.type === "file") return block.name.trim();
      if (block.type === "link") return [block.title.trim(), block.url.trim()].filter(Boolean).join(" ");
      return "";
    })
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

export function normalizeStudyBlocks(content: unknown, fallbackPlainText = ""): StudyContentBlock[] {
  if (Array.isArray(content)) {
    const blocks = content
      .map(normalizeStudyBlock)
      .filter((block): block is StudyContentBlock => Boolean(block));

    return blocks.length > 0 ? blocks : [createStudyTextBlock(fallbackPlainText)];
  }

  if (isStudyBlockDocument(content)) {
    return normalizeStudyBlocks(content.blocks, content.plainText || fallbackPlainText);
  }

  return [createStudyTextBlock(content || fallbackPlainText)];
}

export function isStudyBlockDocument(value: unknown): value is StudyBlockDocument {
  const source = value as Partial<StudyBlockDocument> | null;
  return source?.format === STUDY_BLOCK_DOCUMENT_FORMAT && Array.isArray(source.blocks);
}

function normalizeStudyBlock(value: unknown): StudyContentBlock | null {
  const source = value as Partial<StudyContentBlock> | null;

  if (!source || typeof source !== "object") return null;

  if (source.type === "text") {
    return {
      id: typeof source.id === "string" ? source.id : createStudyBlockId("text"),
      type: "text",
      content: createRichTextDocument((source as Partial<StudyTextBlock>).content),
    };
  }

  if (source.type === "heading") {
    return {
      id: typeof source.id === "string" ? source.id : createStudyBlockId("heading"),
      type: "heading",
      text: typeof (source as Partial<StudyHeadingBlock>).text === "string" ? (source as Partial<StudyHeadingBlock>).text ?? "" : "",
      level: normalizeStudyHeadingLevel((source as Partial<StudyHeadingBlock>).level),
      collapsible: normalizeStudyHeadingCollapsible((source as Partial<StudyHeadingBlock>).collapsible),
    };
  }

  if (source.type === "markdown") {
    return {
      id: typeof source.id === "string" ? source.id : createStudyBlockId("markdown"),
      type: "markdown",
      source: typeof (source as Partial<StudyMarkdownBlock>).source === "string" ? (source as Partial<StudyMarkdownBlock>).source ?? "" : "",
    };
  }

  if (source.type === "latex") {
    return {
      id: typeof source.id === "string" ? source.id : createStudyBlockId("latex"),
      type: "latex",
      source: typeof (source as Partial<StudyLatexBlock>).source === "string" ? (source as Partial<StudyLatexBlock>).source ?? "" : "",
      displayMode: (source as Partial<StudyLatexBlock>).displayMode ?? true,
    };
  }

  if (source.type === "code") {
    return {
      id: typeof source.id === "string" ? source.id : createStudyBlockId("code"),
      type: "code",
      source: typeof (source as Partial<StudyCodeBlock>).source === "string" ? (source as Partial<StudyCodeBlock>).source ?? "" : "",
      language:
        typeof (source as Partial<StudyCodeBlock>).language === "string"
          ? (source as Partial<StudyCodeBlock>).language || "auto"
          : "auto",
    };
  }

  if (source.type === "divider") {
    return {
      id: typeof source.id === "string" ? source.id : createStudyBlockId("divider"),
      type: "divider",
      thickness: normalizeStudyDividerThickness((source as Partial<StudyDividerBlock>).thickness),
      color: normalizeStudyDividerColor((source as Partial<StudyDividerBlock>).color),
    };
  }

  if (source.type === "file") {
    const block = source as Partial<StudyFileBlock>;

    return {
      id: typeof source.id === "string" ? source.id : createStudyBlockId("file"),
      type: "file",
      name: normalizeStudyFileName(block.name),
      mimeType: typeof block.mimeType === "string" ? block.mimeType : "",
      sizeBytes: normalizeStudyFileSize(block.sizeBytes),
      url: typeof block.url === "string" ? block.url : "",
      kind: normalizeStudyFileKind(block.kind, block.mimeType, block.name),
    };
  }

  if (source.type === "link") {
    const block = source as Partial<StudyLinkBlock>;
    const url = normalizeStudyLinkUrl(block.url);

    return {
      id: typeof source.id === "string" ? source.id : createStudyBlockId("link"),
      type: "link",
      title: normalizeStudyLinkTitle(block.title),
      url,
      kind: normalizeStudyLinkKind(block.kind, url),
    };
  }

  return null;
}

function normalizeStudyHeadingLevel(value: unknown): StudyHeadingLevel {
  const level = Number(value);

  if (level === 1 || level === 2 || level === 3 || level === 4 || level === 5) return level;

  return 1;
}

function normalizeStudyHeadingCollapsible(value: unknown) {
  return typeof value === "boolean" ? value : true;
}

function normalizeStudyDividerThickness(value: unknown) {
  const thickness = Number(value);

  if (!Number.isFinite(thickness)) return STUDY_DIVIDER_DEFAULT_THICKNESS;

  return Math.min(STUDY_DIVIDER_MAX_THICKNESS, Math.max(STUDY_DIVIDER_MIN_THICKNESS, Math.round(thickness)));
}

function normalizeStudyDividerColor(value: unknown) {
  if (typeof value !== "string") return STUDY_DIVIDER_DEFAULT_COLOR;

  const color = value.trim();

  return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color) ? color : STUDY_DIVIDER_DEFAULT_COLOR;
}

function normalizeStudyFileName(value: unknown) {
  const name = typeof value === "string" ? value.trim() : "";

  return name || "Файл";
}

function normalizeStudyFileSize(value: unknown) {
  const size = Number(value);

  return Number.isFinite(size) && size > 0 ? Math.round(size) : 0;
}

function normalizeStudyFileKind(kind: unknown, mimeType: unknown, name: unknown): StudyFileKind {
  if (kind === "image" || kind === "video" || kind === "audio" || kind === "file") return kind;

  const mime = typeof mimeType === "string" ? mimeType.toLowerCase() : "";
  const fileName = typeof name === "string" ? name.toLowerCase() : "";

  if (mime.startsWith("image/") || /\.(avif|bmp|gif|jpe?g|png|svg|webp)$/.test(fileName)) return "image";
  if (mime.startsWith("video/") || /\.(m4v|mov|mp4|mpeg|ogv|webm)$/.test(fileName)) return "video";
  if (mime.startsWith("audio/") || /\.(aac|flac|m4a|mp3|oga|ogg|wav|weba)$/.test(fileName)) return "audio";

  return "file";
}

function normalizeStudyLinkTitle(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStudyLinkUrl(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStudyLinkKind(kind: unknown, url: unknown): StudyLinkKind {
  if (kind === "image" || kind === "video" || kind === "audio" || kind === "pdf" || kind === "link") return kind;

  const pathname = getStudyLinkPathname(typeof url === "string" ? url : "");

  if (/\.(avif|bmp|gif|jpe?g|png|svg|webp)$/i.test(pathname)) return "image";
  if (/\.(m4v|mov|mp4|mpeg|ogv|webm)$/i.test(pathname)) return "video";
  if (/\.(aac|flac|m4a|mp3|oga|ogg|wav|weba)$/i.test(pathname)) return "audio";
  if (/\.pdf$/i.test(pathname)) return "pdf";

  return "link";
}

function getStudyLinkPathname(value: string) {
  const trimmed = value.trim();

  if (!trimmed) return "";

  try {
    return new URL(hasStudyLinkProtocol(trimmed) ? trimmed : `https://${trimmed}`).pathname;
  } catch {
    return trimmed.split(/[?#]/, 1)[0] ?? "";
  }
}

function hasStudyLinkProtocol(value: string) {
  return /^[a-z][a-z\d+.-]*:/i.test(value);
}

function createStudyBlockId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
