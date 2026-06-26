import type { ContentGroup, GroupedContentData } from '../types/common';

export function normalizeGroupedContentData<TItem extends { id: string; groupId?: string | null }>(
  data: GroupedContentData<TItem> | TItem[] | unknown,
  mapItem: (item: TItem) => TItem = (item) => item,
): GroupedContentData<TItem> {
  const timestamp = new Date().toISOString();
  const source = data as Partial<GroupedContentData<TItem>> | TItem[] | undefined;
  const rawItems = Array.isArray(source) ? source : source?.items ?? [];
  const rawGroups = Array.isArray(source) ? [] : source?.groups ?? [];
  const seenGroups = new Set<string>();
  const groups = rawGroups
    .filter((group): group is ContentGroup => {
      if (!group?.id || seenGroups.has(group.id)) {
        return false;
      }
      seenGroups.add(group.id);
      return true;
    })
    .map((group) => ({
      id: group.id,
      title: group.title || 'New group',
      createdAt: group.createdAt ?? timestamp,
      updatedAt: group.updatedAt ?? timestamp,
    }));
  const groupIds = new Set(groups.map((group) => group.id));

  return {
    items: rawItems.map((item) => {
      const mapped = mapItem(item);
      return {
        ...mapped,
        groupId: mapped.groupId && groupIds.has(mapped.groupId) ? mapped.groupId : null,
      };
    }),
    groups,
  };
}
