import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AddButton } from '../../shared/components/ActionButtons';
import { EmptyState } from '../../shared/components/EmptyState';
import { ModulePageShell } from '../../shared/components/ModulePageShell';
import { Tooltip } from '../../shared/components/Tooltip';
import { useI18n } from '../../shared/i18n';
import { archiveEntity, isHiddenFromRegularLists, trashEntity } from '../../shared/utils/archiveUtils';
import { cn } from '../../shared/utils/classNames';
import { formatDate, todayDateOnly } from '../../shared/utils/dateUtils';
import {
  buildCalendarDays,
  eventsOnDate,
  monthEvents,
  monthLabel,
  todayEvents,
  upcomingEvents,
  weekEvents,
} from './calendarUtils';
import { CalendarEventCard } from './CalendarEventCard';
import { CalendarEventForm } from './CalendarEventForm';
import type { CalendarEvent } from './types';

interface CalendarPageProps {
  events: CalendarEvent[];
  onChange: (events: CalendarEvent[]) => void;
}

export function CalendarPage({ events, onChange }: CalendarPageProps) {
  const [visibleMonth, setVisibleMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(todayDateOnly());
  const [editing, setEditing] = useState<CalendarEvent | null | undefined>(undefined);
  const [draftDate, setDraftDate] = useState<string | null>(null);
  const activeEvents = events.filter((event) => !isHiddenFromRegularLists(event));
  const days = useMemo(() => buildCalendarDays(visibleMonth, activeEvents), [activeEvents, visibleMonth]);
  const selectedEvents = eventsOnDate(selectedDate, activeEvents);
  const { t } = useI18n();

  function saveEvent(event: CalendarEvent) {
    const exists = events.some((item) => item.id === event.id);
    onChange(exists ? events.map((item) => (item.id === event.id ? event : item)) : [event, ...events]);
    setSelectedDate(event.date.slice(0, 10));
    setVisibleMonth(new Date(event.date));
    setDraftDate(null);
    setEditing(undefined);
  }

  function openNewEvent(date: string) {
    setDraftDate(date);
    setEditing(null);
  }

  function openEditEvent(event: CalendarEvent) {
    setDraftDate(null);
    setEditing(event);
  }

  function closeForm() {
    setDraftDate(null);
    setEditing(undefined);
  }

  function togglePin(event: CalendarEvent) {
    const timestamp = new Date().toISOString();
    onChange(events.map((item) => (item.id === event.id ? { ...item, pinnedAt: item.pinnedAt ? null : timestamp, updatedAt: timestamp } : item)));
  }

  function changeMonth(offset: number) {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  function renderEventCard(event: CalendarEvent) {
    return (
      <CalendarEventCard
        event={event}
        key={event.id}
        onEdit={() => openEditEvent(event)}
        onPin={() => togglePin(event)}
        onArchive={() => onChange(events.map((item) => (item.id === event.id ? archiveEntity(item) : item)))}
        onTrash={() => onChange(events.map((item) => (item.id === event.id ? trashEntity(item) : item)))}
      />
    );
  }

  function Section({ title, items }: { title: string; items: CalendarEvent[] }) {
    if (items.length === 0) {
      return null;
    }
    return (
      <section className={panelClass}>
        <h2 className="text-xl font-extrabold text-app-text">{t(title)}</h2>
        <div className="mt-3 grid gap-3">{items.map(renderEventCard)}</div>
      </section>
    );
  }

  return (
    <ModulePageShell
      title="Calendar"
      subtitle="Important dates, tags, and in-app reminders."
      actions={<AddButton label="Add important date" onClick={() => openNewEvent(todayDateOnly())} />}
    >
      <div className="grid grid-cols-[minmax(0,1.45fr)_minmax(320px,0.55fr)] items-start gap-[18px] max-[1100px]:grid-cols-1">
        <section className={panelClass}>
          <div className="mb-4 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
            <button className={iconButtonClass} type="button" onClick={() => changeMonth(-1)} aria-label={t('Previous month')}>
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <div className="min-w-0 text-center">
              <h2 className="text-xl font-extrabold text-app-text">{monthLabel(visibleMonth)}</h2>
              <small className="text-app-muted">{days.filter((day) => day.isCurrentMonth).reduce((sum, day) => sum + day.events.length, 0)} {t('events')}</small>
            </div>
            <button className={iconButtonClass} type="button" onClick={() => changeMonth(1)} aria-label={t('Next month')}>
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>
          <div className="mb-2 grid grid-cols-7 gap-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <strong className="px-1 text-center text-xs font-extrabold uppercase tracking-[0.08em] text-app-muted" key={day}>{t(day)}</strong>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2 max-[620px]:gap-1">
            {days.map((day) => (
              <button
                className={cn(
                  dayButtonClass,
                  !day.isCurrentMonth && 'opacity-45',
                  day.isToday && 'border-[color-mix(in_srgb,var(--accent)_54%,var(--border))]',
                  day.date === selectedDate && 'border-[color-mix(in_srgb,var(--accent)_80%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_16%,var(--surface-strong))] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--accent)_20%,transparent)]',
                )}
                key={day.date}
                type="button"
                onClick={() => setSelectedDate(day.date)}
              >
                <span className="text-sm font-extrabold text-app-text">{day.dayNumber}</span>
                <div className="mt-auto flex min-h-4 flex-wrap items-center gap-1" aria-label={`${day.events.length} ${t('events')}`}>
                  {day.events.slice(0, 4).map((event) => (
                    <Tooltip content={event.title} position="top" key={event.id}>
                      <i className={cn(importanceDotClass, importanceDotClasses[eventImportance(event)])} />
                    </Tooltip>
                  ))}
                  {day.events.length > 4 ? <small className="text-[10px] font-bold text-app-muted">+{day.events.length - 4}</small> : null}
                </div>
              </button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {importanceLegend.map((item) => (
              <span className={legendItemClass} key={item.value}>
                <i className={cn(importanceDotClass, importanceDotClasses[item.value])} />
                {t(item.label)}
              </span>
            ))}
          </div>
        </section>

        <aside className={panelClass}>
          <div className="mb-4 flex items-start justify-between gap-3 border-b border-[var(--line-soft)] pb-3">
            <div>
              <h2 className="text-xl font-extrabold text-app-text">{formatDate(selectedDate)}</h2>
              <small className="text-app-muted">{selectedEvents.length} {t('events')}</small>
            </div>
            <AddButton iconOnly label="Add important date" onClick={() => openNewEvent(selectedDate)} />
          </div>
          {selectedEvents.length === 0 ? <EmptyState title="No events on this date" message="Add an event or select another date." /> : null}
          <div className="grid gap-3">{selectedEvents.map(renderEventCard)}</div>
        </aside>
      </div>

      <div className="mt-[18px] grid grid-cols-2 gap-[18px] max-[1000px]:grid-cols-1">
        <Section title="Today" items={todayEvents(activeEvents)} />
        <Section title="This week" items={weekEvents(activeEvents)} />
        <Section title="This month" items={monthEvents(activeEvents)} />
        <Section title="Upcoming events" items={upcomingEvents(activeEvents)} />
      </div>
      {activeEvents.length === 0 ? <EmptyState title="No upcoming events" message="Add appointments, dates, and reminders." /> : null}
      {editing !== undefined ? <CalendarEventForm event={editing} defaultDate={draftDate ?? undefined} onCancel={closeForm} onSave={saveEvent} /> : null}
    </ModulePageShell>
  );
}

const importanceLegend: Array<{ value: CalendarEvent['importanceLevel']; label: string }> = [
  { value: 'low', label: 'Low importance' },
  { value: 'medium', label: 'Medium importance' },
  { value: 'high', label: 'High importance' },
];

function eventImportance(event: CalendarEvent) {
  return event.importanceLevel ?? (event.isImportant ? 'high' : 'low');
}

const panelClass =
  'rounded-panel border border-[var(--glass-border)] bg-[var(--panel-bg)] p-4 text-app-text [backdrop-filter:var(--glass-blur)] shadow-panel';

const iconButtonClass =
  'grid h-icon min-h-icon w-icon place-items-center rounded-control border border-[color-mix(in_srgb,var(--accent)_36%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_10%,var(--surface-strong))] text-app-accent-strong transition-colors hover:border-[color-mix(in_srgb,var(--accent-strong)_82%,var(--border))] hover:bg-[var(--control-bg-hover)]';

const dayButtonClass =
  'flex min-h-[96px] flex-col items-start rounded-panel border border-app-border bg-app-surface-soft p-2.5 text-left transition-colors hover:border-[color-mix(in_srgb,var(--accent)_48%,var(--border))] hover:bg-app-surface-strong max-[620px]:min-h-[76px] max-[620px]:p-2';

const importanceDotClass = 'block h-2.5 w-2.5 rounded-full';

const importanceDotClasses: Record<CalendarEvent['importanceLevel'], string> = {
  low: 'bg-app-success',
  medium: 'bg-app-warning',
  high: 'bg-app-danger',
};

const legendItemClass =
  'inline-flex items-center gap-2 rounded-full border border-app-border bg-app-chip px-2.5 py-1.5 text-xs font-bold text-app-chip-text';
