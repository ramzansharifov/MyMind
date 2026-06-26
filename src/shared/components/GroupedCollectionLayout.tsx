import type { ReactNode } from 'react';
import { ContentGroupsPanel, ContentGroupWorkspaceHeader } from './ContentGroupsPanel';
import type { ContentGroup } from '../types/common';

interface GroupedCollectionLayoutProps<T, TGroup extends ContentGroup = ContentGroup> {
  groups: TGroup[];
  sidebarGroups?: TGroup[];
  headerGroups?: TGroup[];
  totalCount: number;
  activeGroupId: string;
  groupCounts?: Record<string, number>;
  getGroupCount?: (groupId: string) => number;
  itemCount: number;
  filters?: ReactNode;
  workspaceHeader?: ReactNode;
  children: ReactNode;
  canManageGroup?: (group: TGroup) => boolean;
  onActiveGroupChange: (groupId: string) => void;
  onGroupsChange: (groups: TGroup[]) => void;
  onRenameGroup: (groupId: string, title: string) => void;
  onDeleteGroup: (groupId: string) => void;
  onCreateGroup?: () => void;
  createGroupDialog?: ReactNode;
  createLabel?: string;
  availableItems?: T[];
  getItemLabel?: (item: T) => string;
  getItemDescription?: (item: T) => string;
  onAddItemsToGroup?: (items: T[]) => void;
}

export function GroupedCollectionLayout<T extends { id: string }, TGroup extends ContentGroup = ContentGroup>({
  groups,
  sidebarGroups,
  headerGroups,
  totalCount,
  activeGroupId,
  groupCounts = {},
  getGroupCount,
  itemCount,
  filters,
  workspaceHeader,
  children,
  canManageGroup,
  onActiveGroupChange,
  onGroupsChange,
  onRenameGroup,
  onDeleteGroup,
  onCreateGroup,
  createGroupDialog,
  createLabel,
  availableItems,
  getItemLabel,
  getItemDescription,
  onAddItemsToGroup,
}: GroupedCollectionLayoutProps<T, TGroup>) {
  const workspaceGroups = headerGroups ?? sidebarGroups ?? [
    { id: 'all', title: 'All', createdAt: 'system', updatedAt: 'system' } as TGroup,
    ...groups,
  ];

  return (
    <div className="grid grid-cols-[260px_minmax(0,1fr)] items-start gap-[18px] max-[980px]:grid-cols-1">
      {filters ? <div className="col-span-full">{filters}</div> : null}
      <ContentGroupsPanel
        groups={groups}
        sidebarGroups={sidebarGroups}
        totalCount={totalCount}
        activeGroupId={activeGroupId}
        counts={groupCounts}
        getGroupCount={getGroupCount}
        onActiveGroupChange={onActiveGroupChange}
        onGroupsChange={onGroupsChange}
        onCreateGroup={onCreateGroup}
        createGroupDialog={createGroupDialog}
        createLabel={createLabel}
      />
      <section className="min-w-0 rounded-panel border border-[var(--glass-border)] bg-[var(--panel-bg)] p-4 text-app-text [backdrop-filter:var(--glass-blur)] shadow-panel">
        {workspaceHeader ?? (
          <ContentGroupWorkspaceHeader
            groups={workspaceGroups}
            activeGroupId={activeGroupId}
            itemCount={itemCount}
            onRenameGroup={onRenameGroup}
            onDeleteGroup={onDeleteGroup}
            canManageGroup={canManageGroup}
            availableItems={availableItems}
            getItemLabel={getItemLabel}
            getItemDescription={getItemDescription}
            onAddItemsToGroup={onAddItemsToGroup}
          />
        )}
        {children}
      </section>
    </div>
  );
}
