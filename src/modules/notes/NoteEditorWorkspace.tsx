import { ArrowLeft, BookOpen, Edit3, Save, Tags, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { ContentGroup } from '../../shared/types/common';
import { cn } from '../../shared/utils/classNames';
import type { Note } from './types';

export type NoteMode = 'read' | 'edit';

export interface NoteEditorNavigationActions {
  save: () => void;
  discard: () => void;
}

export interface NoteEditorWorkspaceProps {
  note?: Note | null;
  groups?: ContentGroup[];
  defaultGroupId?: string | null;
  initialMode?: NoteMode;
  onCancel: () => void;
  onSave: (note: Note) => void;
  onDirtyChange?: (dirty: boolean) => void;
  onNavigationActionsChange?: (actions: NoteEditorNavigationActions | null) => void;
}

export function NoteEditorWorkspace({
  note,
  groups = [],
  defaultGroupId = null,
  initialMode = 'edit',
  onCancel,
  onSave,
  onDirtyChange,
  onNavigationActionsChange,
}: NoteEditorWorkspaceProps) {
  const initial = useMemo(() => createEditableNote(note, defaultGroupId), [note, defaultGroupId]);
  const [mode, setMode] = useState<NoteMode>(initialMode);
  const [title, setTitle] = useState(initial.title);
  const [content, setContent] = useState(initial.editorPlainText || initial.content || '');
  const [category, setCategory] = useState(initial.category);
  const [groupId, setGroupId] = useState<string | null>(initial.groupId ?? null);
  const [tags, setTags] = useState<string[]>(initial.tags ?? []);
  const [tagInput, setTagInput] = useState('');
  const [lastSavedLabel, setLastSavedLabel] = useState('не сохранено');

  const dirty = title !== initial.title
    || content !== (initial.editorPlainText || initial.content || '')
    || category !== initial.category
    || groupId !== (initial.groupId ?? null)
    || tags.join('\u0000') !== (initial.tags ?? []).join('\u0000');

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    onNavigationActionsChange?.({
      save: () => saveNote(),
      discard: onCancel,
    });
    return () => onNavigationActionsChange?.(null);
  });

  function addTag(value = tagInput) {
    const nextTag = value.trim().replace(/^#/, '');
    if (!nextTag) {
      setTagInput('');
      return;
    }
    setTags((current) => (current.includes(nextTag) ? current : [...current, nextTag]));
    setTagInput('');
  }

  function removeTag(value: string) {
    setTags((current) => current.filter((item) => item !== value));
  }

  function buildNote(): Note {
    const timestamp = new Date().toISOString();
    const createdAt = initial.createdAt ?? timestamp;
    const safeTitle = title.trim() || 'Untitled note';
    return {
      ...initial,
      id: initial.id,
      title: safeTitle,
      content,
      contentFormat: 'plain',
      category: category.trim(),
      groupId,
      tags,
      pinned: initial.pinned ?? false,
      editorContent: content,
      editorPlainText: content,
      properties: initial.properties ?? [],
      assets: initial.assets ?? [],
      schemaVersion: 1,
      layoutWidth: initial.layoutWidth ?? 1200,
      createdAt,
      updatedAt: timestamp,
    };
  }

  function saveNote() {
    const nextNote = buildNote();
    onSave(nextNote);
    setLastSavedLabel(new Date().toLocaleTimeString());
  }

  return (
    <section className="min-h-[calc(100vh-48px)] p-6 max-[760px]:p-4">
      <div className="mb-[18px] flex items-center justify-between gap-3 max-[760px]:items-stretch max-[760px]:flex-col">
        <div className="flex items-center gap-3">
          <button className={ghostButtonClass} type="button" onClick={onCancel}>
            <ArrowLeft size={18} />
            Назад к заметкам
          </button>
          <span className={cn(statusDotClass, dirty ? statusDirtyClass : statusSavedClass)} aria-label={dirty ? 'Есть несохранённые изменения' : `Последнее сохранение: ${lastSavedLabel}`} />
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <button className={cn(ghostButtonClass, mode === 'read' && activeButtonClass)} type="button" onClick={() => setMode('read')}>
            <BookOpen size={18} />
            Чтение
          </button>
          <button className={cn(ghostButtonClass, mode === 'edit' && activeButtonClass)} type="button" onClick={() => setMode('edit')}>
            <Edit3 size={18} />
            Редактирование
          </button>
          <button className={accentButtonClass} type="button" onClick={saveNote}>
            <Save size={18} />
            Сохранить
          </button>
        </div>
      </div>

      <div className="flex justify-center">
        <main className="w-[min(100%,1040px)] rounded-panel border border-app-border bg-app-surface p-7 text-app-text shadow-panel max-[760px]:p-[18px]">
          <input
            className="mb-4 w-full px-4 py-3.5 text-[2rem] font-extrabold"
            value={title}
            placeholder="Untitled note"
            readOnly={mode === 'read'}
            onChange={(event) => setTitle(event.target.value)}
          />

          <div className="mb-4 flex flex-wrap items-center gap-3">
            {groups.length > 0 ? (
              <label className={metadataLabelClass}>
                <span className="text-xs text-app-muted">Группа</span>
                <select value={groupId ?? ''} disabled={mode === 'read'} onChange={(event) => setGroupId(event.target.value || null)}>
                  <option value="">Без группы</option>
                  {groups.map((group) => (
                    <option value={group.id} key={group.id}>{group.title}</option>
                  ))}
                </select>
              </label>
            ) : null}

            <label className={metadataLabelClass}>
              <span className="text-xs text-app-muted">Категория</span>
              <input value={category} readOnly={mode === 'read'} onChange={(event) => setCategory(event.target.value)} />
            </label>

            <div className="flex min-w-[260px] flex-1 flex-wrap items-center gap-3">
              <Tags className="text-app-muted" size={17} />
              {tags.map((tag) => (
                <button className={noteChipClass} type="button" key={tag} onClick={() => removeTag(tag)} disabled={mode === 'read'}>
                  {tag}
                  <X size={14} />
                </button>
              ))}
              {mode === 'edit' ? (
                <input
                  className="min-h-[34px] min-w-[150px] flex-1 px-2.5"
                  value={tagInput}
                  placeholder="+ Добавить тег"
                  onChange={(event) => setTagInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ',') {
                      event.preventDefault();
                      addTag();
                    }
                  }}
                  onBlur={() => addTag()}
                />
              ) : null}
            </div>
          </div>

          {mode === 'edit' ? (
            <textarea
              className="min-h-[420px] w-full resize-y p-[18px] leading-[1.65]"
              value={content}
              placeholder="Старый notebook-редактор удалён. Здесь временный plain-text редактор до новой реализации."
              onChange={(event) => setContent(event.target.value)}
            />
          ) : (
            <article className="min-h-[360px] rounded-panel border border-app-border bg-app-surface-soft p-[18px] text-app-text">
              {content.trim() ? content.split(/\n{2,}/).map((paragraph, index) => (
                <p className="mb-4 leading-[1.7] last:mb-0" key={`${paragraph}-${index}`}>{paragraph}</p>
              )) : <p className="text-app-muted">Заметка пока пустая.</p>}
            </article>
          )}
        </main>
      </div>
    </section>
  );
}

