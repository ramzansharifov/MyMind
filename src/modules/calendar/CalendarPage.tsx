import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AddButton } from '../../shared/components/ActionButtons';
import { EmptyState } from '../../shared/components/EmptyState';
import { PageHeader } from '../../shared/components/PageHeader';
import { Tooltip } from '../../shared/components/Tooltip';
import { useI18n } from '../../shared/i18n/I18nProvider';
import { archiveEntity, isHiddenFromRegularLists, trashEntity } from '../../shared/utils/archiveUtils';
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
      <section className="panel section-block">
        <h2>{t(title)}</h2>
        <div className="stack">{items.map(renderEventCard)}</div>
      </section>
    );
  }

  return (
    <section>
      <PageHeader
        title="Calendar"
        subtitle="Important dates, tags, and in-app reminders."
        actions={<AddButton label="Add important date" onClick={() => openNewEvent(todayDateOnly())} />}
      />

      <div className="calendar-workspace">
        <section className="panel calendar-panel">
          <div className="calendar-toolbar">
            <button className="icon-button ghost" type="button" onClick={() => changeMonth(-1)} aria-label={t('Previous month')}>
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <div>
              <h2>{monthLabel(visibleMonth)}</h2>
              <small>{days.filter((day) => day.isCurrentMonth).reduce((sum, day) => sum + day.events.length, 0)} {t('events')}</small>
            </div>
            <button className="icon-button ghost" type="button" onClick={() => changeMonth(1)} aria-label={t('Next month')}>
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>
          <div className="calendar-weekdays">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <strong key={day}>{t(day)}</strong>
            ))}
          </div>
          <div className="calendar-month-grid">
            {days.map((day) => (
              <button
                className={[
                  'calendar-day',
                  day.isCurrentMonth ? '' : 'muted',
                  day.isToday ? 'today' : '',
                  day.date === selectedDate ? 'selected' : '',
                ].filter(Boolean).join(' ')}
                key={day.date}
                type="button"
                onClick={() => setSelectedDate(day.date)}
              >
                <span>{day.dayNumber}</span>
                <div className="calendar-day-dots" aria-label={`${day.events.length} ${t('events')}`}>
                  {day.events.slice(0, 4).map((event) => (
                    <Tooltip content={event.title} position="top" key={event.id}>
                      <i className={eventImportance(event)} />
                    </Tooltip>
                  ))}
                  {day.events.length > 4 ? <small>+{day.events.length - 4}</small> : null}
                </div>
              </button>
            ))}
          </div>
          <div className="calendar-legend">
            {importanceLegend.map((item) => (
              <span key={item.value}>
                <i className={item.value} />
                {t(item.label)}
              </span>
            ))}
          </div>
        </section>

        <aside className="panel selected-date-panel">
          <div className="section-heading">
            <div>
              <h2>{formatDate(selectedDate)}</h2>
              <small>{selectedEvents.length} {t('events')}</small>
            </div>
            <AddButton className="calendar-date-add-button" iconOnly label="Add important date" onClick={() => openNewEvent(selectedDate)} />
          </div>
          {selectedEvents.length === 0 ? <EmptyState title="No events on this date" message="Add an event or select another date." /> : null}
          <div className="stack">{selectedEvents.map(renderEventCard)}</div>
        </aside>
      </div>

      <div className="calendar-support-grid">
        <Section title="Today" items={todayEvents(activeEvents)} />
        <Section title="This week" items={weekEvents(activeEvents)} />
        <Section title="This month" items={monthEvents(activeEvents)} />
        <Section title="Upcoming events" items={upcomingEvents(activeEvents)} />
      </div>
      {activeEvents.length === 0 ? <EmptyState title="No upcoming events" message="Add appointments, dates, and reminders." /> : null}
      {editing !== undefined ? <CalendarEventForm event={editing} defaultDate={draftDate ?? undefined} onCancel={closeForm} onSave={saveEvent} /> : null}
    </section>
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
