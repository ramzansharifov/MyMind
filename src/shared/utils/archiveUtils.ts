export const TRASH_RETENTION_DAYS = 30;

export interface LifecycleEntity {
  id: string;
  updatedAt: string;
  archivedAt?: string | null;
  trashedAt?: string | null;
  trashExpiresAt?: string | null;
  status?: string;
  statusBeforeArchive?: string | null;
  statusBeforeTrash?: string | null;
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function getTrashExpirationDate(trashedAt: string) {
  return addDays(new Date(trashedAt), TRASH_RETENTION_DAYS).toISOString();
}

export function isArchived(item: LifecycleEntity) {
  return Boolean(item.archivedAt || item.status === 'archived');
}

export function isTrashed(item: LifecycleEntity) {
  return Boolean(item.trashedAt);
}

export function isHiddenFromRegularLists(item: LifecycleEntity) {
  return isTrashed(item) || isArchived(item);
}

export function archiveEntity<T extends LifecycleEntity>(item: T, options: { setArchivedStatus?: boolean } = {}): T {
  const timestamp = new Date().toISOString();
  const shouldStoreStatus = options.setArchivedStatus && item.status && item.status !== 'archived';
  return {
    ...item,
    archivedAt: timestamp,
    trashedAt: null,
    trashExpiresAt: null,
    status: options.setArchivedStatus ? 'archived' : item.status,
    statusBeforeArchive: shouldStoreStatus ? item.status : item.statusBeforeArchive ?? null,
    statusBeforeTrash: null,
    updatedAt: timestamp,
  };
}

export function trashEntity<T extends LifecycleEntity>(item: T): T {
  const timestamp = new Date().toISOString();
  return {
    ...item,
    trashedAt: timestamp,
    trashExpiresAt: getTrashExpirationDate(timestamp),
    statusBeforeTrash: item.status && item.status !== 'archived' ? item.status : item.statusBeforeTrash ?? null,
    updatedAt: timestamp,
  };
}

export function restoreEntity<T extends LifecycleEntity>(item: T, fallbackStatus?: string): T {
  const timestamp = new Date().toISOString();
  const restoredStatus = item.status === 'archived' ? item.statusBeforeArchive ?? item.statusBeforeTrash ?? fallbackStatus ?? item.status : item.status;
  return {
    ...item,
    archivedAt: null,
    trashedAt: null,
    trashExpiresAt: null,
    status: restoredStatus,
    statusBeforeArchive: null,
    statusBeforeTrash: null,
    updatedAt: timestamp,
  };
}
