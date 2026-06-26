import type Database from 'better-sqlite3';
import { assertCollectionName, defaultValue, nowIso, type CollectionName } from '../../ipc/storageRegistry';
import { getDataDirectory, parseJson, stringifyJson } from '../core';

type SqliteDatabase = Database.Database;

interface CollectionRepositoryOptions {
  getDb: () => SqliteDatabase;
}

export function createCollectionRepository({ getDb }: CollectionRepositoryOptions) {
  async function readCollection(collectionName: CollectionName) {
    const safeName = assertCollectionName(collectionName);
    const row = getDb()
      .prepare('SELECT payload FROM collections WHERE name = ?')
      .get(safeName) as { payload: string } | undefined;

    if (!row) {
      const fallback = defaultValue(safeName, getDataDirectory());
      await writeCollection(safeName, fallback);
      return fallback;
    }

    return parseJson(row.payload, defaultValue(safeName, getDataDirectory()));
  }

  async function writeCollection(collectionName: CollectionName, value: unknown) {
    const safeName = assertCollectionName(collectionName);
    const now = nowIso();

    getDb()
      .prepare(`
        INSERT INTO collections (name, payload, created_at, updated_at)
        VALUES (@name, @payload, @createdAt, @updatedAt)
        ON CONFLICT(name) DO UPDATE SET
          payload = excluded.payload,
          updated_at = excluded.updated_at
      `)
      .run({
        name: safeName,
        payload: stringifyJson(value),
        createdAt: now,
        updatedAt: now,
      });

    return readCollection(safeName);
  }

  async function addCollectionItem(collectionName: CollectionName, item: { id: string }) {
    const previous = await readCollection(collectionName);
    const list = ensureListCollection(collectionName, previous);
    list.push(item);
    await writeListCollection(collectionName, previous, list);
    return item;
  }

  async function updateCollectionItem(collectionName: CollectionName, item: { id: string }) {
    const previous = await readCollection(collectionName);
    const list = ensureListCollection(collectionName, previous);
    const index = list.findIndex((existing) => existing.id === item.id);
    if (index === -1) {
      list.push(item);
    } else {
      list[index] = item;
    }
    await writeListCollection(collectionName, previous, list);
    return item;
  }

  async function deleteCollectionItem(collectionName: CollectionName, id: string) {
    const previous = await readCollection(collectionName);
    const list = ensureListCollection(collectionName, previous);
    await writeListCollection(
      collectionName,
      previous,
      list.filter((item) => item.id !== id),
    );
    return true;
  }

  async function writeListCollection(collectionName: CollectionName, previousValue: unknown, items: Array<{ id: string }>) {
    if (Array.isArray(previousValue)) {
      await writeCollection(collectionName, items);
      return;
    }

    if (previousValue && typeof previousValue === 'object' && Array.isArray((previousValue as { items?: unknown }).items)) {
      await writeCollection(collectionName, { ...(previousValue as Record<string, unknown>), items });
      return;
    }

    await writeCollection(collectionName, items);
  }

  return {
    readCollection,
    writeCollection,
    addCollectionItem,
    updateCollectionItem,
    deleteCollectionItem,
  };
}

function ensureListCollection(collectionName: CollectionName, value: unknown): Array<{ id: string }> {
  if (Array.isArray(value)) {
    return value.filter((item): item is { id: string } => Boolean(item && typeof item === 'object' && 'id' in item));
  }

  if (value && typeof value === 'object' && Array.isArray((value as { items?: unknown }).items)) {
    return ((value as { items: unknown[] }).items).filter(
      (item): item is { id: string } => Boolean(item && typeof item === 'object' && 'id' in item),
    );
  }

  throw new Error(`${collectionName} does not support item-level storage operations`);
}
