import type { Note, NoteLayoutWidth } from './types';
import { hasCurrentNoteSchema, NOTE_SCHEMA_VERSION } from './migrations';

export { NOTE_SCHEMA_VERSION } from './migrations';

const NOTE_LAYOUT_WIDTHS = [900, 1000, 1100, 1200] as const satisfies readonly NoteLayoutWidth[];
const DEFAULT_NOTE_LAYOUT_WIDTH: NoteLayoutWidth = 1200;

type MyMindEditorBlock = {
  id?: string;
  type?: string;
  content?: unknown;
  checked?: boolean;
  rows?: unknown;
  props?: Record<string, unknown>;
};

export type MyMindEditorContent = Array<Record<string, unknown>>;

export function noteTags(notes: Note[]) {
  return Array.from(new Set(notes.flatMap((note) => note.tags))).sort();
}

export function noteCategories(notes: Note[]) {
  return Array.from(new Set(notes.map((note) => note.category).filter(Boolean))).sort();
}

export function filterNotes(notes: Note[], query: string, tag: string, category: string, pinnedOnly: boolean) {
  const normalized = query.trim().toLowerCase();
  return notes
    .filter((note) => {
      const matchesQuery =
        !normalized || note.title.toLowerCase().includes(normalized) || notePlainText(note).toLowerCase().includes(normalized);
      const matchesTag = !tag || note.tags.includes(tag);
      const matchesCategory = !category || note.category === category;
      const matchesPinned = !pinnedOnly || note.pinned || note.pinnedAt;
      return matchesQuery && matchesTag && matchesCategory && matchesPinned;
    })
    .sort((a, b) => Number(Boolean(b.pinned || b.pinnedAt)) - Number(Boolean(a.pinned || a.pinnedAt)) || b.updatedAt.localeCompare(a.updatedAt));
}

export function stripHtml(value: string) {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

export function notePreview(note: Note, maxLength = 160) {
  const text = getNotePlainText(note);
  return text.length > maxLength ? `${text.slice(0, maxLength).trim()}...` : text;
}

export function notePlainText(note: Note) {
  return getNotePlainText(note);
}

export function getNotePlainText(note: Note) {
  if (note.editorPlainText?.trim()) {
    return note.editorPlainText.trim();
  }
  const editorText = editorContentToPlainText(getNoteEditorContent(note));
  if (editorText) {
    return editorText;
  }
  if (note.contentFormat === 'markdown') {
    return stripMarkdown(note.content);
  }
  return stripHtml(note.content);
}

export function getNotePreview(note: Note, maxLength = 160) {
  return notePreview(note, maxLength);
}

export function getNoteEditorContent(note?: Note | null): MyMindEditorContent {
  if (Array.isArray(note?.editorContent)) {
    return normalizeEditorContent(note.editorContent);
  }
  if (!note) {
    return [];
  }
  return contentToBlockNoteFallback(note);
}

export function noteEditorHtml(note?: Note | null) {
  if (note?.editorHtml) {
    return note.editorHtml;
  }
  if (!note?.content) {
    return '';
  }
  if (note.contentFormat === 'markdown') {
    return markdownToHtml(note.content);
  }
  if (note.contentFormat === 'html') {
    return note.content;
  }
  return escapeHtml(note.content)
    .split('\n')
    .map((line) => `<p>${line || '<br>'}</p>`)
    .join('');
}

export function noteReaderHtml(note?: Note | null) {
  if (note?.editorHtml) {
    return note.editorHtml;
  }
  if (!note?.content) {
    return '';
  }
  if (note.contentFormat === 'markdown') {
    return markdownToHtml(note.content);
  }
  return noteEditorHtml(note);
}

export function markdownToHtml(markdown: string) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const html: string[] = [];
  let paragraph: string[] = [];
  let listType: 'ul' | 'ol' | null = null;
  let inCodeBlock = false;
  let codeLines: string[] = [];

  function flushParagraph() {
    if (paragraph.length === 0) {
      return;
    }
    html.push(`<p>${inlineMarkdown(paragraph.join(' '))}</p>`);
    paragraph = [];
  }

  function closeList() {
    if (!listType) {
      return;
    }
    html.push(`</${listType}>`);
    listType = null;
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        html.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
        codeLines = [];
        inCodeBlock = false;
      } else {
        flushParagraph();
        closeList();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(rawLine);
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      closeList();
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      flushParagraph();
      closeList();
      const level = heading[1].length;
      html.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }

    const unordered = /^[-*]\s+(.+)$/.exec(line.trim());
    const ordered = /^\d+\.\s+(.+)$/.exec(line.trim());
    if (unordered || ordered) {
      flushParagraph();
      const nextType = unordered ? 'ul' : 'ol';
      if (listType !== nextType) {
        closeList();
        listType = nextType;
        html.push(`<${listType}>`);
      }
      html.push(`<li>${inlineMarkdown((unordered ?? ordered)?.[1] ?? '')}</li>`);
      continue;
    }

    const quote = /^>\s+(.+)$/.exec(line.trim());
    if (quote) {
      flushParagraph();
      closeList();
      html.push(`<blockquote>${inlineMarkdown(quote[1])}</blockquote>`);
      continue;
    }

    closeList();
    paragraph.push(line.trim());
  }

  flushParagraph();
  closeList();
  if (inCodeBlock) {
    html.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
  }
  return html.join('');
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function migrateNote(note: Note): Note {
  if (hasCurrentNoteSchema(note)) {
    const editorContent = normalizeEditorContent(note.editorContent);
    const editorPlainText = note.editorPlainText?.trim() || editorContentToPlainText(editorContent) || getNotePlainText({ ...note, editorContent });
    return {
      ...note,
      category: note.category ?? '',
      tags: note.tags ?? [],
      properties: note.properties ?? [],
      assets: note.assets ?? [],
      layoutWidth: normalizeNoteLayoutWidth(note.layoutWidth),
      editorContent,
      editorPlainText,
      content: note.content ?? editorPlainText,
    };
  }

  const editorContent = getMigratedEditorContent(note);
  const editorPlainText = editorContentToPlainText(editorContent) || legacyContentToPlainText(note);
  const editorHtml = note.contentFormat === 'html' ? stripLegacyBlocksComment(note.content) : '';

  return {
    ...note,
    category: note.category ?? '',
    tags: note.tags ?? [],
    properties: note.properties ?? [],
    assets: note.assets ?? [],
    layoutWidth: normalizeNoteLayoutWidth(note.layoutWidth),
    schemaVersion: NOTE_SCHEMA_VERSION,
    editorContent,
    editorPlainText,
    editorHtml,
    content: editorHtml || editorPlainText || stripLegacyBlocksComment(note.content ?? ''),
    contentFormat: editorHtml ? 'html' : 'plain',
  };
}

