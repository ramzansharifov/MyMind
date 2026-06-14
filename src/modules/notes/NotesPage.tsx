import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { AddButton } from '../../shared/components/ActionButtons';
import { CollapsibleFilters } from '../../shared/components/CollapsibleFilters';
import { EmptyState } from '../../shared/components/EmptyState';
import { GroupedCollectionLayout } from '../../shared/components/GroupedCollectionLayout';
import { LoadingState } from '../../shared/components/LoadingState';
import { PageHeader } from '../../shared/components/PageHeader';
import { useI18n } from '../../shared/i18n/I18nProvider';
import type { ContentGroup } from '../../shared/types/common';
import { cn } from '../../shared/utils/classNames';
import { archiveEntity, isHiddenFromRegularLists, trashEntity } from '../../shared/utils/archiveUtils';
import { countItemsByContentGroup, matchesContentGroup } from '../../shared/utils/contentGroupUtils';
import { filterNotes, noteCategories, noteTags } from './noteUtils';
import { NoteCard } from './NoteCard';
import { noteStorageClient } from './storage/noteStorageClient';
import type { Note, NoteIndexItem, NoteSearchIndexItem } from './types';
import type { NoteEditorNavigationActions } from './NoteEditorPage';

const NoteEditorPage = lazy(() => import('./NoteEditorPage').then((module) => ({ default: module.NoteEditorPage })));

interface NotesPageProps {
  data: {
    items: Note[];
    groups: ContentGroup[];
  };
  onChange: (data: NotesPageProps['data']) => void;
  onEditorDirtyChange?: (dirty: boolean) => void;
  onEditorActionsChange?: (actions: NoteEditorNavigationActions | null) => void;
}

