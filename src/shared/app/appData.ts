import type { CalendarEvent } from '../../modules/calendar/types';
import type { BoardsData } from '../../modules/boards/types';
import { emptyBoardsData, normalizeBoardsData } from '../../modules/boards/boardsUtils';
import type { Contact, ContactsData } from '../../modules/contacts/types';
import type { FinanceAccount, FinanceData, FinanceTransaction } from '../../modules/finance/types';
import type { Goal } from '../../modules/goals/types';
import type { HabitData, HabitLog } from '../../modules/habits/types';
import type { HealthData } from '../../modules/health/types';
import type { InventoryItem } from '../../modules/inventory/types';
import type { JournalData, JournalEntry } from '../../modules/journal/types';
import type { Movie } from '../../modules/movies/types';
import { migrateNote } from '../../modules/notes/noteUtils';
import type { Note, NotesData } from '../../modules/notes/types';
import type { Project } from '../../modules/projects/types';
import type { TemplatesData, TextTemplate } from '../../modules/templates/types';
import type { StudyData } from '../../modules/study/types';
import { emptyStudyData, normalizeStudyData } from '../../modules/study/studyUtils';
import type { TodoData, TodoItem } from '../../modules/todos/types';
import { DEFAULT_TODO_GROUPS } from '../../modules/todos/todoUtils';
import type { MealRecord, NutritionEntry } from '../../modules/nutrition/types';
import type { WorkoutData } from '../../modules/workouts/types';
import type { CollectionMap } from '../storage/storageTypes';
import { dataCollections, reminderCollections, type AppCollectionName } from './collectionRegistry';
import { normalizeGroupedContentData } from './groupedContentModel';
import { localDateOnly, weekdayNumber } from '../utils/dateUtils';

export { dataCollections, reminderCollections } from './collectionRegistry';
export type { AppCollectionName } from './collectionRegistry';
export { createDefaultSettings, createDefaultSidebarSettings, normalizeSettings, normalizeSidebarSettings } from './settingsModel';

export interface AppData {
  [collectionName: string]: unknown;
  movies: Movie[];
  workouts: WorkoutData;
  todos: TodoData;
  finance: FinanceData;
  habits: HabitData;
  calendarEvents: CalendarEvent[];
  journalEntries: JournalData;
  notes: NotesData;
  templates: TemplatesData;
  study: StudyData;
  boards: BoardsData;
  projects: Project[];
  contacts: ContactsData;
  health: HealthData;
  goals: Goal[];
  inventory: InventoryItem[];
}

export const emptyData: AppData = {
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
  finance: { startingBalance: 0, startedAt: null, accounts: [], transactions: [], savingsGoals: [], tags: [] },
  habits: { habits: [], logs: [] },
  calendarEvents: [],
  journalEntries: { items: [], groups: [] },
  notes: { items: [], groups: [] },
  templates: { items: [], groups: [] },
  study: emptyStudyData,
  boards: emptyBoardsData,
  projects: [],
  contacts: { items: [], groups: [] },
  health: { entries: [], metrics: [] },
  goals: [],
  inventory: [],
};


function getAppDataKeyForCollection(collectionName: AppCollectionName): string {
  switch (collectionName) {
    case 'calendar_events':
      return 'calendarEvents';
    case 'journal_entries':
      return 'journalEntries';
    default:
      return collectionName;
  }
}

function getDefaultDynamicCollectionValue(collectionName: AppCollectionName) {
  switch (collectionName) {
    case 'todos':
    case 'notes':
    case 'templates':
    case 'contacts':
      return { items: [], groups: [] };
    case 'finance':
      return { startingBalance: 0, startedAt: null, transactions: [], savingsGoals: [], tags: [] };
    case 'habits':
      return { habits: [], logs: [] };
    case 'health':
      return { entries: [], metrics: [] };
    case 'workouts':
      return {
        exercises: [],
        exerciseGroups: [],
        plans: [],
        sessions: [],
        startingPosition: null,
        progressRecords: [],
        nutritionEntries: [],
      };
    case 'study':
      return emptyStudyData;
    case 'boards':
      return emptyBoardsData;
    default:
      return [];
  }
}


