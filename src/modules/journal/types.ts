import type { BaseEntity } from '../../shared/types/common';

export interface JournalEntry extends BaseEntity {
  title: string;
  content: string;
  mood: string;
  tags: string[];
}
