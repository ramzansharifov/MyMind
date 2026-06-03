import type { BaseEntity } from '../../shared/types/common';

export type StudyNodeType = 'folder' | 'material';

export type StudyBlockType =
  | 'heading'
  | 'text'
  | 'latex'
  | 'markdown'
  | 'code'
  | 'table'
  | 'definition'
  | 'problem'
  | 'solution'
  | 'board'
  | 'file'
  | 'divider'
  | 'custom';

export type StudyContentBlockType =
  | 'heading'
  | 'text'
  | 'latex'
  | 'markdown'
  | 'code'
  | 'definition'
  | 'problem'
  | 'solution';

export type StudyCustomFieldType = 'text' | 'long_text' | 'latex' | 'number' | 'checkbox' | 'select' | 'date' | 'link';

export type StudyHeadingStyle = 'h1' | 'h2' | 'h3';
export type StudyBlockTextAlign = 'left' | 'center' | 'right';
export type StudyTableCellTextAlign = 'left' | 'center' | 'right';
export type StudyTableCellVerticalAlign = 'top' | 'middle' | 'bottom';

export interface StudyTableCellStyle {
  backgroundColor?: string;
  textColor?: string;
  textAlign?: StudyTableCellTextAlign;
  verticalAlign?: StudyTableCellVerticalAlign;
}

export interface StudyTableCellSpan {
  rowSpan?: number;
  colSpan?: number;
  hidden?: boolean;
}

export interface StudyBlockSettings {
  headingStyle?: StudyHeadingStyle;
  fontSize?: number;
  textColor?: string;
  backgroundColor?: string;
  padding?: number;
  textAlign?: StudyBlockTextAlign;
  codeLanguage?: string;
  codeWrap?: boolean;
  dividerColor?: string;
  boardHeight?: number;
}

export interface StudyNode extends BaseEntity {
  type: StudyNodeType;
  title: string;
  parentId: string | null;
  order: number;
  collapsed?: boolean;
}

export interface StudyBaseBlock {
  id: string;
  type: StudyBlockType;
  createdAt: string;
  updatedAt: string;
  settings?: StudyBlockSettings;
  children?: StudyBlock[];
  collapsed?: boolean;
}

export interface StudyContentBlock extends StudyBaseBlock {
  type: StudyContentBlockType;
  content: string;
  language?: string;
}

export interface StudyTableBlock extends StudyBaseBlock {
  type: 'table';
  rows: string[][];
  hasHeader: boolean;
  columnWidths?: number[];
  cellStyles?: Record<string, StudyTableCellStyle>;
  cellSpans?: Record<string, StudyTableCellSpan>;
  cellMergeBackups?: Record<string, Record<string, string>>;
}

export interface StudyBoardStrokePoint {
  x: number;
  y: number;
}

export interface StudyBoardStroke {
  id: string;
  color?: string;
  width: number;
  points: StudyBoardStrokePoint[];
}

export interface StudyBoardBlock extends StudyBaseBlock {
  type: 'board';
  strokes: StudyBoardStroke[];
}

export interface StudyFileBlock extends StudyBaseBlock {
  type: 'file';
  fileId: string;
  fileName: string;
  note: string;
  url?: string;
  mimeType?: string;
  size?: number;
}

export interface StudyDividerBlock extends StudyBaseBlock {
  type: 'divider';
}

export interface StudyCustomBlock extends StudyBaseBlock {
  type: 'custom';
  templateId: string;
  values: Record<string, string | number | boolean>;
}

export type StudyBlock =
  | StudyContentBlock
  | StudyTableBlock
  | StudyBoardBlock
  | StudyFileBlock
  | StudyDividerBlock
  | StudyCustomBlock;

export interface StudyMaterial extends BaseEntity {
  nodeId: string;
  title: string;
  description?: string;
  tags: string[];
  blocks: StudyBlock[];
}

export interface StudyCustomBlockField {
  id: string;
  label: string;
  type: StudyCustomFieldType;
  required?: boolean;
  placeholder?: string;
  options?: string[];
  defaultValue?: string | number | boolean;
}

export interface StudyCustomBlockTemplate extends BaseEntity {
  title: string;
  description?: string;
  accentColor?: string;
  fields: StudyCustomBlockField[];
}

export interface StudyState {
  selectedNodeId: string | null;
  nodes: StudyNode[];
  materials: StudyMaterial[];
  customBlockTemplates: StudyCustomBlockTemplate[];
}

export type StudyData = StudyState;
