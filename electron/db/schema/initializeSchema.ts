import type Database from 'better-sqlite3';

export function initializeDatabaseSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS collections (
      name TEXT PRIMARY KEY,
      payload TEXT NOT NULL CHECK (json_valid(payload)),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      preview_text TEXT NOT NULL,
      tags TEXT NOT NULL CHECK (json_valid(tags)),
      category TEXT NOT NULL,
      group_id TEXT,
      pinned INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      archived_at TEXT,
      trashed_at TEXT,
      trash_expires_at TEXT,
      pinned_at TEXT,
      status_before_archive TEXT,
      status_before_trash TEXT,
      cover_asset_id TEXT,
      layout_width INTEGER,
      content TEXT,
      content_format TEXT NOT NULL DEFAULT 'plain',
      editor_content TEXT NOT NULL CHECK (json_valid(editor_content)),
      editor_plain_text TEXT NOT NULL,
      editor_html TEXT,
      properties TEXT NOT NULL CHECK (json_valid(properties)),
      schema_version INTEGER NOT NULL DEFAULT 2
    );

    CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at);
    CREATE INDEX IF NOT EXISTS idx_notes_group_id ON notes(group_id);
    CREATE INDEX IF NOT EXISTS idx_notes_category ON notes(category);
    CREATE INDEX IF NOT EXISTS idx_notes_pinned ON notes(pinned);
    CREATE INDEX IF NOT EXISTS idx_notes_trashed_at ON notes(trashed_at);
    CREATE INDEX IF NOT EXISTS idx_notes_archived_at ON notes(archived_at);

    CREATE TABLE IF NOT EXISTS note_assets (
      id TEXT PRIMARY KEY,
      note_id TEXT NOT NULL,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL DEFAULT 0,
      relative_path TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_note_assets_note_id ON note_assets(note_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_note_assets_note_path ON note_assets(note_id, relative_path);

    CREATE TABLE IF NOT EXISTS note_drafts (
      note_id TEXT PRIMARY KEY,
      editor_content TEXT NOT NULL CHECK (json_valid(editor_content)),
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS note_html_cache (
      note_id TEXT PRIMARY KEY,
      html TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS study_materials (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      editor_content TEXT NOT NULL CHECK (json_valid(editor_content)),
      plain_text TEXT NOT NULL,
      board_links TEXT NOT NULL CHECK (json_valid(board_links)),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_study_materials_updated_at ON study_materials(updated_at);
  `);
}
