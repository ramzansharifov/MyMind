import { useState, type FormEvent } from 'react';
import { CalendarDays, Check, Repeat } from 'lucide-react';
import { AddButton } from '../../shared/components/ActionButtons';
import { EntityForm } from '../../shared/components/EntityForm';
import { useI18n } from '../../shared/i18n/I18nProvider';
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
      <div className="form-grid">
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
      <div className="form-section">
        <strong>{t('Importance')}</strong>
        <div className="calendar-importance-picker">
          {importanceOptions.map((option) => (
            <button
              className={`calendar-importance-choice ${option.value}${importanceLevel === option.value ? ' active' : ''}`}
              type="button"
              key={option.value}
              onClick={() => setImportanceLevel(option.value)}
            >
              <span />
              <strong>{t(option.shortLabel)}</strong>
            </button>
          ))}
        </div>
      </div>
      <div className="form-section">
        <strong>{t('Event repeat')}</strong>
        <div className="calendar-recurrence-picker">
          {recurrenceOptions.map((option) => {
            const Icon = option.icon;
            const isActive = recurrence === option.value;
            return (
              <button
                className={`calendar-recurrence-choice${isActive ? ' active' : ''}`}
                type="button"
                key={option.value}
                onClick={() => setRecurrence(option.value)}
              >
                <span className="calendar-recurrence-icon">
                  <Icon size={18} aria-hidden="true" />
                </span>
                <span>
                  <strong>{t(option.label)}</strong>
                  <small>{t(option.description)}</small>
                </span>
                {isActive ? <Check size={16} aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>
      </div>
      {recurrence === 'yearly' ? (
        <>
          <label className="checkbox-line">
            <input type="checkbox" checked={useStartDate} onChange={(item) => setUseStartDate(item.target.checked)} />
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
      <div className="form-section">
        <strong>{t('Reminders')}</strong>
        <div className="calendar-reminder-builder">
          <div className="calendar-reminder-builder-item">
            <span>{t('Before event')}</span>
            <div className="calendar-reminder-control">
              <label>
                {t('Days before')}
                <input min="0" type="number" value={reminderOffset} onChange={(item) => setReminderOffset(item.target.value)} />
              </label>
              <AddButton iconOnly label="Add reminder" onClick={addRelativeReminder} />
            </div>
          </div>
          <div className="calendar-reminder-builder-item">
            <span>{t('Exact date and time')}</span>
            <div className="calendar-reminder-control">
              <label>
                {t('Calendar reminder time')}
                <input type="datetime-local" value={reminderAt} onChange={(item) => setReminderAt(item.target.value)} />
              </label>
              <AddButton iconOnly label="Add reminder" onClick={addExactReminder} />
            </div>
          </div>
        </div>
        <div className="chip-row">
          {reminders.map((reminder) => (
            <button className="chip removable-chip" key={reminder.id} type="button" onClick={() => removeReminder(reminder.id)}>
              {reminder.remindAt ? formatReminder(reminder.remindAt) : `${t('Before days')}: ${reminder.offsetDays}`}
            </button>
          ))}
          {reminders.length === 0 ? <span className="muted-text">{t('No reminders')}</span> : null}
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
