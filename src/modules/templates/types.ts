import type { BaseEntity, GroupedContentData } from "../../shared/types/common";

export type TemplateVariableType = "text" | "date" | "numberedList";

export interface TemplateVariable {
  name: string;
  type: TemplateVariableType;
  token: string;
}

export type StoredTemplateVariable = TemplateVariable | string;

export interface TextTemplate extends BaseEntity {
  title: string;
  body: string;
  category: string;
  groupId?: string | null;
  tags: string[];
  variables: StoredTemplateVariable[];
}

export type TemplatesData = GroupedContentData<TextTemplate>;
