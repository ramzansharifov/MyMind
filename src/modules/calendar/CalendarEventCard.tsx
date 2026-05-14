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
    <article className={`card list-card ${event.pinnedAt ? 'pinned' : ''}`}>
      <span className={event.isImportant ? 'important-dot' : 'neutral-dot'} />
      <div>
        <h3>{event.title}</h3>
        <p>{event.description || event.category || t('No description.')}</p>
        <small>
          {formatDate(event.date)} / {weekdayLabel(event.date)} {event.time}
        </small>
        <div className="chip-row">
          {event.recurrence === 'yearly' ? <span className="chip">{t('Every year')}</span> : null}
          {(event.tags ?? []).map((tag) => <span className="chip" key={tag}>{tag}</span>)}
          {(event.reminders ?? []).map((reminder) => (
            <span className="chip" key={reminder.id}>{t('Before days')}: {reminder.offsetDays}</span>
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

function weekdayLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(date);
}
