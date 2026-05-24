import type { BaseEntity } from '../../shared/types/common';

export interface TextTemplate extends BaseEntity {
  title: string;
  body: string;
  category: string;
  tags: string[];
  variables: string[];
}
