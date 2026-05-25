import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { AppShell } from './shared/components/AppShell';
import { LoadingState } from './shared/components/LoadingState';
import { Modal } from './shared/components/Modal';
import { UnsavedNoteChangesDialog } from './modules/notes/editor/UnsavedNoteChangesDialog';
import { storageClient } from './shared/storage/storageClient';
import type { ModuleKey } from './shared/types/common';
import { I18nProvider, useI18n } from './shared/i18n/I18nProvider';
import { moduleCollections } from './shared/app/appData';
import { useAppData } from './shared/app/useAppData';
import { useAppReminders, type AppReminder } from './shared/app/useAppReminders';

const DashboardPage = lazy(() => import('./modules/dashboard/DashboardPage').then((module) => ({ default: module.DashboardPage })));
const MoviesPage = lazy(() => import('./modules/movies/MoviesPage').then((module) => ({ default: module.MoviesPage })));
const WorkoutsPage = lazy(() => import('./modules/workouts/WorkoutsPage').then((module) => ({ default: module.WorkoutsPage })));
const TodosPage = lazy(() => import('./modules/todos/TodosPage').then((module) => ({ default: module.TodosPage })));
const FinancePage = lazy(() => import('./modules/finance/FinancePage').then((module) => ({ default: module.FinancePage })));
const HabitsPage = lazy(() => import('./modules/habits/HabitsPage').then((module) => ({ default: module.HabitsPage })));
const CalendarPage = lazy(() => import('./modules/calendar/CalendarPage').then((module) => ({ default: module.CalendarPage })));
const JournalPage = lazy(() => import('./modules/journal/JournalPage').then((module) => ({ default: module.JournalPage })));
const NotesPage = lazy(() => import('./modules/notes/NotesPage').then((module) => ({ default: module.NotesPage })));
const TemplatesPage = lazy(() => import('./modules/templates/TemplatesPage').then((module) => ({ default: module.TemplatesPage })));
const SettingsPage = lazy(() => import('./modules/settings/SettingsPage').then((module) => ({ default: module.SettingsPage })));
const ProjectsPage = lazy(() => import('./modules/projects/ProjectsPage').then((module) => ({ default: module.ProjectsPage })));
const ContactsPage = lazy(() => import('./modules/contacts/ContactsPage').then((module) => ({ default: module.ContactsPage })));
const HealthPage = lazy(() => import('./modules/health/HealthPage').then((module) => ({ default: module.HealthPage })));
const GoalsPage = lazy(() => import('./modules/goals/GoalsPage').then((module) => ({ default: module.GoalsPage })));
const InventoryPage = lazy(() => import('./modules/inventory/InventoryPage').then((module) => ({ default: module.InventoryPage })));

