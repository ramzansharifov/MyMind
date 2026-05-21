import { useEffect, useMemo, useState } from 'react';
import { AppShell } from './shared/components/AppShell';
import { storageClient } from './shared/storage/storageClient';
import type { CollectionName } from './shared/storage/storageTypes';
import type { ModuleKey } from './shared/types/common';
import { createDemoData, fillWorkoutDemoGaps, isAppDataEmpty } from './shared/storage/demoData';
import { DashboardPage } from './modules/dashboard/DashboardPage';
import { MoviesPage } from './modules/movies/MoviesPage';
import type { Movie } from './modules/movies/types';
import { WorkoutsPage } from './modules/workouts/WorkoutsPage';
import type { MealRecord, NutritionEntry, WorkoutData } from './modules/workouts/types';
import { TodosPage } from './modules/todos/TodosPage';
import type { TodoData, TodoItem } from './modules/todos/types';
import { DEFAULT_TODO_GROUPS, todoItems } from './modules/todos/todoUtils';
import { FinancePage } from './modules/finance/FinancePage';
import type { FinanceData } from './modules/finance/types';
import { HabitsPage } from './modules/habits/HabitsPage';
import { isHabitScheduledForDate } from './modules/habits/habitUtils';
import type { HabitData, HabitLog } from './modules/habits/types';
import { CalendarPage } from './modules/calendar/CalendarPage';
import type { CalendarEvent } from './modules/calendar/types';
import { JournalPage } from './modules/journal/JournalPage';
import type { JournalEntry } from './modules/journal/types';
import { NotesPage } from './modules/notes/NotesPage';
import type { Note } from './modules/notes/types';
import { migrateNote } from './modules/notes/noteUtils';
import { SettingsPage } from './modules/settings/SettingsPage';
import { ProjectsPage } from './modules/projects/ProjectsPage';
import type { Project } from './modules/projects/types';
import { ContactsPage } from './modules/contacts/ContactsPage';
import type { Contact } from './modules/contacts/types';
import { HealthPage } from './modules/health/HealthPage';
import type { HealthData } from './modules/health/types';
import { GoalsPage } from './modules/goals/GoalsPage';
import type { Goal } from './modules/goals/types';
import { InventoryPage } from './modules/inventory/InventoryPage';
import type { InventoryItem } from './modules/inventory/types';
import type { AppSettings } from './shared/types/common';
import { I18nProvider, useI18n } from './shared/i18n/I18nProvider';
import { ArchiveTrashManager } from './modules/settings/ArchiveTrashManager';
import { cleanupExpiredTrash } from './shared/utils/appDataUtils';
import { localDateOnly, weekdayNumber } from './shared/utils/dateUtils';

interface AppReminder {
  id: string;
  module: 'todos' | 'calendar' | 'habits';
  sourceId: string;
  reminderId?: string;
  cycle?: string;
  title: string;
  body: string;
}

export interface AppData {
  movies: Movie[];
  workouts: WorkoutData;
  todos: TodoData;
  finance: FinanceData;
  habits: HabitData;
  calendarEvents: CalendarEvent[];
  journalEntries: JournalEntry[];
  notes: Note[];
  projects: Project[];
  contacts: Contact[];
  health: HealthData;
  goals: Goal[];
  inventory: InventoryItem[];
}

const emptyData: AppData = {
  movies: [],
  workouts: {
    exercises: [],
    exerciseGroups: [],
    plans: [],
    sessions: [],
    startingPosition: null,
    progressRecords: [],
    nutritionEntries: [],
  },
  todos: { items: [], groups: [] },
  finance: { startingBalance: 0, startedAt: null, transactions: [], savingsGoals: [], tags: [] },
  habits: { habits: [], logs: [] },
  calendarEvents: [],
  journalEntries: [],
  notes: [],
  projects: [],
  contacts: [],
  health: { entries: [], metrics: [] },
  goals: [],
  inventory: [],
};

