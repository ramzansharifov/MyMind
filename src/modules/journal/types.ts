import type { BaseEntity, GroupedContentData } from '../../shared/types/common';

export interface JournalEntry extends BaseEntity {
  title: string;
  content: string;
  mood: string;
  groupId?: string | null;
  tags: string[];
}

export type JournalData = GroupedContentData<JournalEntry>;
