import { useState } from 'react';
import { ArchiveButton, DeleteButton, EditButton, PinButton } from '../../shared/components/ActionButtons';
import { useI18n } from '../../shared/i18n/I18nProvider';
import { cn } from '../../shared/utils/classNames';
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
  const [isExpanded, setIsExpanded] = useState(false);
  const description = event.description || event.category || t('No description.');
  const canExpandDescription = description.length > 130;
  return (
    <article className={cn(cardClass, event.pinnedAt && pinnedClass)}>
      <div>
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 text-base font-extrabold text-app-text">{event.title}</h3>
          <span className={cn(importanceAccentClass, importanceAccentClasses[event.importanceLevel ?? 'low'])} />
        </div>
      </div>
      <div className="grid gap-2">
        <p className={cn('text-sm text-app-muted', !isExpanded && canExpandDescription && 'line-clamp-3')}>{description}</p>
        {canExpandDescription ? (
          <button className="w-fit text-sm font-bold text-app-accent-strong transition-colors hover:text-app-text" type="button" onClick={() => setIsExpanded((current) => !current)}>
            {t(isExpanded ? 'Show less' : 'Show fully')}
          </button>
        ) : null}
        <small className="text-xs font-bold text-app-muted">
          {formatDate(event.date)} / {weekdayLabel(event.date)} {event.time}
        </small>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {event.recurrence === 'yearly' ? <span className={chipClass}>{t('Every year')}</span> : null}
          <span className={chipClass}>{t(importanceLabel(event.importanceLevel ?? (event.isImportant ? 'high' : 'low')))}</span>
          {(event.tags ?? []).map((tag) => <span className={chipClass} key={tag}>{tag}</span>)}
          {(event.reminders ?? []).map((reminder) => (
            <span className={chipClass} key={reminder.id}>{reminder.remindAt ? formatReminder(reminder.remindAt) : `${t('Before days')}: ${reminder.offsetDays}`}</span>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <PinButton isPinned={Boolean(event.pinnedAt)} onClick={onPin} />
          <EditButton onClick={onEdit} />
          <ArchiveButton label="Archive" onConfirm={onArchive} confirmTitle="Archive item?" confirmMessage="The item will be hidden from regular lists but kept in local SQLite storage." />
          <DeleteButton label="Move to trash" onConfirm={onTrash} confirmTitle="Move event to trash?" confirmMessage="The event will stay in trash for 30 days before permanent deletion." />
        </div>
      </div>
    </article>
  );
}

const cardClass =
  'grid gap-3 rounded-panel border border-[var(--glass-border)] bg-[var(--panel-bg)] p-4 text-app-text [backdrop-filter:var(--glass-blur)] shadow-panel transition-colors hover:border-[color-mix(in_srgb,var(--accent)_34%,var(--border))]';

const pinnedClass = 'border-[color-mix(in_srgb,var(--accent)_44%,var(--border))] shadow-[0_0_0_1px_color-mix(in_srgb,var(--accent)_12%,transparent)]';

const importanceAccentClass = 'mt-1 h-2.5 w-2.5 shrink-0 rounded-full';

const importanceAccentClasses: Record<CalendarEvent['importanceLevel'], string> = {
  low: 'bg-app-success',
  medium: 'bg-app-warning',
  high: 'bg-app-danger',
};

const chipClass =
  'inline-flex w-fit items-center rounded-full border border-app-border bg-app-chip px-2.5 py-1 text-xs font-bold text-app-chip-text';

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
