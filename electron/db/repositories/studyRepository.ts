import Database from 'better-sqlite3';
import fs from 'node:fs/promises';
import path from 'node:path';
import { configureSqliteDatabase, ensureDataDirectory, getDataDirectory, getDatabasePath, parseJson, stringifyJson } from '../core';
import { nowIso } from '../../ipc/storageRegistry';

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


function sqlStringLiteral(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}


const cp1252UnicodeToByte = new Map<number, number>([
  [0x20ac, 0x80], [0x201a, 0x82], [0x0192, 0x83], [0x201e, 0x84], [0x2026, 0x85],
  [0x2020, 0x86], [0x2021, 0x87], [0x02c6, 0x88], [0x2030, 0x89], [0x0160, 0x8a],
  [0x2039, 0x8b], [0x0152, 0x8c], [0x017d, 0x8e], [0x2018, 0x91], [0x2019, 0x92],
  [0x201c, 0x93], [0x201d, 0x94], [0x2022, 0x95], [0x2013, 0x96], [0x2014, 0x97],
  [0x02dc, 0x98], [0x2122, 0x99], [0x0161, 0x9a], [0x203a, 0x9b], [0x0153, 0x9c],
  [0x017e, 0x9e], [0x0178, 0x9f],
]);

const mojibakeRunPattern = /[\u0080-\u009f\u00a0-\u00ff\u20ac\u201a\u0192\u201e\u2026\u2020\u2021\u02c6\u2030\u0160\u2039\u0152\u017d\u2018\u2019\u201c\u201d\u2022\u2013\u2014\u02dc\u2122\u0161\u203a\u0153\u017e\u0178]+/g;
const cyrillicPattern = /[\u0400-\u04ff]/;

function cp1252ByteForChar(char: string) {
  const code = char.charCodeAt(0);
  if (code <= 0xff) return code;
  return cp1252UnicodeToByte.get(code);
}

function decodeMojibakeOnce(text: string) {
  return text.replace(mojibakeRunPattern, (segment) => {
    const bytes: number[] = [];

    for (const char of segment) {
      const byte = cp1252ByteForChar(char);
      if (byte === undefined) return segment;
      bytes.push(byte);
    }

    const decoded = Buffer.from(bytes).toString('utf8');
    return decoded.includes('\uFFFD') || !cyrillicPattern.test(decoded) ? segment : decoded;
  });
}

function repairMojibakeText(value: unknown) {
  let current = String(value ?? '');

  for (let index = 0; index < 4; index += 1) {
    const next = decodeMojibakeOnce(current);
    if (next === current) break;
    current = next;
  }

  return current;
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
    configureSqliteDatabase(db);

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
    title: repairMojibakeText(row.title ?? 'Новый материал'),
    editorContent: parseJson(String(row.editor_content ?? stringifyJson(emptyStudyDocument)), emptyStudyDocument),
    plainText: repairMojibakeText(row.plain_text ?? ''),
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
    title: repairMojibakeText(material.title ?? 'Новый материал').trim() || 'Новый материал',
    editorContent,
    plainText: repairMojibakeText(material.plainText ?? ''),
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
        title: repairMojibakeText(row.title ?? 'Новый материал'),
        plainText: repairMojibakeText(row.plain_text ?? ''),
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