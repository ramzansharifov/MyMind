import { lazy, useMemo, type Dispatch, type SetStateAction } from 'react';
import { normalizeBoardsData } from '../../modules/boards/boardsUtils';
import { LoadingState } from '../../shared/components/LoadingState';
import { getModuleContract } from '../../shared/app/moduleContracts';
import type { AppCollectionName, AppData } from '../../shared/app/appData';
import { storageClient } from '../../shared/storage/storageClient';
import type { CollectionName } from '../../shared/storage/storageTypes';
import type { AppSettings, ModuleKey } from '../../shared/types/common';
import type { EditorNavigationActions } from '../types/editorNavigation';

const DashboardPage = lazy(() => import('../../modules/dashboard').then((module) => ({ default: module.DashboardPage })));
const MoviesPage = lazy(() => import('../../modules/movies').then((module) => ({ default: module.MoviesPage })));
const WorkoutsPage = lazy(() => import('../../modules/workouts').then((module) => ({ default: module.WorkoutsPage })));
const NutritionPage = lazy(() => import('../../modules/nutrition').then((module) => ({ default: module.NutritionPage })));
const TodosPage = lazy(() => import('../../modules/todos').then((module) => ({ default: module.TodosPage })));
const FinancePage = lazy(() => import('../../modules/finance').then((module) => ({ default: module.FinancePage })));
const HabitsPage = lazy(() => import('../../modules/habits').then((module) => ({ default: module.HabitsPage })));
const CalendarPage = lazy(() => import('../../modules/calendar').then((module) => ({ default: module.CalendarPage })));
const JournalPage = lazy(() => import('../../modules/journal').then((module) => ({ default: module.JournalPage })));
const NotesPage = lazy(() => import('../../modules/notes').then((module) => ({ default: module.NotesPage })));
const TemplatesPage = lazy(() => import('../../modules/templates').then((module) => ({ default: module.TemplatesPage })));
const StudyPage = lazy(() => import('../../modules/study').then((module) => ({ default: module.StudyPage })));
const BoardsPage = lazy(() => import('../../modules/boards').then((module) => ({ default: module.BoardsPage })));
const SettingsPage = lazy(() => import('../../modules/settings').then((module) => ({ default: module.SettingsPage })));
const ProjectsPage = lazy(() => import('../../modules/projects').then((module) => ({ default: module.ProjectsPage })));
const ContactsPage = lazy(() => import('../../modules/contacts').then((module) => ({ default: module.ContactsPage })));
const HealthPage = lazy(() => import('../../modules/health').then((module) => ({ default: module.HealthPage })));
const GoalsPage = lazy(() => import('../../modules/goals').then((module) => ({ default: module.GoalsPage })));
const InventoryPage = lazy(() => import('../../modules/inventory').then((module) => ({ default: module.InventoryPage })));

export interface ModuleRendererProps {
  activeModule: ModuleKey;
  data: AppData;
  dataDirectory: string;
  settings: AppSettings;
  statusMessage: string;
  isLoading: boolean;
  loadedCollections: Set<AppCollectionName>;
  loadingCollections: Set<AppCollectionName>;
  setData: Dispatch<SetStateAction<AppData>>;
  requestNavigate: (module: ModuleKey) => void;
  saveSettings: (settings: AppSettings) => Promise<void>;
  exportBackup: () => Promise<void>;
  importBackup: () => Promise<void>;
  exportBackupFile: () => Promise<void>;
  importBackupFile: () => Promise<void>;
  exportCollection: (collectionName: CollectionName) => Promise<void>;
  importCollection: (collectionName: CollectionName) => Promise<void>;
  recreateDemoData: () => Promise<void>;
  clearDemoData: () => Promise<void>;
  setStatusMessage: (message: string) => void;
  setNoteEditorDirty: (isDirty: boolean) => void;
  setNoteEditorActions: (actions: EditorNavigationActions | null) => void;
  setStudyEditorDirty: (isDirty: boolean) => void;
  setStudyEditorActions: (actions: EditorNavigationActions | null) => void;
}

