import { useState, type FormEvent } from 'react';
import { EntityForm } from '../../shared/components/EntityForm';
import { useI18n } from '../../shared/i18n/I18nProvider';
import { createId } from '../../shared/utils/idGenerator';
import { exerciseName } from './workoutUtils';
import type { ExerciseDefinition, WorkoutPlan } from './types';

interface WorkoutPlanFormProps {
  plan?: WorkoutPlan | null;
  exercises: ExerciseDefinition[];
  onCancel: () => void;
  onSave: (plan: WorkoutPlan) => void;
}

export function WorkoutPlanForm({ plan, exercises, onCancel, onSave }: WorkoutPlanFormProps) {
  const [title, setTitle] = useState(plan?.title ?? '');
  const [description, setDescription] = useState(plan?.description ?? '');
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>(plan?.exerciseIds ?? []);
  const { t } = useI18n();

  function toggleExercise(exerciseId: string) {
    setSelectedExerciseIds((current) =>
      current.includes(exerciseId) ? current.filter((id) => id !== exerciseId) : [...current, exerciseId],
    );
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const timestamp = new Date().toISOString();
    onSave({
      id: plan?.id ?? createId('plan'),
      title: title.trim(),
      description: description.trim(),
      exerciseIds: selectedExerciseIds,
      createdAt: plan?.createdAt ?? timestamp,
      updatedAt: timestamp,
    });
  }

  return (
    <EntityForm title={plan ? 'Edit workout plan' : 'Add workout plan'} saveLabel="Save plan" onCancel={onCancel} onSubmit={submit} wide>
      <label>
        {t('Title')}
        <input required value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>
      <label>
        {t('Description')}
        <textarea rows={4} value={description} onChange={(event) => setDescription(event.target.value)} />
      </label>
      
      <div className="form-section">
        <strong>{t('Select Exercises')}</strong>
        {exercises.length === 0 ? (
          <p className="muted-text">{t('Create exercises before building a plan.')}</p>
        ) : (
          <div className="workout-exercise-selection-list">
            {exercises.map((exercise) => (
              <label className="checkbox-line" key={exercise.id}>
                <input
                  type="checkbox"
                  checked={selectedExerciseIds.includes(exercise.id)}
                  onChange={() => toggleExercise(exercise.id)}
                />
                <span>{exerciseName(exercises, exercise.id)}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </EntityForm>
  );
}
