import { ArrowLeft, BookOpen, Edit3, Save, Tags, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  StudyBlockEditor,
  normalizeStudyBlockDocument,
  type StudyBlockDocument,
} from '../../shared/blockEditor';
import type { ContentGroup } from '../../shared/types/common';
import { cn } from '../../shared/utils/classNames';
import { NOTE_SCHEMA_VERSION } from './noteUtils';
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
  onSave: (note: Note) => void | Promise<void>;
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
  const initialDocument = useMemo(
    () => normalizeStudyBlockDocument(initial.editorContent, initial.editorPlainText || initial.content || ''),
    [initial],
  );
  const [mode, setMode] = useState<NoteMode>(initialMode);
  const [title, setTitle] = useState(initial.title);
  const [draftContent, setDraftContent] = useState<StudyBlockDocument>(initialDocument);
  const [draftPlainText, setDraftPlainText] = useState(initialDocument.plainText);
  const [category, setCategory] = useState(initial.category);
  const [groupId, setGroupId] = useState<string | null>(initial.groupId ?? null);
  const [tags, setTags] = useState<string[]>(initial.tags ?? []);
  const [tagInput, setTagInput] = useState('');
  const [lastSavedLabel, setLastSavedLabel] = useState(() =>
    initial.updatedAt ? new Date(initial.updatedAt).toLocaleTimeString() : 'не сохранено',
  );
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const groupTitleById = useMemo(() => new Map(groups.map((group) => [group.id, group.title])), [groups]);
  const initialBlockSignature = useMemo(() => JSON.stringify(initialDocument.blocks), [initialDocument.blocks]);
  const draftBlockSignature = useMemo(() => JSON.stringify(draftContent.blocks), [draftContent.blocks]);
  const initialTagsSignature = useMemo(() => (initial.tags ?? []).join('\u0000'), [initial.tags]);
  const tagsSignature = useMemo(() => tags.join('\u0000'), [tags]);
  const [savedSnapshot, setSavedSnapshot] = useState(() => ({
    title: initial.title,
    blockSignature: initialBlockSignature,
    category: initial.category,
    groupId: initial.groupId ?? null,
    tagsSignature: initialTagsSignature,
  }));
  const dirty =
    title !== savedSnapshot.title ||
    draftBlockSignature !== savedSnapshot.blockSignature ||
    category !== savedSnapshot.category ||
    groupId !== savedSnapshot.groupId ||
    tagsSignature !== savedSnapshot.tagsSignature;
  const saveStatusLabel = isSaving ? 'Сохранение...' : dirty ? 'Есть изменения' : note ? 'Сохранено' : 'Готово';
  const saveStatusTone = isSaving ? 'saving' : dirty ? 'dirty' : 'saved';
  const selectedGroupTitle = groupId ? groupTitleById.get(groupId) : '';

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  const buildNote = useCallback((): Note => {
    const timestamp = new Date().toISOString();
    const createdAt = initial.createdAt ?? timestamp;
    const safeTitle = title.trim() || 'Новая заметка';

    return {
      ...initial,
      id: initial.id,
      title: safeTitle,
      content: draftPlainText,
      contentFormat: 'plain',
      category: category.trim(),
      groupId,
      tags,
      pinned: initial.pinned ?? false,
      editorContent: draftContent.blocks,
      editorPlainText: draftPlainText,
      editorHtml: undefined,
      properties: initial.properties ?? [],
      assets: initial.assets ?? [],
      schemaVersion: NOTE_SCHEMA_VERSION,
      layoutWidth: initial.layoutWidth ?? 1200,
      createdAt,
      updatedAt: timestamp,
    };
  }, [category, draftContent.blocks, draftPlainText, groupId, initial, tags, title]);

  const saveNote = useCallback(async () => {
    setErrorMessage(null);
    setIsSaving(true);

    try {
      const nextNote = buildNote();
      await onSave(nextNote);
      setSavedSnapshot({
        title: nextNote.title,
        blockSignature: draftBlockSignature,
        category: nextNote.category,
        groupId: nextNote.groupId ?? null,
        tagsSignature,
      });
      setLastSavedLabel(new Date().toLocaleTimeString());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Не удалось сохранить заметку.');
    } finally {
      setIsSaving(false);
    }
  }, [buildNote, draftBlockSignature, onSave, tagsSignature]);

  useEffect(() => {
    onNavigationActionsChange?.({
      save: () => void saveNote(),
      discard: onCancel,
    });
    return () => onNavigationActionsChange?.(null);
  }, [onCancel, onNavigationActionsChange, saveNote]);

  function handleEditorChange(document: StudyBlockDocument, plainText: string) {
    setDraftContent(document);
    setDraftPlainText(plainText);
  }

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

  return (
    <section className="min-h-[calc(100dvh-28px)] bg-transparent p-6 text-app-text max-[760px]:p-4">
      <main className="mx-auto w-full max-w-[1600px]">
        <nav className="mb-3 flex min-w-0 flex-wrap items-center gap-2 text-sm font-medium text-app-muted" aria-label="Путь">
          <span>Заметки</span>
          <span className="text-app-muted/70">/</span>
          <span className="truncate">{title.trim() || 'Новая заметка'}</span>
        </nav>

        <div className="mb-4 flex min-w-0 items-start justify-between gap-4 rounded-panel border border-[var(--glass-border)] bg-[var(--panel-bg)] p-5 text-app-text [backdrop-filter:var(--glass-blur)] shadow-panel max-[900px]:flex-col">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <span className="block text-[11px] font-extrabold uppercase tracking-[0.08em] text-app-accent-strong">Заметка</span>
              <div className={cn(saveStatusClass, saveStatusTone === 'dirty' && 'text-app-warning', saveStatusTone === 'saving' && 'text-app-accent-strong')}>
                <span className={cn('h-2 w-2 rounded-full bg-app-positive', saveStatusTone === 'dirty' && 'bg-app-warning', saveStatusTone === 'saving' && 'bg-app-accent-strong')} aria-hidden="true" />
                {saveStatusLabel}
              </div>
            </div>

            {mode === 'edit' ? (
              <input
                className="w-full min-w-0 rounded-control border border-transparent bg-transparent px-0 py-1 text-[34px] font-extrabold leading-tight text-app-text outline-none transition-colors placeholder:text-app-muted focus:border-[color-mix(in_srgb,var(--accent)_42%,transparent)] focus:bg-app-surface-soft focus:px-3"
                value={title}
                placeholder="Новая заметка"
                onChange={(event) => setTitle(event.target.value)}
              />
            ) : (
              <h1 className="truncate text-[34px] font-extrabold leading-tight text-app-text">{title.trim() || 'Новая заметка'}</h1>
            )}

            {mode === 'read' && (selectedGroupTitle || category || tags.length > 0) ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {selectedGroupTitle ? <span className={metadataChipClass}>{selectedGroupTitle}</span> : null}
                {category ? <span className={metadataChipClass}>{category}</span> : null}
                {tags.map((tag) => (
                  <span className={metadataChipClass} key={tag}>{tag}</span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button className={ghostButtonClass} type="button" onClick={onCancel}>
              <ArrowLeft size={16} />
              Назад к заметкам
            </button>

            <div className="inline-flex rounded-control border border-app-border bg-app-surface-soft p-1">
              <button className={cn(modeToggleButtonClass, mode === 'edit' && modeToggleActiveClass)} type="button" onClick={() => setMode('edit')}>
                <Edit3 size={16} />
                Правка
              </button>

              <button className={cn(modeToggleButtonClass, mode === 'read' && modeToggleActiveClass)} type="button" onClick={() => setMode('read')}>
                <BookOpen size={16} />
                Чтение
              </button>
            </div>
          </div>
        </div>

        {errorMessage ? (
          <div className="mb-4 rounded-panel border border-[color-mix(in_srgb,var(--danger)_42%,var(--border))] bg-[color-mix(in_srgb,var(--danger)_10%,var(--surface))] p-3 text-sm text-app-danger">
            {errorMessage}
          </div>
        ) : null}

        {mode === 'edit' ? (
          <StudyBlockEditor
            value={draftContent}
            mode="edit"
            onChange={handleEditorChange}
            sidebarFooter={
              <div className="grid gap-3">
                <aside className="grid gap-3 rounded-panel border border-[var(--glass-border)] bg-[var(--panel-bg)] p-4 text-app-text [backdrop-filter:var(--glass-blur)] shadow-panel" aria-label="Настройки заметки">
                  <div className="border-b border-app-border pb-3">
                    <strong className="text-base font-extrabold text-app-text">Заметка</strong>
                  </div>

                  {groups.length > 0 ? (
                    <label className={settingsLabelClass}>
                      <span>Группа</span>
                      <select value={groupId ?? ''} onChange={(event) => setGroupId(event.target.value || null)}>
                        <option value="">Без группы</option>
                        {groups.map((group) => (
                          <option value={group.id} key={group.id}>{group.title}</option>
                        ))}
                      </select>
                    </label>
                  ) : null}

                  <label className={settingsLabelClass}>
                    <span>Категория</span>
                    <input value={category} placeholder="Без категории" onChange={(event) => setCategory(event.target.value)} />
                  </label>

                  <div className="grid gap-2 border-t border-app-border pt-3">
                    <span className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.08em] text-app-muted">
                      <Tags size={14} />
                      Теги
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <button className={noteChipClass} type="button" key={tag} onClick={() => removeTag(tag)}>
                          {tag}
                          <X size={14} />
                        </button>
                      ))}
                    </div>
                    <input
                      className="min-h-control w-full px-3"
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
                  </div>
                </aside>

                <div className="flex items-center justify-between gap-3 rounded-panel border border-[var(--glass-border)] bg-[var(--panel-bg)] p-3 text-app-muted [backdrop-filter:var(--glass-blur)] shadow-panel">
                  <span>{draftPlainText.trim().length} символов</span>

                  <button className={primaryButtonClass} type="button" onClick={() => void saveNote()} disabled={isSaving}>
                    <Save size={18} />
                    {isSaving ? 'Сохранение...' : 'Сохранить'}
                  </button>
                </div>
              </div>
            }
          />
        ) : (
          <article className="rounded-panel border border-[var(--glass-border)] bg-[var(--panel-bg)] p-4 text-app-text [backdrop-filter:var(--glass-blur)] shadow-panel">
            <StudyBlockEditor value={draftContent} mode="read" onChange={handleEditorChange} />
          </article>
        )}
      </main>
    </section>
  );
}

