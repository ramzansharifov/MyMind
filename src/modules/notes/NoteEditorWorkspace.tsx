import { ArrowLeft, BookOpen, Edit3, Save, Tags, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { ContentGroup } from '../../shared/types/common';
import type { Note } from './types';
import '../../styles/modules/notes.css';

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
    <section className="note-editor-page">
      <div className="note-topbar">
        <div className="note-topbar-leading">
          <button className="button ghost note-topbar-back" type="button" onClick={onCancel}>
            <ArrowLeft size={18} />
            Назад к заметкам
          </button>
          <span className={`note-save-status-dot${dirty ? ' dirty' : ' saved'}`} aria-label={dirty ? 'Есть несохранённые изменения' : `Последнее сохранение: ${lastSavedLabel}`} />
        </div>
        <div className="note-topbar-actions">
          <button className={`button ghost${mode === 'read' ? ' active' : ''}`} type="button" onClick={() => setMode('read')}>
            <BookOpen size={18} />
            Чтение
          </button>
          <button className={`button ghost${mode === 'edit' ? ' active' : ''}`} type="button" onClick={() => setMode('edit')}>
            <Edit3 size={18} />
            Редактирование
          </button>
          <button className="button accent note-save-button" type="button" onClick={saveNote}>
            <Save size={18} />
            Сохранить
          </button>
        </div>
      </div>

      <div className="note-editor-shell plain-note-editor">
        <main className="note-editor-main">
          <input
            className="note-title-input"
            value={title}
            placeholder="Untitled note"
            readOnly={mode === 'read'}
            onChange={(event) => setTitle(event.target.value)}
          />

          <div className="note-metadata">
            {groups.length > 0 ? (
              <label className="note-group-select">
                <span>Группа</span>
                <select value={groupId ?? ''} disabled={mode === 'read'} onChange={(event) => setGroupId(event.target.value || null)}>
                  <option value="">Без группы</option>
                  {groups.map((group) => (
                    <option value={group.id} key={group.id}>{group.title}</option>
                  ))}
                </select>
              </label>
            ) : null}

            <label className="note-group-select">
              <span>Категория</span>
              <input value={category} readOnly={mode === 'read'} onChange={(event) => setCategory(event.target.value)} />
            </label>

            <div className="note-tag-row">
              <Tags size={17} />
              {tags.map((tag) => (
                <button className="note-chip removable" type="button" key={tag} onClick={() => removeTag(tag)} disabled={mode === 'read'}>
                  {tag}
                  <X size={14} />
                </button>
              ))}
              {mode === 'edit' ? (
                <input
                  className="note-tag-input"
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
              className="note-plain-textarea"
              value={content}
              placeholder="Старый notebook-редактор удалён. Здесь временный plain-text редактор до новой реализации."
              onChange={(event) => setContent(event.target.value)}
            />
          ) : (
            <article className="note-read-panel">
              {content.trim() ? content.split(/\n{2,}/).map((paragraph, index) => (
                <p key={`${paragraph}-${index}`}>{paragraph}</p>
              )) : <p className="muted-text">Заметка пока пустая.</p>}
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
