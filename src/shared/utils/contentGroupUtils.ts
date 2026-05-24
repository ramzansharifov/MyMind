export function matchesContentGroup(groupId: string | null | undefined, activeGroupId: string) {
  return activeGroupId === 'all' || groupId === activeGroupId;
}

export function countItemsByContentGroup<T extends { groupId?: string | null }>(items: T[]) {
  return items.reduce<Record<string, number>>((result, item) => {
    if (item.groupId) {
      result[item.groupId] = (result[item.groupId] ?? 0) + 1;
    }
    return result;
  }, {});
}
