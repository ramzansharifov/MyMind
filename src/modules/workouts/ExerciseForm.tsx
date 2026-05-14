import { useState, type FormEvent } from 'react';
import { EntityForm } from '../../shared/components/EntityForm';
import { useI18n } from '../../shared/i18n/I18nProvider';
import { createId } from '../../shared/utils/idGenerator';
import type { ExerciseDefinition, ExerciseGroup } from './types';

interface ExerciseFormProps {
  exercise?: ExerciseDefinition | null;
  groups: ExerciseGroup[];
  defaultGroupId?: string | null;
  onCancel: () => void;
  onSave: (exercise: ExerciseDefinition) => void;
}

export function ExerciseForm({ exercise, groups, defaultGroupId = null, onCancel, onSave }: ExerciseFormProps) {
  const [name, setName] = useState(exercise?.name ?? '');
  const [description, setDescription] = useState(exercise?.description ?? '');
  const [groupId, setGroupId] = useState(exercise?.groupId ?? defaultGroupId ?? '');
  const { t } = useI18n();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const timestamp = new Date().toISOString();
    onSave({
      id: exercise?.id ?? createId('exercise'),
      name: name.trim(),
      description: description.trim(),
      groupId: groupId || null,
      createdAt: exercise?.createdAt ?? timestamp,
      updatedAt: timestamp,
    });
  }

  return (
    <EntityForm title={exercise ? 'Edit exercise' : 'Add exercise'} saveLabel="Save exercise" onCancel={onCancel} onSubmit={submit}>
      <label>
        {t('Exercise name')}
        <input required value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label>
        {t('Technique description')}
        <textarea rows={5} value={description} onChange={(event) => setDescription(event.target.value)} />
      </label>
      <label>
        {t('Exercise group')}
        <select value={groupId} onChange={(event) => setGroupId(event.target.value)}>
          <option value="">{t('No group')}</option>
          {groups.map((group) => (
            <option value={group.id} key={group.id}>
              {group.title}
            </option>
          ))}
        </select>
      </label>
    </EntityForm>
  );
}
