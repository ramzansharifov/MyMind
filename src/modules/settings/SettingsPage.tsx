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
import { ModulePageShell } from '../../shared/components/ModulePageShell';
import { Tooltip } from '../../shared/components/Tooltip';
import { appModules, getModuleDisplayLabel, moduleGroupIcons } from '../../shared/app/moduleRegistry';
import { ArchiveTrashPage } from './ArchiveTrashManager';
import { useI18n } from '../../shared/i18n';
import type { CollectionName } from '../../shared/storage/storageTypes';
import type { AppData } from '../../shared/app/appData';
import type { AppSettings, ModuleGroupIconKey, ModuleKey, SidebarSettings } from '../../shared/types/common';
import { buildRecordCenterRows } from '../../shared/utils/appDataUtils';
import { cn } from '../../shared/utils/classNames';
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

type SettingsSection = 'overview' | 'application' | 'modules' | 'data' | 'archive' | 'trash' | 'records' | 'study_hotkeys';
type ModulesSettingsTab = 'visibility' | 'groups';
type DataSettingsTab = 'general' | 'moduleTransfer';

const pageClass = 'grid gap-5';
const breadcrumbClass = 'flex flex-wrap items-center gap-2 text-sm text-app-muted';
const breadcrumbButtonClass = 'w-auto rounded-control border border-app-border bg-app-surface-soft px-3 py-2 text-sm font-bold text-app-text transition hover:border-[var(--accent-border)] hover:text-app-accent-strong';
const homeGridClass = 'grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4';
const sectionCardClass =
  'grid min-h-[138px] grid-cols-[44px_1fr_auto] items-start gap-3 rounded-panel border border-app-border bg-[var(--panel-bg)] p-4 text-left text-app-text shadow-panel transition hover:-translate-y-0.5 hover:border-[var(--accent-border)] hover:bg-[var(--panel-bg-strong)]';
const iconBadgeClass =
  'grid h-11 w-11 place-items-center rounded-control border border-[var(--accent-border)] bg-[color-mix(in_srgb,var(--accent)_14%,var(--surface-strong))] text-app-accent-strong';
const panelClass = 'grid gap-4 rounded-panel border border-app-border bg-[var(--panel-bg)] p-4 text-app-text shadow-panel [backdrop-filter:var(--glass-blur)]';
const tabListClass = 'flex flex-wrap gap-2 rounded-panel border border-app-border bg-app-surface-soft p-1.5';
const tabButtonClass =
  'inline-flex min-h-control w-auto items-center justify-center gap-2 rounded-control border border-transparent px-3.5 py-2 text-sm font-bold text-app-muted transition hover:text-app-text';
const tabButtonActiveClass = 'border-[var(--accent-border)] bg-[var(--selected-bg)] text-app-accent-strong';
const choiceGroupClass = 'grid gap-3 rounded-panel border border-app-border bg-app-surface-soft p-4';
const choiceHeadingClass = 'flex items-center gap-2 text-app-text';
const choiceGridClass = 'grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3';
const moduleGridClass = 'grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3';
const moduleToggleCardClass =
  'grid min-h-[104px] grid-cols-[24px_38px_1fr] items-start gap-3 rounded-panel border border-app-border bg-app-surface p-3 text-left text-app-text transition hover:border-[var(--accent-border)] hover:bg-app-surface-strong disabled:cursor-not-allowed disabled:opacity-70';
const activeCardClass = 'border-[var(--accent-border)] bg-[var(--selected-bg)]';
const inactiveCardClass = 'opacity-70';
const stateDotClass = 'grid h-6 w-6 place-items-center rounded-full border border-app-border bg-app-surface-soft text-app-accent-strong';
const groupCreateClass = 'grid grid-cols-[1fr_auto] gap-2 max-[640px]:grid-cols-1';
const primaryButtonClass =
  'inline-flex min-h-control items-center justify-center gap-2 rounded-control border border-[color-mix(in_srgb,var(--accent)_72%,var(--border))] bg-[var(--button-bg-primary)] px-3.5 py-2.5 text-sm font-bold text-app-accent-strong transition hover:border-[color-mix(in_srgb,var(--accent)_86%,var(--border))] hover:bg-[var(--button-bg-primary-hover)]';
