import type { ReactNode } from 'react';
import { useState } from 'react';
import {
  Archive,
  Box,
  Check,
  ChevronRight,
  Database,
  Download,
  FileJson,
  FolderOpen,
  Globe2,
  Layers3,
  LayoutDashboard,
  Monitor,
  Palette,
  Plus,
  Rows3,
  Settings2,
  SlidersHorizontal,
  Trash2,
  Upload,
} from 'lucide-react';
import { DeleteButton } from '../../shared/components/ActionButtons';
import { PageHeader } from '../../shared/components/PageHeader';
import { appModules, moduleGroupIcons } from '../../shared/app/moduleRegistry';
import { ArchiveTrashPage } from './ArchiveTrashManager';
import { useI18n } from '../../shared/i18n/I18nProvider';
import type { CollectionName } from '../../shared/storage/storageTypes';
import type { AppData } from '../../shared/app/appData';
import type { AppSettings, ModuleGroupIconKey, ModuleKey, SidebarSettings } from '../../shared/types/common';
import { buildRecordCenterRows } from '../../shared/utils/appDataUtils';
import { formatDate } from '../../shared/utils/dateUtils';
import { createId } from '../../shared/utils/idGenerator';

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
  onDataChange: (data: AppData) => void;
  onStatusMessage: (message: string) => void;
  onSettingsChange: (settings: AppSettings) => Promise<void>;
}

type SettingsSection = 'overview' | 'application' | 'modules' | 'data' | 'archive' | 'trash' | 'records';
type ModulesSettingsTab = 'visibility' | 'groups';
type DataSettingsTab = 'general' | 'moduleTransfer';

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
  onDataChange,
  onStatusMessage,
  onSettingsChange,
}: SettingsPageProps) {
  const { t } = useI18n();
  const [activeSection, setActiveSection] = useState<SettingsSection>('overview');
  const [selectedCollection, setSelectedCollection] = useState<CollectionName>('notes');
  const activeLabel = sectionCards.find((section) => section.id === activeSection)?.label ?? 'Settings';

  return (
    <section>
      <div className="settings-header">
        <PageHeader title="Settings" subtitle="Local storage, backups, and future migration controls." />
        <nav className="settings-breadcrumb" aria-label={t('Settings path')}>
          <button type="button" onClick={() => setActiveSection('overview')}>
            {t('Settings')}
          </button>
          {activeSection !== 'overview' ? (
            <>
              <ChevronRight size={15} aria-hidden="true" />
              <span>{t(activeLabel)}</span>
            </>
          ) : null}
        </nav>
      </div>

      {activeSection === 'overview' ? (
        <div className="settings-home-grid">
          {sectionCards.filter((section) => section.id !== 'overview').map((section) => (
            <button className="settings-section-card" type="button" key={section.id} onClick={() => setActiveSection(section.id)}>
              <span className="settings-section-icon">{section.icon}</span>
              <span>
                <strong>{t(section.label)}</strong>
                <small>{t(section.description)}</small>
              </span>
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          ))}
        </div>
      ) : null}

      {activeSection === 'application' ? (
        <ApplicationSettings settings={settings} dataDirectory={dataDirectory} onSettingsChange={onSettingsChange} />
      ) : null}

      {activeSection === 'modules' ? (
        <ModulesSettings settings={settings} onSettingsChange={onSettingsChange} />
      ) : null}

      {activeSection === 'data' ? (
        <DataSettings
          selectedCollection={selectedCollection}
          statusMessage={statusMessage}
          onSelectedCollectionChange={setSelectedCollection}
          onExportBackup={onExportBackup}
          onImportBackup={onImportBackup}
          onExportBackupFile={onExportBackupFile}
          onImportBackupFile={onImportBackupFile}
          onExportCollection={onExportCollection}
          onImportCollection={onImportCollection}
          onOpenDataFolder={onOpenDataFolder}
          onRecreateDemoData={onRecreateDemoData}
          onClearDemoData={onClearDemoData}
        />
      ) : null}

      {activeSection === 'archive' ? (
        <section className="panel settings-page-panel">
          <ArchiveTrashPage data={data} mode="archive" onChange={onDataChange} onStatusMessage={onStatusMessage} />
        </section>
      ) : null}

      {activeSection === 'trash' ? (
        <section className="panel settings-page-panel">
          <ArchiveTrashPage data={data} mode="trash" onChange={onDataChange} onStatusMessage={onStatusMessage} />
        </section>
      ) : null}

      {activeSection === 'records' ? (
        <section className="panel settings-page-panel">
          <SettingsPanelHeading icon={<Rows3 size={18} />} title="Record center" description="A compact stream of recent active records across modules." />
          <RecordCenter data={data} onNavigate={onNavigate} />
        </section>
      ) : null}
    </section>
  );
}

