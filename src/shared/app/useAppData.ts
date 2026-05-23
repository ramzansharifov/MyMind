import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { createDemoData, fillWorkoutDemoGaps, isAppDataEmpty } from '../storage/demoData';
import { storageClient } from '../storage/storageClient';
import type { CollectionName } from '../storage/storageTypes';
import type { AppSettings, ModuleKey } from '../types/common';
import { cleanupExpiredTrash } from '../utils/appDataUtils';
import {
  createDefaultSettings,
  dataCollections,
  emptyData,
  moduleCollections,
  normalizeCollectionValue,
  reminderCollections,
  setDataCollection,
  type AppCollectionName,
  type AppData,
} from './appData';

export function useAppData(activeModule: ModuleKey, setActiveModule: Dispatch<SetStateAction<ModuleKey>>) {
  const [data, setData] = useState<AppData>(emptyData);
  const [dataDirectory, setDataDirectory] = useState('');
  const [settings, setSettings] = useState<AppSettings>(() => createDefaultSettings());
  const [isLoading, setIsLoading] = useState(true);
  const [loadedCollections, setLoadedCollections] = useState<Set<AppCollectionName>>(() => new Set());
  const [loadingCollections, setLoadingCollections] = useState<Set<AppCollectionName>>(() => new Set());
  const [statusMessage, setStatusMessage] = useState('');
  const lastSavedDataRef = useRef<AppData | null>(null);
  const saveGenerationRef = useRef(0);
  const loadedCollectionsRef = useRef<Set<AppCollectionName>>(new Set());
  const loadingCollectionsRef = useRef<Map<AppCollectionName, Promise<void>>>(new Map());
  const isHydratingRef = useRef(false);

  async function loadData() {
    isHydratingRef.current = true;
    setIsLoading(true);
    loadedCollectionsRef.current = new Set();
    loadingCollectionsRef.current = new Map();
    setLoadedCollections(new Set());
    setLoadingCollections(new Set());
    setData(emptyData);
    lastSavedDataRef.current = emptyData;
    try {
      const [appSettings, directory] = await Promise.all([storageClient.getAll('app_settings'), storageClient.getDataDirectory()]);
      setDataDirectory(directory);
      const mergedSettings = { ...createDefaultSettings(), ...appSettings, dataDirectory: directory };
      setSettings(mergedSettings);
      const startModule = mergedSettings.startModule ?? 'dashboard';
      setActiveModule(startModule);
      setIsLoading(false);
      isHydratingRef.current = false;
      void loadCollections([...reminderCollections, ...moduleCollections[startModule]], { runWorkspaceMaintenance: startModule === 'dashboard' });
    } catch (error) {
      console.error('Failed to load data:', error);
      setStatusMessage('Error loading data. Check console for details.');
      isHydratingRef.current = false;
      setIsLoading(false);
    }
  }

  async function loadCollections(collections: AppCollectionName[], options?: { runWorkspaceMaintenance?: boolean }) {
    const uniqueCollections = Array.from(new Set(collections));
    const pending = uniqueCollections.filter((collectionName) => !loadedCollectionsRef.current.has(collectionName));
    if (pending.length === 0) {
      if (options?.runWorkspaceMaintenance) {
        await runWorkspaceMaintenance();
      }
      return;
    }

    for (const collectionName of pending) {
      if (!loadingCollectionsRef.current.has(collectionName)) {
        const loading = loadCollection(collectionName);
        loadingCollectionsRef.current.set(collectionName, loading);
      }
    }

    setLoadingCollections(new Set(loadingCollectionsRef.current.keys()));

    try {
      await Promise.all(pending.map((collectionName) => loadingCollectionsRef.current.get(collectionName)));
      if (options?.runWorkspaceMaintenance) {
        await runWorkspaceMaintenance();
      }
    } catch (error) {
      console.error('Failed to load module data:', error);
      setStatusMessage('Error loading module data. Check console for details.');
    }
  }

  async function loadCollection(collectionName: AppCollectionName) {
    try {
      const value = await storageClient.getAll(collectionName);
      const normalizedValue = normalizeCollectionValue(collectionName, value);
      setData((current) => {
        const nextData = setDataCollection(current, collectionName, normalizedValue);
        const previousBaseline = lastSavedDataRef.current ?? current;
        lastSavedDataRef.current = setDataCollection(previousBaseline, collectionName, normalizedValue);
        return nextData;
      });
      loadedCollectionsRef.current.add(collectionName);
      setLoadedCollections(new Set(loadedCollectionsRef.current));
    } finally {
      loadingCollectionsRef.current.delete(collectionName);
      setLoadingCollections(new Set(loadingCollectionsRef.current.keys()));
    }
  }

  async function runWorkspaceMaintenance() {
    if (!dataCollections.every((collectionName) => loadedCollectionsRef.current.has(collectionName))) {
      return;
    }

    const currentData = lastSavedDataRef.current ?? data;
    const cleanupResult = cleanupExpiredTrash(currentData);
    let nextData = cleanupResult.data;
    if (isAppDataEmpty(nextData)) {
      const seeded = createDemoData();
      await saveWholeData(seeded);
      lastSavedDataRef.current = seeded;
      setData(seeded);
      loadedCollectionsRef.current = new Set(dataCollections);
      setLoadedCollections(new Set(loadedCollectionsRef.current));
      setStatusMessage('Demo data created because all collections were empty.');
      return;
    }

    const workoutDemo = fillWorkoutDemoGaps(nextData.workouts);
    if (workoutDemo.didFill) {
      nextData = { ...nextData, workouts: workoutDemo.workouts };
    }
    if (cleanupResult.removed > 0 || workoutDemo.didFill) {
      await saveWholeData(nextData);
      lastSavedDataRef.current = nextData;
      setData(nextData);
      setStatusMessage(
        [
          cleanupResult.removed > 0 ? `Trash cleanup removed ${cleanupResult.removed} expired items.` : '',
          workoutDemo.didFill ? 'Workout demo data added.' : '',
        ]
          .filter(Boolean)
          .join(' '),
      );
    }
  }

  async function saveWholeData(nextData: AppData) {
    await Promise.all([
      storageClient.saveAll('movies', nextData.movies),
      storageClient.saveAll('workouts', nextData.workouts),
      storageClient.saveAll('todos', nextData.todos),
      storageClient.saveAll('finance', nextData.finance),
      storageClient.saveAll('habits', nextData.habits),
      storageClient.saveAll('calendar_events', nextData.calendarEvents),
      storageClient.saveAll('journal_entries', nextData.journalEntries),
      storageClient.saveAll('notes', nextData.notes),
      storageClient.saveAll('projects', nextData.projects),
      storageClient.saveAll('contacts', nextData.contacts),
      storageClient.saveAll('health', nextData.health),
      storageClient.saveAll('goals', nextData.goals),
      storageClient.saveAll('inventory', nextData.inventory),
    ]);
  }

  async function saveChangedData(nextData: AppData, previousData: AppData) {
    await Promise.all([
      nextData.movies !== previousData.movies ? storageClient.saveAll('movies', nextData.movies) : null,
      nextData.workouts !== previousData.workouts ? storageClient.saveAll('workouts', nextData.workouts) : null,
      nextData.todos !== previousData.todos ? storageClient.saveAll('todos', nextData.todos) : null,
      nextData.finance !== previousData.finance ? storageClient.saveAll('finance', nextData.finance) : null,
      nextData.habits !== previousData.habits ? storageClient.saveAll('habits', nextData.habits) : null,
      nextData.calendarEvents !== previousData.calendarEvents ? storageClient.saveAll('calendar_events', nextData.calendarEvents) : null,
      nextData.journalEntries !== previousData.journalEntries ? storageClient.saveAll('journal_entries', nextData.journalEntries) : null,
      nextData.notes !== previousData.notes ? storageClient.saveAll('notes', nextData.notes) : null,
      nextData.projects !== previousData.projects ? storageClient.saveAll('projects', nextData.projects) : null,
      nextData.contacts !== previousData.contacts ? storageClient.saveAll('contacts', nextData.contacts) : null,
      nextData.health !== previousData.health ? storageClient.saveAll('health', nextData.health) : null,
      nextData.goals !== previousData.goals ? storageClient.saveAll('goals', nextData.goals) : null,
      nextData.inventory !== previousData.inventory ? storageClient.saveAll('inventory', nextData.inventory) : null,
    ].filter(Boolean));
  }

  async function saveSettings(nextSettings: AppSettings) {
    const updated = { ...nextSettings, updatedAt: new Date().toISOString() };
    setSettings(updated);
    await storageClient.saveAll('app_settings', updated);
  }

  async function recreateDemoData() {
    if (!isAppDataEmpty(data)) {
      setStatusMessage('Demo data was not recreated because real data is present.');
      return;
    }
    const seeded = createDemoData();
    await saveWholeData(seeded);
    lastSavedDataRef.current = seeded;
    setData(seeded);
    setStatusMessage('Demo data recreated.');
  }

  async function clearDemoData() {
    await saveWholeData(emptyData);
    lastSavedDataRef.current = emptyData;
    setData(emptyData);
    setStatusMessage('Demo data cleared.');
  }

  async function exportBackup() {
    const backupPath = await storageClient.exportBackup();
    setStatusMessage(`Backup exported to ${backupPath}`);
  }

  async function importBackup() {
    const importedPath = await storageClient.importBackup();
    if (importedPath) {
      setStatusMessage(`Backup imported from selected folder.`);
      await loadData();
    }
  }

  async function exportBackupFile() {
    const backupPath = await storageClient.exportBackupFile();
    if (backupPath) {
      setStatusMessage(`Full backup exported to ${backupPath}`);
    }
  }

  async function importBackupFile() {
    const importedPath = await storageClient.importBackupFile();
    if (importedPath) {
      setStatusMessage('Full backup imported from selected file.');
      await loadData();
    }
  }

  async function exportCollection(collectionName: CollectionName) {
    const exportedPath = await storageClient.exportCollection(collectionName);
    if (exportedPath) {
      setStatusMessage(`Module exported to ${exportedPath}`);
    }
  }

  async function importCollection(collectionName: CollectionName) {
    const importedPath = await storageClient.importCollection(collectionName);
    if (importedPath) {
      setStatusMessage(`Module imported from ${importedPath}`);
      await loadData();
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    if (isLoading) {
      return;
    }
    void loadCollections(moduleCollections[activeModule], { runWorkspaceMaintenance: activeModule === 'dashboard' || activeModule === 'settings' });
  }, [activeModule, isLoading]);

  useEffect(() => {
    if (isLoading || isHydratingRef.current) {
      return;
    }
    const previousData = lastSavedDataRef.current;
    if (!previousData || previousData === data) {
      lastSavedDataRef.current = data;
      return;
    }

    const generation = saveGenerationRef.current + 1;
    saveGenerationRef.current = generation;

    const timeoutId = window.setTimeout(() => {
      void saveChangedData(data, previousData)
        .then(() => {
          if (saveGenerationRef.current === generation) {
            lastSavedDataRef.current = data;
          }
        })
        .catch((error) => {
          console.error('Failed to save data:', error);
          setStatusMessage('Error saving data. Check console for details.');
        });
    }, 700);

    return () => window.clearTimeout(timeoutId);
  }, [data, isLoading]);

  return {
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
  };
}
