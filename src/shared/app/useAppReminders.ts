import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { isHabitScheduledForDate } from '../../modules/habits/habitUtils';
import type { HabitLog } from '../../modules/habits/types';
import { localDateOnly } from '../utils/dateUtils';
import type { AppData } from './appData';

export interface AppReminder {
  id: string;
  module: 'todos' | 'calendar' | 'habits';
  sourceId: string;
  reminderId?: string;
  cycle?: string;
  title: string;
  body: string;
}

export function useAppReminders(data: AppData, setData: Dispatch<SetStateAction<AppData>>) {
  const [snoozedReminders, setSnoozedReminders] = useState<Record<string, number>>({});
  const [nowTick, setNowTick] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNowTick(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

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

  return {
    activeReminder,
    reminderBadges,
    dismissReminder,
    snoozeReminder,
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
