import { useMemo, useState, type FormEvent } from 'react';
import { AddButton } from '../../shared/components/ActionButtons';
import { EntityForm } from '../../shared/components/EntityForm';
import { useI18n } from '../../shared/i18n/I18nProvider';
import { createId } from '../../shared/utils/idGenerator';
import { weekdayNumber } from '../../shared/utils/dateUtils';
import { exerciseName, planExerciseIds } from './workoutUtils';
import type { ExerciseDefinition, WorkoutPlan, WorkoutResultExercise, WorkoutSession } from './types';

interface WorkoutSessionFormProps {
  plan?: WorkoutPlan | null;
  exercises: ExerciseDefinition[];
  onCancel: () => void;
  onSave: (session: WorkoutSession) => void;
}

export function WorkoutSessionForm({ plan, exercises, onCancel, onSave }: WorkoutSessionFormProps) {
  const initialRows = useMemo(() => {
    const ids = plan ? planExerciseIds(plan) : [];
    return ids.map((exerciseId) => createResultExercise(exercises, exerciseId));
  }, [exercises, plan]);
  
  const [rows, setRows] = useState<WorkoutResultExercise[]>(initialRows);
  const [selectedExerciseId, setSelectedExerciseId] = useState(exercises[0]?.id ?? '');
  const [mood, setMood] = useState(7);
  const [energyLevel, setEnergyLevel] = useState(7);
  const [notes, setNotes] = useState('');
  const { t } = useI18n();

  function addExercise() {
    if (!selectedExerciseId) {
      return;
    }
    setRows((current) => [...current, createResultExercise(exercises, selectedExerciseId)]);
  }

  function updateRow(id: string, patch: Partial<WorkoutResultExercise>) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const now = new Date();
    const timestamp = now.toISOString();
    const date = timestamp.slice(0, 10);
    const time = now.toTimeString().slice(0, 5);
    const dayOfWeek = weekdayNumber(now);

    const normalizedRows = rows.map((row) => ({
      ...row,
      sets: row.status === 'skipped' ? 0 : row.sets,
      reps: row.status === 'skipped' ? 0 : row.reps,
      weight: row.status === 'skipped' ? 0 : row.weight,
    }));

    onSave({
      id: createId('session'),
      planId: plan?.id ?? null,
      planTitle: plan?.title ?? '',
      date,
      time,
      dayOfWeek,
      exercises: normalizedRows,
      completedExercises: normalizedRows.filter((row) => row.status === 'completed'),
      mood,
      energyLevel,
      notes: notes.trim(),
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  return (
    <EntityForm
      title={plan ? `${t('Log')} ${plan.title}` : 'Log free workout'}
      saveLabel="Save session"
      onCancel={onCancel}
      onSubmit={submit}
      wide
    >
      <div className="form-section">
        <div className="card-title-row">
          <strong>{t('Workout results')}</strong>
          <div className="inline-controls">
            <select value={selectedExerciseId} onChange={(event) => setSelectedExerciseId(event.target.value)}>
              {exercises.map((exercise) => (
                <option value={exercise.id} key={exercise.id}>
                  {exercise.name}
                </option>
              ))}
            </select>
            <AddButton label="Add exercise" onClick={addExercise} disabled={!selectedExerciseId} />
          </div>
        </div>
        {rows.length === 0 ? <p className="muted-text">{t('Add exercises to log this workout.')}</p> : null}
        <div className="workout-result-list">
          {rows.map((row) => (
            <article className="workout-result-row" key={row.id}>
              <div className="workout-result-header">
                <label className="checkbox-line">
                  <input 
                    type="checkbox" 
                    checked={row.status === 'completed'} 
                    onChange={(e) => updateRow(row.id, { status: e.target.checked ? 'completed' : 'skipped' })} 
                  />
                  <strong>{row.name}</strong>
                </label>
              </div>
              <label>
                {t('Weight')}
                <input type="number" min="0" value={row.weight} disabled={row.status === 'skipped'} onChange={(event) => updateRow(row.id, { weight: Number(event.target.value) })} />
              </label>
              <label>
                {t('Sets')}
                <input type="number" min="0" value={row.sets} disabled={row.status === 'skipped'} onChange={(event) => updateRow(row.id, { sets: Number(event.target.value) })} />
              </label>
              <label>
                {t('Reps')}
                <input type="number" min="0" value={row.reps} disabled={row.status === 'skipped'} onChange={(event) => updateRow(row.id, { reps: Number(event.target.value) })} />
              </label>
              <label className="workout-result-notes">
                {t('Notes')}
                <input value={row.notes} onChange={(event) => updateRow(row.id, { notes: event.target.value })} />
              </label>
            </article>
          ))}
        </div>
      </div>

      <div className="workout-rating-grid">
        <RatingScale label={t('Mood')} value={mood} onChange={setMood} />
        <RatingScale label={t('Energy')} value={energyLevel} onChange={setEnergyLevel} />
      </div>

      <label>
        {t('Progress and well-being notes')}
        <textarea rows={5} value={notes} onChange={(event) => setNotes(event.target.value)} />
      </label>
    </EntityForm>
  );
}

function RatingScale({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <fieldset className="workout-rating-scale">
      <legend>
        <span>{label}</span>
        <strong>{value}/10</strong>
      </legend>
      <div className="workout-rating-options" role="radiogroup" aria-label={label}>
        {Array.from({ length: 10 }, (_, index) => {
          const rating = index + 1;
          return (
            <button
              key={rating}
              type="button"
              className={`workout-rating-option${rating <= value ? ' selected' : ''}${rating === value ? ' current' : ''}`}
              aria-pressed={rating === value}
              onClick={() => onChange(rating)}
            >
              {rating}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function createResultExercise(exercises: ExerciseDefinition[], exerciseId: string): WorkoutResultExercise {
  return {
    id: createId('result-exercise'),
    exerciseId,
    name: exerciseName(exercises, exerciseId),
    status: 'completed',
    sets: 0,
    reps: 0,
    weight: 0,
    notes: '',
  };
}
