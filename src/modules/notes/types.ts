import type { BaseEntity, GroupedContentData } from '../../shared/types/common';

export type NotePropertyType = 'text' | 'number' | 'date' | 'select' | 'multiSelect' | 'checkbox' | 'url';

export type NoteLayoutWidth = 900 | 1000 | 1200;
export type NoteAssetType = 'image' | 'video' | 'audio' | 'file' | 'drawing';

export interface NoteProperty {
  id: string;
  name: string;
  type: NotePropertyType;
  value: unknown;
}

export interface NoteAsset {
  id: string;
  noteId?: string;
  type: NoteAssetType;
  name?: string;
  mimeType?: string;
  data?: string;
  url?: string;
  relativePath?: string;
  assetPath?: string;
  size?: number;
  sizeBytes?: number;
  createdAt?: string;
  metadata?: Record<string, unknown>;
}

export interface Note extends BaseEntity {
  title: string;
  content: string;
  contentFormat?: 'plain' | 'html' | 'markdown';
  category: string;
  groupId?: string | null;
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

export type NotesData = GroupedContentData<Note>;

export interface NoteIndexItem extends BaseEntity {
  title: string;
  previewText: string;
  tags: string[];
  category: string;
  groupId?: string | null;
  pinned: boolean;
  coverAssetId?: string | null;
  layoutWidth?: NoteLayoutWidth;
}

export interface NoteProperties {
  custom: NoteProperty[];
}

export interface NoteFile extends BaseEntity {
  title: string;
  schemaVersion: number;
  editorContent: unknown;
  editorPlainText: string;
  content?: string;
  contentFormat?: 'plain' | 'html' | 'markdown';
  editorHtml?: string;
  properties: NoteProperty[];
  assets: NoteAsset[];
  layoutWidth: NoteLayoutWidth;
  tags: string[];
  category: string;
  groupId?: string | null;
  pinned: boolean;
}

export interface NoteDraft {
  noteId: string;
  editorContent: unknown;
  updatedAt: string;
}

export interface NoteSearchIndexItem {
  noteId: string;
  title: string;
  editorPlainText: string;
  tags: string[];
  category: string;
  groupId?: string | null;
  updatedAt: string;
}
