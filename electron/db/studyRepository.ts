import Database from 'better-sqlite3';
import fs from 'node:fs/promises';
import path from 'node:path';
import { ensureDataDirectory, getDataDirectory, getDatabasePath } from './sqliteRepository';
import { nowIso } from '../ipc/storageRegistry';

type SqliteDatabase = Database.Database;

type StudyMaterial = {
  id: string;
  title: string;
  editorContent: unknown;
  plainText: string;
  boardLinks: unknown[];
  createdAt: string;
  updatedAt: string;
};

const emptyStudyDocument = {
  format: 'study-blocks-v1',
  version: 1,
  blocks: [],
  plainText: '',
};

function stringifyJson(value: unknown) {
  return JSON.stringify(value ?? null);
}

function sqlStringLiteral(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

function parseJson<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== 'string') {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function sanitizeStudyMaterialId(value: unknown) {
  const id = String(value ?? '').trim();

  if (!id || /[\\/]/.test(id) || id.includes('..')) {
    throw new Error('Invalid study material id.');
  }

  return id.replace(/[^a-zA-Z0-9_-]/g, '-');
}

function tableColumns(db: SqliteDatabase, tableName: string) {
  return new Set(
    (db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name?: unknown }>).map((row) => String(row.name)),
  );
}

function ensureStudySchema(db: SqliteDatabase) {
  db.exec(`
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

  const columns = tableColumns(db, 'study_materials');
  const now = nowIso();
  const defaultDocument = stringifyJson(emptyStudyDocument);

  if (!columns.has('title')) {
    db.exec("ALTER TABLE study_materials ADD COLUMN title TEXT NOT NULL DEFAULT 'Новый материал'");
  }

  if (!columns.has('editor_content')) {
    db.exec(`ALTER TABLE study_materials ADD COLUMN editor_content TEXT NOT NULL DEFAULT ${sqlStringLiteral(defaultDocument)}`);
  }

  if (!columns.has('plain_text')) {
    db.exec("ALTER TABLE study_materials ADD COLUMN plain_text TEXT NOT NULL DEFAULT ''");
  }

  if (!columns.has('board_links')) {
    db.exec("ALTER TABLE study_materials ADD COLUMN board_links TEXT NOT NULL DEFAULT '[]'");
  }

  if (!columns.has('created_at')) {
    db.exec(`ALTER TABLE study_materials ADD COLUMN created_at TEXT NOT NULL DEFAULT ${sqlStringLiteral(now)}`);
  }

  if (!columns.has('updated_at')) {
    db.exec(`ALTER TABLE study_materials ADD COLUMN updated_at TEXT NOT NULL DEFAULT ${sqlStringLiteral(now)}`);
  }

  db.prepare(
    `
      UPDATE study_materials
      SET editor_content = ?
      WHERE editor_content IS NULL OR editor_content = '' OR NOT json_valid(editor_content)
    `,
  ).run(defaultDocument);

  db.prepare(
    `
      UPDATE study_materials
      SET board_links = '[]'
      WHERE board_links IS NULL OR board_links = '' OR NOT json_valid(board_links)
    `,
  ).run();

  db.prepare("UPDATE study_materials SET title = 'Новый материал' WHERE title IS NULL OR trim(title) = ''").run();
  db.prepare("UPDATE study_materials SET plain_text = '' WHERE plain_text IS NULL").run();
  db.prepare('UPDATE study_materials SET created_at = ? WHERE created_at IS NULL OR trim(created_at) = ?').run(now, '');
  db.prepare('UPDATE study_materials SET updated_at = ? WHERE updated_at IS NULL OR trim(updated_at) = ?').run(now, '');
}

async function withStudyDb<T>(operation: (db: SqliteDatabase) => T): Promise<T> {
  await ensureDataDirectory();
  await fs.mkdir(path.join(getDataDirectory(), 'assets'), { recursive: true });

  const db = new Database(getDatabasePath());

  try {
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    db.pragma('foreign_keys = ON');
    db.pragma('busy_timeout = 5000');

    ensureStudySchema(db);

    return operation(db);
  } finally {
    try {
      db.pragma('wal_checkpoint(PASSIVE)');
    } catch {
      // SQLite can checkpoint on the next opened connection.
    }

    db.close();
  }
}

function studyMaterialFromRow(row: Record<string, unknown>): StudyMaterial {
  const boardLinks = parseJson(String(row.board_links ?? '[]'), []);

  return {
    id: String(row.id),
    title: String(row.title ?? 'Новый материал'),
    editorContent: parseJson(String(row.editor_content ?? stringifyJson(emptyStudyDocument)), emptyStudyDocument),
    plainText: String(row.plain_text ?? ''),
    boardLinks: Array.isArray(boardLinks) ? boardLinks : [],
    createdAt: String(row.created_at ?? nowIso()),
    updatedAt: String(row.updated_at ?? nowIso()),
  };
}

function normalizeStudyMaterial(material: Partial<StudyMaterial> & { id: string }, existingCreatedAt?: string): StudyMaterial {
  const timestamp = nowIso();
  const boardLinks = Array.isArray(material.boardLinks) ? material.boardLinks : [];
  const editorContent = material.editorContent ?? emptyStudyDocument;

  return {
    id: sanitizeStudyMaterialId(material.id),
    title: String(material.title ?? 'Новый материал').trim() || 'Новый материал',
    editorContent,
    plainText: String(material.plainText ?? ''),
    boardLinks,
    createdAt: existingCreatedAt ?? material.createdAt ?? timestamp,
    updatedAt: timestamp,
  };
}

export async function readStudyMaterialIndex() {
  return withStudyDb((db) => {
    const rows = db
      .prepare(
        `
          SELECT id, title, plain_text, board_links, created_at, updated_at
          FROM study_materials
          ORDER BY updated_at DESC
        `,
      )
      .all() as Record<string, unknown>[];

    return rows.map((row) => {
      const boardLinks = parseJson(String(row.board_links ?? '[]'), []);

      return {
        id: String(row.id),
        title: String(row.title ?? 'Новый материал'),
        plainText: String(row.plain_text ?? ''),
        boardCount: Array.isArray(boardLinks) ? boardLinks.length : 0,
        createdAt: String(row.created_at ?? nowIso()),
        updatedAt: String(row.updated_at ?? nowIso()),
      };
    });
  });
}

export async function readStudyMaterial(materialId: string) {
  return withStudyDb((db) => {
    const row = db
      .prepare(
        `
          SELECT id, title, editor_content, plain_text, board_links, created_at, updated_at
          FROM study_materials
          WHERE id = ?
        `,
      )
      .get(sanitizeStudyMaterialId(materialId)) as Record<string, unknown> | undefined;

    return row ? studyMaterialFromRow(row) : null;
  });
}

export async function saveStudyMaterial(material: Partial<StudyMaterial> & { id: string }) {
  return withStudyDb((db) => {
    const id = sanitizeStudyMaterialId(material.id);
    const existing = db.prepare('SELECT created_at FROM study_materials WHERE id = ?').get(id) as { created_at?: string } | undefined;
    const normalized = normalizeStudyMaterial({ ...material, id }, existing?.created_at);

    const save = db.transaction(() => {
      db.prepare(
        `
          INSERT INTO study_materials (id, title, editor_content, plain_text, board_links, created_at, updated_at)
          VALUES (@id, @title, @editorContent, @plainText, @boardLinks, @createdAt, @updatedAt)
          ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            editor_content = excluded.editor_content,
            plain_text = excluded.plain_text,
            board_links = excluded.board_links,
            updated_at = excluded.updated_at
        `,
      ).run({
        id: normalized.id,
        title: normalized.title,
        editorContent: stringifyJson(normalized.editorContent),
        plainText: normalized.plainText,
        boardLinks: stringifyJson(normalized.boardLinks),
        createdAt: normalized.createdAt,
        updatedAt: normalized.updatedAt,
      });
    });

    save();

    const row = db
      .prepare(
        `
          SELECT id, title, editor_content, plain_text, board_links, created_at, updated_at
          FROM study_materials
          WHERE id = ?
        `,
      )
      .get(normalized.id) as Record<string, unknown> | undefined;

    if (!row) {
      throw new Error('Study material was not persisted.');
    }

    return studyMaterialFromRow(row);
  });
}

export async function deleteStudyMaterial(materialId: string) {
  return withStudyDb((db) => {
    db.prepare('DELETE FROM study_materials WHERE id = ?').run(sanitizeStudyMaterialId(materialId));
    return true;
  });
}