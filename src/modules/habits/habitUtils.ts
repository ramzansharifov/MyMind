import { localDateOnly, weekdayNumber } from '../../shared/utils/dateUtils';
import type { Habit, HabitLog } from './types';

export function activeHabits(habits: Habit[]) {
  return habits.filter((habit) => habit.isActive && !habit.trashedAt && !habit.archivedAt);
}

export function isHabitScheduledForDate(habit: Habit, date = new Date()) {
  const day = weekdayNumber(date);
  return !habit.daysOfWeek?.length || habit.daysOfWeek.includes(day);
}

export function todayHabits(habits: Habit[], date = new Date()) {
  return activeHabits(habits).filter((habit) => isHabitScheduledForDate(habit, date));
}

export function todayLog(habitId: string, logs: HabitLog[], dateKey = localDateOnly()) {
  return logs.find((log) => log.habitId === habitId && log.date === dateKey);
}

export function isHabitCompletedToday(habitId: string, logs: HabitLog[], dateKey = localDateOnly()) {
  return Boolean(todayLog(habitId, logs, dateKey)?.isCompleted);
}

export function recentHabitLogs(logs: HabitLog[]) {
  return [...logs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30);
}
