import { useState, type FormEvent } from 'react';
import { EntityForm } from '../../shared/components/EntityForm';
import { useI18n } from '../../shared/i18n/I18nProvider';
import { createId } from '../../shared/utils/idGenerator';
import type { Habit } from './types';

interface HabitFormProps {
  habit?: Habit | null;
  onCancel: () => void;
  onSave: (habit: Habit) => void;
}

export function HabitForm({ habit, onCancel, onSave }: HabitFormProps) {
  const [title, setTitle] = useState(habit?.title ?? '');
  const [description, setDescription] = useState(habit?.description ?? '');
  const [category, setCategory] = useState(habit?.category ?? '');
  const [timeOfDay, setTimeOfDay] = useState(habit?.timeOfDay ?? '');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(habit?.daysOfWeek ?? [1, 2, 3, 4, 5, 6, 7]);
  const { t } = useI18n();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const timestamp = new Date().toISOString();
    onSave({
      ...habit,
      id: habit?.id ?? createId('habit'),
      title: title.trim(),
      description: description.trim(),
      category: category.trim(),
      timeOfDay,
      daysOfWeek,
      isActive: true,
      createdAt: habit?.createdAt ?? timestamp,
      updatedAt: timestamp,
    });
  }

  return (
    <EntityForm title={habit ? 'Edit habit' : 'Add habit'} saveLabel="Save habit" onCancel={onCancel} onSubmit={submit}>
      <label>
        {t('Title')}
        <input required value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>
      <label>
        {t('Description')}
        <textarea rows={4} value={description} onChange={(event) => setDescription(event.target.value)} />
      </label>
      <div className="form-grid">
        <label>
          {t('Category')}
          <input value={category} onChange={(event) => setCategory(event.target.value)} />
        </label>
        <label>
          {t('Time')}
          <input type="time" value={timeOfDay} onChange={(event) => setTimeOfDay(event.target.value)} />
        </label>
      </div>
      <div className="form-section">
        <strong>{t('Days')}</strong>
        <div className="day-selector">
          {habitDays.map((day) => (
            <button
              className={daysOfWeek.includes(day.id) ? 'active' : ''}
              type="button"
              key={day.id}
              onClick={() => setDaysOfWeek((current) => (current.includes(day.id) ? current.filter((item) => item !== day.id) : [...current, day.id].sort()))}
            >
              {t(day.label)}
            </button>
          ))}
        </div>
      </div>
    </EntityForm>
  );
}

const habitDays = [
  { id: 1, label: 'Mon' },
  { id: 2, label: 'Tue' },
  { id: 3, label: 'Wed' },
  { id: 4, label: 'Thu' },
  { id: 5, label: 'Fri' },
  { id: 6, label: 'Sat' },
  { id: 7, label: 'Sun' },
];