const defaultSettings: AppSettings = {
  themeMode: 'system',
  language: 'en',
  dataDirectory: '',
  currency: 'USD',
  uiDensity: 'comfortable',
  accentColor: 'teal',
  startModule: 'dashboard',
  seedDataCreated: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export function App() {
  const [activeModule, setActiveModule] = useState<ModuleKey>('dashboard');
  const [data, setData] = useState<AppData>(emptyData);
  const [dataDirectory, setDataDirectory] = useState('');
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState('');
  const [isArchiveManagerOpen, setIsArchiveManagerOpen] = useState(false);
  const [snoozedReminders, setSnoozedReminders] = useState<Record<string, number>>({});
  const [nowTick, setNowTick] = useState(() => Date.now());

  async function loadData() {
    setIsLoading(true);
    try {
      const [
        movies,
        workouts,
        todos,
        finance,
        habits,
        calendarEvents,
        journalEntries,
        notes,
        projects,
        contacts,
        health,
        goals,
        inventory,
        appSettings,
        directory,
      ] = await Promise.all([
        storageClient.getAll('movies'),
        storageClient.getAll('workouts'),
        storageClient.getAll('todos'),
        storageClient.getAll('finance'),
        storageClient.getAll('habits'),
        storageClient.getAll('calendar_events'),
        storageClient.getAll('journal_entries'),
        storageClient.getAll('notes'),
        storageClient.getAll('projects'),
        storageClient.getAll('contacts'),
        storageClient.getAll('health'),
        storageClient.getAll('goals'),
        storageClient.getAll('inventory'),
        storageClient.getAll('app_settings'),
        storageClient.getDataDirectory(),
      ]);

      const normalizedData = normalizeData({
        movies,
        workouts,
        todos,
        finance,
        habits,
        calendarEvents,
        journalEntries,
        notes,
        projects,
        contacts,
        health,
        goals,
        inventory,
      });
      const cleanupResult = cleanupExpiredTrash(normalizedData);
      let nextData = cleanupResult.data;
      if (isAppDataEmpty(nextData)) {
        const seeded = createDemoData();
        await saveWholeData(seeded);
        setData(seeded);
        setStatusMessage('Demo data created because all collections were empty.');
      } else {
        const workoutDemo = fillWorkoutDemoGaps(nextData.workouts);
        if (workoutDemo.didFill) {
          nextData = { ...nextData, workouts: workoutDemo.workouts };
        }
        if (cleanupResult.removed > 0 || workoutDemo.didFill) {
          await saveWholeData(nextData);
          setStatusMessage(
            [
              cleanupResult.removed > 0 ? `Trash cleanup removed ${cleanupResult.removed} expired items.` : '',
              workoutDemo.didFill ? 'Workout demo data added.' : '',
            ]
              .filter(Boolean)
              .join(' '),
          );
        }
        setData(nextData);
      }
      setDataDirectory(directory);
      const mergedSettings = { ...defaultSettings, ...appSettings, dataDirectory: directory };
      setSettings(mergedSettings);
      setActiveModule(mergedSettings.startModule ?? 'dashboard');
    } catch (error) {
      console.error('Failed to load data:', error);
      setStatusMessage('Error loading data. Check console for details.');
    } finally {
      setIsLoading(false);
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
    setData(seeded);
    setStatusMessage('Demo data recreated.');
  }

  async function clearDemoData() {
    await saveWholeData(emptyData);
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
      const form = document.querySelector<HTMLFormElement>('.entity-form, .form-panel');
      if (!form) {
        return;
      }
      if (event.key === 'Escape') {
        const closeButton = form.querySelector<HTMLButtonElement>('.form-heading .icon-button');
        closeButton?.click();
      }
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        form.requestSubmit();
      }
    }

    window.addEventListener('keydown', handleFormShortcuts);
    return () => window.removeEventListener('keydown', handleFormShortcuts);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNowTick(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const page = useMemo(() => {
    if (isLoading) {
      return <section className="loading-panel">Loading local JSON workspace...</section>;
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
            entries={data.journalEntries}
            onChange={(journalEntries) => setData((current) => ({ ...current, journalEntries }))}
          />
        );
      case 'notes':
        return <NotesPage notes={data.notes} onChange={(notes) => setData((current) => ({ ...current, notes }))} />;
      case 'projects':
        return <ProjectsPage projects={data.projects} onChange={(projects) => setData((current) => ({ ...current, projects }))} />;
      case 'contacts':
        return <ContactsPage contacts={data.contacts} onChange={(contacts) => setData((current) => ({ ...current, contacts }))} />;
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
            onNavigate={setActiveModule}
            onOpenDataFolder={() => storageClient.openDataDirectory()}
            onExportBackup={exportBackup}
            onImportBackup={importBackup}
            onExportBackupFile={exportBackupFile}
            onImportBackupFile={importBackupFile}
            onExportCollection={exportCollection}
            onImportCollection={importCollection}
            onRecreateDemoData={recreateDemoData}
            onClearDemoData={clearDemoData}
            onOpenArchiveManager={() => setIsArchiveManagerOpen(true)}
            onSettingsChange={saveSettings}
          />
        );
      case 'dashboard':
      default:
        return (
          <DashboardPage
            data={data}
            currency={settings.currency}
            onNavigate={setActiveModule}
            settings={settings}
            onSettingsChange={saveSettings}
          />
        );
    }
  }, [activeModule, data, dataDirectory, isLoading, settings, statusMessage]);

  useEffect(() => {
    if (isLoading) {
      return;
    }
    void saveWholeData(data);
  }, [data, isLoading]);

  const dueReminders = useMemo(
    () => buildDueReminders(data, nowTick).filter((reminder) => (snoozedReminders[reminder.id] ?? 0) <= nowTick),
    [data, nowTick, snoozedReminders],
  );
  const activeReminder = dueReminders[0] ?? null;
  const reminderBadges = {
    todos: dueReminders.filter((reminder) => reminder.module === 'todos').length,
    habits: dueReminders.filter((reminder) => reminder.module === 'habits').length,
    calendar: dueReminders.filter((reminder) => reminder.module === 'calendar').length,
  };

  function dismissReminder(reminder: AppReminder) {
    const timestamp = new Date().toISOString();
    if (reminder.module === 'todos') {
      setData((current) => ({
        ...current,
        todos: {
          ...current.todos,
          items: current.todos.items.map((todo) => (todo.id === reminder.sourceId ? { ...todo, reminderFiredAt: timestamp, updatedAt: timestamp } : todo)),
        },
      }));
      return;
    }
    if (reminder.module === 'habits') {
      setData((current) => {
        const habit = current.habits.habits.find((item) => item.id === reminder.sourceId);
        const date = localDateOnly();
        const existing = current.habits.logs.find((log) => log.habitId === reminder.sourceId && log.date === date);
        const nextLog: HabitLog = {
          id: existing?.id ?? `habitlog-${reminder.sourceId}-${date}`,
          habitId: reminder.sourceId,
          habitTitle: habit?.title ?? reminder.title,
          date,
          isCompleted: existing?.isCompleted ?? false,
          notes: existing?.notes ?? '',
          reminderFiredAt: timestamp,
          completedAt: existing?.completedAt ?? null,
          createdAt: existing?.createdAt ?? timestamp,
          updatedAt: timestamp,
        };
        return {
          ...current,
          habits: {
            ...current.habits,
            logs: existing
              ? current.habits.logs.map((log) => (log.id === existing.id ? nextLog : log))
              : [...current.habits.logs, nextLog],
          },
        };
      });
      return;
    }
    setData((current) => ({
      ...current,
      calendarEvents: current.calendarEvents.map((event) =>
        event.id === reminder.sourceId
          ? {
              ...event,
              reminders: (event.reminders ?? []).map((item) =>
                item.id === reminder.reminderId ? { ...item, status: 'confirmed', firedAt: timestamp, firedCycle: reminder.cycle ?? item.firedCycle ?? null } : item,
              ),
              reminderFiredAt: timestamp,
              updatedAt: timestamp,
            }
          : event,
      ),
    }));
  }

  function snoozeReminder(reminder: AppReminder) {
    setSnoozedReminders((current) => ({ ...current, [reminder.id]: Date.now() + 15 * 60 * 1000 }));
  }

  return (
    <I18nProvider language={settings.language}>
      <AppShell active={activeModule} onNavigate={setActiveModule} reminderBadges={reminderBadges}>
        {page}
        {activeReminder ? <ReminderModal reminder={activeReminder} onDismiss={() => dismissReminder(activeReminder)} onSnooze={() => snoozeReminder(activeReminder)} /> : null}
        {isArchiveManagerOpen ? (
          <ArchiveTrashManager
            data={data}
            onChange={setData}
            onClose={() => setIsArchiveManagerOpen(false)}
            onStatusMessage={setStatusMessage}
          />
        ) : null}
      </AppShell>
    </I18nProvider>
  );
}

