import type { Note } from './types';

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
  const text = notePlainText(note);
  return text.length > maxLength ? `${text.slice(0, maxLength).trim()}...` : text;
}

export function notePlainText(note: Note) {
  if (note.contentFormat === 'markdown') {
    return stripMarkdown(note.content);
  }
  return stripHtml(note.content);
}

export function noteEditorHtml(note?: Note | null) {
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
