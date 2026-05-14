import type { BaseEntity } from '../../shared/types/common';

export interface Habit extends BaseEntity {
  title: string;
  description: string;
  daysOfWeek?: number[];
  timeOfDay?: string;
  category?: string;
  isActive: boolean;
}

export interface HabitLog {
  id: string;
  habitId: string;
  habitTitle: string;
  date: string;
  isCompleted: boolean;
  notes: string;
}

export interface HabitData {
  habits: Habit[];
  logs: HabitLog[];
}
