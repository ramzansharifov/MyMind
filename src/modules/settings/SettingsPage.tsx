import { DeleteButton } from '../../shared/components/ActionButtons';
import { PageHeader } from '../../shared/components/PageHeader';
import { useI18n } from '../../shared/i18n/I18nProvider';
import type { CollectionName } from '../../shared/storage/storageTypes';
import type { AppData } from '../../App';
import type { AppSettings, ModuleKey } from '../../shared/types/common';
import { buildRecordCenterRows } from '../../shared/utils/appDataUtils';
import { formatDate } from '../../shared/utils/dateUtils';
import { useState } from 'react';

interface SettingsPageProps {
  data: AppData;
  dataDirectory: string;
  settings: AppSettings;
  statusMessage: string;
  onNavigate: (module: ModuleKey) => void;
  onOpenDataFolder: () => Promise<unknown>;
  onExportBackup: () => Promise<void>;
  onImportBackup: () => Promise<void>;
  onExportBackupFile: () => Promise<void>;
  onImportBackupFile: () => Promise<void>;
  onExportCollection: (collectionName: CollectionName) => Promise<void>;
  onImportCollection: (collectionName: CollectionName) => Promise<void>;
  onRecreateDemoData: () => Promise<void>;
  onClearDemoData: () => Promise<void>;
  onOpenArchiveManager: () => void;
  onSettingsChange: (settings: AppSettings) => Promise<void>;
}

