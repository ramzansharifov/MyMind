import { useState } from 'react';
import { AddButton } from '../../shared/components/ActionButtons';
import { EmptyState } from '../../shared/components/EmptyState';
import { FilterBar } from '../../shared/components/FilterBar';
import { PageHeader } from '../../shared/components/PageHeader';
import { SearchInput } from '../../shared/components/SearchInput';
import { useI18n } from '../../shared/i18n/I18nProvider';
import { archiveEntity, isHiddenFromRegularLists, trashEntity } from '../../shared/utils/archiveUtils';
import { filterNotes, noteCategories, noteTags } from './noteUtils';
import { NoteCard } from './NoteCard';
import { NoteEditorPage } from './NoteEditorPage';
import type { Note } from './types';

interface NotesPageProps {
  notes: Note[];
  onChange: (notes: Note[]) => void;
}

export function NotesPage({ notes, onChange }: NotesPageProps) {
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState('');
  const [category, setCategory] = useState('');
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [editorNote, setEditorNote] = useState<Note | null | undefined>(undefined);
  const visibleNotes = notes.filter((note) => !isHiddenFromRegularLists(note));
  const filtered = filterNotes(visibleNotes, query, tag, category, pinnedOnly);
  const { t } = useI18n();

  function saveNote(note: Note) {
    const exists = notes.some((item) => item.id === note.id);
    onChange(exists ? notes.map((item) => (item.id === note.id ? note : item)) : [note, ...notes]);
    setEditorNote(undefined);
  }

  function archiveNote(note: Note) {
    onChange(notes.map((item) => (item.id === note.id ? archiveEntity(item) : item)));
  }

  function moveNoteToTrash(note: Note) {
    onChange(notes.map((item) => (item.id === note.id ? trashEntity(item) : item)));
  }

  function togglePin(note: Note) {
    const timestamp = new Date().toISOString();
    const isPinned = Boolean(note.pinned || note.pinnedAt);
    onChange(
      notes.map((item) =>
        item.id === note.id ? { ...item, pinned: !isPinned, pinnedAt: isPinned ? null : timestamp, updatedAt: timestamp } : item,
      ),
    );
  }

  if (editorNote !== undefined) {
    return <NoteEditorPage note={editorNote} onCancel={() => setEditorNote(undefined)} onSave={saveNote} />;
  }

  return (
    <section>
      <PageHeader
        title="Notes"
        subtitle="Knowledge, ideas, references, and durable thinking that are not tied to a diary date."
        actions={
          <AddButton label="Add note" onClick={() => setEditorNote(null)} />
        }
      />
      <FilterBar>
        <SearchInput value={query} placeholder="Search notes" onChange={setQuery} />
        <label>
          {t('Category')}
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">{t('All')}</option>
            {noteCategories(visibleNotes).map((item) => (
              <option value={item} key={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t('Tag')}
          <select value={tag} onChange={(event) => setTag(event.target.value)}>
            <option value="">{t('All')}</option>
            {noteTags(visibleNotes).map((item) => (
              <option value={item} key={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="checkbox-line">
          <input type="checkbox" checked={pinnedOnly} onChange={(event) => setPinnedOnly(event.target.checked)} />
          {t('Pinned only')}
        </label>
      </FilterBar>
      {filtered.length === 0 ? (
        <EmptyState title="No notes found" message="Capture ideas, instructions, references, and personal knowledge." />
      ) : (
        <div className="card-grid">
          {filtered.map((note) => (
            <NoteCard
              note={note}
              key={note.id}
              onOpen={() => setEditorNote(note)}
              onEdit={() => setEditorNote(note)}
              onPin={() => togglePin(note)}
              onArchive={() => archiveNote(note)}
              onTrash={() => moveNoteToTrash(note)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