export function normalizeData(data: AppData): AppData {
  return {
    ...data,
    workouts: normalizeWorkoutData(data.workouts),
    health: {
      entries: data.health?.entries ?? [],
      metrics: data.health?.metrics ?? [],
    },
    finance: normalizeFinanceData(data.finance),
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
    journalEntries: normalizeGroupedContentData<JournalEntry>(data.journalEntries),
    notes: normalizeGroupedContentData<Note>(data.notes, (note) => migrateNote(note)),
    templates: normalizeGroupedContentData<TextTemplate>(data.templates),
    study: normalizeStudyData(data.study),
    boards: normalizeBoardsData(data.boards),
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
    contacts: normalizeGroupedContentData<Contact>(data.contacts, (contact) => ({
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

export function normalizeCollectionValue<K extends AppCollectionName>(collectionName: K, value: unknown): CollectionMap[K] {
  const normalized = normalizeData(setDataCollection(emptyData, collectionName, value));
  return getDataCollection(normalized, collectionName);
}

export function getDataCollection<K extends AppCollectionName>(data: AppData, collectionName: K): CollectionMap[K] {
  switch (collectionName) {
    case 'movies':
      return data.movies as CollectionMap[K];
    case 'workouts':
      return data.workouts as CollectionMap[K];
    case 'todos':
      return data.todos as CollectionMap[K];
    case 'finance':
      return data.finance as CollectionMap[K];
    case 'habits':
      return data.habits as CollectionMap[K];
    case 'calendar_events':
      return data.calendarEvents as CollectionMap[K];
    case 'journal_entries':
      return data.journalEntries as CollectionMap[K];
    case 'notes':
      return data.notes as CollectionMap[K];
    case 'templates':
      return data.templates as CollectionMap[K];
    case 'projects':
      return data.projects as CollectionMap[K];
    case 'contacts':
      return data.contacts as CollectionMap[K];
    case 'health':
      return data.health as CollectionMap[K];
    case 'goals':
      return data.goals as CollectionMap[K];
    case 'inventory':
      return data.inventory as CollectionMap[K];
    default: {
      const key = getAppDataKeyForCollection(collectionName);
      return ((data as Record<string, unknown>)[key] ?? getDefaultDynamicCollectionValue(collectionName)) as CollectionMap[K];
    }
  }
}

export function setDataCollection(data: AppData, collectionName: AppCollectionName, value: unknown): AppData {
  switch (collectionName) {
    case 'movies':
      return { ...data, movies: Array.isArray(value) ? value as Movie[] : [] };
    case 'workouts':
      return { ...data, workouts: value as WorkoutData };
    case 'todos':
      return { ...data, todos: value as TodoData };
    case 'finance':
      return { ...data, finance: value as FinanceData };
    case 'habits':
      return { ...data, habits: value as HabitData };
    case 'calendar_events':
      return { ...data, calendarEvents: Array.isArray(value) ? value as CalendarEvent[] : [] };
    case 'journal_entries':
      return { ...data, journalEntries: normalizeGroupedContentData<JournalEntry>(value) };
    case 'notes':
      return { ...data, notes: normalizeGroupedContentData<Note>(value, (note) => migrateNote(note)) };
    case 'templates':
      return { ...data, templates: normalizeGroupedContentData<TextTemplate>(value) };
    case 'projects':
      return { ...data, projects: Array.isArray(value) ? value as Project[] : [] };
    case 'contacts':
      return { ...data, contacts: normalizeGroupedContentData<Contact>(value) };
    case 'health':
      return { ...data, health: value as HealthData };
    case 'goals':
      return { ...data, goals: Array.isArray(value) ? value as Goal[] : [] };
    case 'inventory':
      return { ...data, inventory: Array.isArray(value) ? value as InventoryItem[] : [] };
    default: {
      const key = getAppDataKeyForCollection(collectionName);
      return {
        ...data,
        [key]: value ?? getDefaultDynamicCollectionValue(collectionName),
      } as AppData;
    }
  }
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

function normalizeFinanceData(finance: FinanceData | undefined): FinanceData {
  const timestamp = new Date().toISOString();
  const startedAt = finance?.startedAt ?? timestamp;
  const legacyStartingBalance = finance?.startingBalance ?? 0;
  const rawAccounts = finance?.accounts ?? [];

  const accounts: FinanceAccount[] = rawAccounts.length > 0
    ? rawAccounts.map((account, index) => ({
      id: account.id || `account-${index}`,
      title: account.title || 'Main account',
      startingBalance: Number(account.startingBalance) || 0,
      description: account.description ?? '',
      createdAt: account.createdAt ?? startedAt,
      updatedAt: account.updatedAt ?? account.createdAt ?? startedAt,
    }))
    : [{
      id: 'legacy-main-account',
      title: 'Main account',
      startingBalance: legacyStartingBalance,
      description: 'Default account created from the previous starting balance.',
      createdAt: startedAt,
      updatedAt: startedAt,
    }];

  const accountIds = new Set(accounts.map((account) => account.id));
  const fallbackAccountId = accounts[0]?.id ?? 'legacy-main-account';
  const transactions: FinanceTransaction[] = (finance?.transactions ?? []).map((transaction) => {
    const accountId = transaction.accountId && accountIds.has(transaction.accountId)
      ? transaction.accountId
      : fallbackAccountId;

    return {
      ...transaction,
      amount: Number(transaction.amount) || 0,
      description: transaction.description ?? '',
      tags: transaction.tags ?? [],
      sourceOrCategory: transaction.sourceOrCategory ?? transaction.tags?.[0] ?? '',
      accountId,
    };
  });

  return {
    startingBalance: legacyStartingBalance,
    startedAt: finance?.startedAt ?? null,
    accounts,
    transactions,
    savingsGoals: finance?.savingsGoals ?? [],
    tags: finance?.tags ?? [],
  };
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
      .map((exercise) => [exercise.name.trim().toLowerCase(), exercise.id]),
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
