import { lazy, Suspense, useState } from 'react';
import { AddButton } from '../../shared/components/ActionButtons';
import { CollapsibleFilters } from '../../shared/components/CollapsibleFilters';
import { EmptyState } from '../../shared/components/EmptyState';
import { GroupedCollectionLayout } from '../../shared/components/GroupedCollectionLayout';
import { LoadingState } from '../../shared/components/LoadingState';
import { PageHeader } from '../../shared/components/PageHeader';
import { useI18n } from '../../shared/i18n/I18nProvider';
import type { ContentGroup } from '../../shared/types/common';
import { archiveEntity, isHiddenFromRegularLists, trashEntity } from '../../shared/utils/archiveUtils';
import { countItemsByContentGroup, matchesContentGroup } from '../../shared/utils/contentGroupUtils';
import { filterNotes, noteCategories, noteTags } from './noteUtils';
import { NoteCard } from './NoteCard';
import type { Note } from './types';
import '../../styles/modules/notes.css';

const NoteEditorPage = lazy(() => import('./NoteEditorPage').then((module) => ({ default: module.NoteEditorPage })));

interface NotesPageProps {
  data: {
    items: Note[];
    groups: ContentGroup[];
  };
  onChange: (data: NotesPageProps['data']) => void;
}

export function NotesPage({ data, onChange }: NotesPageProps) {
  const notes = data.items;
  const groups = data.groups;
  const [query, setQuery] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeGroupId, setActiveGroupId] = useState('all');
  const [editorNote, setEditorNote] = useState<Note | null | undefined>(undefined);
  const [editorInitialMode, setEditorInitialMode] = useState<'read' | 'edit'>('edit');
  const visibleNotes = notes.filter((note) => !isHiddenFromRegularLists(note));
  const searched = filterNotes(visibleNotes, query, '', '', false);
  const filteredByFilters = searched.filter((note) => {
    const matchesTags = tags.length === 0 || tags.some((tag) => note.tags.includes(tag));
    const matchesCategories = categories.length === 0 || categories.includes(note.category);
    const matchesPinned = !pinnedOnly || Boolean(note.pinned || note.pinnedAt);
    return matchesTags && matchesCategories && matchesPinned;
  });
  const filtered = filteredByFilters.filter((note) => matchesContentGroup(note.groupId, activeGroupId));
  const { t } = useI18n();
  const availableTags = noteTags(visibleNotes);
  const availableCategories = noteCategories(visibleNotes);
  const activeFilterCount = tags.length + categories.length + (pinnedOnly ? 1 : 0);
  const groupCounts = countItemsByContentGroup(visibleNotes);

  function saveNote(note: Note) {
    const exists = notes.some((item) => item.id === note.id);
    onChange({ ...data, items: exists ? notes.map((item) => (item.id === note.id ? note : item)) : [note, ...notes] });
    setEditorNote(undefined);
  }

  function archiveNote(note: Note) {
    onChange({ ...data, items: notes.map((item) => (item.id === note.id ? archiveEntity(item) : item)) });
  }

  function moveNoteToTrash(note: Note) {
    onChange({ ...data, items: notes.map((item) => (item.id === note.id ? trashEntity(item) : item)) });
  }

  function togglePin(note: Note) {
    const timestamp = new Date().toISOString();
    const isPinned = Boolean(note.pinned || note.pinnedAt);
    onChange({
      ...data,
      items: notes.map((item) =>
        item.id === note.id ? { ...item, pinned: !isPinned, pinnedAt: isPinned ? null : timestamp, updatedAt: timestamp } : item,
      ),
    });
  }

  function toggleTag(value: string) {
    setTags((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]));
  }

  function toggleCategory(value: string) {
    setCategories((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]));
  }

  function clearFilters() {
    setTags([]);
    setCategories([]);
    setPinnedOnly(false);
  }

  function renameGroup(groupId: string, title: string) {
    const timestamp = new Date().toISOString();
    onChange({ ...data, groups: groups.map((group) => (group.id === groupId ? { ...group, title, updatedAt: timestamp } : group)) });
  }

  function deleteGroup(groupId: string) {
    const timestamp = new Date().toISOString();
    onChange({
      ...data,
      groups: groups.filter((group) => group.id !== groupId),
      items: notes.map((note) => (note.groupId === groupId ? { ...note, groupId: null, updatedAt: timestamp } : note)),
    });
    setActiveGroupId('all');
  }

  if (editorNote !== undefined) {
    return (
      <Suspense fallback={<LoadingState title="Opening editor" message="Preparing BlockNote tools and note content..." variant="page" />}>
        <NoteEditorPage
          note={editorNote}
          groups={groups}
          defaultGroupId={activeGroupId === 'all' ? null : activeGroupId}
          initialMode={editorInitialMode}
          onCancel={() => setEditorNote(undefined)}
          onSave={saveNote}
        />
      </Suspense>
    );
  }

  return (
    <section>
      <PageHeader
        title="Notes"
        subtitle="Knowledge, ideas, references, and durable thinking that are not tied to a diary date."
        actions={
          <AddButton
            label="Add note"
            onClick={() => {
              setEditorInitialMode('edit');
              setEditorNote(null);
            }}
          />
        }
      />
      <GroupedCollectionLayout
        filters={
          <CollapsibleFilters
            query={query}
            placeholder="Search notes"
            isOpen={filtersOpen}
            activeCount={activeFilterCount}
            onQueryChange={setQuery}
            onToggle={() => setFiltersOpen((current) => !current)}
          >
        <div className="filter-choice-group">
          <div className="filter-choice-heading">
            <strong>{t('Category')}</strong>
            {categories.length > 0 ? <button type="button" onClick={() => setCategories([])}>{t('Clear')}</button> : null}
          </div>
          <div className="filter-chip-row">
            {availableCategories.length > 0 ? availableCategories.map((item) => (
              <button className={`filter-chip${categories.includes(item) ? ' active' : ''}`} type="button" key={item} onClick={() => toggleCategory(item)}>
                {item}
              </button>
            )) : <span className="muted-text">{t('No categories yet.')}</span>}
          </div>
        </div>
        <div className="filter-choice-group">
          <div className="filter-choice-heading">
            <strong>{t('Tag')}</strong>
            {tags.length > 0 ? <button type="button" onClick={() => setTags([])}>{t('Clear')}</button> : null}
          </div>
          <div className="filter-chip-row">
            {availableTags.length > 0 ? availableTags.map((item) => (
              <button className={`filter-chip${tags.includes(item) ? ' active' : ''}`} type="button" key={item} onClick={() => toggleTag(item)}>
                {item}
              </button>
            )) : <span className="muted-text">{t('No tags yet.')}</span>}
          </div>
        </div>
        <div className="filter-choice-group">
          <div className="filter-choice-heading">
            <strong>{t('Pinned only')}</strong>
          </div>
          <div className="filter-chip-row">
            <button className={`filter-chip${pinnedOnly ? ' active' : ''}`} type="button" onClick={() => setPinnedOnly((current) => !current)}>
              {t('Pinned only')}
            </button>
          </div>
        </div>
        {activeFilterCount > 0 ? <button className="button ghost filter-clear-button" type="button" onClick={clearFilters}>{t('Clear filters')}</button> : null}
          </CollapsibleFilters>
        }
        groups={groups}
        totalCount={visibleNotes.length}
        activeGroupId={activeGroupId}
        groupCounts={groupCounts}
        itemCount={filtered.length}
        onActiveGroupChange={setActiveGroupId}
        onGroupsChange={(groups) => onChange({ ...data, groups })}
        onRenameGroup={renameGroup}
        onDeleteGroup={deleteGroup}
      >
          {filtered.length === 0 ? (
            <EmptyState title="No notes found" message="Capture ideas, instructions, references, and personal knowledge." />
          ) : (
            <div className="card-grid">
              {filtered.map((note) => (
                <NoteCard
                  note={note}
                  key={note.id}
                  onOpen={() => {
                    setEditorInitialMode('read');
                    setEditorNote(note);
                  }}
                  onEdit={() => {
                    setEditorInitialMode('edit');
                    setEditorNote(note);
                  }}
                  onPin={() => togglePin(note)}
                  onArchive={() => archiveNote(note)}
                  onTrash={() => moveNoteToTrash(note)}
                />
              ))}
            </div>
          )}
      </GroupedCollectionLayout>
    </section>
  );
}
