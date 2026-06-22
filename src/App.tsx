import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { AppShell } from './shared/components/AppShell';
import { CancelButton, SaveButton } from './shared/components/ActionButtons';
import { LoadingState } from './shared/components/LoadingState';
import { Modal } from './shared/components/Modal';
import { storageClient } from './shared/storage/storageClient';
import type { ModuleKey } from './shared/types/common';
import { I18nProvider, useI18n } from './shared/i18n/I18nProvider';
import { moduleCollections } from './shared/app/appData';
import { useAppData } from './shared/app/useAppData';
import { useAppReminders, type AppReminder } from './shared/app/useAppReminders';
import { normalizeBoardsData } from './modules/boards/boardsUtils';

const DashboardPage = lazy(() => import('./modules/dashboard/DashboardPage').then((module) => ({ default: module.DashboardPage })));
const MoviesPage = lazy(() => import('./modules/movies/MoviesPage').then((module) => ({ default: module.MoviesPage })));
const WorkoutsPage = lazy(() => import('./modules/workouts/WorkoutsPage').then((module) => ({ default: module.WorkoutsPage })));
const NutritionPage = lazy(() => import('./modules/nutrition/NutritionPage').then((module) => ({ default: module.NutritionPage })));
const TodosPage = lazy(() => import('./modules/todos/TodosPage').then((module) => ({ default: module.TodosPage })));
const FinancePage = lazy(() => import('./modules/finance/FinancePage').then((module) => ({ default: module.FinancePage })));
const HabitsPage = lazy(() => import('./modules/habits/HabitsPage').then((module) => ({ default: module.HabitsPage })));
const CalendarPage = lazy(() => import('./modules/calendar/CalendarPage').then((module) => ({ default: module.CalendarPage })));
const JournalPage = lazy(() => import('./modules/journal/JournalPage').then((module) => ({ default: module.JournalPage })));
const NotesPage = lazy(() => import('./modules/notes/NotesPage').then((module) => ({ default: module.NotesPage })));
const TemplatesPage = lazy(() => import('./modules/templates/TemplatesPage').then((module) => ({ default: module.TemplatesPage })));
const StudyPage = lazy(() => import('./modules/study/StudyPage').then((module) => ({ default: module.StudyPage })));
const BoardsPage = lazy(() => import('./modules/boards/BoardsPage').then((module) => ({ default: module.BoardsPage })));
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
      const form = document.querySelector<HTMLFormElement>('form[data-entity-form="true"]');
      if (!form) {
        return;
      }
      if (event.key === 'Escape') {
        const closeButton = document.querySelector<HTMLButtonElement>('button[data-modal-close="true"]');
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
      return <LoadingState title="Loading workspace" message="Reading local SQLite data and preparing modules..." variant="page" />;
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
        return (
          <WorkoutsPage
            data={data.workouts}
            onChange={(workouts) => setData((current) => ({ ...current, workouts }))}
          />
        );
      case 'nutrition':
        return (
          <NutritionPage
            data={data.workouts}
            onChange={(workouts) => setData((current) => ({ ...current, workouts }))}
          />
        );
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
      case 'study':
        return (
          <StudyPage
            data={data.study}
            boards={data.boards}
            onChange={(study) => setData((current) => ({ ...current, study }))}
            onBoardsChange={(boards) => setData((current) => ({ ...current, boards }))}
            onOpenBoards={(boardId) => {
              setData((current) => ({
                ...current,
                boards: normalizeBoardsData({ ...current.boards, activeBoardId: boardId }),
              }));
              requestNavigate('boards');
            }}
          />
        );
      case 'boards':
        return <BoardsPage data={data.boards} onChange={(boards) => setData((current) => ({ ...current, boards }))} />;
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
  save: () => void;
  discard: () => void;
}

function UnsavedNoteChangesDialog({ onCancel, onDiscard, onSave }: { onCancel: () => void; onDiscard: () => void; onSave: () => void }) {
  return (
    <Modal
      title="Unsaved note changes"
      subtitle="Save or discard the current note before leaving Notes."
      size="sm"
      onClose={onCancel}
      footer={
        <>
          <CancelButton onClick={onCancel}>Cancel</CancelButton>
          <button
            className="inline-flex min-h-control items-center justify-center gap-2 whitespace-nowrap rounded-control border border-[color-mix(in_srgb,var(--danger)_72%,var(--border))] bg-[var(--button-bg-danger)] px-3.5 py-2.5 text-app-danger transition-[border-color,box-shadow,transform,background,color] duration-150 hover:-translate-y-px hover:border-[color-mix(in_srgb,var(--danger)_88%,var(--border))] hover:bg-[var(--button-bg-danger-hover)] hover:text-[color-mix(in_srgb,var(--danger)_92%,white)] hover:shadow-[0_8px_22px_var(--shadow)]"
            type="button"
            onClick={onDiscard}
          >
            Discard
          </button>
          <SaveButton label="Save" type="button" onClick={onSave} />
        </>
      }
    >
      <p className="text-app-muted">The note editor has unsaved changes.</p>
    </Modal>
  );
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
          <button
            className="inline-flex min-h-control items-center justify-center gap-2 whitespace-nowrap rounded-control border border-[color-mix(in_srgb,var(--accent)_36%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_10%,var(--surface-strong))] px-3.5 py-2.5 text-[color-mix(in_srgb,var(--accent-strong)_86%,var(--text))] transition-[border-color,box-shadow,transform,background,color] duration-150 hover:-translate-y-px hover:border-[color-mix(in_srgb,var(--accent-strong)_82%,var(--border))] hover:bg-[var(--control-bg-hover)] hover:text-[color-mix(in_srgb,var(--accent-strong)_92%,white)] hover:shadow-[0_8px_22px_var(--shadow)]"
            type="button"
            onClick={onSnooze}
          >
            {t('Snooze 15 min')}
          </button>
          <SaveButton label="OK" type="button" onClick={onDismiss} />
        </>
      }
    >
      <span className="inline-flex text-xs font-extrabold uppercase tracking-[0.08em] text-app-danger">{t('Reminder')}</span>
      <h2 id="app-reminder-title">{reminder.title}</h2>
      <p className="text-app-muted">{reminder.body}</p>
    </Modal>
  );
}
