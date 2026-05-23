import { useMemo } from 'react';
import { archiveEntity, isHiddenFromRegularLists, trashEntity } from '../utils/archiveUtils';

type EntityLike = {
  id: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
  trashedAt?: string | null;
  pinnedAt?: string | null;
  status?: string;
};

interface UseCollectionItemsOptions<T extends EntityLike> {
  items: T[];
  onChange: (items: T[]) => void;
  search?: string;
  searchText?: (item: T) => string;
}

export function useCollectionItems<T extends EntityLike>({ items, onChange, search = '', searchText }: UseCollectionItemsOptions<T>) {
  const normalizedSearch = search.trim().toLowerCase();

  const visibleItems = useMemo(() => items.filter((item) => !isHiddenFromRegularLists(item)), [items]);
  const filteredItems = useMemo(() => {
    const filtered = normalizedSearch
      ? visibleItems.filter((item) => (searchText?.(item) ?? '').toLowerCase().includes(normalizedSearch))
      : visibleItems;

    return [...filtered].sort((a, b) => Number(Boolean(b.pinnedAt)) - Number(Boolean(a.pinnedAt)) || b.updatedAt.localeCompare(a.updatedAt));
  }, [normalizedSearch, searchText, visibleItems]);

  function upsertItem(item: T) {
    const exists = items.some((current) => current.id === item.id);
    onChange(exists ? items.map((current) => (current.id === item.id ? item : current)) : [item, ...items]);
  }

  function archiveItem(item: T) {
    onChange(items.map((current) => (current.id === item.id ? archiveEntity(current, { setArchivedStatus: typeof current.status === 'string' }) : current)));
  }

  function trashItem(item: T) {
    onChange(items.map((current) => (current.id === item.id ? trashEntity(current) : current)));
  }

  function togglePin(item: T) {
    const timestamp = new Date().toISOString();
    onChange(items.map((current) => (current.id === item.id ? { ...current, pinnedAt: current.pinnedAt ? null : timestamp, updatedAt: timestamp } : current)));
  }

  return {
    visibleItems,
    filteredItems,
    upsertItem,
    archiveItem,
    trashItem,
    togglePin,
  };
}
