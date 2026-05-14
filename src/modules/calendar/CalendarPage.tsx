import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AddButton } from '../../shared/components/ActionButtons';
import { EmptyState } from '../../shared/components/EmptyState';
import { FilterBar } from '../../shared/components/FilterBar';
import { PageHeader } from '../../shared/components/PageHeader';
import { useI18n } from '../../shared/i18n/I18nProvider';
import { archiveEntity, isHiddenFromRegularLists, trashEntity } from '../../shared/utils/archiveUtils';
import { formatDate, todayDateOnly } from '../../shared/utils/dateUtils';
import {
  buildCalendarDays,
  calendarTags,
  eventsOnDate,
  filterEvents,
  importantUpcomingEvents,
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
  const [tag, setTag] = useState('');
  const [importantOnly, setImportantOnly] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(todayDateOnly());
  const [editing, setEditing] = useState<CalendarEvent | null | undefined>(undefined);
  const activeEvents = events.filter((event) => !isHiddenFromRegularLists(event));
  const filtered = filterEvents(activeEvents, tag, importantOnly);
  const days = useMemo(() => buildCalendarDays(visibleMonth, filtered), [filtered, visibleMonth]);
  const selectedEvents = eventsOnDate(selectedDate, filtered);
  const { t } = useI18n();

  function saveEvent(event: CalendarEvent) {
    const exists = events.some((item) => item.id === event.id);
    onChange(exists ? events.map((item) => (item.id === event.id ? event : item)) : [event, ...events]);
    setSelectedDate(event.date.slice(0, 10));
    setVisibleMonth(new Date(event.date));
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
        onEdit={() => setEditing(event)}
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
        actions={<AddButton label="Add important date" onClick={() => setEditing(null)} />}
      />
      <FilterBar>
        <label>
          {t('Tag')}
          <select value={tag} onChange={(event) => setTag(event.target.value)}>
            <option value="">{t('All')}</option>
            {calendarTags(activeEvents).map((item) => (
              <option value={item} key={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="checkbox-line">
          <input type="checkbox" checked={importantOnly} onChange={(event) => setImportantOnly(event.target.checked)} />
          {t('Important only')}
        </label>
      </FilterBar>

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
                <div>
                  {day.events.slice(0, 3).map((event) => (
                    <i className={event.isImportant ? 'important' : ''} key={event.id}>
                      {event.time ? `${event.time} ` : ''}{event.title}
                    </i>
                  ))}
                  {day.events.length > 3 ? <small>+{day.events.length - 3}</small> : null}
                </div>
              </button>
            ))}
          </div>
        </section>

        <aside className="panel selected-date-panel">
          <div className="section-heading">
            <div>
              <h2>{formatDate(selectedDate)}</h2>
              <small>{selectedEvents.length} {t('events')}</small>
            </div>
            <AddButton label="Add important date" onClick={() => setEditing(null)} />
          </div>
          {selectedEvents.length === 0 ? <EmptyState title="No events on this date" message="Add an event or select another date." /> : null}
          <div className="stack">{selectedEvents.map(renderEventCard)}</div>
        </aside>
      </div>

      <div className="calendar-support-grid">
        <Section title="Today" items={todayEvents(filtered)} />
        <Section title="This week" items={weekEvents(filtered)} />
        <Section title="This month" items={monthEvents(filtered)} />
        <Section title="Important upcoming" items={importantUpcomingEvents(filtered)} />
        <Section title="Upcoming events" items={upcomingEvents(filtered)} />
      </div>
      {filtered.length === 0 ? <EmptyState title="No upcoming events" message="Add appointments, dates, and reminders." /> : null}
      {editing !== undefined ? <CalendarEventForm event={editing} onCancel={() => setEditing(undefined)} onSave={saveEvent} /> : null}
    </section>
  );
}
