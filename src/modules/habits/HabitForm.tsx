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
  const { t } = useI18n();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const timestamp = new Date().toISOString();
    onSave({
      ...habit,
      id: habit?.id ?? createId('habit'),
      title: title.trim(),
      description: description.trim(),
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
    </EntityForm>
  );
}
