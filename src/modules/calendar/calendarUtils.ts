import { isToday, isWithinDays } from '../../shared/utils/dateUtils';
import type { CalendarEvent } from './types';

export interface CalendarDay {
  date: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: CalendarEvent[];
}

export function calendarTags(events: CalendarEvent[]) {
  return Array.from(new Set(events.flatMap((event) => event.tags ?? []).filter(Boolean))).sort();
}

export function filterEvents(events: CalendarEvent[], tag: string, importantOnly: boolean) {
  return events
    .filter((event) => (!tag || (event.tags ?? []).includes(tag)) && (!importantOnly || event.isImportant))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function reminderDate(date: string, offsetDays: number) {
  const value = new Date(`${date.slice(0, 10)}T09:00`);
  value.setDate(value.getDate() - offsetDays);
  return value;
}

export function todayEvents(events: CalendarEvent[]) {
  return events.filter((event) => isToday(event.date));
}

export function weekEvents(events: CalendarEvent[]) {
  return events.filter((event) => isWithinDays(event.date, 7));
}

export function monthEvents(events: CalendarEvent[]) {
  return events.filter((event) => isWithinDays(event.date, 31));
}

export function upcomingEvents(events: CalendarEvent[], limit = 8) {
  const today = new Date().toISOString().slice(0, 10);
  return events
    .filter((event) => event.date.slice(0, 10) >= today)
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
    .slice(0, limit);
}

export function importantUpcomingEvents(events: CalendarEvent[], limit = 5) {
  return upcomingEvents(events.filter((event) => event.isImportant), limit);
}

export function monthLabel(date: Date) {
  return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(date);
}

export function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function toDateOnly(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function eventsOnDate(date: string, events: CalendarEvent[]) {
  return events
    .filter((event) => occursOnDate(event, date))
    .map((event) => ({ ...event, date }))
    .sort((a, b) => a.time.localeCompare(b.time));
}

export function buildCalendarDays(monthDate: Date, events: CalendarEvent[]): CalendarDay[] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const startDate = new Date(year, month, 1 - startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    const key = toDateOnly(date);
    return {
      date: key,
      dayNumber: date.getDate(),
      isCurrentMonth: date.getMonth() === month,
      isToday: isToday(key),
      events: eventsOnDate(key, events),
    };
  });
}

function occursOnDate(event: CalendarEvent, date: string) {
  if ((event.recurrence ?? 'once') !== 'yearly') {
    return event.date.slice(0, 10) === date;
  }

  const eventDate = parseDateOnly(event.date);
  const targetDate = parseDateOnly(date);
  if (!eventDate || !targetDate) {
    return false;
  }
  if (eventDate.getMonth() !== targetDate.getMonth() || eventDate.getDate() !== targetDate.getDate()) {
    return false;
  }
  if (!event.recurrenceStartDate) {
    return true;
  }
  const startDate = parseDateOnly(event.recurrenceStartDate);
  return Boolean(startDate && targetDate.getTime() >= startDate.getTime());
}

function parseDateOnly(value: string) {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) {
    return null;
  }
  return new Date(year, month - 1, day);
}
