import type { BaseEntity } from '../../shared/types/common';

export interface MealRecord {
  id: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  time: string;
  customDescription: string;
  protein: number;
  carbs: number;
  fats: number;
  calories: number;
}

export interface NutritionEntry extends BaseEntity {
  date: string;
  meals: MealRecord[];
  water: number;
  notes: string;
}
