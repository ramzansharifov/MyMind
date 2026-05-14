import { Archive, RotateCcw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { AppData } from '../../App';
import { CloseButton, DeleteButton } from '../../shared/components/ActionButtons';
import { useI18n } from '../../shared/i18n/I18nProvider';
import { archiveEntity, isArchived, isTrashed, restoreEntity, trashEntity, type LifecycleEntity } from '../../shared/utils/archiveUtils';
import { formatDate } from '../../shared/utils/dateUtils';

type ManagedCollectionKey = 'movies' | 'todos' | 'calendarEvents' | 'journalEntries' | 'notes' | 'projects' | 'contacts' | 'goals' | 'inventory';
type ArchiveTab = 'archive' | 'trash';
type ManagedItem = LifecycleEntity & Record<string, unknown> & { createdAt?: string };

interface ArchiveTrashManagerProps {
  data: AppData;
  onChange: (data: AppData) => void;
  onClose: () => void;
  onStatusMessage: (message: string) => void;
}

interface CollectionConfig {
  key: ManagedCollectionKey;
  label: string;
  fallbackStatus?: string;
  setArchivedStatus?: boolean;
  titleKeys: string[];
  detailKeys: string[];
}

const managedCollections: CollectionConfig[] = [
  { key: 'movies', label: 'Movies', titleKeys: ['title'], detailKeys: ['originalTitle', 'notes'] },
  { key: 'todos', label: 'Todo', fallbackStatus: 'pending', setArchivedStatus: true, titleKeys: ['title'], detailKeys: ['description'] },
  { key: 'calendarEvents', label: 'Calendar', titleKeys: ['title'], detailKeys: ['description', 'category'] },
  { key: 'journalEntries', label: 'Diary', titleKeys: ['title'], detailKeys: ['content', 'mood'] },
  { key: 'notes', label: 'Notes', titleKeys: ['title'], detailKeys: ['content', 'category'] },
  { key: 'projects', label: 'Projects', fallbackStatus: 'active', setArchivedStatus: true, titleKeys: ['title'], detailKeys: ['description', 'area'] },
  { key: 'contacts', label: 'Contacts', titleKeys: ['name'], detailKeys: ['relationship', 'notes'] },
  { key: 'goals', label: 'Goals', fallbackStatus: 'active', setArchivedStatus: true, titleKeys: ['title'], detailKeys: ['description', 'metric'] },
  { key: 'inventory', label: 'Inventory', titleKeys: ['title'], detailKeys: ['category', 'location', 'notes'] },
];

export function ArchiveTrashManager({ data, onChange, onClose, onStatusMessage }: ArchiveTrashManagerProps) {
  const { t } = useI18n();
  const archiveRows = getRows(data, 'archive');
  const trashRows = getRows(data, 'trash');
  const [activeTab, setActiveTab] = useState<ArchiveTab>(trashRows.length > 0 ? 'trash' : 'archive');
  const rows = activeTab === 'archive' ? archiveRows : trashRows;

  function updateCollection(config: CollectionConfig, updater: (items: ManagedItem[]) => ManagedItem[], message: string) {
    const nextData = {
      ...data,
      [config.key]: updater(getCollectionItems(data, config.key)),
    } as AppData;
    onChange(nextData);
    onStatusMessage(message);
  }

  function archiveItem(config: CollectionConfig, id: string) {
    updateCollection(
      config,
      (items) => items.map((item) => (item.id === id ? archiveEntity(item, { setArchivedStatus: config.setArchivedStatus }) : item)),
      'Item archived.',
    );
  }

  function restoreItem(config: CollectionConfig, id: string) {
    updateCollection(
      config,
      (items) => items.map((item) => (item.id === id ? restoreEntity(item, config.fallbackStatus) : item)),
      'Item restored.',
    );
  }

  function moveToTrash(config: CollectionConfig, id: string) {
    updateCollection(
      config,
      (items) => items.map((item) => (item.id === id ? trashEntity(item) : item)),
      'Item moved to trash.',
    );
  }

  function deleteForever(config: CollectionConfig, id: string) {
    updateCollection(config, (items) => items.filter((item) => item.id !== id), 'Item permanently deleted.');
  }

  return (
    <div className="archive-window-backdrop">
      <section className="archive-window" role="dialog" aria-modal="true" aria-label={t('Archive and Trash')}>
        <div className="archive-window-header">
          <div>
            <h2>{t('Archive and Trash')}</h2>
            <p>{t('Review hidden records, restore them, move them to trash, or delete them forever.')}</p>
          </div>
          <CloseButton onClick={onClose} />
        </div>
        <div className="archive-tabs" role="tablist">
          <button className={activeTab === 'archive' ? 'active' : ''} type="button" onClick={() => setActiveTab('archive')}>
            <Archive size={16} aria-hidden="true" />
            <span>{t('Archive')}</span>
            <strong>{archiveRows.length}</strong>
          </button>
          <button className={activeTab === 'trash' ? 'active' : ''} type="button" onClick={() => setActiveTab('trash')}>
            <Trash2 size={16} aria-hidden="true" />
            <span>{t('Trash')}</span>
            <strong>{trashRows.length}</strong>
          </button>
        </div>
        {rows.length === 0 ? (
          <div className="empty-state archive-empty">
            <strong>{t(activeTab === 'archive' ? 'No archived items' : 'Trash is empty')}</strong>
            <span>{t(activeTab === 'archive' ? 'Archived records will appear here.' : 'Items moved to trash will appear here for 30 days.')}</span>
          </div>
        ) : (
          <div className="archive-list">
            {rows.map((row) => (
              <article className="archive-row" key={`${row.config.key}-${row.item.id}`}>
                <div className="archive-row-main">
                  <span className="chip">{t(row.config.label)}</span>
                  <h3>{row.title}</h3>
                  <p>{row.detail || t('No description.')}</p>
                  <small>
                    {t(row.state === 'archive' ? 'Archived' : 'In trash')}: {formatDate(row.date)}
                    {row.state === 'trash' && row.item.trashExpiresAt ? ` / ${t('Expires')}: ${formatDate(row.item.trashExpiresAt)}` : ''}
                  </small>
                </div>
                <div className="archive-row-actions">
                  {row.state === 'trash' ? (
                    <button className="button ghost" type="button" onClick={() => archiveItem(row.config, row.item.id)}>
                      <Archive size={16} aria-hidden="true" />
                      <span>{t('Archive')}</span>
                    </button>
                  ) : null}
                  <button className="button ghost" type="button" onClick={() => restoreItem(row.config, row.item.id)}>
                    <RotateCcw size={16} aria-hidden="true" />
                    <span>{t('Restore')}</span>
                  </button>
                  {row.state === 'archive' ? (
                    <DeleteButton
                      iconOnly={false}
                      label="Move to trash"
                      confirmTitle="Move to trash?"
                      confirmMessage="The item will stay in trash for 30 days before permanent deletion."
                      onConfirm={() => moveToTrash(row.config, row.item.id)}
                    />
                  ) : null}
                  <DeleteButton
                    iconOnly={false}
                    label="Delete forever"
                    confirmTitle="Delete forever?"
                    confirmMessage="This permanently removes the item from local JSON storage."
                    onConfirm={() => deleteForever(row.config, row.item.id)}
                  />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function getRows(data: AppData, state: ArchiveTab) {
  return managedCollections.flatMap((config) =>
    getCollectionItems(data, config.key)
      .filter((item) => (state === 'archive' ? isArchived(item) && !isTrashed(item) : isTrashed(item)))
      .map((item) => ({
        config,
        item,
        state,
        title: getFirstText(item, config.titleKeys) || 'Untitled',
        detail: getFirstText(item, config.detailKeys),
        date: state === 'archive' ? item.archivedAt ?? item.updatedAt : item.trashedAt ?? item.updatedAt,
      })),
  );
}

function getCollectionItems(data: AppData, key: ManagedCollectionKey) {
  return data[key] as unknown as ManagedItem[];
}

function getFirstText(item: ManagedItem, keys: string[]) {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
    if (typeof value === 'number') {
      return String(value);
    }
  }
  return '';
}
