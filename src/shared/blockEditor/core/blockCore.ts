import {
  createRichTextDocument,
  richTextHtmlToPlainText,
  type RichTextDocument,
} from "../blocks/richText/richTextCore";

export type StudyHeadingLevel = 1 | 2 | 3 | 4 | 5;
export type StudyBlockType = "text" | "heading" | "markdown" | "latex" | "code";

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

export type StudyContentBlock =
  | StudyTextBlock
  | StudyHeadingBlock
  | StudyMarkdownBlock
  | StudyLatexBlock
  | StudyCodeBlock;

export interface StudyBlockDocument {
  format: typeof STUDY_BLOCK_DOCUMENT_FORMAT;
  version: typeof STUDY_BLOCK_DOCUMENT_VERSION;
  blocks: StudyContentBlock[];
  plainText: string;
}

export const STUDY_BLOCK_DOCUMENT_FORMAT = "study-blocks-v1";
export const STUDY_BLOCK_DOCUMENT_VERSION = 1;

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

export function createStudyHeadingBlock(text = "", level: StudyHeadingLevel = 1): StudyHeadingBlock {
  return {
    id: createStudyBlockId("heading"),
    type: "heading",
    text,
    level,
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

export function studyBlocksToPlainText(blocks: StudyContentBlock[]) {
  return blocks
    .map((block) => {
      if (block.type === "text") return richTextHtmlToPlainText(block.content);
      if (block.type === "heading") return block.text.trim();
      if (block.type === "markdown" || block.type === "latex" || block.type === "code") return block.source.trim();
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

  return null;
}

function normalizeStudyHeadingLevel(value: unknown): StudyHeadingLevel {
  const level = Number(value);

  if (level === 1 || level === 2 || level === 3 || level === 4 || level === 5) return level;

  return 1;
}

function createStudyBlockId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
