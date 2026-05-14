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
  return (
    <article className="card">
      <div className="card-title-row">
        <div>
          <h3>{plan.title}</h3>
        </div>
        <span className="rating-pill">{uniqueExercises.length} {t('exercises')}</span>
      </div>
      <p>{plan.description || t('No description.')}</p>
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
