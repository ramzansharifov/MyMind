import { useState, type FormEvent } from 'react';
import { AddButton, ArchiveButton, DeleteButton, EditButton, PinButton } from './ActionButtons';
import { splitCsv, joinCsv } from '../utils/formatters';
import { createId } from '../utils/idGenerator';
import { EmptyState } from './EmptyState';
import { EntityForm as EntityFormShell } from './EntityForm';
import { FilterBar } from './FilterBar';
import { PageHeader } from './PageHeader';
import { SearchInput } from './SearchInput';
import { useI18n } from '../i18n/I18nProvider';
import { archiveEntity, isHiddenFromRegularLists, trashEntity } from '../utils/archiveUtils';

type FieldType = 'text' | 'textarea' | 'date' | 'number' | 'select' | 'tags';

export interface EntityField<T> {
  key: keyof T;
  label: string;
  type?: FieldType;
  options?: string[];
  required?: boolean;
}

interface SimpleEntityPageProps<T extends { id: string; createdAt: string; updatedAt: string; tags?: string[] }> {
  title: string;
  subtitle: string;
  addLabel: string;
  emptyTitle: string;
  emptyMessage: string;
  items: T[];
  fields: Array<EntityField<T>>;
  searchKeys: Array<keyof T>;
  summary: (item: T) => string;
  onChange: (items: T[]) => void;
}

export function SimpleEntityPage<T extends { id: string; createdAt: string; updatedAt: string; archivedAt?: string | null; trashedAt?: string | null; status?: string; pinnedAt?: string | null; tags?: string[] }>({
  title,
  subtitle,
  addLabel,
  emptyTitle,
  emptyMessage,
  items,
  fields,
  searchKeys,
  summary,
  onChange,
}: SimpleEntityPageProps<T>) {
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<T | null | undefined>(undefined);
  const { t } = useI18n();
  const normalized = query.trim().toLowerCase();
  const visibleItems = items.filter((item) => !isHiddenFromRegularLists(item));
  const filtered = visibleItems
    .filter((item) => searchKeys.some((key) => String(item[key] ?? '').toLowerCase().includes(normalized)))
    .sort((a, b) => Number(Boolean(b.pinnedAt)) - Number(Boolean(a.pinnedAt)) || b.updatedAt.localeCompare(a.updatedAt));

  function save(item: T) {
    const exists = items.some((existing) => existing.id === item.id);
    onChange(exists ? items.map((existing) => (existing.id === item.id ? item : existing)) : [item, ...items]);
    setEditing(undefined);
  }

  function archive(item: T) {
    onChange(
      items.map((existing) =>
        existing.id === item.id ? archiveEntity(existing, { setArchivedStatus: typeof existing.status === 'string' }) : existing,
      ),
    );
  }

  function moveToTrash(item: T) {
    onChange(items.map((existing) => (existing.id === item.id ? trashEntity(existing) : existing)));
  }

  function togglePin(item: T) {
    const timestamp = new Date().toISOString();
    onChange(
      items.map((existing) =>
        existing.id === item.id ? { ...existing, pinnedAt: existing.pinnedAt ? null : timestamp, updatedAt: timestamp } : existing,
      ),
    );
  }

  return (
    <section>
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          <AddButton label={addLabel} onClick={() => setEditing(null)} />
        }
      />
      <FilterBar>
        <SearchInput value={query} placeholder={`Search ${title.toLowerCase()}`} onChange={setQuery} />
      </FilterBar>
      {filtered.length === 0 ? (
        <EmptyState title={emptyTitle} message={emptyMessage} />
      ) : (
        <div className="card-grid">
          {filtered.map((item) => (
            <article className={`card ${item.pinnedAt ? 'pinned' : ''}`} key={item.id}>
              <div className="card-title-row">
                <div>
                  <h3>{String(item[fields[0].key] ?? 'Untitled')}</h3>
                  <small>{summary(item).split(' / ').map((part) => t(part)).join(' / ')}</small>
                </div>
              </div>
              {'tags' in item && item.tags ? (
                <div className="chip-row">
                  {item.tags.map((tag) => (
                    <span className="chip" key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="card-actions">
                <PinButton isPinned={Boolean(item.pinnedAt)} onClick={() => togglePin(item)} />
                <EditButton onClick={() => setEditing(item)} />
                <ArchiveButton
                  label="Archive"
                  confirmTitle="Archive item?"
                  confirmMessage="The item will be hidden from regular lists but kept in local JSON storage."
                  onConfirm={() => archive(item)}
                />
                <DeleteButton
                  label="Move to trash"
                  confirmTitle="Move to trash?"
                  confirmMessage="The item will stay in trash for 30 days before permanent deletion."
                  onConfirm={() => moveToTrash(item)}
                />
              </div>
            </article>
          ))}
        </div>
      )}
      {editing !== undefined ? <SimpleEntityForm item={editing} fields={fields} onCancel={() => setEditing(undefined)} onSave={save} /> : null}
    </section>
  );
}

interface SimpleEntityFormProps<T extends { id: string; createdAt: string; updatedAt: string; archivedAt?: string | null; tags?: string[] }> {
  item?: T | null;
  fields: Array<EntityField<T>>;
  onCancel: () => void;
  onSave: (item: T) => void;
}

function SimpleEntityForm<T extends { id: string; createdAt: string; updatedAt: string; archivedAt?: string | null; tags?: string[] }>({
  item,
  fields,
  onCancel,
  onSave,
}: SimpleEntityFormProps<T>) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<Record<string, unknown>>(() => {
    const values: Record<string, unknown> = {};
    for (const field of fields) {
      const rawValue = item?.[field.key];
      values[String(field.key)] = Array.isArray(rawValue) ? joinCsv(rawValue) : rawValue ?? field.options?.[0] ?? '';
    }
    return values;
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const timestamp = new Date().toISOString();
    const next: Record<string, unknown> = {
      ...(item ?? {}),
      id: item?.id ?? createId('item'),
      createdAt: item?.createdAt ?? timestamp,
      updatedAt: timestamp,
    };
    for (const field of fields) {
      const key = String(field.key);
      const value = draft[key];
      if (field.type === 'number') {
        next[key] = Number.parseFloat(String(value)) || 0;
      } else if (field.type === 'tags') {
        next[key] = splitCsv(String(value ?? ''));
      } else {
        next[key] = value === '' && field.type === 'date' ? null : value;
      }
    }
    onSave(next as T);
  }

  return (
    <EntityFormShell title={item ? 'Edit item' : 'Add item'} saveLabel="Save" onCancel={onCancel} onSubmit={submit}>
      {fields.map((field) => {
        const key = String(field.key);
        const value = String(draft[key] ?? '');
        if (field.type === 'textarea') {
          return (
            <label key={key}>
              {t(field.label)}
              <textarea rows={5} value={value} onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))} />
            </label>
          );
        }
        if (field.type === 'select') {
          return (
            <label key={key}>
              {t(field.label)}
              <select value={value} onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))}>
                {field.options?.map((option) => (
                  <option value={option} key={option}>
                    {t(option)}
                  </option>
                ))}
              </select>
            </label>
          );
        }
        return (
          <label key={key}>
            {t(field.label)}
            <input
              required={field.required}
              type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
              value={value}
              onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))}
            />
          </label>
        );
      })}
    </EntityFormShell>
  );
}
