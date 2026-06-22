import type { BaseEntity } from "../../shared/types/common";
import type { NutritionEntry } from "../nutrition/types";

export interface ExerciseDefinition extends BaseEntity {
  name: string;
  description: string;
  groupId: string | null;
}

export interface ExerciseGroup extends BaseEntity {
  title: string;
  description: string;
}

export interface WorkoutResultExercise {
  id: string;
  exerciseId: string | null;
  name: string;
  status: "completed" | "skipped";
  sets: number;
  reps: number;
  weight: number;
  notes: string;
}

export interface WorkoutPlanDay {
  id: string;
  dayOfWeek: number;
  exerciseIds: string[];
}

export interface WorkoutPlan extends BaseEntity {
  title: string;
  description: string;
  exerciseIds: string[]; // Simplified: flat list of exercises
  daysOfWeek?: number[]; // Deprecated but kept for compatibility
  days?: WorkoutPlanDay[]; // Deprecated but kept for compatibility
}

export interface WorkoutSession extends BaseEntity {
  planId: string | null;
  planTitle: string;
  date: string;
  time: string;
  dayOfWeek: number;
  exercises: WorkoutResultExercise[];
  completedExercises: WorkoutResultExercise[];
  mood: number; // Scale 1-10
  energyLevel: number; // Scale 1-10
  notes: string;
}

export interface StartingPositionMetric {
  key: string;
  label: string;
  value: string;
  unit: string;
}

export interface StartingPosition extends BaseEntity {
  date: string;
  metrics: StartingPositionMetric[];
  images?: string[];
  notes: string;
}

export interface ProgressRecordMetric {
  key: string;
  label: string;
  value: string;
  unit: string;
}

export interface ProgressRecord extends BaseEntity {
  date: string;
  metrics: ProgressRecordMetric[];
  images?: string[];
  notes: string;
}

export interface WorkoutData {
  exercises: ExerciseDefinition[];
  exerciseGroups: ExerciseGroup[];
  plans: WorkoutPlan[];
  sessions: WorkoutSession[];
  startingPosition: StartingPosition | null;
  progressRecords: ProgressRecord[];
  nutritionEntries: NutritionEntry[];
}
