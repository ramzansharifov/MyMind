import { useState, type FormEvent } from 'react';
import { AddButton } from '../../shared/components/ActionButtons';
import { EntityForm } from '../../shared/components/EntityForm';
import { useI18n } from '../../shared/i18n/I18nProvider';
import { joinCsv, splitCsv } from '../../shared/utils/formatters';
import { createId } from '../../shared/utils/idGenerator';
import type { CalendarEvent, CalendarReminder } from './types';

interface CalendarEventFormProps {
  event?: CalendarEvent | null;
  onCancel: () => void;
  onSave: (event: CalendarEvent) => void;
}

export function CalendarEventForm({ event, onCancel, onSave }: CalendarEventFormProps) {
  const [title, setTitle] = useState(event?.title ?? '');
  const [description, setDescription] = useState(event?.description ?? '');
  const [date, setDate] = useState(event?.date.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState(event?.time ?? '');
  const [tags, setTags] = useState(joinCsv(event?.tags?.length ? event.tags : event?.category ? [event.category] : []));
  const [isImportant, setIsImportant] = useState(event?.isImportant ?? false);
  const [recurrence, setRecurrence] = useState<'once' | 'yearly'>(event?.recurrence ?? 'once');
  const [useStartDate, setUseStartDate] = useState(Boolean(event?.recurrenceStartDate));
  const [recurrenceStartDate, setRecurrenceStartDate] = useState(event?.recurrenceStartDate?.slice(0, 10) ?? date);
  const [reminders, setReminders] = useState<CalendarReminder[]>(event?.reminders ?? []);
  const [reminderOffset, setReminderOffset] = useState('7');
  const { t } = useI18n();

  function addReminder() {
    const offsetDays = Math.max(0, Number.parseInt(reminderOffset, 10) || 0);
    if (reminders.some((reminder) => reminder.offsetDays === offsetDays)) {
      return;
    }
    setReminders([...reminders, { id: createId('calendar-reminder'), offsetDays, firedAt: null, firedCycle: null }].sort((a, b) => b.offsetDays - a.offsetDays));
  }

  function removeReminder(id: string) {
    setReminders(reminders.filter((reminder) => reminder.id !== id));
  }

  function submit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const timestamp = new Date().toISOString();
    const cleanTags = splitCsv(tags);
    const firstReminderAt = reminders[0] ? reminderIso(date, reminders[0].offsetDays) : null;
    onSave({
      id: event?.id ?? createId('event'),
      title: title.trim(),
      description: description.trim(),
      date,
      time,
      category: cleanTags[0] ?? '',
      tags: cleanTags,
      isImportant,
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
          <input value={time} onChange={(item) => setTime(item.target.value)} />
        </label>
      </div>
      <label>
        {t('Tags')}
        <input value={tags} onChange={(item) => setTags(item.target.value)} placeholder={t('Comma-separated tags')} />
      </label>
      <label className="checkbox-line">
        <input type="checkbox" checked={isImportant} onChange={(item) => setIsImportant(item.target.checked)} />
        {t('Important')}
      </label>
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
        <div className="inline-form">
          <input type="number" min="0" value={reminderOffset} onChange={(item) => setReminderOffset(item.target.value)} />
          <AddButton label="Add reminder" onClick={addReminder} />
        </div>
        <div className="chip-row">
          {reminders.map((reminder) => (
            <button className="chip removable-chip" key={reminder.id} type="button" onClick={() => removeReminder(reminder.id)}>
              {t('Before days')}: {reminder.offsetDays}
            </button>
          ))}
          {reminders.length === 0 ? <span className="muted-text">{t('No reminders')}</span> : null}
        </div>
      </div>
    </EntityForm>
  );
}

function reminderIso(date: string, offsetDays: number) {
  const value = new Date(`${date.slice(0, 10)}T09:00`);
  value.setDate(value.getDate() - offsetDays);
  return value.toISOString();
}