function createEditableNote(note: Note | null | undefined, defaultGroupId: string | null): Note {
  const timestamp = new Date().toISOString();
  if (note) {
    return {
      ...note,
      title: note.title || 'Новая заметка',
      content: note.content ?? note.editorPlainText ?? '',
      category: note.category ?? '',
      groupId: note.groupId ?? null,
      tags: note.tags ?? [],
      pinned: note.pinned ?? false,
      properties: note.properties ?? [],
      assets: note.assets ?? [],
      schemaVersion: note.schemaVersion ?? NOTE_SCHEMA_VERSION,
      layoutWidth: note.layoutWidth ?? 1200,
      createdAt: note.createdAt ?? timestamp,
      updatedAt: note.updatedAt ?? timestamp,
    };
  }

  return {
    id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: 'Новая заметка',
    content: '',
    contentFormat: 'plain',
    category: '',
    groupId: defaultGroupId,
    tags: [],
    pinned: false,
    editorContent: [],
    editorPlainText: '',
    properties: [],
    assets: [],
    schemaVersion: NOTE_SCHEMA_VERSION,
    layoutWidth: 1200,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

const saveStatusClass =
  'inline-flex w-fit items-center gap-2 rounded-full border border-app-border bg-app-surface-soft px-3 py-1.5 text-xs font-bold text-app-muted';
const metadataChipClass =
  'inline-flex w-fit items-center rounded-full border border-app-border bg-app-chip px-2.5 py-1 text-xs font-bold text-app-chip-text';
const ghostButtonClass =
  'inline-flex min-h-control items-center justify-center gap-2 rounded-control border border-[color-mix(in_srgb,var(--accent)_36%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_10%,var(--surface-strong))] px-3.5 py-2.5 text-sm font-bold text-[color-mix(in_srgb,var(--accent-strong)_86%,var(--text))] transition-colors hover:border-[color-mix(in_srgb,var(--accent-strong)_72%,var(--border))] hover:bg-[var(--control-bg-hover)] disabled:cursor-not-allowed disabled:opacity-45';
const primaryButtonClass =
  'inline-flex min-h-control items-center justify-center gap-2 rounded-control border border-[color-mix(in_srgb,var(--accent)_72%,var(--border))] bg-[var(--button-bg-primary)] px-3.5 py-2.5 text-sm font-bold text-app-accent-strong transition-colors hover:bg-[var(--button-bg-primary-hover)] disabled:cursor-not-allowed disabled:opacity-55';
const modeToggleButtonClass =
  'inline-flex min-h-9 items-center gap-2 rounded-control px-3 py-2 text-sm font-bold text-app-muted transition-colors hover:text-app-text';
const modeToggleActiveClass =
  'bg-[color-mix(in_srgb,var(--accent)_18%,var(--surface-strong))] text-app-accent-strong shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--accent)_38%,transparent)]';
const settingsLabelClass =
  'grid gap-1.5 text-xs font-extrabold uppercase tracking-[0.08em] text-app-muted [&_input]:min-h-control [&_input]:w-full [&_input]:px-3 [&_input]:text-sm [&_input]:font-bold [&_input]:normal-case [&_input]:tracking-normal [&_select]:min-h-control [&_select]:w-full [&_select]:px-3 [&_select]:text-sm [&_select]:font-bold [&_select]:normal-case [&_select]:tracking-normal';
const noteChipClass =
  'inline-flex min-h-[30px] items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--accent)_24%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] px-2.5 text-sm font-bold text-app-text transition-colors hover:border-[color-mix(in_srgb,var(--danger)_36%,var(--border))] hover:text-app-danger';
