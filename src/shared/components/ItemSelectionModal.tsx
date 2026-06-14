import { useState, useMemo } from 'react';
import { Modal } from './Modal';
import { TextField } from './FormFields';
import { SaveButton, CancelButton } from './ActionButtons';
import { useI18n } from '../i18n/I18nProvider';
import { cn } from '../utils/classNames';

interface ItemSelectionModalProps<T> {
  title: string;
  items: T[];
  getItemLabel: (item: T) => string;
  getItemDescription?: (item: T) => string;
  onConfirm: (selectedItems: T[]) => void;
  onCancel: () => void;
}

export function ItemSelectionModal<T extends { id: string }>({
  title,
  items,
  getItemLabel,
  getItemDescription,
  onConfirm,
  onCancel,
}: ItemSelectionModalProps<T>) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredItems = useMemo(() => {
    const normalized = query.toLowerCase().trim();
    if (!normalized) return items;
    return items.filter((item) => {
      const label = getItemLabel(item).toLowerCase();
      const description = getItemDescription?.(item).toLowerCase() ?? '';
      return label.includes(normalized) || description.includes(normalized);
    });
  }, [items, query, getItemLabel, getItemDescription]);

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredItems.length && filteredItems.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map((item) => item.id)));
    }
  };

  const handleConfirm = () => {
    const selectedItems = items.filter((item) => selectedIds.has(item.id));
    onConfirm(selectedItems);
  };

  const isAllSelected = filteredItems.length > 0 && filteredItems.every(item => selectedIds.has(item.id));

  return (
    <Modal
      title={title}
      onClose={onCancel}
      footer={
        <>
          <CancelButton onClick={onCancel} />
          <SaveButton
            label="Add"
            disabled={selectedIds.size === 0}
            onClick={handleConfirm}
          />
        </>
      }
    >
      <div className="grid gap-3">
        <TextField
          label="Search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('Search items...')}
          autoFocus
        />

        <div className="flex items-center justify-between gap-3">
           <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-bold text-app-text">
            <input
              className="h-4 w-4 accent-[var(--accent)]"
              type="checkbox"
              checked={isAllSelected}
              onChange={toggleAll}
            />
            <span>{t('Select All')} ({filteredItems.length})</span>
          </label>
        </div>

        <div className="grid max-h-[400px] gap-2 overflow-y-auto">
          {filteredItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={cn(choiceTileClass, selectedIds.has(item.id) && choiceTileActiveClass)}
              onClick={() => toggleSelection(item.id)}
            >
              <div className={cn(choiceMarkClass, selectedIds.has(item.id) && choiceMarkActiveClass)}>
                {selectedIds.has(item.id) ? '✓' : ''}
              </div>
              <div className="min-w-0 text-left">
                <strong className="block truncate text-sm text-app-text">{getItemLabel(item)}</strong>
                {getItemDescription && <small className="mt-0.5 block truncate text-xs text-app-muted">{getItemDescription(item)}</small>}
              </div>
            </button>
          ))}
          {filteredItems.length === 0 && (
            <p className="rounded-panel border border-dashed border-app-border bg-app-surface-soft p-5 text-center text-sm text-app-muted">
              {t('No items found')}
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}

const choiceTileClass =
  'grid w-full grid-cols-[34px_minmax(0,1fr)] items-center gap-3 rounded-panel border border-app-border bg-app-surface-soft p-3 text-left transition-colors hover:border-[color-mix(in_srgb,var(--accent)_42%,var(--border))] hover:bg-app-surface-strong';

const choiceTileActiveClass =
  'border-[color-mix(in_srgb,var(--accent)_68%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_16%,var(--surface-strong))]';

const choiceMarkClass =
  'grid h-[34px] w-[34px] place-items-center rounded-panel border border-app-border bg-app-surface text-sm font-extrabold text-transparent';

const choiceMarkActiveClass =
  'border-[color-mix(in_srgb,var(--accent)_70%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_18%,var(--surface-soft))] text-app-accent-strong';
