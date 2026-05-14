import type { ExerciseDefinition, WorkoutPlan, WorkoutResultExercise, WorkoutSession } from './types';

export const weekdayLabels: Record<number, string> = {
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
  7: 'Sun',
};

export function recentSessions(sessions: WorkoutSession[]) {
  return [...(sessions ?? [])].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')).slice(0, 12);
}

export function exerciseName(exercises: ExerciseDefinition[], exerciseId: string) {
  return exercises.find((exercise) => exercise.id === exerciseId)?.name ?? 'Unknown exercise';
}

export function planExerciseIds(plan: WorkoutPlan) {
  if (plan.exerciseIds && plan.exerciseIds.length > 0) {
    return plan.exerciseIds;
  }
  return Array.from(new Set((plan.days ?? []).flatMap((day) => day.exerciseIds ?? [])));
}

export function resultSummary(exercises: WorkoutResultExercise[]) {
  const completed = (exercises ?? []).filter((exercise) => exercise.status === 'completed').length;
  const skipped = (exercises ?? []).filter((exercise) => exercise.status === 'skipped').length;
  return { completed, skipped };
}
