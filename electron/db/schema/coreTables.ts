import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const metaTable = sqliteTable('meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export const collectionsTable = sqliteTable('collections', {
  name: text('name').primaryKey(),
  payload: text('payload', { mode: 'json' }).notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const notesTable = sqliteTable('notes', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  previewText: text('preview_text').notNull(),
  tags: text('tags', { mode: 'json' }).notNull(),
  category: text('category').notNull(),
  groupId: text('group_id'),
  pinned: integer('pinned', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  archivedAt: text('archived_at'),
  trashedAt: text('trashed_at'),
  trashExpiresAt: text('trash_expires_at'),
  pinnedAt: text('pinned_at'),
  statusBeforeArchive: text('status_before_archive'),
  statusBeforeTrash: text('status_before_trash'),
  coverAssetId: text('cover_asset_id'),
  layoutWidth: integer('layout_width'),
  content: text('content'),
  contentFormat: text('content_format').notNull().default('plain'),
  editorContent: text('editor_content', { mode: 'json' }).notNull(),
  editorPlainText: text('editor_plain_text').notNull(),
  editorHtml: text('editor_html'),
  properties: text('properties', { mode: 'json' }).notNull(),
  schemaVersion: integer('schema_version').notNull().default(2),
});

export const noteAssetsTable = sqliteTable('note_assets', {
  id: text('id').primaryKey(),
  noteId: text('note_id').notNull(),
  type: text('type').notNull(),
  name: text('name').notNull(),
  mimeType: text('mime_type').notNull(),
  size: integer('size').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  relativePath: text('relative_path').notNull(),
  createdAt: text('created_at').notNull(),
});

export const noteDraftsTable = sqliteTable('note_drafts', {
  noteId: text('note_id').primaryKey(),
  editorContent: text('editor_content', { mode: 'json' }).notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const noteHtmlCacheTable = sqliteTable('note_html_cache', {
  noteId: text('note_id').primaryKey(),
  html: text('html').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const studyMaterialsTable = sqliteTable('study_materials', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  editorContent: text('editor_content', { mode: 'json' }).notNull(),
  plainText: text('plain_text').notNull(),
  boardLinks: text('board_links', { mode: 'json' }).notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});