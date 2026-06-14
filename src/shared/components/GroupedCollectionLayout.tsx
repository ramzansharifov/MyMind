import type { ReactNode } from 'react';
import { ContentGroupsPanel, ContentGroupWorkspaceHeader } from './ContentGroupsPanel';
import type { ContentGroup } from '../types/common';

interface GroupedCollectionLayoutProps<T> {
  groups: ContentGroup[];
  totalCount: number;
  activeGroupId: string;
  groupCounts: Record<string, number>;
  itemCount: number;
  filters?: ReactNode;
  children: ReactNode;
  onActiveGroupChange: (groupId: string) => void;
  onGroupsChange: (groups: ContentGroup[]) => void;
  onRenameGroup: (groupId: string, title: string) => void;
  onDeleteGroup: (groupId: string) => void;
  availableItems?: T[];
  getItemLabel?: (item: T) => string;
  getItemDescription?: (item: T) => string;
  onAddItemsToGroup?: (items: T[]) => void;
}

export function GroupedCollectionLayout<T extends { id: string }>({
  groups,
  totalCount,
  activeGroupId,
  groupCounts,
  itemCount,
  filters,
  children,
  onActiveGroupChange,
  onGroupsChange,
  onRenameGroup,
  onDeleteGroup,
  availableItems,
  getItemLabel,
  getItemDescription,
  onAddItemsToGroup,
}: GroupedCollectionLayoutProps<T>) {
  return (
    <div className="grid grid-cols-[260px_minmax(0,1fr)] items-start gap-[18px] max-[980px]:grid-cols-1">
      {filters ? <div className="col-span-full">{filters}</div> : null}
      <ContentGroupsPanel
        groups={groups}
        totalCount={totalCount}
        activeGroupId={activeGroupId}
        counts={groupCounts}
        onActiveGroupChange={onActiveGroupChange}
        onGroupsChange={onGroupsChange}
      />
      <section className="min-w-0 rounded-panel border border-[var(--glass-border)] bg-[var(--panel-bg)] p-4 text-app-text [backdrop-filter:var(--glass-blur)] shadow-panel">
        <ContentGroupWorkspaceHeader
          groups={groups}
          activeGroupId={activeGroupId}
          itemCount={itemCount}
          onRenameGroup={onRenameGroup}
          onDeleteGroup={onDeleteGroup}
          availableItems={availableItems}
          getItemLabel={getItemLabel}
          getItemDescription={getItemDescription}
          onAddItemsToGroup={onAddItemsToGroup}
        />
        {children}
      </section>
    </div>
  );
}
