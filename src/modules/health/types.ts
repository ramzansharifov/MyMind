import type { BaseEntity } from '../../shared/types/common';

export interface HealthEntry extends BaseEntity {
  date: string;
  mood: string;
  sleepHours: number;
  weight: number;
  energy: number;
  symptoms: string;
  notes: string;
  tags: string[];
}

export interface HealthMetric {
  id: string;
  name: string;
  unit: string;
  value: number;
  date: string;
}

export interface HealthData {
  entries: HealthEntry[];
  metrics: HealthMetric[];
}