export function App() {
  const [activeModule, setActiveModule] = useState<ModuleKey>('dashboard');
  const [pendingNavigation, setPendingNavigation] = useState<ModuleKey | null>(null);
  const [noteEditorDirty, setNoteEditorDirty] = useState(false);
  const [noteEditorActions, setNoteEditorActions] = useState<NoteEditorNavigationActions | null>(null);
  const {
    data,
    setData,
    dataDirectory,
    settings,
    isLoading,
    loadedCollections,
    loadingCollections,
    statusMessage,
    setStatusMessage,
    saveSettings,
    exportBackup,
    importBackup,
    exportBackupFile,
    importBackupFile,
    exportCollection,
    importCollection,
    recreateDemoData,
    clearDemoData,
  } = useAppData(activeModule, setActiveModule);
  const { activeReminder, reminderBadges, dismissReminder, snoozeReminder } = useAppReminders(data, setData);

  const requestNavigate = useCallback(
    (module: ModuleKey) => {
      if (module === activeModule) {
        return;
      }

      if (activeModule === 'notes' && noteEditorDirty && noteEditorActions) {
        setPendingNavigation(module);
        return;
      }

      setActiveModule(module);
    },
    [activeModule, noteEditorActions, noteEditorDirty],
  );

  async function saveNoteAndNavigate() {
    const target = pendingNavigation;
    const actions = noteEditorActions;
    if (!target || !actions) {
      setPendingNavigation(null);
      return;
    }

    await actions.save();
    setPendingNavigation(null);
    setNoteEditorDirty(false);
    setNoteEditorActions(null);
    setActiveModule(target);
  }

  function discardNoteAndNavigate() {
    const target = pendingNavigation;
    if (!target) {
      setPendingNavigation(null);
      return;
    }

    noteEditorActions?.discard();
    setPendingNavigation(null);
    setNoteEditorDirty(false);
    setNoteEditorActions(null);
    setActiveModule(target);
  }

  useEffect(() => {
    document.documentElement.dataset.theme = settings.themeMode;
  }, [settings.themeMode]);

  useEffect(() => {
    document.documentElement.dataset.density = settings.uiDensity;
    document.documentElement.dataset.accent = settings.accentColor;
  }, [settings.uiDensity, settings.accentColor]);

  useEffect(() => {
    document.documentElement.lang = settings.language;
  }, [settings.language]);

  useEffect(() => {
    function handleFormShortcuts(event: KeyboardEvent) {
      const form = document.querySelector<HTMLFormElement>('.entity-form');
      if (!form) {
        return;
      }
      if (event.key === 'Escape') {
        const closeButton = document.querySelector<HTMLButtonElement>('.app-modal-panel .form-heading .icon-button');
        closeButton?.click();
      }
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        form.requestSubmit();
      }
    }

    window.addEventListener('keydown', handleFormShortcuts);
    return () => window.removeEventListener('keydown', handleFormShortcuts);
  }, []);

  const page = useMemo(() => {
    if (isLoading) {
      return <LoadingState title="Loading workspace" message="Reading local JSON data and preparing modules..." variant="page" />;
    }
    const requiredCollections = moduleCollections[activeModule] ?? [];
    const isModuleDataReady = requiredCollections.every((collectionName) => loadedCollections.has(collectionName));
    if (!isModuleDataReady) {
      const activeLoads = requiredCollections.filter((collectionName) => loadingCollections.has(collectionName)).length;
      return (
        <LoadingState
          title="Loading module"
          message="Pulling the needed local collections into memory..."
          detail={activeLoads ? `${activeLoads} collection${activeLoads === 1 ? '' : 's'} in progress` : undefined}
          variant="page"
        />
      );
    }

    switch (activeModule) {
      case 'movies':
        return <MoviesPage movies={data.movies} onChange={(movies) => setData((current) => ({ ...current, movies }))} />;
      case 'workouts':
        return <WorkoutsPage data={data.workouts} onChange={(workouts) => setData((current) => ({ ...current, workouts }))} />;
      case 'todos':
        return <TodosPage data={data.todos} onChange={(todos) => setData((current) => ({ ...current, todos }))} />;
      case 'finance':
        return <FinancePage data={data.finance} currency={settings.currency} onChange={(finance) => setData((current) => ({ ...current, finance }))} />;
      case 'habits':
        return <HabitsPage data={data.habits} onChange={(habits) => setData((current) => ({ ...current, habits }))} />;
      case 'calendar':
        return (
          <CalendarPage
            events={data.calendarEvents}
            onChange={(calendarEvents) => setData((current) => ({ ...current, calendarEvents }))}
          />
        );
      case 'journal':
        return (
          <JournalPage
            data={data.journalEntries}
            onChange={(journalEntries) => setData((current) => ({ ...current, journalEntries }))}
          />
        );
      case 'notes':
        return (
          <NotesPage
            data={data.notes}
            onChange={(notes) => setData((current) => ({ ...current, notes }))}
            onEditorDirtyChange={setNoteEditorDirty}
            onEditorActionsChange={setNoteEditorActions}
          />
        );
      case 'templates':
        return (
          <TemplatesPage
            data={data.templates}
            onChange={(templates) => setData((current) => ({ ...current, templates }))}
          />
        );
      case 'projects':
        return <ProjectsPage projects={data.projects} onChange={(projects) => setData((current) => ({ ...current, projects }))} />;
      case 'contacts':
        return (
          <ContactsPage
            data={data.contacts}
            onChange={(contacts) => setData((current) => ({ ...current, contacts }))}
          />
        );
      case 'health':
        return <HealthPage data={data.health} onChange={(health) => setData((current) => ({ ...current, health }))} />;
      case 'goals':
        return <GoalsPage goals={data.goals} onChange={(goals) => setData((current) => ({ ...current, goals }))} />;
      case 'inventory':
        return (
          <InventoryPage
            items={data.inventory}
            currency={settings.currency}
            onChange={(inventory) => setData((current) => ({ ...current, inventory }))}
          />
        );
      case 'settings':
        return (
          <SettingsPage
            data={data}
            dataDirectory={dataDirectory}
            settings={settings}
            statusMessage={statusMessage}
            onNavigate={requestNavigate}
            onOpenDataFolder={() => storageClient.openDataDirectory()}
            onExportBackup={exportBackup}
            onImportBackup={importBackup}
            onExportBackupFile={exportBackupFile}
            onImportBackupFile={importBackupFile}
            onExportCollection={exportCollection}
            onImportCollection={importCollection}
            onRecreateDemoData={recreateDemoData}
            onClearDemoData={clearDemoData}
            onDataChange={setData}
            onStatusMessage={setStatusMessage}
            onSettingsChange={saveSettings}
          />
        );
      case 'dashboard':
      default:
        return (
          <DashboardPage
            data={data}
            currency={settings.currency}
            onNavigate={requestNavigate}
            settings={settings}
            onSettingsChange={saveSettings}
          />
        );
    }
  }, [activeModule, data, dataDirectory, isLoading, loadedCollections, loadingCollections, requestNavigate, settings, statusMessage]);

  return (
    <I18nProvider language={settings.language}>
      <AppShell
        active={activeModule}
        onNavigate={requestNavigate}
        sidebarSettings={settings.sidebar}
        onSidebarSettingsChange={(sidebar) => void saveSettings({ ...settings, sidebar })}
        reminderBadges={reminderBadges}
      >
        <Suspense fallback={<LoadingState title="Opening module" message="Loading interface and tools..." variant="page" />}>{page}</Suspense>
        {pendingNavigation ? (
          <UnsavedNoteChangesDialog
            onCancel={() => setPendingNavigation(null)}
            onDiscard={discardNoteAndNavigate}
            onSave={() => void saveNoteAndNavigate()}
          />
        ) : null}
        {activeReminder ? <ReminderModal reminder={activeReminder} onDismiss={() => dismissReminder(activeReminder)} onSnooze={() => snoozeReminder(activeReminder)} /> : null}
      </AppShell>
    </I18nProvider>
  );
}

interface NoteEditorNavigationActions {
  save: () => Promise<void>;
  discard: () => void;
}

function ReminderModal({ reminder, onDismiss, onSnooze }: { reminder: AppReminder; onDismiss: () => void; onSnooze: () => void }) {
  const { t } = useI18n();

  useEffect(() => {
    const audio = new Audio('/audio/reminder.mp3');
    audio.volume = 0.72;
    void audio.play().catch(() => {
      // Some environments block autoplay until the first user interaction.
    });
    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, [reminder.id]);

  return (
    <Modal
      size="sm"
      panelClassName="confirm-dialog reminder-dialog"
      showClose={false}
      onClose={onDismiss}
      footer={
        <>
          <button className="button ghost" type="button" onClick={onSnooze}>
            {t('Snooze 15 min')}
          </button>
          <button className="button primary" type="button" onClick={onDismiss}>
            {t('OK')}
          </button>
        </>
      }
    >
        <span className="reminder-kicker">{t('Reminder')}</span>
        <h2 id="app-reminder-title">{reminder.title}</h2>
        <p>{reminder.body}</p>
    </Modal>
  );
}