const defaultButtonClass =
  'inline-flex min-h-control items-center justify-center gap-2 rounded-control border border-[var(--control-border)] bg-[var(--button-bg)] px-3.5 py-2.5 text-sm font-bold text-app-text transition hover:border-[color-mix(in_srgb,var(--accent)_44%,var(--border))] hover:bg-[var(--control-bg-hover)]';
const ghostButtonClass =
  'inline-flex min-h-control items-center justify-center gap-2 rounded-control border border-[color-mix(in_srgb,var(--accent)_36%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_10%,var(--surface-strong))] px-3.5 py-2.5 text-sm font-bold text-[color-mix(in_srgb,var(--accent-strong)_86%,var(--text))] transition hover:border-[color-mix(in_srgb,var(--accent-strong)_82%,var(--border))] hover:bg-[var(--control-bg-hover)]';
const groupListClass = 'grid gap-3';
const groupCardClass = 'grid gap-4 rounded-panel border border-app-border bg-app-surface p-4 shadow-panel [backdrop-filter:var(--glass-blur)]';
const groupHeadClass = 'grid grid-cols-[1fr_auto_auto] items-end gap-3 max-[860px]:grid-cols-1';
const visibilityButtonClass =
  'inline-flex min-h-control items-center justify-center gap-2 rounded-control border border-app-border bg-app-surface-soft px-3.5 py-2.5 text-sm font-bold text-app-muted transition hover:border-[var(--accent-border)]';
const iconPickerClass = 'flex flex-wrap gap-2';
const iconChoiceClass =
  'grid h-icon min-h-icon w-icon place-items-center rounded-control border border-app-border bg-app-surface-soft text-app-muted transition hover:border-[var(--accent-border)] hover:text-app-accent-strong';
const modulePickerClass = 'flex flex-wrap gap-2';
const moduleChipClass =
  'inline-flex min-h-9 items-center gap-2 rounded-full border border-app-border bg-app-chip px-3 py-1.5 text-sm font-bold text-app-chip-text transition hover:border-[var(--accent-border)]';
const infoGridClass = 'grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-3';
const actionGridClass = 'grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3';
const dangerZoneClass = 'flex items-center justify-between gap-4 rounded-panel border border-[color-mix(in_srgb,var(--danger)_38%,var(--border))] bg-[color-mix(in_srgb,var(--danger)_8%,var(--surface-soft))] p-4 max-[760px]:items-start max-[760px]:flex-col';
const inlineActionsClass = 'flex flex-wrap items-center gap-2';
const panelHeadingClass = 'flex items-start gap-3 border-b border-[var(--line-soft)] pb-3';
const choiceCardClass =
  'grid min-h-[92px] grid-cols-[auto_1fr_auto] items-center gap-3 rounded-panel border border-app-border bg-app-surface p-3 text-left text-app-text transition hover:border-[var(--accent-border)] hover:bg-app-surface-strong';
const actionCardClass =
  'grid min-h-[110px] grid-cols-[44px_1fr] items-start gap-3 rounded-panel border border-app-border bg-app-surface p-4 text-left text-app-text transition hover:border-[var(--accent-border)] hover:bg-app-surface-strong';