export function editorContentToPlainText(content: unknown): string {
  if (!Array.isArray(content)) {
    return '';
  }
  const parts: string[] = [];

  function walk(blocks: unknown[]) {
    for (const block of blocks) {
      if (!block || typeof block !== 'object') {
        continue;
      }
      const current = block as Record<string, unknown>;
      const blockText = inlineContentToText(current.content);
      if (blockText) {
        parts.push(blockText);
      }
      if (current.type === 'image' && typeof (current.props as Record<string, unknown> | undefined)?.caption === 'string') {
        parts.push(String((current.props as Record<string, unknown>).caption));
      }
      if (current.type === 'drawing') {
        parts.push('Drawing board');
      }
      if (Array.isArray(current.children)) {
        walk(current.children);
      }
    }
  }

  walk(content);
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

export function normalizeEditorContent(content: unknown): MyMindEditorContent {
  if (!Array.isArray(content)) {
    return [];
  }
  return content.map(normalizeEditorBlock).filter(Boolean) as MyMindEditorContent;
}

export function legacyContentToPlainText(note: Note) {
  if (note.contentFormat === 'markdown') {
    return stripMarkdown(stripLegacyBlocksComment(note.content ?? ''));
  }
  return stripHtml(stripLegacyBlocksComment(note.content ?? ''));
}

function normalizeNoteLayoutWidth(value: unknown): NoteLayoutWidth {
  const width = Number(value);
  return NOTE_LAYOUT_WIDTHS.includes(width as NoteLayoutWidth) ? (width as NoteLayoutWidth) : DEFAULT_NOTE_LAYOUT_WIDTH;
}

function getMigratedEditorContent(note: Note): MyMindEditorContent {
  const legacyBlocks = readLegacyBlocks(note.content ?? '');
  if (legacyBlocks.length > 0) {
    const migrated = legacyBlocksToBlockNote(legacyBlocks);
    if (migrated.length > 0) {
      return migrated;
    }
  }
  return contentToBlockNoteFallback(note);
}

function contentToBlockNoteFallback(note: Note): MyMindEditorContent {
  const plainText = legacyContentToPlainText(note);
  if (!plainText) {
    return [];
  }
  return textToParagraphBlocks(plainText);
}

function textToParagraphBlocks(value: string): MyMindEditorContent {
  return value
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ({
      type: 'paragraph',
      content: line,
    }));
}

