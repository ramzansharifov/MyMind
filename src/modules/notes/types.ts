import type { BaseEntity } from '../../shared/types/common';

export interface Note extends BaseEntity {
  title: string;
  content: string;
  contentFormat?: 'plain' | 'html' | 'markdown';
  category: string;
  tags: string[];
  pinned: boolean;
}