export function NotesPage({ data, onChange, onEditorDirtyChange, onEditorActionsChange }: NotesPageProps) {
  const groups = data.groups;
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchIndex, setSearchIndex] = useState<NoteSearchIndexItem[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [query, setQuery] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeGroupId, setActiveGroupId] = useState('all');
  const [editorNoteId, setEditorNoteId] = useState<string | null | undefined>(undefined);
  const [editorInitialMode, setEditorInitialMode] = useState<'read' | 'edit'>('edit');
  const visibleNotes = notes.filter((note) => !isHiddenFromRegularLists(note));
  const searchById = useMemo(() => new Map(searchIndex.map((item) => [item.noteId, item])), [searchIndex]);
  const searched = query.trim()
    ? visibleNotes.filter((note) => matchesNoteSearch(note, searchById.get(note.id), query))
    : filterNotes(visibleNotes, query, '', '', false);
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
  const groupTitleById = useMemo(() => new Map(groups.map((group) => [group.id, group.title])), [groups]);

  const loadNotes = useCallback(async () => {
    setLoadingNotes(true);
    try {
      const [index, search] = await Promise.all([noteStorageClient.listIndex(), noteStorageClient.listSearchIndex()]);
      setNotes(index.map(noteFromIndexItem));
      setSearchIndex(search);
    } finally {
      setLoadingNotes(false);
    }
  }, []);

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  useEffect(() => {
    if (editorNoteId !== undefined) {
      return;
    }

    onEditorDirtyChange?.(false);
    onEditorActionsChange?.(null);
  }, [editorNoteId, onEditorActionsChange, onEditorDirtyChange]);

  async function saveNote(note: Note) {
    await noteStorageClient.saveNote(note);
    await loadNotes();
    setEditorNoteId(undefined);
  }

  async function archiveNote(note: Note) {
    await noteStorageClient.patchNoteMetadata(note.id, archiveEntity(note));
    await loadNotes();
  }

  async function moveNoteToTrash(note: Note) {
    await noteStorageClient.patchNoteMetadata(note.id, trashEntity(note));
    await loadNotes();
  }

  async function togglePin(note: Note) {
    const timestamp = new Date().toISOString();
    const isPinned = Boolean(note.pinned || note.pinnedAt);
    await noteStorageClient.patchNoteMetadata(note.id, { pinned: !isPinned, pinnedAt: isPinned ? null : timestamp, updatedAt: timestamp });
    await loadNotes();
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

  async function addNotesToGroup(itemsToAdd: Note[]) {
    const timestamp = new Date().toISOString();
    const idsToAdd = new Set(itemsToAdd.map((item) => item.id));
    await noteStorageClient.patchManyNoteMetadata(Array.from(idsToAdd), { groupId: activeGroupId, updatedAt: timestamp });
    await loadNotes();
  }

  async function deleteGroup(groupId: string) {
    const timestamp = new Date().toISOString();
    const affectedNoteIds = notes.filter((note) => note.groupId === groupId).map((note) => note.id);
    if (affectedNoteIds.length > 0) {
      await noteStorageClient.patchManyNoteMetadata(affectedNoteIds, { groupId: null, updatedAt: timestamp });
      await loadNotes();
    }
    onChange({
      ...data,
      groups: groups.filter((group) => group.id !== groupId),
      items: data.items,
    });
    setActiveGroupId('all');
  }

  if (editorNoteId !== undefined) {
    return (
      <Suspense fallback={<LoadingState title="Opening editor" message="Preparing note content..." variant="page" />}>
        <NoteEditorPage
          noteId={editorNoteId}
          groups={groups}
          defaultGroupId={activeGroupId === 'all' ? null : activeGroupId}
          initialMode={editorInitialMode}
          onCancel={() => setEditorNoteId(undefined)}
          onSave={saveNote}
          onDirtyChange={onEditorDirtyChange}
          onNavigationActionsChange={onEditorActionsChange}
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
              setEditorNoteId(null);
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
        <div className={filterGroupClass}>
          <div className={filterHeadingClass}>
            <strong>{t('Category')}</strong>
            {categories.length > 0 ? <button className={filterClearInlineClass} type="button" onClick={() => setCategories([])}>{t('Clear')}</button> : null}
          </div>
          <div className={filterChipRowClass}>
            {availableCategories.length > 0 ? availableCategories.map((item) => (
              <button className={cn(filterChipClass, categories.includes(item) && filterChipActiveClass)} type="button" key={item} onClick={() => toggleCategory(item)}>
                {item}
              </button>
            )) : <span className="text-sm text-app-muted">{t('No categories yet.')}</span>}
          </div>
        </div>
        <div className={filterGroupClass}>
          <div className={filterHeadingClass}>
            <strong>{t('Tag')}</strong>
            {tags.length > 0 ? <button className={filterClearInlineClass} type="button" onClick={() => setTags([])}>{t('Clear')}</button> : null}
          </div>
          <div className={filterChipRowClass}>
            {availableTags.length > 0 ? availableTags.map((item) => (
              <button className={cn(filterChipClass, tags.includes(item) && filterChipActiveClass)} type="button" key={item} onClick={() => toggleTag(item)}>
                {item}
              </button>
            )) : <span className="text-sm text-app-muted">{t('No tags yet.')}</span>}
          </div>
        </div>
        <div className={filterGroupClass}>
          <div className={filterHeadingClass}>
            <strong>{t('Pinned only')}</strong>
          </div>
          <div className={filterChipRowClass}>
            <button className={cn(filterChipClass, pinnedOnly && filterChipActiveClass)} type="button" onClick={() => setPinnedOnly((current) => !current)}>
              {t('Pinned only')}
            </button>
          </div>
        </div>
        {activeFilterCount > 0 ? <button className={filterClearButtonClass} type="button" onClick={clearFilters}>{t('Clear filters')}</button> : null}
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
        availableItems={visibleNotes.filter((note) => note.groupId !== activeGroupId)}
        getItemLabel={(note) => note.title}
        getItemDescription={(note) => note.category || ''}
        onAddItemsToGroup={addNotesToGroup}
      >
          {loadingNotes ? (
            <LoadingState title="Loading notes" message="Preparing note index..." />
          ) : filtered.length === 0 ? (
            <EmptyState title="No notes found" message="Capture ideas, instructions, references, and personal knowledge." />
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
              {filtered.map((note) => (
                <NoteCard
                  note={note}
                  groupTitle={note.groupId ? groupTitleById.get(note.groupId) : undefined}
                  key={note.id}
                  onOpen={() => {
                    setEditorInitialMode('read');
                    setEditorNoteId(note.id);
                  }}
                  onEdit={() => {
                    setEditorInitialMode('edit');
                    setEditorNoteId(note.id);
                  }}
                  onPin={() => void togglePin(note)}
                  onArchive={() => void archiveNote(note)}
                  onTrash={() => void moveNoteToTrash(note)}
                />
              ))}
            </div>
          )}
      </GroupedCollectionLayout>
    </section>
  );
}

const filterGroupClass = 'grid gap-2 rounded-panel border border-app-border bg-app-surface-soft p-3';
const filterHeadingClass = 'flex items-center justify-between gap-3 text-sm text-app-text';
const filterChipRowClass = 'flex flex-wrap gap-2';
const filterChipClass =
  'inline-flex min-h-[34px] items-center rounded-full border border-app-border bg-app-surface px-3 py-1 text-sm font-bold text-app-muted transition-colors hover:border-[color-mix(in_srgb,var(--accent)_42%,var(--border))] hover:text-app-text';
const filterChipActiveClass =
  'border-[color-mix(in_srgb,var(--accent)_58%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_16%,var(--surface-strong))] text-app-accent-strong';
const filterClearInlineClass = 'text-xs font-bold text-app-accent-strong hover:text-app-text';
const filterClearButtonClass =
  'inline-flex min-h-control w-fit items-center justify-center rounded-control border border-[color-mix(in_srgb,var(--accent)_36%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_10%,var(--surface-strong))] px-3.5 py-2.5 text-sm font-bold text-app-accent-strong transition-colors hover:border-[color-mix(in_srgb,var(--accent-strong)_72%,var(--border))] hover:bg-[var(--control-bg-hover)]';

function noteFromIndexItem(item: NoteIndexItem): Note {
  return {
    ...item,
    content: item.previewText,
    contentFormat: 'plain',
    editorPlainText: item.previewText,
    category: item.category ?? '',
    groupId: item.groupId ?? null,
    tags: item.tags ?? [],
    properties: [],
    assets: [],
    schemaVersion: 2,
    layoutWidth: item.layoutWidth ?? 1200,
  };
}

function matchesNoteSearch(note: Note, searchItem: NoteSearchIndexItem | undefined, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }
  const searchable = [
    note.title,
    note.content,
    note.category,
    ...(note.tags ?? []),
    searchItem?.title,
    searchItem?.editorPlainText,
    searchItem?.category,
    ...(searchItem?.tags ?? []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return searchable.includes(normalized);
}
