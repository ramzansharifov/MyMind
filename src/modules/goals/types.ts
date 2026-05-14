import type { BaseEntity } from '../../shared/types/common';

export type GoalStatus = 'active' | 'completed' | 'paused' | 'archived';

export interface Goal extends BaseEntity {
  title: string;
  description: string;
  status: GoalStatus;
  horizon: 'month' | 'quarter' | 'year' | 'long-term';
  targetDate: string | null;
  progress: number;
  metric: string;
  tags: string[];
}