export function SettingsPage({
  data,
  dataDirectory,
  settings,
  statusMessage,
  onNavigate,
  onOpenDataFolder,
  onExportBackup,
  onImportBackup,
  onExportBackupFile,
  onImportBackupFile,
  onExportCollection,
  onImportCollection,
  onRecreateDemoData,
  onClearDemoData,
  onOpenArchiveManager,
  onSettingsChange,
}: SettingsPageProps) {
  const { t } = useI18n();
  const [selectedCollection, setSelectedCollection] = useState<CollectionName>('notes');
  return (
    <section>
      <PageHeader title="Settings" subtitle="Local storage, backups, and future migration controls." />
      <div className="two-column">
        <section className="panel">
          <h2>{t('Application')}</h2>
          <div className="settings-row">
            <span>{t('App name')}</span>
            <strong>MyMind</strong>
          </div>
          <div className="settings-row">
            <span>{t('Data directory')}</span>
            <code>{dataDirectory || t('Resolving...')}</code>
          </div>
          <label>
            {t('Theme mode')}
            <select value={settings.themeMode} onChange={(event) => void onSettingsChange({ ...settings, themeMode: event.target.value as AppSettings['themeMode'] })}>
              <option value="system">{t('System')}</option>
              <option value="light">{t('Light')}</option>
              <option value="dark">{t('Dark')}</option>
            </select>
          </label>
          <label>
            {t('Language')}
            <select value={settings.language} onChange={(event) => void onSettingsChange({ ...settings, language: event.target.value as AppSettings['language'] })}>
              <option value="en">{t('English')}</option>
              <option value="ru">{t('Russian')}</option>
            </select>
          </label>
          <label>
            {t('Currency')}
            <select value={settings.currency} onChange={(event) => void onSettingsChange({ ...settings, currency: event.target.value })}>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="RUB">RUB</option>
              <option value="TJS">TJS</option>
            </select>
          </label>
          <label>
            {t('Interface density')}
            <select value={settings.uiDensity} onChange={(event) => void onSettingsChange({ ...settings, uiDensity: event.target.value as AppSettings['uiDensity'] })}>
              <option value="comfortable">{t('Comfortable')}</option>
              <option value="compact">{t('Compact')}</option>
            </select>
          </label>
          <label>
            {t('Accent color')}
            <select value={settings.accentColor} onChange={(event) => void onSettingsChange({ ...settings, accentColor: event.target.value as AppSettings['accentColor'] })}>
              <option value="teal">{t('Teal')}</option>
              <option value="blue">{t('Blue')}</option>
              <option value="violet">{t('Violet')}</option>
              <option value="amber">{t('Amber')}</option>
            </select>
          </label>
          <label>
            {t('Start section')}
            <select value={settings.startModule} onChange={(event) => void onSettingsChange({ ...settings, startModule: event.target.value as ModuleKey })}>
              {startModules.map((module) => (
                <option value={module.key} key={module.key}>
                  {t(module.label)}
                </option>
              ))}
            </select>
          </label>
          <div className="settings-row">
            <span>{t('Version')}</span>
            <strong>0.1.0</strong>
          </div>
        </section>
        <section className="panel">
          <h2>{t('Data')}</h2>
          <div className="stack">
            <button className="button" type="button" onClick={() => void onExportBackup()}>
              {t('Export JSON backup')}
            </button>
            <button className="button" type="button" onClick={() => void onImportBackup()}>
              {t('Import JSON backup')}
            </button>
            <div className="module-transfer">
              <strong>{t('Single-file backup')}</strong>
              <small>{t('Export or import every collection as one JSON file with preview on import.')}</small>
              <div className="module-transfer-actions">
                <button className="button" type="button" onClick={() => void onExportBackupFile()}>
                  {t('Export full backup file')}
                </button>
                <button className="button" type="button" onClick={() => void onImportBackupFile()}>
                  {t('Import full backup file')}
                </button>
              </div>
            </div>
            <div className="module-transfer">
              <label>
                {t('Module')}
                <select value={selectedCollection} onChange={(event) => setSelectedCollection(event.target.value as CollectionName)}>
                  {exportableCollections.map((collection) => (
                    <option value={collection.name} key={collection.name}>
                      {t(collection.label)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="module-transfer-actions">
                <button className="button" type="button" onClick={() => void onExportCollection(selectedCollection)}>
                  {t('Export module')}
                </button>
                <button className="button" type="button" onClick={() => void onImportCollection(selectedCollection)}>
                  {t('Import module')}
                </button>
              </div>
            </div>
            <button className="button" type="button" onClick={() => void onOpenDataFolder()}>
              {t('Open data folder')}
            </button>
            <button className="button ghost" type="button" onClick={() => void onRecreateDemoData()}>
              {t('Reset demo data')}
            </button>
            <button className="button ghost" type="button" onClick={onOpenArchiveManager}>
              {t('Open archive and trash')}
            </button>
            <DeleteButton
              iconOnly={false}
              label="Clear demo data"
              onConfirm={() => void onClearDemoData()}
              confirmTitle="Clear demo data?"
              confirmMessage="This will clear local demo collections from JSON storage."
            />
          </div>
          {statusMessage ? <p className="status-message">{statusMessage}</p> : null}
        </section>
        <section className="panel settings-wide-panel">
          <h2>{t('Record center')}</h2>
          <p className="muted-text">{t('A compact stream of recent active records across modules.')}</p>
          <RecordCenter data={data} onNavigate={onNavigate} />
        </section>
      </div>
    </section>
  );
}

function RecordCenter({ data, onNavigate }: { data: AppData; onNavigate: (module: ModuleKey) => void }) {
  const { t } = useI18n();
  const rows = buildRecordCenterRows(data).slice(0, 18);
  if (rows.length === 0) {
    return <p className="muted-text">{t('No active records yet.')}</p>;
  }
  return (
    <div className="record-center-list">
      {rows.map((row) => (
        <button className="record-center-row" type="button" key={`${row.collectionKey}-${row.id}`} onClick={() => onNavigate(moduleMap[row.collectionKey])}>
          <span className="chip">{t(row.module)}</span>
          <strong>{row.title}</strong>
          <span>{row.detail || t('No description.')}</span>
          <small>
            {row.pinnedAt ? `${t('Pinned')} / ` : ''}
            {formatDate(row.updatedAt)}
          </small>
        </button>
      ))}
    </div>
  );
}

const exportableCollections: Array<{ name: CollectionName; label: string }> = [
  { name: 'movies', label: 'Movies' },
  { name: 'workouts', label: 'Workouts' },
  { name: 'todos', label: 'Todo' },
  { name: 'finance', label: 'Finance' },
  { name: 'habits', label: 'Habits' },
  { name: 'calendar_events', label: 'Calendar' },
  { name: 'journal_entries', label: 'Diary' },
  { name: 'notes', label: 'Notes' },
  { name: 'projects', label: 'Projects' },
  { name: 'contacts', label: 'Contacts' },
  { name: 'health', label: 'Health' },
  { name: 'goals', label: 'Goals' },
  { name: 'inventory', label: 'Inventory' },
];

const moduleMap: Record<string, ModuleKey> = {
  movies: 'movies',
  todos: 'todos',
  calendarEvents: 'calendar',
  journalEntries: 'journal',
  notes: 'notes',
  projects: 'projects',
  contacts: 'contacts',
  goals: 'goals',
  inventory: 'inventory',
};

const startModules: Array<{ key: ModuleKey; label: string }> = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'movies', label: 'Movies' },
  { key: 'workouts', label: 'Workouts' },
  { key: 'todos', label: 'Todo' },
  { key: 'finance', label: 'Finance' },
  { key: 'habits', label: 'Habits' },
  { key: 'calendar', label: 'Calendar' },
  { key: 'journal', label: 'Diary' },
  { key: 'notes', label: 'Notes' },
  { key: 'projects', label: 'Projects' },
  { key: 'contacts', label: 'Contacts' },
  { key: 'health', label: 'Health' },
  { key: 'goals', label: 'Goals' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'settings', label: 'Settings' },
];
