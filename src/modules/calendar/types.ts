import type { BaseEntity } from '../../shared/types/common';

export interface CalendarReminder {
  id: string;
  offsetDays: number;
  firedAt: string | null;
  firedCycle?: string | null;
}

export interface CalendarEvent extends BaseEntity {
  title: string;
  description: string;
  date: string;
  time: string;
  category: string;
  tags: string[];
  isImportant: boolean;
  recurrence: 'once' | 'yearly';
  recurrenceStartDate: string | null;
  reminders: CalendarReminder[];
  reminderAt: string | null;
  reminderEnabled: boolean;
  reminderFiredAt: string | null;
}
