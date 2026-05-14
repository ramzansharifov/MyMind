import { AddButton, DeleteButton, EditButton } from '../../shared/components/ActionButtons';
import { useI18n } from '../../shared/i18n/I18nProvider';
import { exerciseName, planExerciseIds, weekdayLabels } from './workoutUtils';
import type { ExerciseDefinition, WorkoutPlan } from './types';

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
    <article className="card workout-plan-card">
      <div className="workout-card-heading">
        <div>
          <span className="panel-kicker">{t('Training plan')}</span>
          <h3>{plan.title}</h3>
        </div>
        <span className="rating-pill">{uniqueExercises.length} {t('exercises')}</span>
      </div>
      <p className="workout-card-description">{plan.description || t('No description.')}</p>
      <div className="workout-card-metrics">
        <div className="workout-card-metric">
          <span>{t('Exercises')}</span>
          <strong>{uniqueExercises.length}</strong>
        </div>
        <div className="workout-card-metric">
          <span>{t('Training days')}</span>
          <strong>{dayCount}</strong>
        </div>
      </div>
      <div className="workout-plan-exercises">
        <div className="chip-row">
          {uniqueExercises.map((exerciseId) => (
            <span className="chip" key={exerciseId}>
              {exerciseName(exercises, exerciseId)}
            </span>
          ))}
        </div>
      </div>
      <div className="card-actions">
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