export function ModuleRenderer({
  activeModule,
  data,
  dataDirectory,
  settings,
  statusMessage,
  isLoading,
  loadedCollections,
  loadingCollections,
  setData,
  requestNavigate,
  saveSettings,
  exportBackup,
  importBackup,
  exportBackupFile,
  importBackupFile,
  exportCollection,
  importCollection,
  recreateDemoData,
  clearDemoData,
  setStatusMessage,
  setNoteEditorDirty,
  setNoteEditorActions,
  setStudyEditorDirty,
  setStudyEditorActions,
}: ModuleRendererProps) {
  return useMemo(() => {
    if (isLoading) {
      return <LoadingState title="Loading workspace" message="Reading local SQLite data and preparing modules..." variant="page" />;
    }

    const requiredCollections = getModuleContract(activeModule)?.collections ?? [];
    const isModuleDataReady = requiredCollections.every((collectionName) => loadedCollections.has(collectionName));
    if (!isModuleDataReady) {
      const activeLoads = requiredCollections.filter((collectionName) => loadingCollections.has(collectionName)).length;
      return (
        <LoadingState
          title="Loading module"
          message="Pulling the needed SQLite-backed collections into memory..."
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
      case 'nutrition':
        return <NutritionPage data={data.workouts} onChange={(workouts) => setData((current) => ({ ...current, workouts }))} />;
      case 'todos':
        return <TodosPage data={data.todos} onChange={(todos) => setData((current) => ({ ...current, todos }))} />;
      case 'finance':
        return <FinancePage data={data.finance} currency={settings.currency} onChange={(finance) => setData((current) => ({ ...current, finance }))} />;
      case 'habits':
        return <HabitsPage data={data.habits} onChange={(habits) => setData((current) => ({ ...current, habits }))} />;
      case 'calendar':
        return <CalendarPage events={data.calendarEvents} onChange={(calendarEvents) => setData((current) => ({ ...current, calendarEvents }))} />;
      case 'journal':
        return <JournalPage data={data.journalEntries} onChange={(journalEntries) => setData((current) => ({ ...current, journalEntries }))} />;
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
        return <TemplatesPage data={data.templates} onChange={(templates) => setData((current) => ({ ...current, templates }))} />;
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
            onEditorDirtyChange={setStudyEditorDirty}
            onEditorActionsChange={setStudyEditorActions}
          />
        );
      case 'boards':
        return <BoardsPage data={data.boards} onChange={(boards) => setData((current) => ({ ...current, boards }))} />;
      case 'projects':
        return <ProjectsPage projects={data.projects} onChange={(projects) => setData((current) => ({ ...current, projects }))} />;
      case 'contacts':
        return <ContactsPage data={data.contacts} onChange={(contacts) => setData((current) => ({ ...current, contacts }))} />;
      case 'health':
        return <HealthPage data={data.health} onChange={(health) => setData((current) => ({ ...current, health }))} />;
      case 'goals':
        return <GoalsPage goals={data.goals} onChange={(goals) => setData((current) => ({ ...current, goals }))} />;
      case 'inventory':
        return <InventoryPage items={data.inventory} currency={settings.currency} onChange={(inventory) => setData((current) => ({ ...current, inventory }))} />;
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
  }, [
    activeModule,
    clearDemoData,
    data,
    dataDirectory,
    exportBackup,
    exportBackupFile,
    exportCollection,
    importBackup,
    importBackupFile,
    importCollection,
    isLoading,
    loadedCollections,
    loadingCollections,
    recreateDemoData,
    requestNavigate,
    saveSettings,
    setData,
    setNoteEditorActions,
    setNoteEditorDirty,
    setStatusMessage,
    setStudyEditorActions,
    setStudyEditorDirty,
    settings,
    statusMessage,
  ]);
}