function normalizeEditorBlock(block: unknown): Record<string, unknown> | null {
  if (!block || typeof block !== 'object') {
    return null;
  }

  const current = { ...(block as Record<string, unknown>) };
  if (isTableContent(current.content)) {
    current.content = {
      ...current.content,
      rows: current.content.rows.map((row) => ({
        ...row,
        cells: row.cells.map((cell) => (typeof cell === 'string' ? cell : cell)),
      })),
    };
  }

  if (Array.isArray(current.children)) {
    current.children = current.children.map(normalizeEditorBlock).filter(Boolean);
  }

  return current;
}

function isTableContent(value: unknown): value is { rows: Array<{ cells: unknown[] }> } {
  return Boolean(
    value &&
      typeof value === 'object' &&
      Array.isArray((value as { rows?: unknown }).rows) &&
      (value as { rows: unknown[] }).rows.every((row) => row && typeof row === 'object' && Array.isArray((row as { cells?: unknown }).cells)),
  );
}

function legacyBlocksToBlockNote(blocks: MyMindEditorBlock[]): MyMindEditorContent {
  const result: MyMindEditorContent = [];

  for (const block of blocks) {
    const type = block.type ?? 'text';
    if (type === 'checklist') {
      const items = Array.isArray(block.content) ? block.content : [];
      if (items.length === 0) {
        result.push({ type: 'checkListItem', content: '' });
      } else {
        for (const item of items) {
          if (item && typeof item === 'object') {
            const value = item as Record<string, unknown>;
            const text = String(value.text ?? value.content ?? '');
            result.push({
              type: 'checkListItem',
              props: { checked: Boolean(value.checked) },
              content: text,
            });
          } else {
            const text = String(item ?? '');
            result.push({ type: 'checkListItem', content: text });
          }
        }
      }
      continue;
    }

    if (type === 'divider') {
      result.push({ type: 'divider' });
      continue;
    }

    if (type === 'quote') {
      const text = stripHtml(String(block.content ?? ''));
      result.push({ type: 'quote', content: text });
      continue;
    }

    if (type === 'code') {
      const text = String(block.content ?? '');
      result.push({ type: 'codeBlock', content: text });
      continue;
    }

    if (type === 'image') {
      const props = block.props ?? {};
      const url = String(props.url ?? props.src ?? block.content ?? '');
      result.push({ type: 'image', props: { url, caption: String(props.caption ?? '') } });
      continue;
    }

    if (type === 'table') {
      const tableText = Array.isArray(block.rows) ? block.rows.map((row) => (Array.isArray(row) ? row.join('\t') : String(row))).join('\n') : '';
      const text = tableText || stripHtml(String(block.content ?? ''));
      result.push({ type: 'paragraph', content: text });
      continue;
    }

    const text = stripHtml(String(block.content ?? ''));
    if (text) {
      result.push({ type: 'paragraph', content: text });
    }
  }

  return result;
}

function readLegacyBlocks(content: string): MyMindEditorBlock[] {
  const match = /<!--mymind-blocks:([\s\S]*?)-->/.exec(content);
  if (!match) {
    return [];
  }
  try {
    const parsed = JSON.parse(decodeURIComponent(match[1]));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    try {
      const parsed = JSON.parse(match[1]);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}

function stripLegacyBlocksComment(value: string) {
  return value.replace(/<!--mymind-blocks:[\s\S]*?-->/g, '').trim();
}

function inlineContentToText(content: unknown): string {
  if (!content) {
    return '';
  }
  if (typeof content === 'string') {
    return content;
  }
  if (Array.isArray(content)) {
    return content.map(inlineContentToText).join('');
  }
  if (typeof content === 'object') {
    const value = content as Record<string, unknown>;
    if (typeof value.text === 'string') {
      return value.text;
    }
    if (Array.isArray(value.content)) {
      return value.content.map(inlineContentToText).join('');
    }
  }
  return '';
}

function inlineMarkdown(value: string) {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

function stripMarkdown(value: string) {
  return value
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s+/gm, '')
    .replace(/^[-*]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}
