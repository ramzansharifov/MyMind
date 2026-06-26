import { useState, type FormEvent } from 'react';
import { CalendarDays, Check, Repeat } from 'lucide-react';
import { AddButton } from '../../shared/components/ActionButtons';
import { EntityForm } from '../../shared/forms';
import { useI18n } from '../../shared/i18n';
import { cn } from '../../shared/utils/classNames';
import { joinCsv, splitCsv } from '../../shared/utils/formatters';
import { createId } from '../../shared/utils/idGenerator';
import type { CalendarEvent, CalendarReminder } from './types';

interface CalendarEventFormProps {
  event?: CalendarEvent | null;
  defaultDate?: string;
  onCancel: () => void;
  onSave: (event: CalendarEvent) => void;
}

export function CalendarEventForm({ event, defaultDate, onCancel, onSave }: CalendarEventFormProps) {
  const [title, setTitle] = useState(event?.title ?? '');
  const [description, setDescription] = useState(event?.description ?? '');
  const [date, setDate] = useState(event?.date.slice(0, 10) ?? defaultDate ?? new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState(event?.time ?? '');
  const [tags, setTags] = useState(joinCsv(event?.tags?.length ? event.tags : event?.category ? [event.category] : []));
  const [importanceLevel, setImportanceLevel] = useState<CalendarEvent['importanceLevel']>(event?.importanceLevel ?? (event?.isImportant ? 'high' : 'low'));
  const [recurrence, setRecurrence] = useState<'once' | 'yearly'>(event?.recurrence ?? 'once');
  const [useStartDate, setUseStartDate] = useState(Boolean(event?.recurrenceStartDate));
  const [recurrenceStartDate, setRecurrenceStartDate] = useState(event?.recurrenceStartDate?.slice(0, 10) ?? date);
  const [reminders, setReminders] = useState<CalendarReminder[]>(event?.reminders ?? []);
  const [reminderOffset, setReminderOffset] = useState('7');
  const [reminderAt, setReminderAt] = useState('');
  const { t } = useI18n();

  function addRelativeReminder() {
    const offsetDays = Math.max(0, Number.parseInt(reminderOffset, 10) || 0);
    if (reminders.some((reminder) => !reminder.remindAt && reminder.offsetDays === offsetDays)) {
      return;
    }
    setReminders(sortReminders([...reminders, { id: createId('calendar-reminder'), offsetDays, remindAt: null, status: 'pending', firedAt: null, firedCycle: null }]));
  }

  function addExactReminder() {
    if (!reminderAt) {
      return;
    }
    const remindAtIso = new Date(reminderAt).toISOString();
    if (reminders.some((reminder) => reminder.remindAt === remindAtIso)) {
      return;
    }
    setReminders(sortReminders([...reminders, { id: createId('calendar-reminder'), offsetDays: 0, remindAt: remindAtIso, status: 'pending', firedAt: null, firedCycle: null }]));
    setReminderAt('');
  }

  function removeReminder(id: string) {
    setReminders(reminders.filter((reminder) => reminder.id !== id));
  }

  function submit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const timestamp = new Date().toISOString();
    const cleanTags = splitCsv(tags);
    const firstReminderAt = reminders
      .map((reminder) => reminder.remindAt ?? reminderIso(date, reminder.offsetDays))
      .filter(Boolean)
      .sort()[0] ?? null;
    onSave({
      id: event?.id ?? createId('event'),
      title: title.trim(),
      description: description.trim(),
      date,
      time,
      category: cleanTags[0] ?? '',
      tags: cleanTags,
      isImportant: importanceLevel === 'high',
      importanceLevel,
      recurrence,
      recurrenceStartDate: recurrence === 'yearly' && useStartDate ? recurrenceStartDate : null,
      reminders,
      reminderAt: firstReminderAt,
      reminderEnabled: reminders.length > 0,
      reminderFiredAt: event?.reminderFiredAt ?? null,
      createdAt: event?.createdAt ?? timestamp,
      updatedAt: timestamp,
    });
  }

  return (
    <EntityForm title={event ? 'Edit event' : 'Add event'} saveLabel="Save event" onCancel={onCancel} onSubmit={submit}>
      <label>
        {t('Title')}
        <input required value={title} onChange={(item) => setTitle(item.target.value)} />
      </label>
      <label>
        {t('Description')}
        <textarea rows={4} value={description} onChange={(item) => setDescription(item.target.value)} />
      </label>
      <div className="grid grid-cols-2 gap-3 max-[760px]:grid-cols-1">
        <label>
          {t('Date')}
          <input type="date" value={date} onChange={(item) => setDate(item.target.value)} />
        </label>
        <label>
          {t('Time')}
          <input type="time" value={time} onChange={(item) => setTime(item.target.value)} />
        </label>
      </div>
      <label>
        {t('Tags')}
        <input value={tags} onChange={(item) => setTags(item.target.value)} placeholder={t('Comma-separated tags')} />
      </label>
      <div className={formSectionClass}>
        <strong className={sectionTitleClass}>{t('Importance')}</strong>
        <div className="grid grid-cols-3 gap-2 max-[520px]:grid-cols-1">
          {importanceOptions.map((option) => (
            <button
              className={cn(importanceChoiceClass, importanceLevel === option.value && choiceActiveClass)}
              type="button"
              key={option.value}
              onClick={() => setImportanceLevel(option.value)}
            >
              <span className={cn(importanceDotClass, importanceDotClasses[option.value])} />
              <strong>{t(option.shortLabel)}</strong>
            </button>
          ))}
        </div>
      </div>
      <div className={formSectionClass}>
        <strong className={sectionTitleClass}>{t('Event repeat')}</strong>
        <div className="grid gap-2">
          {recurrenceOptions.map((option) => {
            const Icon = option.icon;
            const isActive = recurrence === option.value;
            return (
              <button
                className={cn(choiceCardClass, isActive && choiceActiveClass)}
                type="button"
                key={option.value}
                onClick={() => setRecurrence(option.value)}
              >
                <span className={choiceIconClass}>
                  <Icon size={18} aria-hidden="true" />
                </span>
                <span className="min-w-0 text-left">
                  <strong className="block text-sm text-app-text">{t(option.label)}</strong>
                  <small className="mt-0.5 block text-xs text-app-muted">{t(option.description)}</small>
                </span>
                {isActive ? <Check size={16} aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>
      </div>
      {recurrence === 'yearly' ? (
        <>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-bold text-app-text">
            <input className="h-4 w-4 accent-[var(--accent)]" type="checkbox" checked={useStartDate} onChange={(item) => setUseStartDate(item.target.checked)} />
            {t('Use start date')}
          </label>
          {useStartDate ? (
            <label>
              {t('Start showing from')}
              <input type="date" value={recurrenceStartDate} onChange={(item) => setRecurrenceStartDate(item.target.value)} />
            </label>
          ) : null}
        </>
      ) : null}
      <div className={formSectionClass}>
        <strong className={sectionTitleClass}>{t('Reminders')}</strong>
        <div className="grid grid-cols-2 gap-3 max-[760px]:grid-cols-1">
          <div className="grid gap-2 rounded-panel border border-app-border bg-app-surface p-3">
            <span className="text-sm font-bold text-app-text">{t('Before event')}</span>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
              <label>
                {t('Days before')}
                <input min="0" type="number" value={reminderOffset} onChange={(item) => setReminderOffset(item.target.value)} />
              </label>
              <AddButton iconOnly label="Add reminder" onClick={addRelativeReminder} />
            </div>
          </div>
          <div className="grid gap-2 rounded-panel border border-app-border bg-app-surface p-3">
            <span className="text-sm font-bold text-app-text">{t('Exact date and time')}</span>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
              <label>
                {t('Calendar reminder time')}
                <input type="datetime-local" value={reminderAt} onChange={(item) => setReminderAt(item.target.value)} />
              </label>
              <AddButton iconOnly label="Add reminder" onClick={addExactReminder} />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {reminders.map((reminder) => (
            <button className={removableChipClass} key={reminder.id} type="button" onClick={() => removeReminder(reminder.id)}>
              {reminder.remindAt ? formatReminder(reminder.remindAt) : `${t('Before days')}: ${reminder.offsetDays}`}
            </button>
          ))}
          {reminders.length === 0 ? <span className="text-sm text-app-muted">{t('No reminders')}</span> : null}
        </div>
      </div>
    </EntityForm>
  );
}

const importanceOptions: Array<{ value: CalendarEvent['importanceLevel']; shortLabel: string }> = [
  { value: 'low', shortLabel: 'Low importance short' },
  { value: 'medium', shortLabel: 'Medium importance short' },
  { value: 'high', shortLabel: 'High importance short' },
];

const recurrenceOptions: Array<{
  value: CalendarEvent['recurrence'];
  label: string;
  description: string;
  icon: typeof CalendarDays;
}> = [
  { value: 'once', label: 'One-time event', description: 'Only on selected date', icon: CalendarDays },
  { value: 'yearly', label: 'Every year', description: 'Repeat annually', icon: Repeat },
];

const formSectionClass = 'grid gap-3 rounded-panel border border-[var(--line-soft)] bg-app-surface-soft p-3';

const sectionTitleClass = 'text-sm font-extrabold text-app-text';

const importanceChoiceClass =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-panel border border-app-border bg-app-surface px-3 py-2 text-sm font-extrabold text-app-text transition-colors hover:border-[color-mix(in_srgb,var(--accent)_42%,var(--border))] hover:bg-app-surface-strong';

const choiceCardClass =
  'grid w-full grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-3 rounded-panel border border-app-border bg-app-surface p-3 text-left transition-colors hover:border-[color-mix(in_srgb,var(--accent)_42%,var(--border))] hover:bg-app-surface-strong';

const choiceActiveClass =
  'border-[color-mix(in_srgb,var(--accent)_68%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_16%,var(--surface-strong))] text-app-accent-strong';

const choiceIconClass =
  'grid h-[34px] w-[34px] place-items-center rounded-panel border border-[color-mix(in_srgb,var(--accent)_38%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_10%,var(--surface-soft))] text-app-accent-strong';

const importanceDotClass = 'h-2.5 w-2.5 rounded-full';

const importanceDotClasses: Record<CalendarEvent['importanceLevel'], string> = {
  low: 'bg-app-success',
  medium: 'bg-app-warning',
  high: 'bg-app-danger',
};

const removableChipClass =
  'inline-flex w-fit items-center rounded-full border border-app-border bg-app-chip px-2.5 py-1.5 text-xs font-bold text-app-chip-text transition-colors hover:border-[color-mix(in_srgb,var(--danger)_50%,var(--border))] hover:text-app-danger';

function formatReminder(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
}

function sortReminders(reminders: CalendarReminder[]) {
  return [...reminders].sort((first, second) => reminderSortValue(first).localeCompare(reminderSortValue(second)));
}

function reminderSortValue(reminder: CalendarReminder) {
  return reminder.remindAt ?? `offset-${String(reminder.offsetDays).padStart(4, '0')}`;
}

function reminderIso(date: string, offsetDays: number) {
  const value = new Date(`${date.slice(0, 10)}T09:00`);
  value.setDate(value.getDate() - offsetDays);
  return value.toISOString();
}
