import type { BaseEntity } from '../../shared/types/common';

export type TodoStatus = 'pending' | 'completed' | 'archived';
export type TodoPriority = 'low' | 'medium' | 'high';

export interface TodoGroup extends BaseEntity {
  title: string;
  kind?: 'all' | 'pending' | 'completed' | 'custom';
}

export interface TodoItem extends BaseEntity {
  title: string;
  description: string;
  status: TodoStatus;
  priority: TodoPriority;
  groupId: string;
  tags: string[];
  dueDate: string | null;
  reminderAt: string | null;
  reminderEnabled: boolean;
  reminderFiredAt: string | null;
  completedAt: string | null;
}

export interface TodoData {
  items: TodoItem[];
  groups: TodoGroup[];
}
