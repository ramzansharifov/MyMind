import { Suspense, useCallback, useEffect, useState } from 'react';
import { AppProviders, ModuleRenderer, ReminderDialog, UnsavedChangesDialog, type EditorNavigationActions } from './app/index';
import { useAppData, useAppReminders } from './shared/app';
import { LoadingState } from './shared/components';
import { AppShell } from './shared/layouts';
import type { ModuleKey } from './shared/types/common';


export function App() {
  const [activeModule, setActiveModule] = useState<ModuleKey>('dashboard');
  const [pendingNavigation, setPendingNavigation] = useState<ModuleKey | null>(null);
  const [noteEditorDirty, setNoteEditorDirty] = useState(false);
  const [noteEditorActions, setNoteEditorActions] = useState<EditorNavigationActions | null>(null);
  const [studyEditorDirty, setStudyEditorDirty] = useState(false);
  const [studyEditorActions, setStudyEditorActions] = useState<EditorNavigationActions | null>(null);
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

      if (activeModule === 'study' && studyEditorDirty && studyEditorActions) {
        setPendingNavigation(module);
        return;
      }

      setActiveModule(module);
    },
    [activeModule, noteEditorActions, noteEditorDirty, studyEditorActions, studyEditorDirty],
  );

  async function saveNoteAndNavigate() {
    const target = pendingNavigation;
    const actions = activeModule === 'study' ? studyEditorActions : noteEditorActions;

    if (!target || !actions) {
      setPendingNavigation(null);
      return;
    }

    try {
      await actions.save();
    } catch {
      return;
    }

    setPendingNavigation(null);

    if (activeModule === 'study') {
      setStudyEditorDirty(false);
      setStudyEditorActions(null);
    } else {
      setNoteEditorDirty(false);
      setNoteEditorActions(null);
    }

    setActiveModule(target);
  }

  function discardNoteAndNavigate() {
    const target = pendingNavigation;
    const actions = activeModule === 'study' ? studyEditorActions : noteEditorActions;

    if (!target) {
      setPendingNavigation(null);
      return;
    }

    actions?.discard();
    setPendingNavigation(null);

    if (activeModule === 'study') {
      setStudyEditorDirty(false);
      setStudyEditorActions(null);
    } else {
      setNoteEditorDirty(false);
      setNoteEditorActions(null);
    }

    setActiveModule(target);
  }


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

  const page = (
    <ModuleRenderer
      activeModule={activeModule}
      data={data}
      dataDirectory={dataDirectory}
      settings={settings}
      statusMessage={statusMessage}
      isLoading={isLoading}
      loadedCollections={loadedCollections}
      loadingCollections={loadingCollections}
      setData={setData}
      requestNavigate={requestNavigate}
      saveSettings={saveSettings}
      exportBackup={exportBackup}
      importBackup={importBackup}
      exportBackupFile={exportBackupFile}
      importBackupFile={importBackupFile}
      exportCollection={exportCollection}
      importCollection={importCollection}
      recreateDemoData={recreateDemoData}
      clearDemoData={clearDemoData}
      setStatusMessage={setStatusMessage}
      setNoteEditorDirty={setNoteEditorDirty}
      setNoteEditorActions={setNoteEditorActions}
      setStudyEditorDirty={setStudyEditorDirty}
      setStudyEditorActions={setStudyEditorActions}
    />
  );

  return (
    <AppProviders settings={settings}>
      <AppShell
        active={activeModule}
        onNavigate={requestNavigate}
        sidebarSettings={settings.sidebar}
        onSidebarSettingsChange={(sidebar) => void saveSettings({ ...settings, sidebar })}
        reminderBadges={reminderBadges}
      >
        <Suspense fallback={<LoadingState title="Opening module" message="Loading interface and tools..." variant="page" />}>{page}</Suspense>
        {pendingNavigation ? (
          <UnsavedChangesDialog
            onCancel={() => setPendingNavigation(null)}
            onDiscard={discardNoteAndNavigate}
            onSave={() => void saveNoteAndNavigate()}
          />
        ) : null}
        {activeReminder ? <ReminderDialog reminder={activeReminder} onDismiss={() => dismissReminder(activeReminder)} onSnooze={() => snoozeReminder(activeReminder)} /> : null}
      </AppShell>
    </AppProviders>
  );
}

