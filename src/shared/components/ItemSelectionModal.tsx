import { useState, useMemo } from 'react';
import { Modal } from './Modal';
import { TextField } from './FormFields';
import { SaveButton, CancelButton } from './ActionButtons';
import { useI18n } from '../i18n/I18nProvider';

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
      <div className="item-selection-modal-content">
        <TextField
          label="Search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('Search items...')}
          autoFocus
        />

        <div className="item-selection-list-header" style={{ marginTop: '12px', marginBottom: '8px' }}>
           <label className="checkbox-line" style={{ cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={isAllSelected}
              onChange={toggleAll}
            />
            <span>{t('Select All')} ({filteredItems.length})</span>
          </label>
        </div>

        <div className="item-selection-list" style={{ maxHeight: '400px', overflowY: 'auto', display: 'grid', gap: '8px' }}>
          {filteredItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`choice-tile ${selectedIds.has(item.id) ? 'active' : ''}`}
              onClick={() => toggleSelection(item.id)}
            >
              <div className="choice-tile-mark">
                {selectedIds.has(item.id) ? '✓' : ''}
              </div>
              <div className="choice-tile-copy">
                <strong>{getItemLabel(item)}</strong>
                {getItemDescription && <small>{getItemDescription(item)}</small>}
              </div>
            </button>
          ))}
          {filteredItems.length === 0 && (
            <p className="muted-text" style={{ textAlign: 'center', padding: '20px' }}>
              {t('No items found')}
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}
