import { todayDateOnly } from '../../shared/utils/dateUtils';
import type { Habit, HabitLog } from './types';

export function activeHabits(habits: Habit[]) {
  return habits.filter((habit) => habit.isActive);
}

export function todayHabits(habits: Habit[]) {
  return activeHabits(habits);
}

export function todayLog(habitId: string, logs: HabitLog[]) {
  return logs.find((log) => log.habitId === habitId && log.date === todayDateOnly());
}

export function isHabitCompletedToday(habitId: string, logs: HabitLog[]) {
  return Boolean(todayLog(habitId, logs)?.isCompleted);
}

export function recentHabitLogs(logs: HabitLog[]) {
  return [...logs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30);
}