function normalizeData(data: AppData): AppData {
  return {
    ...data,
    workouts: normalizeWorkoutData(data.workouts),
    health: {
      entries: data.health?.entries ?? [],
      metrics: data.health?.metrics ?? [],
    },
    finance: {
      startingBalance: data.finance?.startingBalance ?? 0,
      startedAt: data.finance?.startedAt ?? null,
      transactions: data.finance?.transactions ?? [],
      savingsGoals: data.finance?.savingsGoals ?? [],
      tags: data.finance?.tags ?? [],
    },
    habits: {
      habits: (data.habits?.habits ?? []).map((habit) => ({
        ...habit,
        isActive: habit.isActive ?? true,
      })),
      logs: (data.habits?.logs ?? []).map((log) => ({
        ...log,
        date: normalizeHabitLogDate(log),
        habitTitle: log.habitTitle ?? data.habits?.habits?.find((habit) => habit.id === log.habitId)?.title ?? '',
        notes: log.notes ?? '',
        reminderFiredAt: log.reminderFiredAt ?? null,
        completedAt: log.isCompleted ? log.completedAt ?? log.updatedAt ?? null : null,
        createdAt: log.createdAt ?? log.updatedAt ?? new Date().toISOString(),
        updatedAt: log.updatedAt ?? log.completedAt ?? log.createdAt ?? new Date().toISOString(),
      })),
    },
    todos: normalizeTodoData(data.todos),
    notes: (data.notes ?? []).map(migrateNote),
    calendarEvents: (data.calendarEvents ?? []).map((event) => ({
      ...event,
      tags: event.tags ?? (event.category ? [event.category] : []),
      importanceLevel: event.importanceLevel ?? (event.isImportant ? 'high' : 'low'),
      isImportant: event.isImportant ?? (event.importanceLevel === 'high'),
      recurrence: event.recurrence ?? 'once',
      recurrenceStartDate: event.recurrenceStartDate ?? null,
      reminders: (event.reminders ?? normalizeLegacyEventReminder(event)).map((reminder) => ({
        ...reminder,
        remindAt: reminder.remindAt ?? null,
        status: reminder.status ?? (reminder.firedAt ? 'confirmed' : 'pending'),
        firedAt: reminder.firedAt ?? null,
        firedCycle: reminder.firedCycle ?? null,
      })),
      reminderAt: event.reminderAt ?? null,
      reminderEnabled: event.reminderEnabled ?? false,
      reminderFiredAt: event.reminderFiredAt ?? null,
    })),
    projects: data.projects ?? [],
    contacts: (data.contacts ?? []).map((contact) => ({
      ...contact,
      facebook: contact.facebook ?? '',
      whatsapp: contact.whatsapp ?? '',
      telegram: contact.telegram ?? '',
      instagram: contact.instagram ?? '',
    })),
    goals: data.goals ?? [],
    inventory: data.inventory ?? [],
  };
}

