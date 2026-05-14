import type { BaseEntity } from '../../shared/types/common';

export type ProjectStatus = 'active' | 'paused' | 'completed' | 'archived';

export interface Project extends BaseEntity {
  title: string;
  description: string;
  status: ProjectStatus;
  area: string;
  nextAction: string;
  deadline: string | null;
  tags: string[];
}
