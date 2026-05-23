import type { BaseEntity } from '../../shared/types/common';

export type NotePropertyType = 'text' | 'number' | 'date' | 'select' | 'multiSelect' | 'checkbox' | 'url';

export type NoteLayoutWidth = 900 | 1000 | 1200;

export interface NoteProperty {
  id: string;
  name: string;
  type: NotePropertyType;
  value: unknown;
}

export interface NoteAsset {
  id: string;
  type: 'image' | 'drawing';
  name?: string;
  data?: string;
  metadata?: Record<string, unknown>;
}

export interface Note extends BaseEntity {
  title: string;
  content: string;
  contentFormat?: 'plain' | 'html' | 'markdown';
  category: string;
  tags: string[];
  pinned: boolean;
  editorContent?: unknown;
  editorPlainText?: string;
  editorHtml?: string;
  properties?: NoteProperty[];
  assets?: NoteAsset[];
  schemaVersion?: number;
  layoutWidth?: NoteLayoutWidth;
}