function buildDueReminders(data: AppData, now: number): AppReminder[] {
  const todoReminders = data.todos.items
    .filter((todo) => todo.reminderEnabled && todo.reminderAt && !todo.reminderFiredAt && todo.status !== 'completed')
    .filter((todo) => new Date(todo.reminderAt as string).getTime() <= now)
    .map((todo) => ({
      id: `todo-${todo.id}`,
      module: 'todos' as const,
      sourceId: todo.id,
      title: todo.title,
      body: todo.description || 'Task reminder',
    }));

  const calendarReminders = data.calendarEvents.flatMap((event) => {
    const exactReminders = (event.reminders ?? [])
      .filter((reminder) => reminder.remindAt && reminder.status !== 'confirmed' && !reminder.firedAt)
      .filter((reminder) => new Date(reminder.remindAt as string).getTime() <= now)
      .map((reminder) => ({
        id: `calendar-${event.id}-${reminder.id}`,
        module: 'calendar' as const,
        sourceId: event.id,
        reminderId: reminder.id,
        title: event.title,
        body: event.description || 'Important date',
      }));

    const target = nextCalendarTarget(event.date, event.recurrence ?? 'once', event.recurrenceStartDate ?? null, now);
    if (!target) {
      return exactReminders;
    }
    const daysLeft = daysBetweenLocal(now, target.getTime());
    const cycle = event.recurrence === 'yearly' ? String(target.getFullYear()) : event.date.slice(0, 10);
    const relativeReminders = (event.reminders ?? [])
      .filter((reminder) => !reminder.remindAt)
      .filter((reminder) => reminder.offsetDays >= daysLeft)
      .filter((reminder) => reminder.status !== 'confirmed')
      .filter((reminder) => (event.recurrence === 'yearly' ? reminder.firedCycle !== cycle : !reminder.firedAt))
      .map((reminder) => ({
        id: `calendar-${event.id}-${reminder.id}`,
        module: 'calendar' as const,
        sourceId: event.id,
        reminderId: reminder.id,
        cycle,
        title: event.title,
        body: `${event.description || 'Important date'} / ${daysLeft >= 0 ? `${daysLeft} days left` : 'reminder overdue'}`,
      }));
    return [...exactReminders, ...relativeReminders];
  });

  const habitReminders = data.habits.habits
    .filter((habit) => habit.isActive && habit.timeOfDay)
    .map((habit) => {
      const currentDate = new Date(now);
      const date = localDateOnly(currentDate);
      const log = data.habits.logs.find((item) => item.habitId === habit.id && item.date === date);
      const [hours, minutes] = String(habit.timeOfDay).split(':').map(Number);
      const dueAt = new Date(currentDate);
      dueAt.setHours(hours || 0, minutes || 0, 0, 0);
      return { habit, log, dueAt, isScheduledToday: isHabitScheduledForDate(habit, currentDate) };
    })
    .filter(({ isScheduledToday }) => isScheduledToday)
    .filter(({ log }) => !log?.isCompleted && !log?.reminderFiredAt)
    .filter(({ dueAt }) => dueAt.getTime() <= now)
    .map(({ habit }) => ({
      id: `habit-${habit.id}-${localDateOnly(new Date(now))}`,
      module: 'habits' as const,
      sourceId: habit.id,
      title: habit.title,
      body: habit.description || 'Habit reminder',
    }));

  return [...todoReminders, ...habitReminders, ...calendarReminders];
}

