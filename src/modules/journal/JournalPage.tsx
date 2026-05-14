import { useState } from 'react';
import { AddButton } from '../../shared/components/ActionButtons';
import { EmptyState } from '../../shared/components/EmptyState';
import { FilterBar } from '../../shared/components/FilterBar';
import { PageHeader } from '../../shared/components/PageHeader';
import { SearchInput } from '../../shared/components/SearchInput';
import { useI18n } from '../../shared/i18n/I18nProvider';
import { archiveEntity, isHiddenFromRegularLists, trashEntity } from '../../shared/utils/archiveUtils';
import { filterEntries, journalMoods, journalTags } from './journalUtils';
import { JournalEntryCard } from './JournalEntryCard';
import { JournalEntryForm } from './JournalEntryForm';
import type { JournalEntry } from './types';

interface JournalPageProps {
  entries: JournalEntry[];
  onChange: (entries: JournalEntry[]) => void;
}

export function JournalPage({ entries, onChange }: JournalPageProps) {
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState('');
  const [mood, setMood] = useState('');
  const [editing, setEditing] = useState<JournalEntry | null | undefined>(undefined);
  const activeEntries = entries.filter((entry) => !isHiddenFromRegularLists(entry));
  const filtered = filterEntries(activeEntries, query, tag, mood).sort(
    (a, b) => Number(Boolean(b.pinnedAt)) - Number(Boolean(a.pinnedAt)) || b.updatedAt.localeCompare(a.updatedAt),
  );
  const { t } = useI18n();

  function saveEntry(entry: JournalEntry) {
    const exists = entries.some((item) => item.id === entry.id);
    onChange(exists ? entries.map((item) => (item.id === entry.id ? entry : item)) : [entry, ...entries]);
    setEditing(undefined);
  }

  function togglePin(entry: JournalEntry) {
    const timestamp = new Date().toISOString();
    onChange(entries.map((item) => (item.id === entry.id ? { ...item, pinnedAt: item.pinnedAt ? null : timestamp, updatedAt: timestamp } : item)));
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
      <FilterBar>
        <SearchInput value={query} placeholder="Search diary" onChange={setQuery} />
        <label>
          {t('Tag')}
          <select value={tag} onChange={(event) => setTag(event.target.value)}>
            <option value="">{t('All')}</option>
            {journalTags(activeEntries).map((item) => (
              <option value={item} key={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t('Mood')}
          <select value={mood} onChange={(event) => setMood(event.target.value)}>
            <option value="">{t('All')}</option>
            {journalMoods(activeEntries).map((item) => (
              <option value={item} key={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </FilterBar>
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
              onArchive={() => onChange(entries.map((item) => (item.id === entry.id ? archiveEntity(item) : item)))}
              onTrash={() => onChange(entries.map((item) => (item.id === entry.id ? trashEntity(item) : item)))}
            />
          ))}
        </div>
      )}
      {editing !== undefined ? <JournalEntryForm entry={editing} onCancel={() => setEditing(undefined)} onSave={saveEntry} /> : null}
    </section>
  );
}
