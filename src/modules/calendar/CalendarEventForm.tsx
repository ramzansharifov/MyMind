import { useState, type FormEvent } from 'react';
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
              <strong>{t(option.label)}</strong>
            </button>
          ))}
        </div>
      </div>
      <label>
        {t('Event repeat')}
        <select value={recurrence} onChange={(item) => setRecurrence(item.target.value as 'once' | 'yearly')}>
          <option value="once">{t('One-time event')}</option>
          <option value="yearly">{t('Every year')}</option>
        </select>
      </label>
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
            <div className="inline-form">
              <input min="0" type="number" value={reminderOffset} onChange={(item) => setReminderOffset(item.target.value)} />
              <AddButton label="Add reminder" onClick={addRelativeReminder} />
            </div>
          </div>
          <div className="calendar-reminder-builder-item">
            <span>{t('Exact date and time')}</span>
            <div className="inline-form">
              <input type="datetime-local" value={reminderAt} onChange={(item) => setReminderAt(item.target.value)} />
              <AddButton label="Add reminder" onClick={addExactReminder} />
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

const importanceOptions: Array<{ value: CalendarEvent['importanceLevel']; label: string }> = [
  { value: 'low', label: 'Low importance' },
  { value: 'medium', label: 'Medium importance' },
  { value: 'high', label: 'High importance' },
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
