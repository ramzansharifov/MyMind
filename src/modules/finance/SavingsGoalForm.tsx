import { useState, type FormEvent } from 'react';
import { EntityForm } from '../../shared/components/EntityForm';
import { useI18n } from '../../shared/i18n/I18nProvider';
import { createId } from '../../shared/utils/idGenerator';
import type { SavingsGoal } from './types';

interface SavingsGoalFormProps {
  goal?: SavingsGoal | null;
  onCancel: () => void;
  onSave: (goal: SavingsGoal) => void;
}

export function SavingsGoalForm({ goal, onCancel, onSave }: SavingsGoalFormProps) {
  const [title, setTitle] = useState(goal?.title ?? '');
  const [targetAmount, setTargetAmount] = useState(String(goal?.targetAmount ?? 0));
  const [deadline, setDeadline] = useState(goal?.deadline?.slice(0, 10) ?? '');
  const [description, setDescription] = useState(goal?.description ?? '');
  const { t } = useI18n();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const timestamp = new Date().toISOString();
    onSave({
      id: goal?.id ?? createId('goal'),
      title: title.trim(),
      targetAmount: Math.max(0, Number.parseFloat(targetAmount) || 0),
      currentAmount: 0,
      deadline: deadline || null,
      description: description.trim(),
      createdAt: goal?.createdAt ?? timestamp,
      updatedAt: timestamp,
    });
  }

  return (
    <EntityForm title={goal ? 'Edit savings goal' : 'Add savings goal'} saveLabel="Save goal" onCancel={onCancel} onSubmit={submit}>
      <label>
        {t('Title')}
        <input required value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>
      <label>
        {t('Target amount')}
        <input value={targetAmount} onChange={(event) => setTargetAmount(event.target.value)} />
      </label>
      <label>
        {t('Deadline')}
        <input type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} />
      </label>
      <label>
        {t('Description')}
        <textarea rows={4} value={description} onChange={(event) => setDescription(event.target.value)} />
      </label>
    </EntityForm>
  );
}
