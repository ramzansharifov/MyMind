import type Database from 'better-sqlite3';

export function configureSqliteDatabase(db: Database.Database) {
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');
  db.pragma('temp_store = MEMORY');
  db.pragma('busy_timeout = 5000');
}