function nextCalendarTarget(date: string, recurrence: 'once' | 'yearly', recurrenceStartDate: string | null, now: number) {
  const base = parseLocalDateOnly(date);
  if (!base) {
    return null;
  }
  if (recurrence === 'once') {
    return base;
  }
  const today = new Date(now);
  const target = new Date(today.getFullYear(), base.getMonth(), base.getDate());
  const startDate = recurrenceStartDate ? parseLocalDateOnly(recurrenceStartDate) : null;
  while (startDate && startOfLocalDay(target).getTime() < startOfLocalDay(startDate).getTime()) {
    target.setFullYear(target.getFullYear() + 1);
  }
  if (startOfLocalDay(target).getTime() < startOfLocalDay(today).getTime()) {
    target.setFullYear(target.getFullYear() + 1);
  }
  return target;
}

function parseLocalDateOnly(date: string) {
  const [year, month, day] = date.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) {
    return null;
  }
  return new Date(year, month - 1, day);
}

function startOfLocalDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function daysBetweenLocal(from: number, to: number) {
  const fromDay = startOfLocalDay(new Date(from)).getTime();
  const toDay = startOfLocalDay(new Date(to)).getTime();
  return Math.ceil((toDay - fromDay) / 86400000);
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
    <div className="dialog-backdrop" role="presentation">
      <section className="confirm-dialog reminder-dialog" role="dialog" aria-modal="true" aria-labelledby="app-reminder-title">
        <span className="reminder-kicker">{t('Reminder')}</span>
        <h2 id="app-reminder-title">{reminder.title}</h2>
        <p>{reminder.body}</p>
        <div className="dialog-actions">
          <button className="button ghost" type="button" onClick={onSnooze}>
            {t('Snooze 15 min')}
          </button>
          <button className="button primary" type="button" onClick={onDismiss}>
            {t('OK')}
          </button>
        </div>
      </section>
    </div>
  );
}

function normalizeLegacyEventReminder(event: {
  id: string;
  date: string;
  reminderAt?: string | null;
  reminderEnabled?: boolean;
  reminderFiredAt?: string | null;
}) {
  if (!event.reminderEnabled || !event.reminderAt) {
    return [];
  }
  const eventDate = new Date(`${event.date.slice(0, 10)}T09:00`).getTime();
  const reminderDate = new Date(event.reminderAt).getTime();
  const offsetDays = Number.isNaN(eventDate) || Number.isNaN(reminderDate) ? 0 : Math.max(0, Math.round((eventDate - reminderDate) / 86400000));
  return [{
    id: `${event.id}-legacy-reminder`,
    offsetDays,
    remindAt: event.reminderAt,
    status: event.reminderFiredAt ? 'confirmed' as const : 'pending' as const,
    firedAt: event.reminderFiredAt ?? null,
    firedCycle: null,
  }];
}

