import { useState, type FormEvent } from 'react';
import { EntityForm } from '../../shared/components/EntityForm';
import { useI18n } from '../../shared/i18n/I18nProvider';
import { cn } from '../../shared/utils/classNames';
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
      <div className="grid grid-cols-2 gap-3 max-[760px]:grid-cols-1">
        <label>
          {t('Category')}
          <input value={category} onChange={(event) => setCategory(event.target.value)} />
        </label>
        <label>
          {t('Time')}
          <input type="time" value={timeOfDay} onChange={(event) => setTimeOfDay(event.target.value)} />
        </label>
      </div>
      <div className="grid gap-2 rounded-panel border border-[var(--line-soft)] bg-app-surface-soft p-3">
        <strong className="text-sm font-extrabold text-app-text">{t('Days')}</strong>
        <div className="grid grid-cols-7 gap-2 max-[640px]:grid-cols-4">
          {habitDays.map((day) => (
            <button
              className={cn(dayButtonClass, daysOfWeek.includes(day.id) && dayButtonActiveClass)}
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

const dayButtonClass =
  'min-h-10 rounded-control border border-app-border bg-app-surface px-2 text-sm font-extrabold text-app-text transition-colors hover:border-[color-mix(in_srgb,var(--accent)_42%,var(--border))] hover:bg-app-surface-strong';

const dayButtonActiveClass =
  'border-[color-mix(in_srgb,var(--accent)_68%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_16%,var(--surface-strong))] text-app-accent-strong';
