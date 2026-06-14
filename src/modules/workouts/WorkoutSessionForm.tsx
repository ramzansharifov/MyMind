import { useMemo, useState, type FormEvent } from 'react';
import { AddButton } from '../../shared/components/ActionButtons';
import { EntityForm } from '../../shared/components/EntityForm';
import { useI18n } from '../../shared/i18n/I18nProvider';
import { cn } from '../../shared/utils/classNames';
import { createId } from '../../shared/utils/idGenerator';
import { weekdayNumber } from '../../shared/utils/dateUtils';
import { exerciseName, planExerciseIds } from './workoutUtils';
import type { ExerciseDefinition, WorkoutPlan, WorkoutResultExercise, WorkoutSession } from './types';

const formSectionClass = 'grid gap-3 rounded-panel border border-app-border bg-app-surface-soft p-4';
const titleRowClass = 'flex items-center justify-between gap-3 max-[720px]:items-start max-[720px]:flex-col';
const inlineControlsClass = 'flex items-center gap-2 max-[720px]:w-full max-[720px]:flex-col';
const resultListClass = 'grid gap-3';
const resultRowClass = 'grid grid-cols-[minmax(180px,1.4fr)_repeat(3,minmax(88px,0.7fr))_minmax(160px,1.2fr)] gap-3 rounded-panel border border-app-border bg-app-surface p-3 max-[980px]:grid-cols-2 max-[640px]:grid-cols-1';
const resultHeaderClass = 'flex items-center';
const checkboxLineClass = 'flex cursor-pointer items-center gap-3 text-app-text';
const checkboxInputClass = 'h-4 min-h-0 w-4 accent-[var(--accent)]';
const ratingGridClass = 'grid grid-cols-2 gap-3 max-[720px]:grid-cols-1';
const ratingScaleClass = 'grid gap-3 rounded-panel border border-app-border bg-app-surface-soft p-4';
const ratingOptionsClass = 'grid grid-cols-10 gap-2 max-[640px]:grid-cols-5';
const ratingOptionClass =
  'min-h-control rounded-control border border-app-border bg-app-surface-soft px-2 text-sm font-extrabold text-app-muted transition hover:border-[color-mix(in_srgb,var(--accent)_45%,var(--border))] hover:text-app-text';
const ratingSelectedClass = 'border-[var(--accent-border)] bg-[color-mix(in_srgb,var(--accent)_16%,var(--surface-strong))] text-app-accent-strong';
const ratingCurrentClass = 'shadow-[0_0_0_2px_color-mix(in_srgb,var(--accent)_25%,transparent)]';

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
      <div className={formSectionClass}>
        <div className={titleRowClass}>
          <strong>{t('Workout results')}</strong>
          <div className={inlineControlsClass}>
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
        {rows.length === 0 ? <p className="text-sm text-app-muted">{t('Add exercises to log this workout.')}</p> : null}
        <div className={resultListClass}>
          {rows.map((row) => (
            <article className={resultRowClass} key={row.id}>
              <div className={resultHeaderClass}>
                <label className={checkboxLineClass}>
                  <input 
                    className={checkboxInputClass}
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
              <label>
                {t('Notes')}
                <input value={row.notes} onChange={(event) => updateRow(row.id, { notes: event.target.value })} />
              </label>
            </article>
          ))}
        </div>
      </div>

      <div className={ratingGridClass}>
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
    <fieldset className={ratingScaleClass}>
      <legend className="flex w-full items-center justify-between gap-3 text-sm text-app-muted">
        <span>{label}</span>
        <strong>{value}/10</strong>
      </legend>
      <div className={ratingOptionsClass} role="radiogroup" aria-label={label}>
        {Array.from({ length: 10 }, (_, index) => {
          const rating = index + 1;
          return (
            <button
              key={rating}
              type="button"
              className={cn(ratingOptionClass, rating <= value && ratingSelectedClass, rating === value && ratingCurrentClass)}
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