function ModulesSettings({
  settings,
  onSettingsChange,
}: {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => Promise<void>;
}) {
  const { t } = useI18n();
  const [newGroupName, setNewGroupName] = useState('');
  const [activeTab, setActiveTab] = useState<ModulesSettingsTab>('visibility');
  const sidebar = settings.sidebar;
  const hiddenModules = new Set(sidebar.hiddenModules);

  function saveSidebar(nextSidebar: SidebarSettings) {
    void onSettingsChange({ ...settings, sidebar: nextSidebar });
  }

  function setModuleVisible(moduleKey: ModuleKey, isVisible: boolean) {
    const module = appModules.find((item) => item.key === moduleKey);
    if (!module?.canHide) {
      return;
    }
    const nextHidden = isVisible
      ? sidebar.hiddenModules.filter((key) => key !== moduleKey)
      : Array.from(new Set([...sidebar.hiddenModules, moduleKey]));
    saveSidebar({ ...sidebar, hiddenModules: nextHidden });
  }

  function createGroup() {
    const title = newGroupName.trim();
    if (!title) {
      return;
    }
    saveSidebar({
      ...sidebar,
      groups: [
        ...sidebar.groups,
        {
          id: createId('module-group'),
          title,
          icon: 'folder',
          moduleKeys: [],
          isVisible: true,
          isExpanded: true,
        },
      ],
    });
    setNewGroupName('');
  }

  function updateGroup(groupId: string, updater: (group: SidebarSettings['groups'][number]) => SidebarSettings['groups'][number]) {
    saveSidebar({
      ...sidebar,
      groups: sidebar.groups.map((group) => (group.id === groupId ? updater(group) : group)),
    });
  }

  function deleteGroup(groupId: string) {
    saveSidebar({
      ...sidebar,
      groups: sidebar.groups.filter((group) => group.id !== groupId),
    });
  }

  function setGroupModule(groupId: string, moduleKey: ModuleKey, isIncluded: boolean) {
    const module = appModules.find((item) => item.key === moduleKey);
    if (!module?.canGroup) {
      return;
    }
    const nextGroups = sidebar.groups.map((group) => {
      const withoutModule = group.moduleKeys.filter((key) => key !== moduleKey);
      if (group.id !== groupId) {
        return { ...group, moduleKeys: withoutModule };
      }
      return {
        ...group,
        moduleKeys: isIncluded ? [...withoutModule, moduleKey] : withoutModule,
      };
    });
    saveSidebar({ ...sidebar, groups: nextGroups });
  }

  return (
    <section className="panel settings-page-panel">
      <SettingsPanelHeading icon={<Layers3 size={18} />} title="Modules and groups" description="Choose which modules appear in the sidebar and organize them into collapsible groups." />

      <div className="settings-inner-tabs" role="tablist" aria-label={t('Modules and groups')}>
        <button className={activeTab === 'visibility' ? 'active' : ''} type="button" onClick={() => setActiveTab('visibility')}>
          <Layers3 size={16} aria-hidden="true" />
          <span>{t('Visible modules')}</span>
        </button>
        <button className={activeTab === 'groups' ? 'active' : ''} type="button" onClick={() => setActiveTab('groups')}>
          <FolderOpen size={16} aria-hidden="true" />
          <span>{t('Module groups')}</span>
        </button>
      </div>

      {activeTab === 'visibility' ? (
        <section className="settings-choice-group">
          <div className="settings-choice-heading">
            <span><Layers3 size={17} aria-hidden="true" /></span>
            <h3>{t('Visible modules')}</h3>
          </div>
          <div className="settings-module-card-grid">
            {appModules.map((module) => {
              const Icon = module.icon;
              const isVisible = !hiddenModules.has(module.key) || !module.canHide;
              return (
                <button
                  className={`settings-module-toggle-card${isVisible ? ' active' : ' inactive'}${!module.canHide ? ' locked' : ''}`}
                  type="button"
                  key={module.key}
                  disabled={!module.canHide}
                  onClick={() => setModuleVisible(module.key, !isVisible)}
                >
                  <span className="settings-module-card-state" aria-hidden="true">
                    {isVisible ? <Check size={15} /> : null}
                  </span>
                  <span className="settings-section-icon">
                    <Icon size={17} aria-hidden="true" />
                  </span>
                  <span>
                    <strong>{t(module.label)}</strong>
                    <small>{module.canHide ? t(isVisible ? 'Shown in sidebar' : 'Hidden from sidebar') : t('Always visible')}</small>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {activeTab === 'groups' ? (
        <section className="settings-choice-group settings-module-groups-builder">
          <div className="settings-choice-heading">
            <span><Layers3 size={17} aria-hidden="true" /></span>
            <h3>{t('Module groups')}</h3>
          </div>
          <div className="settings-group-create">
            <input value={newGroupName} placeholder={t('Group name')} onChange={(event) => setNewGroupName(event.target.value)} />
            <button className="button primary" type="button" onClick={createGroup}>
              <Plus size={17} aria-hidden="true" />
              <span>{t('Create group')}</span>
            </button>
          </div>
          {sidebar.groups.length === 0 ? (
            <p className="muted-text">{t('No module groups yet.')}</p>
          ) : (
            <div className="settings-module-groups">
              {sidebar.groups.map((group) => (
                <ModuleGroupCard
                  key={group.id}
                  group={group}
                  groups={sidebar.groups}
                  onUpdate={(updater) => updateGroup(group.id, updater)}
                  onDelete={() => deleteGroup(group.id)}
                  onSetModule={(moduleKey, isIncluded) => setGroupModule(group.id, moduleKey, isIncluded)}
                />
              ))}
            </div>
          )}
        </section>
      ) : null}
    </section>
  );
}

function ModuleGroupCard({
  group,
  groups,
  onUpdate,
  onDelete,
  onSetModule,
}: {
  group: SidebarSettings['groups'][number];
  groups: SidebarSettings['groups'];
  onUpdate: (updater: (group: SidebarSettings['groups'][number]) => SidebarSettings['groups'][number]) => void;
  onDelete: () => void;
  onSetModule: (moduleKey: ModuleKey, isIncluded: boolean) => void;
}) {
  const { t } = useI18n();
  const modulesInOtherGroups = new Set(
    groups
      .filter((item) => item.id !== group.id)
      .flatMap((item) => item.moduleKeys),
  );
  const availableModules = appModules.filter(
    (module) => module.canGroup && (group.moduleKeys.includes(module.key) || !modulesInOtherGroups.has(module.key)),
  );

  return (
    <article className="settings-module-group-card">
      <div className="settings-module-group-head">
        <label>
          {t('Group name')}
          <input value={group.title} onChange={(event) => onUpdate((current) => ({ ...current, title: event.target.value }))} />
        </label>
        <button
          className={`settings-group-visibility ${group.isVisible ? 'active' : 'inactive'}`}
          type="button"
          onClick={() => onUpdate((current) => ({ ...current, isVisible: !current.isVisible }))}
        >
          <span className="settings-module-card-state" aria-hidden="true">
            {group.isVisible ? <Check size={15} /> : null}
          </span>
          <span>{t(group.isVisible ? 'Group is shown' : 'Group is hidden')}</span>
        </button>
        <DeleteButton
          iconOnly={false}
          label="Delete module group"
          confirmTitle="Delete group?"
          confirmMessage="Modules inside this group will return to the regular sidebar list if they are visible."
          onConfirm={onDelete}
        />
      </div>

      <div className="settings-group-section">
        <span className="settings-group-section-title">{t('Group icon')}</span>
        <div className="settings-group-icon-picker">
          {moduleGroupIcons.map((option) => {
            const Icon = option.icon;
            const isActive = (group.icon ?? 'folder') === option.key;
            return (
              <button
                className={`settings-icon-choice${isActive ? ' active' : ''}`}
                type="button"
                key={option.key}
                title={t(option.label)}
                aria-label={t(option.label)}
                onClick={() => onUpdate((current) => ({ ...current, icon: option.key as ModuleGroupIconKey }))}
              >
                <Icon size={18} aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </div>

      <div className="settings-group-section">
        <span className="settings-group-section-title">{t('Modules in group')}</span>
        <div className="settings-module-picker">
          {availableModules.length > 0 ? (
            availableModules.map((module) => {
              const Icon = module.icon;
              const isIncluded = group.moduleKeys.includes(module.key);
              return (
                <button
                  className={`settings-module-chip${isIncluded ? ' active' : ' inactive'}`}
                  type="button"
                  key={module.key}
                  onClick={() => onSetModule(module.key, !isIncluded)}
                >
                  <span className="settings-module-card-state" aria-hidden="true">
                    {isIncluded ? <Check size={14} /> : null}
                  </span>
                  <Icon size={16} aria-hidden="true" />
                  <span>{t(module.label)}</span>
                </button>
              );
            })
          ) : (
            <p className="muted-text">{t('No modules available for this group.')}</p>
          )}
        </div>
      </div>
    </article>
  );
}

function ApplicationSettings({
  settings,
  dataDirectory,
  onSettingsChange,
}: {
  settings: AppSettings;
  dataDirectory: string;
  onSettingsChange: (settings: AppSettings) => Promise<void>;
}) {
  const { t } = useI18n();
  return (
    <section className="panel settings-page-panel">
      <SettingsPanelHeading icon={<Settings2 size={18} />} title="Application" description="Interface, language, start section, and visual preferences." />

      <div className="settings-info-grid">
        <InfoTile label="App name" value="MyMind" />
        <InfoTile label="Version" value="0.1.0" />
        <InfoTile label="Data directory" value={dataDirectory || t('Resolving...')} code />
      </div>

      <SettingsChoiceGroup title="Language" icon={<Globe2 size={17} />}>
        <ChoiceCard active={settings.language === 'ru'} title="RU" subtitle="Russian" onClick={() => void onSettingsChange({ ...settings, language: 'ru' })} />
        <ChoiceCard active={settings.language === 'en'} title="EN" subtitle="English" onClick={() => void onSettingsChange({ ...settings, language: 'en' })} />
      </SettingsChoiceGroup>

      <SettingsChoiceGroup title="Theme mode" icon={<Monitor size={17} />}>
        {themeOptions.map((option) => (
          <ChoiceCard
            key={option.value}
            active={settings.themeMode === option.value}
            title={option.label}
            subtitle={option.description}
            onClick={() => void onSettingsChange({ ...settings, themeMode: option.value })}
          />
        ))}
      </SettingsChoiceGroup>

      <SettingsChoiceGroup title="Interface density" icon={<SlidersHorizontal size={17} />}>
        {densityOptions.map((option) => (
          <ChoiceCard
            key={option.value}
            active={settings.uiDensity === option.value}
            title={option.label}
            subtitle={option.description}
            onClick={() => void onSettingsChange({ ...settings, uiDensity: option.value })}
          />
        ))}
      </SettingsChoiceGroup>

      <SettingsChoiceGroup title="Accent color" icon={<Palette size={17} />}>
        {accentOptions.map((option) => (
          <ChoiceCard
            key={option.value}
            active={settings.accentColor === option.value}
            title={option.label}
            subtitle={option.description}
            swatch={option.value}
            onClick={() => void onSettingsChange({ ...settings, accentColor: option.value })}
          />
        ))}
      </SettingsChoiceGroup>

      <SettingsChoiceGroup title="Currency" icon={<Box size={17} />}>
        {currencyOptions.map((currency) => (
          <ChoiceCard
            key={currency}
            active={settings.currency === currency}
            title={currency}
            subtitle={`${currency} ledger`}
            onClick={() => void onSettingsChange({ ...settings, currency })}
          />
        ))}
      </SettingsChoiceGroup>

      <SettingsChoiceGroup title="Start section" icon={<LayoutDashboard size={17} />}>
        {startModules.map((module) => (
          <ChoiceCard
            key={module.key}
            active={settings.startModule === module.key}
            title={module.label}
            subtitle="Open on launch"
            onClick={() => void onSettingsChange({ ...settings, startModule: module.key })}
          />
        ))}
      </SettingsChoiceGroup>
    </section>
  );
}

function DataSettings({
  selectedCollection,
  statusMessage,
  onSelectedCollectionChange,
  onOpenDataFolder,
  onExportBackup,
  onImportBackup,
  onExportBackupFile,
  onImportBackupFile,
  onExportCollection,
  onImportCollection,
  onRecreateDemoData,
  onClearDemoData,
}: {
  selectedCollection: CollectionName;
  statusMessage: string;
  onSelectedCollectionChange: (collection: CollectionName) => void;
  onOpenDataFolder: () => Promise<unknown>;
  onExportBackup: () => Promise<void>;
  onImportBackup: () => Promise<void>;
  onExportBackupFile: () => Promise<void>;
  onImportBackupFile: () => Promise<void>;
  onExportCollection: (collectionName: CollectionName) => Promise<void>;
  onImportCollection: (collectionName: CollectionName) => Promise<void>;
  onRecreateDemoData: () => Promise<void>;
  onClearDemoData: () => Promise<void>;
}) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<DataSettingsTab>('general');
  return (
    <section className="panel settings-page-panel">
      <SettingsPanelHeading icon={<Database size={18} />} title="Data" description="Backups, imports, demo data, and local JSON files." />

      <div className="settings-inner-tabs" role="tablist" aria-label={t('Data')}>
        <button className={activeTab === 'general' ? 'active' : ''} type="button" onClick={() => setActiveTab('general')}>
          <Database size={16} aria-hidden="true" />
          <span>{t('General data')}</span>
        </button>
        <button className={activeTab === 'moduleTransfer' ? 'active' : ''} type="button" onClick={() => setActiveTab('moduleTransfer')}>
          <Upload size={16} aria-hidden="true" />
          <span>{t('Module import and export')}</span>
        </button>
      </div>

      {activeTab === 'general' ? (
        <>
          <div className="settings-action-grid">
            <ActionCard icon={<Download size={18} />} title="Export JSON backup" description="Export every module as a backup folder." onClick={() => void onExportBackup()} />
            <ActionCard icon={<Upload size={18} />} title="Import JSON backup" description="Import a backup folder into local storage." onClick={() => void onImportBackup()} />
            <ActionCard icon={<FileJson size={18} />} title="Export full backup file" description="Export all collections into one JSON file." onClick={() => void onExportBackupFile()} />
            <ActionCard icon={<FileJson size={18} />} title="Import full backup file" description="Import one JSON file with preview." onClick={() => void onImportBackupFile()} />
            <ActionCard icon={<FolderOpen size={18} />} title="Open data folder" description="Open the local JSON storage folder." onClick={() => void onOpenDataFolder()} />
          </div>

          <div className="settings-danger-zone">
            <div>
              <h3>{t('Demo data')}</h3>
              <p>{t('Use these actions when you want to test the app with generated local data.')}</p>
            </div>
            <div className="settings-inline-actions">
              <button className="button ghost" type="button" onClick={() => void onRecreateDemoData()}>
                {t('Reset demo data')}
              </button>
              <DeleteButton
                iconOnly={false}
                label="Clear demo data"
                onConfirm={() => void onClearDemoData()}
                confirmTitle="Clear demo data?"
                confirmMessage="This will clear local demo collections from JSON storage."
              />
            </div>
          </div>
        </>
      ) : null}

      {activeTab === 'moduleTransfer' ? (
        <>
          <SettingsChoiceGroup title="Module" icon={<Database size={17} />}>
            {exportableCollections.map((collection) => (
              <ChoiceCard
                key={collection.name}
                active={selectedCollection === collection.name}
                title={collection.label}
                subtitle={collection.name}
                onClick={() => onSelectedCollectionChange(collection.name)}
              />
            ))}
          </SettingsChoiceGroup>

          <div className="settings-inline-actions">
            <button className="button" type="button" onClick={() => void onExportCollection(selectedCollection)}>
              {t('Export module')}
            </button>
            <button className="button" type="button" onClick={() => void onImportCollection(selectedCollection)}>
              {t('Import module')}
            </button>
          </div>
        </>
      ) : null}

      {statusMessage ? <p className="status-message">{statusMessage}</p> : null}
    </section>
  );
}

function SettingsPanelHeading({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  const { t } = useI18n();
  return (
    <div className="settings-panel-heading">
      <span className="settings-section-icon">{icon}</span>
      <div>
        <h2>{t(title)}</h2>
        <p>{t(description)}</p>
      </div>
    </div>
  );
}

function SettingsChoiceGroup({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  const { t } = useI18n();
  return (
    <section className="settings-choice-group">
      <div className="settings-choice-heading">
        <span>{icon}</span>
        <h3>{t(title)}</h3>
      </div>
      <div className="settings-choice-grid">{children}</div>
    </section>
  );
}

function ChoiceCard({
  active,
  title,
  subtitle,
  swatch,
  onClick,
}: {
  active: boolean;
  title: string;
  subtitle: string;
  swatch?: string;
  onClick: () => void;
}) {
  const { t } = useI18n();
  return (
    <button className={`settings-choice-card${active ? ' active' : ''}`} type="button" onClick={onClick}>
      {swatch ? <span className={`settings-swatch ${swatch}`} aria-hidden="true" /> : null}
      <span>
        <strong>{t(title)}</strong>
        <small>{t(subtitle)}</small>
      </span>
      {active ? <Check size={16} aria-hidden="true" /> : null}
    </button>
  );
}

function ActionCard({ icon, title, description, onClick }: { icon: ReactNode; title: string; description: string; onClick: () => void }) {
  const { t } = useI18n();
  return (
    <button className="settings-action-card" type="button" onClick={onClick}>
      <span className="settings-section-icon">{icon}</span>
      <span>
        <strong>{t(title)}</strong>
        <small>{t(description)}</small>
      </span>
    </button>
  );
}

function InfoTile({ label, value, code = false }: { label: string; value: string; code?: boolean }) {
  const { t } = useI18n();
  return (
    <div className="settings-info-tile">
      <span>{t(label)}</span>
      {code ? <code>{value}</code> : <strong>{value}</strong>}
    </div>
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

const sectionCards: Array<{ id: SettingsSection; label: string; description: string; icon: ReactNode }> = [
  { id: 'overview', label: 'Settings', description: 'Settings overview', icon: <Settings2 size={18} /> },
  { id: 'application', label: 'Application', description: 'Interface, language, start page, currency, and theme.', icon: <Settings2 size={18} /> },
  { id: 'modules', label: 'Modules and groups', description: 'Sidebar visibility, grouping, and module organization.', icon: <Layers3 size={18} /> },
  { id: 'data', label: 'Data', description: 'Backups, module transfer, demo data, and local files.', icon: <Database size={18} /> },
  { id: 'archive', label: 'Archive', description: 'Review archived records and restore or move them to trash.', icon: <Archive size={18} /> },
  { id: 'trash', label: 'Trash', description: 'Review deleted records before permanent removal.', icon: <Trash2 size={18} /> },
  { id: 'records', label: 'Record center', description: 'A compact stream of active records across modules.', icon: <Rows3 size={18} /> },
];

const themeOptions: Array<{ value: AppSettings['themeMode']; label: string; description: string }> = [
  { value: 'system', label: 'System', description: 'Follow OS theme' },
  { value: 'light', label: 'Light', description: 'Light interface' },
  { value: 'dark', label: 'Dark', description: 'Dark interface' },
];

const densityOptions: Array<{ value: AppSettings['uiDensity']; label: string; description: string }> = [
  { value: 'comfortable', label: 'Comfortable', description: 'More breathing room' },
  { value: 'compact', label: 'Compact', description: 'Denser information' },
];

const accentOptions: Array<{ value: AppSettings['accentColor']; label: string; description: string }> = [
  { value: 'teal', label: 'Teal', description: 'Calm green accent' },
  { value: 'blue', label: 'Blue', description: 'Cool blue accent' },
  { value: 'violet', label: 'Violet', description: 'Soft violet accent' },
  { value: 'amber', label: 'Amber', description: 'Warm amber accent' },
];

const currencyOptions = ['USD', 'EUR', 'RUB', 'TJS'];

const exportableCollections: Array<{ name: CollectionName; label: string }> = [
  { name: 'movies', label: 'Movies' },
  { name: 'workouts', label: 'Workouts' },
  { name: 'todos', label: 'Todo' },
  { name: 'finance', label: 'Finance' },
  { name: 'habits', label: 'Habits' },
  { name: 'calendar_events', label: 'Calendar' },
  { name: 'journal_entries', label: 'Diary' },
  { name: 'notes', label: 'Notes' },
  { name: 'templates', label: 'Templates' },
  { name: 'projects', label: 'Projects' },
  { name: 'contacts', label: 'Contacts' },
  { name: 'health', label: 'Health' },
  { name: 'goals', label: 'Goals' },
  { name: 'inventory', label: 'Inventory' },
];

const moduleMap: Record<string, ModuleKey> = {
  movies: 'movies',
  workouts: 'workouts',
  todos: 'todos',
  finance: 'finance',
  habits: 'habits',
  calendarEvents: 'calendar',
  journalEntries: 'journal',
  notes: 'notes',
  templates: 'templates',
  projects: 'projects',
  contacts: 'contacts',
  health: 'health',
  goals: 'goals',
  inventory: 'inventory',
};

const startModules: Array<{ key: ModuleKey; label: string }> = [
  ...appModules.map((module) => ({ key: module.key, label: module.label })),
];
