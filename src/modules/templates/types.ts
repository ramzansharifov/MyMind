import type { BaseEntity, GroupedContentData } from '../../shared/types/common';

export interface TextTemplate extends BaseEntity {
  title: string;
  body: string;
  category: string;
  groupId?: string | null;
  tags: string[];
  variables: string[];
}

export type TemplatesData = GroupedContentData<TextTemplate>;
