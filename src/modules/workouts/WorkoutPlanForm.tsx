import { useState, type FormEvent } from 'react';
import { EntityForm } from '../../shared/forms';
import { useI18n } from '../../shared/i18n';
import { createId } from '../../shared/utils/idGenerator';
import { exerciseName } from './workoutUtils';
import type { ExerciseDefinition, WorkoutPlan } from './types';

const formSectionClass = 'grid gap-3 rounded-panel border border-app-border bg-app-surface-soft p-4';
const checkboxListClass = 'grid gap-2';
const checkboxLineClass =
  'flex min-h-control cursor-pointer items-center gap-3 rounded-control border border-app-border bg-app-surface-soft px-3 py-2 text-app-text transition hover:border-[color-mix(in_srgb,var(--accent)_42%,var(--border))] hover:bg-[var(--control-bg-hover)]';

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
      
      <div className={formSectionClass}>
        <strong>{t('Select Exercises')}</strong>
        {exercises.length === 0 ? (
          <p className="text-sm text-app-muted">{t('Create exercises before building a plan.')}</p>
        ) : (
          <div className={checkboxListClass}>
            {exercises.map((exercise) => (
              <label className={checkboxLineClass} key={exercise.id}>
                <input
                  type="checkbox"
                  className="h-4 min-h-0 w-4 accent-[var(--accent)]"
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
