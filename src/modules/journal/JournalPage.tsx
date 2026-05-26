import { useState } from 'react';
import { AddButton } from '../../shared/components/ActionButtons';
import { CollapsibleFilters } from '../../shared/components/CollapsibleFilters';
import { EmptyState } from '../../shared/components/EmptyState';
import { GroupedCollectionLayout } from '../../shared/components/GroupedCollectionLayout';
import { PageHeader } from '../../shared/components/PageHeader';
import { useI18n } from '../../shared/i18n/I18nProvider';
import { archiveEntity, isHiddenFromRegularLists, trashEntity } from '../../shared/utils/archiveUtils';
import { countItemsByContentGroup, matchesContentGroup } from '../../shared/utils/contentGroupUtils';
import { filterEntries, journalMoods, journalTags } from './journalUtils';
import { JournalEntryCard } from './JournalEntryCard';
import { JournalEntryForm } from './JournalEntryForm';
import type { JournalData, JournalEntry } from './types';

interface JournalPageProps {
  data: JournalData;
  onChange: (data: JournalData) => void;
}

export function JournalPage({ data, onChange }: JournalPageProps) {
  const entries = data.items;
  const groups = data.groups;
  const [query, setQuery] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [moods, setMoods] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeGroupId, setActiveGroupId] = useState('all');
  const [editing, setEditing] = useState<JournalEntry | null | undefined>(undefined);
  const activeEntries = entries.filter((entry) => !isHiddenFromRegularLists(entry));
  const searched = filterEntries(activeEntries, query, '', '');
  const filteredByFilters = searched.filter((entry) => {
    const matchesTags = tags.length === 0 || tags.some((tag) => entry.tags.includes(tag));
    const matchesMoods = moods.length === 0 || moods.includes(entry.mood);
    return matchesTags && matchesMoods;
  });
  const filtered = filteredByFilters.filter((entry) => matchesContentGroup(entry.groupId, activeGroupId)).sort(
    (a, b) => Number(Boolean(b.pinnedAt)) - Number(Boolean(a.pinnedAt)) || b.updatedAt.localeCompare(a.updatedAt),
  );
  const { t } = useI18n();
  const availableTags = journalTags(activeEntries);
  const availableMoods = journalMoods(activeEntries);
  const activeFilterCount = tags.length + moods.length;
  const groupCounts = countItemsByContentGroup(activeEntries);

  function saveEntry(entry: JournalEntry) {
    const exists = entries.some((item) => item.id === entry.id);
    onChange({ ...data, items: exists ? entries.map((item) => (item.id === entry.id ? entry : item)) : [entry, ...entries] });
    setEditing(undefined);
  }

  function togglePin(entry: JournalEntry) {
    const timestamp = new Date().toISOString();
    onChange({ ...data, items: entries.map((item) => (item.id === entry.id ? { ...item, pinnedAt: item.pinnedAt ? null : timestamp, updatedAt: timestamp } : item)) });
  }

  function toggleTag(value: string) {
    setTags((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]));
  }

  function toggleMood(value: string) {
    setMoods((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]));
  }

  function clearFilters() {
    setTags([]);
    setMoods([]);
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
      items: entries.map((entry) => (entry.groupId === groupId ? { ...entry, groupId: null, updatedAt: timestamp } : entry)),
    });
    setActiveGroupId('all');
  }

  function addEntriesToGroup(itemsToAdd: JournalEntry[]) {
    const timestamp = new Date().toISOString();
    const idsToAdd = new Set(itemsToAdd.map((item) => item.id));
    onChange({
      ...data,
      items: entries.map((entry) =>
        idsToAdd.has(entry.id) ? { ...entry, groupId: activeGroupId, updatedAt: timestamp } : entry,
      ),
    });
  }

  return (
    <section>
      <PageHeader
        title="Diary"
        subtitle="Private local notes with moods and tags."
        actions={
          <AddButton label="Add entry" onClick={() => setEditing(null)} />
        }
      />
      <GroupedCollectionLayout
        filters={
          <CollapsibleFilters
            query={query}
            placeholder="Search diary"
            isOpen={filtersOpen}
            activeCount={activeFilterCount}
            onQueryChange={setQuery}
            onToggle={() => setFiltersOpen((current) => !current)}
          >
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
                <strong>{t('Mood')}</strong>
                {moods.length > 0 ? <button type="button" onClick={() => setMoods([])}>{t('Clear')}</button> : null}
              </div>
              <div className="filter-chip-row">
                {availableMoods.length > 0 ? availableMoods.map((item) => (
                  <button className={`filter-chip${moods.includes(item) ? ' active' : ''}`} type="button" key={item} onClick={() => toggleMood(item)}>
                    {item}
                  </button>
                )) : <span className="muted-text">{t('No moods yet.')}</span>}
              </div>
            </div>
            {activeFilterCount > 0 ? <button className="button ghost filter-clear-button" type="button" onClick={clearFilters}>{t('Clear filters')}</button> : null}
          </CollapsibleFilters>
        }
        groups={groups}
        totalCount={activeEntries.length}
        activeGroupId={activeGroupId}
        groupCounts={groupCounts}
        itemCount={filtered.length}
        onActiveGroupChange={setActiveGroupId}
        onGroupsChange={(groups) => onChange({ ...data, groups })}
        onRenameGroup={renameGroup}
        onDeleteGroup={deleteGroup}
        availableItems={activeEntries.filter((entry) => entry.groupId !== activeGroupId)}
        getItemLabel={(entry) => entry.title || entry.content.slice(0, 50)}
        getItemDescription={(entry) => entry.createdAt.slice(0, 10)}
        onAddItemsToGroup={addEntriesToGroup}
      >
          {filtered.length === 0 ? (
            <EmptyState title="No diary entries" message="Write local notes that stay on this machine." />
          ) : (
            <div className="card-grid">
              {filtered.map((entry) => (
                <JournalEntryCard
                  entry={entry}
                  key={entry.id}
                  onEdit={() => setEditing(entry)}
                  onPin={() => togglePin(entry)}
                  onArchive={() => onChange({ ...data, items: entries.map((item) => (item.id === entry.id ? archiveEntity(item) : item)) })}
                  onTrash={() => onChange({ ...data, items: entries.map((item) => (item.id === entry.id ? trashEntity(item) : item)) })}
                />
              ))}
            </div>
          )}
      </GroupedCollectionLayout>
      {editing !== undefined ? (
        <JournalEntryForm
          entry={editing}
          groups={groups}
          defaultGroupId={activeGroupId === 'all' ? null : activeGroupId}
          onCancel={() => setEditing(undefined)}
          onSave={saveEntry}
        />
      ) : null}
    </section>
  );
}
