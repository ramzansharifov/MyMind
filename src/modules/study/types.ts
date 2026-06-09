import type { BaseEntity } from "../../shared/types/common";
import type { StudyBlockDocument } from "./blocks/blockCore";
import type { RichTextDocument } from "./richText/richTextCore";

export type StudyEditorContent = StudyBlockDocument | RichTextDocument | string | unknown[] | null;

export type StudyNodeType = "folder" | "material";

export interface StudyNode extends BaseEntity {
  type: StudyNodeType;
  parentId: string | null;
  title: string;
  materialId: string | null;
  isExpanded: boolean;
  order: number;
}

export interface StudyData {
  selectedNodeId: string | null;
  nodes: StudyNode[];
}

export interface StudyBoardLink {
  id: string;
  boardId: string;
  title: string;
  createdAt: string;
}

export interface StudyMaterial extends BaseEntity {
  title: string;
  editorContent: StudyEditorContent;
  plainText: string;
  boardLinks: StudyBoardLink[];
}

export interface StudyMaterialIndexItem extends BaseEntity {
  title: string;
  plainText: string;
  boardCount: number;
}
