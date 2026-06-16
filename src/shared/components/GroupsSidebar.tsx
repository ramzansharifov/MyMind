import type { ReactNode } from 'react';
import { AddButton } from './ActionButtons';
import { useI18n } from '../i18n/I18nProvider';
import { cn } from '../utils/classNames';

export interface GroupsSidebarItem {
  id: string;
  title: string;
  icon?: ReactNode;
  disabled?: boolean;
}

interface GroupsSidebarProps {
  title?: string;
  totalCount: number;
  groups: GroupsSidebarItem[];
  activeGroupId: string;
  ariaLabel?: string;
  getGroupCount: (groupId: string) => number;
  onActiveGroupChange: (groupId: string) => void;
  onCreateGroup?: () => void;
  createLabel?: string;
  children?: ReactNode;
  className?: string;
}

export function GroupsSidebar({
  title = 'Groups',
  totalCount,
  groups,
  activeGroupId,
  ariaLabel = title,
  getGroupCount,
  onActiveGroupChange,
  onCreateGroup,
  createLabel = 'Add group',
  children,
  className = '',
}: GroupsSidebarProps) {
  const { t } = useI18n();

  return (
    <aside className={cn('grid content-start gap-3 rounded-panel border border-app-border bg-app-surface-soft p-3 text-app-text shadow-panel [backdrop-filter:var(--glass-blur)]', className)}>
      <div className="flex items-center justify-between gap-3 border-b border-[var(--line-soft)] pb-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <h2 className="truncate text-lg font-extrabold">{t(title)}</h2>
          <span className={countPillClass}>{totalCount}</span>
        </div>
        {onCreateGroup ? <AddButton iconOnly label={createLabel} onClick={onCreateGroup} /> : null}
      </div>

      <div className="grid gap-2" role="tablist" aria-label={t(ariaLabel)}>
        {groups.map((group) => (
          <button
            className={cn(groupTabClass, activeGroupId === group.id && groupTabActiveClass)}
            key={group.id}
            type="button"
            disabled={group.disabled}
            onClick={() => onActiveGroupChange(group.id)}
          >
            <span className="flex min-w-0 items-center gap-2">
              {group.icon}
              <span className="min-w-0 truncate">{t(group.title)}</span>
            </span>
            <small className="shrink-0 text-xs font-extrabold text-app-muted">{getGroupCount(group.id)}</small>
          </button>
        ))}
      </div>

      {children}
    </aside>
  );
}

const countPillClass =
  'inline-flex h-7 min-w-7 items-center justify-center rounded-full border border-app-border bg-app-chip px-2 text-xs font-extrabold text-app-chip-text';

const groupTabClass =
  'grid min-h-control w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-control border border-app-border bg-app-surface-soft px-3 py-2 text-left text-sm font-bold text-app-text transition-colors hover:border-[color-mix(in_srgb,var(--accent)_45%,var(--border))] hover:bg-[var(--control-bg-hover)] disabled:cursor-not-allowed disabled:opacity-55';

const groupTabActiveClass =
  'border-[var(--accent-border)] bg-[var(--selected-bg)] text-app-accent-strong shadow-[inset_3px_0_0_var(--accent)]';