const infoTileClass = 'grid gap-1 rounded-panel border border-app-border bg-app-surface-soft p-3';
const hotkeysGridClass = 'grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-3';
const recordListClass = 'grid gap-2';
const recordRowClass = 'grid grid-cols-[auto_1fr_1.5fr_auto] items-center gap-3 rounded-panel border border-app-border bg-app-surface p-3 text-left text-app-text transition hover:border-[var(--accent-border)] max-[860px]:grid-cols-1';
const chipClass = 'inline-flex w-fit items-center rounded-full border border-app-border bg-app-chip px-2.5 py-1 text-xs font-bold text-app-chip-text';
const swatchClass: Record<string, string> = {
  teal: 'bg-[#2f8c7f]',
  blue: 'bg-[#3f7fbf]',
  violet: 'bg-[#7b6dc8]',
  amber: 'bg-[#b6843b]',
};

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
    <ModulePageShell
      title="Settings"
      subtitle="Local storage, backups, and future migration controls."
      filters={
        <nav className={breadcrumbClass} aria-label={t('Settings path')}>
          <button className={breadcrumbButtonClass} type="button" onClick={() => setActiveSection('overview')}>
            {t('Settings')}
          </button>
          {activeSection !== 'overview' ? (
            <>
              <ChevronRight size={15} aria-hidden="true" />
              <span>{t(activeLabel)}</span>
            </>
          ) : null}
        </nav>
      }
    >
      <div className={pageClass}>
        {activeSection === 'overview' ? (
        <div className={homeGridClass}>
          {sectionCards.filter((section) => section.id !== 'overview').map((section) => (
            <button className={sectionCardClass} type="button" key={section.id} onClick={() => setActiveSection(section.id)}>
              <span className={iconBadgeClass}>{section.icon}</span>
              <span>
                <strong className="block text-base text-app-text">{t(section.label)}</strong>
                <small className="mt-1 block text-sm text-app-muted">{t(section.description)}</small>
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
        <section className={panelClass}>
          <ArchiveTrashPage data={data} mode="archive" onChange={onDataChange} onStatusMessage={onStatusMessage} />
        </section>
      ) : null}

      {activeSection === 'trash' ? (
        <section className={panelClass}>
          <ArchiveTrashPage data={data} mode="trash" onChange={onDataChange} onStatusMessage={onStatusMessage} />
        </section>
      ) : null}

      {activeSection === 'records' ? (
        <section className={panelClass}>
          <SettingsPanelHeading icon={<Rows3 size={18} />} title="Record center" description="A compact stream of recent active records across modules." />
          <RecordCenter data={data} onNavigate={onNavigate} />
        </section>
      ) : null}

        {activeSection === 'study_hotkeys' ? (
          <section className={panelClass}>
            <SettingsPanelHeading icon={<Monitor size={18} />} title="Study hotkeys" description="Keyboard shortcuts for the Study module editor and navigation." />
            <StudyHotkeys />
          </section>
        ) : null}
      </div>
    </ModulePageShell>
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
    <section className={panelClass}>
      <SettingsPanelHeading icon={<Layers3 size={18} />} title="Modules and groups" description="Choose which modules appear in the sidebar and organize them into collapsible groups." />

      <div className={tabListClass} role="tablist" aria-label={t('Modules and groups')}>
        <button className={cn(tabButtonClass, activeTab === 'visibility' && tabButtonActiveClass)} type="button" onClick={() => setActiveTab('visibility')}>
          <Layers3 size={16} aria-hidden="true" />
          <span>{t('Visible modules')}</span>
        </button>
        <button className={cn(tabButtonClass, activeTab === 'groups' && tabButtonActiveClass)} type="button" onClick={() => setActiveTab('groups')}>
          <FolderOpen size={16} aria-hidden="true" />
          <span>{t('Module groups')}</span>
        </button>
      </div>

      {activeTab === 'visibility' ? (
        <section className={choiceGroupClass}>
          <div className={choiceHeadingClass}>
            <span className={iconBadgeClass}><Layers3 size={17} aria-hidden="true" /></span>
            <h3>{t('Visible modules')}</h3>
          </div>
          <div className={moduleGridClass}>
            {appModules.map((module) => {
              const Icon = module.icon;
              const label = getModuleDisplayLabel(module, t);
              const isVisible = !hiddenModules.has(module.key) || !module.canHide;
              return (
                <button
                  className={cn(moduleToggleCardClass, isVisible ? activeCardClass : inactiveCardClass, !module.canHide && 'opacity-80')}
                  type="button"
                  key={module.key}
                  disabled={!module.canHide}
                  onClick={() => setModuleVisible(module.key, !isVisible)}
                >
                  <span className={stateDotClass} aria-hidden="true">
                    {isVisible ? <Check size={15} /> : null}
                  </span>
                  <span className={iconBadgeClass}>
                    <Icon size={17} aria-hidden="true" />
                  </span>
                  <span>
                    <strong className="block text-sm text-app-text">{label}</strong>
                    <small className="mt-1 block text-xs text-app-muted">{module.canHide ? t(isVisible ? 'Shown in sidebar' : 'Hidden from sidebar') : t('Always visible')}</small>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {activeTab === 'groups' ? (
        <section className={choiceGroupClass}>
          <div className={choiceHeadingClass}>
            <span className={iconBadgeClass}><Layers3 size={17} aria-hidden="true" /></span>
            <h3>{t('Module groups')}</h3>
          </div>
          <div className={groupCreateClass}>
            <input value={newGroupName} placeholder={t('Group name')} onChange={(event) => setNewGroupName(event.target.value)} />
            <button className={primaryButtonClass} type="button" onClick={createGroup}>
              <Plus size={17} aria-hidden="true" />
              <span>{t('Create group')}</span>
            </button>
          </div>
          {sidebar.groups.length === 0 ? (
            <p className="text-sm text-app-muted">{t('No module groups yet.')}</p>
          ) : (
            <div className={groupListClass}>
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
    <article className={groupCardClass}>
      <div className={groupHeadClass}>
        <label>
          {t('Group name')}
          <input value={group.title} onChange={(event) => onUpdate((current) => ({ ...current, title: event.target.value }))} />
        </label>
        <button
          className={cn(visibilityButtonClass, group.isVisible && activeCardClass)}
          type="button"
          onClick={() => onUpdate((current) => ({ ...current, isVisible: !current.isVisible }))}
        >
          <span className={stateDotClass} aria-hidden="true">
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

      <div className="grid gap-2">
        <span className="text-xs font-extrabold uppercase tracking-[0.12em] text-app-muted">{t('Group icon')}</span>
        <div className={iconPickerClass}>
          {moduleGroupIcons.map((option) => {
            const Icon = option.icon;
            const isActive = (group.icon ?? 'folder') === option.key;
            return (
              <Tooltip content={t(option.label)} position="top" key={option.key}>
                <button
                  className={cn(iconChoiceClass, isActive && activeCardClass)}
                  type="button"
                  aria-label={t(option.label)}
                  onClick={() => onUpdate((current) => ({ ...current, icon: option.key as ModuleGroupIconKey }))}
                >
                  <Icon size={18} aria-hidden="true" />
                </button>
              </Tooltip>
            );
          })}
        </div>
      </div>

      <div className="grid gap-2">
        <span className="text-xs font-extrabold uppercase tracking-[0.12em] text-app-muted">{t('Modules in group')}</span>
        <div className={modulePickerClass}>
          {availableModules.length > 0 ? (
            availableModules.map((module) => {
              const Icon = module.icon;
              const label = getModuleDisplayLabel(module, t);
              const isIncluded = group.moduleKeys.includes(module.key);
              return (
                <button
                  className={cn(moduleChipClass, isIncluded ? activeCardClass : inactiveCardClass)}
                  type="button"
                  key={module.key}
                  onClick={() => onSetModule(module.key, !isIncluded)}
                >
                  <span className={stateDotClass} aria-hidden="true">
                    {isIncluded ? <Check size={14} /> : null}
                  </span>
                  <Icon size={16} aria-hidden="true" />
                  <span>{label}</span>
                </button>
              );
            })
          ) : (
            <p className="text-sm text-app-muted">{t('No modules available for this group.')}</p>
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
    <section className={panelClass}>
      <SettingsPanelHeading icon={<Settings2 size={18} />} title="Application" description="Interface, language, start section, and visual preferences." />

      <div className={infoGridClass}>
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
            title={getModuleDisplayLabel(module, t)}
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
    <section className={panelClass}>
      <SettingsPanelHeading icon={<Database size={18} />} title="Data" description="Backups, imports, demo data, and the local SQLite database." />

      <div className={tabListClass} role="tablist" aria-label={t('Data')}>
        <button className={cn(tabButtonClass, activeTab === 'general' && tabButtonActiveClass)} type="button" onClick={() => setActiveTab('general')}>
          <Database size={16} aria-hidden="true" />
          <span>{t('General data')}</span>
        </button>
        <button className={cn(tabButtonClass, activeTab === 'moduleTransfer' && tabButtonActiveClass)} type="button" onClick={() => setActiveTab('moduleTransfer')}>
          <Upload size={16} aria-hidden="true" />
          <span>{t('Module import and export')}</span>
        </button>
      </div>

      {activeTab === 'general' ? (
        <>
          <div className={actionGridClass}>
            <ActionCard icon={<Download size={18} />} title="Export SQLite backup" description="Export the SQLite database and assets as a backup folder." onClick={() => void onExportBackup()} />
            <ActionCard icon={<Upload size={18} />} title="Import SQLite backup" description="Import a SQLite backup folder into local storage." onClick={() => void onImportBackup()} />
            <ActionCard icon={<FileJson size={18} />} title="Export database file" description="Export the full SQLite database file." onClick={() => void onExportBackupFile()} />
            <ActionCard icon={<FileJson size={18} />} title="Import database file" description="Import one SQLite database file with confirmation." onClick={() => void onImportBackupFile()} />
            <ActionCard icon={<FolderOpen size={18} />} title="Open data folder" description="Open the local SQLite storage folder." onClick={() => void onOpenDataFolder()} />
          </div>

          <div className={dangerZoneClass}>
            <div>
              <h3>{t('Demo data')}</h3>
              <p className="mt-1 text-sm text-app-muted">{t('Use these actions when you want to test the app with generated local data.')}</p>
            </div>
            <div className={inlineActionsClass}>
              <button className={ghostButtonClass} type="button" onClick={() => void onRecreateDemoData()}>
                {t('Reset demo data')}
              </button>
              <DeleteButton
                iconOnly={false}
                label="Clear demo data"
                onConfirm={() => void onClearDemoData()}
                confirmTitle="Clear demo data?"
                confirmMessage="This will clear local demo collections from SQLite storage."
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

          <div className={inlineActionsClass}>
            <button className={defaultButtonClass} type="button" onClick={() => void onExportCollection(selectedCollection)}>
              {t('Export module')}
            </button>
            <button className={defaultButtonClass} type="button" onClick={() => void onImportCollection(selectedCollection)}>
              {t('Import module')}
            </button>
          </div>
        </>
      ) : null}

      {statusMessage ? <p className="rounded-control border border-[var(--accent-border)] bg-[var(--accent-soft)] p-3 text-sm font-bold text-app-accent-strong">{statusMessage}</p> : null}
    </section>
  );
}

function SettingsPanelHeading({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  const { t } = useI18n();
  return (
    <div className={panelHeadingClass}>
      <span className={iconBadgeClass}>{icon}</span>
      <div>
        <h2>{t(title)}</h2>
        <p className="mt-1 text-sm text-app-muted">{t(description)}</p>
      </div>
    </div>
  );
}

function SettingsChoiceGroup({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  const { t } = useI18n();
  return (
    <section className={choiceGroupClass}>
      <div className={choiceHeadingClass}>
        <span className={iconBadgeClass}>{icon}</span>
        <h3>{t(title)}</h3>
      </div>
      <div className={choiceGridClass}>{children}</div>
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
    <button className={cn(choiceCardClass, active && activeCardClass)} type="button" onClick={onClick}>
      {swatch ? <span className={cn('h-6 w-6 rounded-full border border-app-border', swatchClass[swatch])} aria-hidden="true" /> : null}
      <span>
        <strong className="block text-sm text-app-text">{t(title)}</strong>
        <small className="mt-1 block text-xs text-app-muted">{t(subtitle)}</small>
      </span>
      {active ? <Check size={16} aria-hidden="true" /> : null}
    </button>
  );
}

function ActionCard({ icon, title, description, onClick }: { icon: ReactNode; title: string; description: string; onClick: () => void }) {
  const { t } = useI18n();
  return (
    <button className={actionCardClass} type="button" onClick={onClick}>
      <span className={iconBadgeClass}>{icon}</span>
      <span>
        <strong className="block text-sm text-app-text">{t(title)}</strong>
        <small className="mt-1 block text-xs text-app-muted">{t(description)}</small>
      </span>
    </button>
  );
}

function InfoTile({ label, value, code = false }: { label: string; value: string; code?: boolean }) {
  const { t } = useI18n();
  return (
    <div className={infoTileClass}>
      <span className="text-xs font-extrabold uppercase tracking-[0.12em] text-app-muted">{t(label)}</span>
      {code ? <code className="break-all text-sm text-[var(--code)]">{value}</code> : <strong className="text-app-text">{value}</strong>}
    </div>
  );
}

function StudyHotkeys() {
  const { t } = useI18n();
  const groups = [
    {
      title: 'Navigation',
      keys: [
        { key: 'Ctrl + Shift + K', description: 'Open command palette' },
        { key: 'Ctrl + Shift + S', description: 'Toggle sidebar' },
      ],
    },
    {
      title: 'Editor nesting',
      keys: [
        { key: 'Tab', description: 'Nest block (inside block card)' },
        { key: 'Shift + Tab', description: 'Unnest block (inside block card)' },
      ],
    },
    {
      title: 'Editor manipulation',
      keys: [
        { key: 'Ctrl + Arrow Up', description: 'Move block up' },
        { key: 'Ctrl + Arrow Down', description: 'Move block down' },
        { key: 'Ctrl + D', description: 'Duplicate block' },
        { key: 'Backspace', description: 'Delete selected block' },
      ],
    },
    {
      title: 'Rich text editing',
      keys: [
        { key: 'Ctrl + B', description: 'Bold text' },
        { key: 'Ctrl + I', description: 'Italic text' },
        { key: 'Ctrl + U', description: 'Underline text' },
        { key: 'Ctrl + Shift + X', description: 'Strikethrough' },
        { key: 'Ctrl + Shift + 7', description: 'Ordered list' },
        { key: 'Ctrl + Shift + 8', description: 'Unordered list' },
      ],
    },
    {
      title: 'History',
      keys: [
        { key: 'Ctrl + Z', description: 'Undo' },
        { key: 'Ctrl + Y / Ctrl + Shift + Z', description: 'Redo' },
      ],
    },
  ];

  return (
    <div className={hotkeysGridClass}>
      {groups.map((group) => (
        <section key={group.title} className={choiceGroupClass}>
          <div className={choiceHeadingClass}>
             <h3>{t(group.title)}</h3>
          </div>
          <div className={infoGridClass}>
            {group.keys.map((item) => (
              <div key={item.key} className={infoTileClass}>
                <span className="text-sm text-app-muted">{t(item.description)}</span>
                <code className="text-sm text-[var(--code)]">{item.key}</code>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function RecordCenter({ data, onNavigate }: { data: AppData; onNavigate: (module: ModuleKey) => void }) {
  const { t } = useI18n();
  const rows = buildRecordCenterRows(data).slice(0, 18);
  if (rows.length === 0) {
    return <p className="text-sm text-app-muted">{t('No active records yet.')}</p>;
  }
  return (
    <div className={recordListClass}>
      {rows.map((row) => (
        <button className={recordRowClass} type="button" key={`${row.collectionKey}-${row.id}`} onClick={() => onNavigate(moduleMap[row.collectionKey])}>
          <span className={chipClass}>{t(row.module)}</span>
          <strong className="text-app-text">{row.title}</strong>
          <span className="text-sm text-app-muted">{row.detail || t('No description.')}</span>
          <small className="text-xs text-app-muted">
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
  { id: 'study_hotkeys', label: 'Study hotkeys', description: 'Keyboard shortcuts for the learning workspace.', icon: <Monitor size={18} /> },
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

const startModules = appModules;