function normalizeTodoData(todos: TodoData | TodoItem[] | undefined): TodoData {
  const timestamp = new Date().toISOString();
  const rawItems = Array.isArray(todos) ? todos : todos?.items ?? [];
  const rawGroups = Array.isArray(todos) ? [] : todos?.groups ?? [];
  const groupIds = new Set([...DEFAULT_TODO_GROUPS.map((group) => group.id), ...rawGroups.map((group) => group.id)]);
  const groups = rawGroups
    .filter((group) => !DEFAULT_TODO_GROUPS.some((item) => item.id === group.id))
    .map((group) => ({
      ...group,
      title: group.title || 'New group',
      kind: group.kind ?? 'custom',
      createdAt: group.createdAt ?? timestamp,
      updatedAt: group.updatedAt ?? timestamp,
    }));

  return {
    items: (rawItems ?? []).map((todo) => {
      const normalizedStatus = todo.status === 'archived' ? 'pending' : todo.status ?? 'pending';
      const groupId = todo.groupId && groupIds.has(todo.groupId) ? todo.groupId : 'pending';
      return {
        ...todo,
        status: normalizedStatus,
        groupId,
        tags: todo.tags ?? [],
        reminderAt: todo.reminderAt ?? null,
        reminderEnabled: todo.reminderEnabled ?? false,
        reminderFiredAt: todo.reminderFiredAt ?? null,
        completedAt: todo.completedAt ?? null,
      };
    }),
    groups,
  };
}

function normalizeHabitLogDate(log: HabitLog) {
  const source = log.isCompleted ? log.completedAt ?? log.updatedAt ?? log.date : log.date;
  if (!source) {
    return localDateOnly();
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(source)) {
    return source;
  }
  const parsed = new Date(source);
  return Number.isNaN(parsed.getTime()) ? localDateOnly() : localDateOnly(parsed);
}

function normalizeWorkoutData(workouts: WorkoutData | undefined): WorkoutData {
  const timestamp = new Date().toISOString();
  const exerciseGroups = (workouts?.exerciseGroups ?? []).map((group) => ({
    ...group,
    title: group.title || 'New group',
    description: group.description ?? '',
    createdAt: group.createdAt ?? timestamp,
    updatedAt: group.updatedAt ?? timestamp,
  }));
  const exerciseGroupIds = new Set(exerciseGroups.map((group) => group.id));
  const baseExercises = (workouts?.exercises ?? []).map((exercise) => ({
    ...exercise,
    groupId: exercise.groupId && exerciseGroupIds.has(exercise.groupId) ? exercise.groupId : null,
  }));
  const exerciseByName = new Map(
    baseExercises
      .filter((ex) => ex.name)
      .map((exercise) => [exercise.name.trim().toLowerCase(), exercise.id])
  );

  const plans = (workouts?.plans ?? []).map((plan) => {
    const legacyExercises = (plan as unknown as { exercises?: Array<{ id: string; name: string; notes?: string }> }).exercises ?? [];
    const migratedIds = legacyExercises.map((exercise) => {
      const key = (exercise.name || '').trim().toLowerCase();
      const existingId = exerciseByName.get(key);
      if (existingId) {
        return existingId;
      }
      const nextExercise = {
        id: exercise.id,
        name: exercise.name || 'Unnamed Exercise',
        description: exercise.notes ?? '',
        groupId: null,
        createdAt: plan.createdAt ?? timestamp,
        updatedAt: plan.updatedAt ?? timestamp,
      };
      baseExercises.push(nextExercise);
      exerciseByName.set(key, nextExercise.id);
      return nextExercise.id;
    });

    const flatIds = plan.exerciseIds && plan.exerciseIds.length > 0 ? plan.exerciseIds : migratedIds;

    return {
      ...plan,
      exerciseIds: flatIds,
      daysOfWeek: plan.daysOfWeek ?? [],
      days:
        plan.days ??
        (plan.daysOfWeek ?? []).map((dayOfWeek) => ({
          id: `${plan.id}-${dayOfWeek}`,
          dayOfWeek,
          exerciseIds: flatIds,
        })),
    };
  });

  const sessions = (workouts?.sessions ?? []).map((session) => {
    const legacyExercises = (session as unknown as { completedExercises?: Array<{ id: string; name: string; sets: number; reps: number; weight: number; notes: string }> }).completedExercises ?? [];
    const exercises =
      session.exercises ??
      legacyExercises.map((exercise) => {
        const key = exercise.name.trim().toLowerCase();
        return {
          ...exercise,
          exerciseId: exerciseByName.get(key) ?? null,
          status: 'completed' as const,
        };
      });
    return {
      ...session,
      planId: session.planId ?? null,
      planTitle: session.planTitle ?? '',
      time: session.time ?? '',
      dayOfWeek: session.dayOfWeek ?? (session.date ? weekdayNumber(new Date(session.date)) : 1),
      mood: typeof session.mood === 'number' ? session.mood : 7,
      energyLevel: session.energyLevel ?? 7,
      exercises,
      completedExercises: exercises.filter((exercise) => exercise.status === 'completed'),
    };
  });

  return {
    exercises: baseExercises,
    exerciseGroups,
    plans,
    sessions,
    startingPosition: workouts?.startingPosition ?? null,
    progressRecords: workouts?.progressRecords ?? [],
    nutritionEntries: normalizeNutritionEntries(workouts?.nutritionEntries, timestamp),
  };
}

