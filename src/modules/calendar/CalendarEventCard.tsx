import { ArchiveButton, DeleteButton, EditButton, PinButton } from '../../shared/components/ActionButtons';
import { useI18n } from '../../shared/i18n/I18nProvider';
import { formatDate } from '../../shared/utils/dateUtils';
import type { CalendarEvent } from './types';

interface CalendarEventCardProps {
  event: CalendarEvent;
  onEdit: () => void;
  onPin: () => void;
  onArchive: () => void;
  onTrash: () => void;
}

export function CalendarEventCard({ event, onEdit, onPin, onArchive, onTrash }: CalendarEventCardProps) {
  const { t } = useI18n();
  return (
    <article className={`card list-card calendar-event-card ${event.importanceLevel ?? 'low'} ${event.pinnedAt ? 'pinned' : ''}`}>
      <div>
        <div className="calendar-event-title-row">
          <h3>{event.title}</h3>
          <span className={`calendar-event-accent ${event.importanceLevel ?? 'low'}`} />
        </div>
        <p>{event.description || event.category || t('No description.')}</p>
        <small>
          {formatDate(event.date)} / {weekdayLabel(event.date)} {event.time}
        </small>
        <div className="chip-row">
          {event.recurrence === 'yearly' ? <span className="chip">{t('Every year')}</span> : null}
          <span className="chip">{t(importanceLabel(event.importanceLevel ?? (event.isImportant ? 'high' : 'low')))}</span>
          {(event.tags ?? []).map((tag) => <span className="chip" key={tag}>{tag}</span>)}
          {(event.reminders ?? []).map((reminder) => (
            <span className="chip" key={reminder.id}>{reminder.remindAt ? formatReminder(reminder.remindAt) : `${t('Before days')}: ${reminder.offsetDays}`}</span>
          ))}
        </div>
      </div>
      <div className="card-actions compact">
        <PinButton isPinned={Boolean(event.pinnedAt)} onClick={onPin} />
        <EditButton onClick={onEdit} />
        <ArchiveButton label="Archive" onConfirm={onArchive} confirmTitle="Archive item?" confirmMessage="The item will be hidden from regular lists but kept in local JSON storage." />
        <DeleteButton label="Move to trash" onConfirm={onTrash} confirmTitle="Move event to trash?" confirmMessage="The event will stay in trash for 30 days before permanent deletion." />
      </div>
    </article>
  );
}

function importanceLabel(value: CalendarEvent['importanceLevel']) {
  if (value === 'high') return 'High importance';
  if (value === 'medium') return 'Medium importance';
  return 'Low importance';
}

function formatReminder(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
}

function weekdayLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(date);
}
