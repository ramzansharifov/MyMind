import { useState, type FormEvent } from 'react';
import { AddButton, ArchiveButton, DeleteButton, EditButton, PinButton } from './ActionButtons';
import { splitCsv, joinCsv } from '../utils/formatters';
import { createId } from '../utils/idGenerator';
import { EmptyState } from './EmptyState';
import { EntityForm as EntityFormShell } from './EntityForm';
import { TextField, TextareaField, SelectField } from './FormFields';
import { ChoiceTile } from './ChoiceTile';
import { CollapsibleFilters } from './CollapsibleFilters';
import { ModulePageShell } from './ModulePageShell';
import { useI18n } from '../i18n/I18nProvider';
import { useCollectionItems } from '../hooks/useCollectionItems';

type FieldType = 'text' | 'textarea' | 'date' | 'number' | 'select' | 'card-select' | 'tags';

export interface EntityField<T> {
  key: keyof T;
  label: string;
  type?: FieldType;
  options?: string[];
  optionDescriptions?: Record<string, string>;
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
  const { filteredItems, upsertItem, archiveItem, trashItem, togglePin } = useCollectionItems({
    items,
    onChange,
    search: query,
    searchText: (item) => searchKeys.map((key) => String(item[key] ?? '')).join(' '),
  });

  function save(item: T) {
    upsertItem(item);
    setEditing(undefined);
  }

  return (
    <ModulePageShell
      title={title}
      subtitle={subtitle}
      actions={<AddButton label={addLabel} onClick={() => setEditing(null)} />}
      filters={<CollapsibleFilters query={query} placeholder={`Search ${title.toLowerCase()}`} onQueryChange={setQuery} />}
    >
      {filteredItems.length === 0 ? (
        <EmptyState title={emptyTitle} message={emptyMessage} />
      ) : (
        <div className="card-grid">
          {filteredItems.map((item) => (
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
                  onConfirm={() => archiveItem(item)}
                />
                <DeleteButton
                  label="Move to trash"
                  confirmTitle="Move to trash?"
                  confirmMessage="The item will stay in trash for 30 days before permanent deletion."
                  onConfirm={() => trashItem(item)}
                />
              </div>
            </article>
          ))}
        </div>
      )}
      {editing !== undefined ? <SimpleEntityForm item={editing} fields={fields} onCancel={() => setEditing(undefined)} onSave={save} /> : null}
    </ModulePageShell>
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
            <TextareaField
              key={key}
              label={field.label}
              rows={5}
              value={value}
              onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))}
            />
          );
        }
        if (field.type === 'select') {
          return (
            <SelectField
              key={key}
              label={field.label}
              value={value}
              options={(field.options ?? []).map((option) => ({ value: option, label: option }))}
              onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))}
            />
          );
        }
        if (field.type === 'card-select') {
          return (
            <section className="form-choice-section" key={key}>
              <h3>{t(field.label)}</h3>
              <div className="form-choice-grid">
                {field.options?.map((option) => (
                  <button
                    className={`form-choice-card${value === option ? ' active' : ''}`}
                    type="button"
                    key={option}
                    onClick={() => setDraft((current) => ({ ...current, [key]: option }))}
                  >
                    <span className="form-choice-mark">{value === option ? '✓' : ''}</span>
                    <span>
                      <strong>{t(option)}</strong>
                      {field.optionDescriptions?.[option] ? <small>{t(field.optionDescriptions[option])}</small> : null}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          );
        }
        return (
          <TextField
            key={key}
            label={field.label}
            required={field.required}
            type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
            value={value}
            onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))}
          />
        );
      })}
    </EntityFormShell>
  );
}