function createEditableNote(note: Note | null | undefined, defaultGroupId: string | null): Note {
  const timestamp = new Date().toISOString();
  if (note) {
    return {
      ...note,
      content: note.content ?? note.editorPlainText ?? '',
      category: note.category ?? '',
      groupId: note.groupId ?? null,
      tags: note.tags ?? [],
      pinned: note.pinned ?? false,
      createdAt: note.createdAt ?? timestamp,
      updatedAt: note.updatedAt ?? timestamp,
    };
  }

  return {
    id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: 'Untitled note',
    content: '',
    contentFormat: 'plain',
    category: '',
    groupId: defaultGroupId,
    tags: [],
    pinned: false,
    editorContent: '',
    editorPlainText: '',
    properties: [],
    assets: [],
    schemaVersion: 1,
    layoutWidth: 1200,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

const ghostButtonClass =
  'inline-flex min-h-control items-center justify-center gap-2 rounded-control border border-[color-mix(in_srgb,var(--accent)_36%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_10%,var(--surface-strong))] px-3.5 py-2.5 font-bold text-[color-mix(in_srgb,var(--accent-strong)_86%,var(--text))] transition-colors hover:border-[color-mix(in_srgb,var(--accent-strong)_72%,var(--border))] hover:bg-[var(--control-bg-hover)]';
const activeButtonClass =
  'border-[color-mix(in_srgb,var(--accent)_62%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_18%,var(--surface-strong))] text-app-accent-strong';
const accentButtonClass =
  'inline-flex min-h-control items-center justify-center gap-2 rounded-control border border-[color-mix(in_srgb,var(--accent)_72%,var(--border))] bg-[var(--button-bg-primary)] px-3.5 py-2.5 font-bold text-app-accent-strong transition-colors hover:bg-[var(--button-bg-primary-hover)]';
const statusDotClass = 'h-2.5 w-2.5 rounded-full';
const statusDirtyClass = 'bg-app-warning shadow-[0_0_0_4px_color-mix(in_srgb,var(--warning)_18%,transparent)]';
const statusSavedClass = 'bg-app-positive shadow-[0_0_0_4px_color-mix(in_srgb,var(--positive)_18%,transparent)]';
const metadataLabelClass =
  'flex min-w-[180px] flex-col gap-1.5 text-sm text-app-muted [&_input]:min-h-[38px] [&_input]:px-2.5 [&_select]:min-h-[38px] [&_select]:px-2.5';
const noteChipClass =
  'inline-flex min-h-[30px] items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--accent)_24%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] px-2.5 text-sm text-app-text transition-opacity disabled:opacity-60';
