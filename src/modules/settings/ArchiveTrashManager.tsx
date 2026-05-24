import { Archive, ChevronDown, ChevronUp, RotateCcw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { AppData } from '../../shared/app/appData';
import { CloseButton, DeleteButton } from '../../shared/components/ActionButtons';
import { useI18n } from '../../shared/i18n/I18nProvider';
import { archiveEntity, isArchived, isTrashed, restoreEntity, trashEntity, type LifecycleEntity } from '../../shared/utils/archiveUtils';
import { formatDate } from '../../shared/utils/dateUtils';

type ManagedCollectionKey =
  | 'movies'
  | 'todos'
  | 'habits'
  | 'financeTransactions'
  | 'calendarEvents'
  | 'journalEntries'
  | 'notes'
  | 'templates'
  | 'projects'
  | 'contacts'
  | 'goals'
  | 'inventory';
type ArchiveTab = 'archive' | 'trash';
type ManagedItem = LifecycleEntity & Record<string, unknown> & { createdAt?: string };

interface ArchiveTrashManagerProps {
  data: AppData;
  onChange: (data: AppData) => void;
  onClose: () => void;
  onStatusMessage: (message: string) => void;
}

interface ArchiveTrashPageProps {
  data: AppData;
  mode: ArchiveTab;
  onChange: (data: AppData) => void;
  onStatusMessage: (message: string) => void;
}

interface ArchiveTrashContentProps {
  data: AppData;
  activeTab: ArchiveTab;
  isEmbedded?: boolean;
  onActiveTabChange?: (tab: ArchiveTab) => void;
  onChange: (data: AppData) => void;
  onClose?: () => void;
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
  { key: 'habits', label: 'Habits', titleKeys: ['title'], detailKeys: ['description', 'category'] },
  { key: 'financeTransactions', label: 'Finance', titleKeys: ['title'], detailKeys: ['sourceOrCategory', 'description'] },
  { key: 'calendarEvents', label: 'Calendar', titleKeys: ['title'], detailKeys: ['description', 'category'] },
  { key: 'journalEntries', label: 'Diary', titleKeys: ['title'], detailKeys: ['content', 'mood'] },
  { key: 'notes', label: 'Notes', titleKeys: ['title'], detailKeys: ['content', 'category'] },
  { key: 'templates', label: 'Templates', titleKeys: ['title'], detailKeys: ['body', 'category'] },
  { key: 'projects', label: 'Projects', fallbackStatus: 'active', setArchivedStatus: true, titleKeys: ['title'], detailKeys: ['description', 'area'] },
  { key: 'contacts', label: 'Contacts', titleKeys: ['name'], detailKeys: ['relationship', 'notes'] },
  { key: 'goals', label: 'Goals', fallbackStatus: 'active', setArchivedStatus: true, titleKeys: ['title'], detailKeys: ['description', 'metric'] },
  { key: 'inventory', label: 'Inventory', titleKeys: ['title'], detailKeys: ['category', 'location', 'notes'] },
];

export function ArchiveTrashManager({ data, onChange, onClose, onStatusMessage }: ArchiveTrashManagerProps) {
  const archiveRows = getRows(data, 'archive');
  const trashRows = getRows(data, 'trash');
  const [activeTab, setActiveTab] = useState<ArchiveTab>(trashRows.length > 0 ? 'trash' : 'archive');

  return (
    <div
      className="archive-window-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <ArchiveTrashContent
        data={data}
        activeTab={activeTab}
        onActiveTabChange={setActiveTab}
        onChange={onChange}
        onClose={onClose}
        onStatusMessage={onStatusMessage}
      />
    </div>
  );
}

export function ArchiveTrashPage({ data, mode, onChange, onStatusMessage }: ArchiveTrashPageProps) {
  return <ArchiveTrashContent data={data} activeTab={mode} isEmbedded onChange={onChange} onStatusMessage={onStatusMessage} />;
}

function ArchiveTrashContent({
  data,
  activeTab,
  isEmbedded = false,
  onActiveTabChange,
  onChange,
  onClose,
  onStatusMessage,
}: ArchiveTrashContentProps) {
  const { t } = useI18n();
  const archiveRows = getRows(data, 'archive');
  const trashRows = getRows(data, 'trash');
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const rows = activeTab === 'archive' ? archiveRows : trashRows;
  const title = onActiveTabChange ? 'Archive and Trash' : activeTab === 'archive' ? 'Archive' : 'Trash';
  const description = onActiveTabChange
    ? 'Review hidden records, restore them, move them to trash, or delete them forever.'
    : activeTab === 'archive'
      ? 'Review archived records, restore them, or move them to trash.'
      : 'Review trashed records, restore them, archive them, or delete them forever.';

  function updateCollection(config: CollectionConfig, updater: (items: ManagedItem[]) => ManagedItem[], message: string) {
    const nextData = setCollectionItems(data, config.key, updater(getCollectionItems(data, config.key)));
    onChange(nextData);
    onStatusMessage(message);
  }

  function archiveItem(config: CollectionConfig, id: string) {
    updateCollection(
      config,
      (items) => items.map((item) => (item.id === id ? applyInactiveState(archiveEntity(item, { setArchivedStatus: config.setArchivedStatus }), config.key) : item)),
      'Item archived.',
    );
  }

  function restoreItem(config: CollectionConfig, id: string) {
    updateCollection(
      config,
      (items) => items.map((item) => (item.id === id ? applyActiveState(restoreEntity(item, config.fallbackStatus), config.key) : item)),
      'Item restored.',
    );
  }

  function moveToTrash(config: CollectionConfig, id: string) {
    updateCollection(
      config,
      (items) => items.map((item) => (item.id === id ? applyInactiveState(trashEntity(item), config.key) : item)),
      'Item moved to trash.',
    );
  }

  function deleteForever(config: CollectionConfig, id: string) {
    updateCollection(config, (items) => items.filter((item) => item.id !== id), 'Item permanently deleted.');
  }

  function toggleExpanded(rowKey: string) {
    setExpandedRows((current) => ({ ...current, [rowKey]: !current[rowKey] }));
  }

    return (
      <section
        className={`archive-window${isEmbedded ? ' archive-window-embedded' : ''}`}
        role={isEmbedded ? 'region' : 'dialog'}
        aria-modal={isEmbedded ? undefined : true}
        aria-label={t(title)}
      >
        <div className="archive-window-header">
          <div>
            <h2>{t(title)}</h2>
            <p>{t(description)}</p>
          </div>
          {onClose ? <CloseButton onClick={onClose} /> : null}
        </div>
        {onActiveTabChange ? (
          <div className="archive-tabs" role="tablist">
            <button className={activeTab === 'archive' ? 'active' : ''} type="button" onClick={() => onActiveTabChange('archive')}>
              <Archive size={16} aria-hidden="true" />
              <span>{t('Archive')}</span>
              <strong>{archiveRows.length}</strong>
            </button>
            <button className={activeTab === 'trash' ? 'active' : ''} type="button" onClick={() => onActiveTabChange('trash')}>
              <Trash2 size={16} aria-hidden="true" />
              <span>{t('Trash')}</span>
              <strong>{trashRows.length}</strong>
            </button>
          </div>
        ) : null}
        {rows.length === 0 ? (
          <div className="empty-state archive-empty">
            <strong>{t(activeTab === 'archive' ? 'No archived items' : 'Trash is empty')}</strong>
            <span>{t(activeTab === 'archive' ? 'Archived records will appear here.' : 'Items moved to trash will appear here for 30 days.')}</span>
          </div>
        ) : (
          <div className="archive-list">
            {rows.map((row) => {
              const rowKey = `${row.config.key}-${row.item.id}`;
              const isExpanded = Boolean(expandedRows[rowKey]);
              const detail = row.detail || t('No description.');
              return (
                <article className="archive-row" key={rowKey}>
                  <div className="archive-row-top">
                    <div className="archive-row-heading">
                      <span className="chip">{t(row.config.label)}</span>
                      <h3>{row.title}</h3>
                      <small>
                        {t(row.state === 'archive' ? 'Archived' : 'In trash')}: {formatDate(row.date)}
                        {row.state === 'trash' && row.item.trashExpiresAt ? ` / ${t('Expires')}: ${formatDate(row.item.trashExpiresAt)}` : ''}
                      </small>
                    </div>
                    <div className="archive-row-actions">
                      <button className="button ghost" type="button" onClick={() => toggleExpanded(rowKey)}>
                        {isExpanded ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
                        <span>{t(isExpanded ? 'Show less' : 'Show fully')}</span>
                      </button>
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
                  </div>
                  <p className={`archive-row-detail${isExpanded ? ' expanded' : ''}`}>{detail}</p>
                </article>
              );
            })}
          </div>
        )}
      </section>
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
  if (key === 'todos') {
    return data.todos.items as unknown as ManagedItem[];
  }
  if (key === 'habits') {
    return data.habits.habits as unknown as ManagedItem[];
  }
  if (key === 'financeTransactions') {
    return data.finance.transactions as unknown as ManagedItem[];
  }
  const collection = data[key];
  if (!Array.isArray(collection)) {
    return [];
  }
  return collection as unknown as ManagedItem[];
}

function setCollectionItems(data: AppData, key: ManagedCollectionKey, items: ManagedItem[]): AppData {
  if (key === 'todos') {
    return {
      ...data,
      todos: {
        ...data.todos,
        items: items as unknown as AppData['todos']['items'],
      },
    };
  }
  if (key === 'habits') {
    return {
      ...data,
      habits: {
        ...data.habits,
        habits: items as unknown as AppData['habits']['habits'],
      },
    };
  }
  if (key === 'financeTransactions') {
    return {
      ...data,
      finance: {
        ...data.finance,
        transactions: items as unknown as AppData['finance']['transactions'],
      },
    };
  }
  return {
    ...data,
    [key]: items,
  } as AppData;
}

function applyInactiveState(item: ManagedItem, key: ManagedCollectionKey) {
  return key === 'habits' ? { ...item, isActive: false } : item;
}

function applyActiveState(item: ManagedItem, key: ManagedCollectionKey) {
  return key === 'habits' ? { ...item, isActive: true } : item;
}

function getFirstText(item: ManagedItem, keys: string[]) {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === 'string' && value.trim()) {
      return normalizePreviewText(value);
    }
    if (typeof value === 'number') {
      return String(value);
    }
  }
  return '';
}

function normalizePreviewText(value: string) {
  return value
    .replace(/<!--mymind-blocks:[\s\S]*?-->/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}
