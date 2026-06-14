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
import { cn } from '../utils/classNames';

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
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3.5">
          {filteredItems.map((item) => (
            <article
              className={cn(
                'grid gap-3.5 rounded-panel border border-[var(--glass-border)] bg-[var(--panel-bg)] p-4 text-app-text [backdrop-filter:var(--glass-blur)] shadow-panel hover:border-[color-mix(in_srgb,var(--accent)_34%,var(--border))]',
                item.pinnedAt && 'border-[color-mix(in_srgb,var(--accent)_55%,var(--border))] bg-[color-mix(in_srgb,var(--surface)_88%,var(--accent)_12%)]',
              )}
              key={item.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-app-text">{String(item[fields[0].key] ?? 'Untitled')}</h3>
                  <small className="text-app-muted">{summary(item).split(' / ').map((part) => t(part)).join(' / ')}</small>
                </div>
              </div>
              {'tags' in item && item.tags ? (
                <div className="flex flex-wrap gap-2">
                  {item.tags.map((tag) => (
                    <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-app-border bg-app-chip px-2.5 py-1.5 text-xs leading-tight text-app-chip-text" key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="flex flex-wrap items-center gap-2">
                <PinButton isPinned={Boolean(item.pinnedAt)} onClick={() => togglePin(item)} />
                <EditButton onClick={() => setEditing(item)} />
                <ArchiveButton
                  label="Archive"
                  confirmTitle="Archive item?"
                  confirmMessage="The item will be hidden from regular lists but kept in local SQLite storage."
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
            <section className="grid gap-2.5 rounded-panel border border-[var(--line-soft)] bg-app-surface-soft p-3" key={key}>
              <h3 className="text-base font-bold text-app-text">{t(field.label)}</h3>
              <div className="grid gap-2.5">
                {field.options?.map((option) => (
                  <button
                    className={cn(
                      'grid w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-panel border border-app-border bg-app-surface p-3 text-left text-app-text transition-colors',
                      'hover:border-[color-mix(in_srgb,var(--accent)_52%,var(--border))] hover:bg-app-surface-strong',
                      value === option && 'border-[color-mix(in_srgb,var(--accent)_52%,var(--border))] bg-app-surface-strong',
                    )}
                    type="button"
                    key={option}
                    onClick={() => setDraft((current) => ({ ...current, [key]: option }))}
                  >
                    <span className="grid h-[34px] w-[34px] place-items-center rounded-panel border border-[color-mix(in_srgb,var(--accent)_38%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_10%,var(--surface-soft))] font-extrabold text-app-accent-strong">
                      {value === option ? '✓' : ''}
                    </span>
                    <span>
                      <strong className="min-w-0 break-words">{t(option)}</strong>
                      {field.optionDescriptions?.[option] ? <small className="mt-0.5 block text-app-muted">{t(field.optionDescriptions[option])}</small> : null}
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
