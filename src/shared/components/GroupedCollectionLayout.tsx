import type { ReactNode } from 'react';
import { ContentGroupsPanel, ContentGroupWorkspaceHeader } from './ContentGroupsPanel';
import type { ContentGroup } from '../types/common';

interface GroupedCollectionLayoutProps {
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
}

export function GroupedCollectionLayout({
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
}: GroupedCollectionLayoutProps) {
  return (
    <div className="todo-workspace grouped-collection-layout">
      {filters ? <div className="todo-filters-row grouped-collection-filters">{filters}</div> : null}
      <ContentGroupsPanel
        groups={groups}
        totalCount={totalCount}
        activeGroupId={activeGroupId}
        counts={groupCounts}
        onActiveGroupChange={onActiveGroupChange}
        onGroupsChange={onGroupsChange}
      />
      <section className="todo-list-panel grouped-collection-panel">
        <ContentGroupWorkspaceHeader
          groups={groups}
          activeGroupId={activeGroupId}
          itemCount={itemCount}
          onRenameGroup={onRenameGroup}
          onDeleteGroup={onDeleteGroup}
        />
        {children}
      </section>
    </div>
  );
}