function normalizeNutritionEntries(entries: NutritionEntry[] | undefined, timestamp: string): NutritionEntry[] {
  return (entries ?? []).filter(Boolean).map((entry, index) => {
    const legacyEntry = entry as NutritionEntry & {
      meals?: unknown;
      calories?: unknown;
      protein?: unknown;
      carbs?: unknown;
      fats?: unknown;
    };
    const date = normalizeDate(entry.date, entry.createdAt, timestamp);

    return {
      ...entry,
      id: entry.id || `nutrition-${index}`,
      date,
      meals: normalizeMealRecords(legacyEntry.meals, legacyEntry, timestamp),
      water: Number(entry.water) || 0,
      notes: typeof entry.notes === 'string' ? entry.notes : '',
      createdAt: entry.createdAt ?? timestamp,
      updatedAt: entry.updatedAt ?? timestamp,
    };
  });
}

function normalizeMealRecords(
  meals: unknown,
  legacyEntry: { id?: string; calories?: unknown; protein?: unknown; carbs?: unknown; fats?: unknown; notes?: unknown },
  timestamp: string,
): MealRecord[] {
  if (Array.isArray(meals)) {
    return meals.filter(Boolean).map((meal, index) => normalizeMealRecord(meal, legacyEntry.id ?? 'meal', index));
  }

  if (typeof meals === 'string' && meals.trim()) {
    return [
      normalizeMealRecord(
        {
          id: `${legacyEntry.id ?? 'meal'}-legacy`,
          mealType: 'snack',
          time: '',
          customDescription: meals,
          protein: legacyEntry.protein,
          carbs: legacyEntry.carbs,
          fats: legacyEntry.fats,
          calories: legacyEntry.calories,
        },
        legacyEntry.id ?? timestamp,
        0,
      ),
    ];
  }

  return [];
}

function normalizeMealRecord(meal: unknown, parentId: string, index: number): MealRecord {
  const source = meal as Partial<MealRecord> & { description?: string };
  const mealType = String(source.mealType);
  const safeMealType = (['breakfast', 'lunch', 'dinner', 'snack'].includes(mealType) ? mealType : 'snack') as MealRecord['mealType'];

  return {
    id: source.id || `${parentId}-meal-${index}`,
    mealType: safeMealType,
    time: typeof source.time === 'string' ? source.time : '',
    customDescription:
      typeof source.customDescription === 'string'
        ? source.customDescription
        : typeof source.description === 'string'
          ? source.description
          : '',
    protein: Number(source.protein) || 0,
    carbs: Number(source.carbs) || 0,
    fats: Number(source.fats) || 0,
    calories: Number(source.calories) || 0,
  };
}

function normalizeDate(date: string | undefined, createdAt: string | undefined, fallback: string) {
  const candidate = date || createdAt || fallback;
  const parsed = new Date(candidate);
  return Number.isNaN(parsed.getTime()) ? fallback.slice(0, 10) : candidate.slice(0, 10);
}
