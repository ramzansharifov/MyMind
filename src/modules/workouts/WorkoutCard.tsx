import { AddButton, DeleteButton, EditButton } from '../../shared/components/ActionButtons';
import { useI18n } from '../../shared/i18n';
import { exerciseName, planExerciseIds, weekdayLabels } from './workoutUtils';
import type { ExerciseDefinition, WorkoutPlan } from './types';

const cardClass = 'grid gap-3 rounded-panel border border-app-border bg-app-surface p-4 shadow-panel [backdrop-filter:var(--glass-blur)]';
const headingRowClass = 'flex items-start justify-between gap-3 max-[640px]:flex-col';
const kickerClass = 'text-[11px] font-extrabold uppercase tracking-[0.12em] text-app-accent-strong';
const pillClass =
  'inline-flex w-fit shrink-0 items-center rounded-full border border-app-border bg-app-chip px-2.5 py-1 text-xs font-extrabold text-app-chip-text';
const metricGridClass = 'grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-2.5';
const metricTileClass = 'grid gap-1 rounded-control border border-app-border bg-app-surface-soft p-3';
const chipRowClass = 'flex flex-wrap gap-2';
const chipClass = 'inline-flex w-fit items-center rounded-full border border-app-border bg-app-chip px-2.5 py-1 text-xs font-bold text-app-chip-text';
const actionRowClass = 'flex flex-wrap items-center justify-end gap-2';

interface WorkoutCardProps {
  plan: WorkoutPlan;
  exercises: ExerciseDefinition[];
  onLog: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function WorkoutCard({ plan, exercises, onLog, onEdit, onDelete }: WorkoutCardProps) {
  const { t } = useI18n();
  const uniqueExercises = planExerciseIds(plan);
  const dayCount = plan.days?.length ?? plan.daysOfWeek?.length ?? 0;
  return (
    <article className={cardClass}>
      <div className={headingRowClass}>
        <div>
          <span className={kickerClass}>{t('Training plan')}</span>
          <h3 className="text-base font-extrabold text-app-text">{plan.title}</h3>
        </div>
        <span className={pillClass}>{uniqueExercises.length} {t('exercises')}</span>
      </div>
      <p className="text-sm text-app-muted">{plan.description || t('No description.')}</p>
      <div className={metricGridClass}>
        <div className={metricTileClass}>
          <span>{t('Exercises')}</span>
          <strong>{uniqueExercises.length}</strong>
        </div>
        <div className={metricTileClass}>
          <span>{t('Training days')}</span>
          <strong>{dayCount}</strong>
        </div>
      </div>
      <div>
        <div className={chipRowClass}>
          {uniqueExercises.map((exerciseId) => (
            <span className={chipClass} key={exerciseId}>
              {exerciseName(exercises, exerciseId)}
            </span>
          ))}
        </div>
      </div>
      <div className={actionRowClass}>
        <AddButton label="Log workout" iconOnly onClick={onLog} />
        <EditButton onClick={onEdit} />
        <DeleteButton
          onConfirm={onDelete}
          confirmTitle="Delete workout plan?"
          confirmMessage="Workout history will stay, but this plan will be removed."
        />
      </div>
    </article>
  );
}
