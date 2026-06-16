import type { ReactNode } from 'react';
import { Search } from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider';
import { cn } from '../utils/classNames';

export interface LibrarySidebarStat {
  id: string;
  label: string;
  value: number | string;
  icon?: ReactNode;
}

interface LibrarySidebarProps {
  eyebrow?: string;
  title: string;
  actions?: ReactNode;
  stats?: LibrarySidebarStat[];
  searchValue?: string;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  sectionLabel?: string;
  sectionAction?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function LibrarySidebar({
  eyebrow = 'Library',
  title,
  actions,
  stats,
  searchValue,
  searchPlaceholder = 'Search',
  onSearchChange,
  sectionLabel,
  sectionAction,
  children,
  footer,
  className = '',
  contentClassName = '',
}: LibrarySidebarProps) {
  const { t } = useI18n();
  const hasSearch = typeof searchValue === 'string' && onSearchChange;

  return (
    <aside
      className={cn(
        'sticky top-0 flex h-[calc(100vh-48px)] flex-col overflow-hidden border-r border-app-border',
        'bg-[linear-gradient(180deg,color-mix(in_srgb,var(--surface)_94%,var(--accent)_6%),var(--surface))] p-4 text-app-text',
        'max-[980px]:static max-[980px]:h-auto',
        className,
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="block text-[11px] font-extrabold uppercase tracking-[0.08em] text-app-muted">{t(eyebrow)}</span>
          <strong className="block truncate text-base font-extrabold text-app-text">{t(title)}</strong>
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>

      {stats?.length ? (
        <div className="mb-3 grid grid-cols-2 gap-2" aria-label={t(`${title} stats`)}>
          {stats.map((stat) => (
            <span className={statPillClass} key={stat.id} title={t(stat.label)}>
              {stat.icon}
              {stat.value}
            </span>
          ))}
        </div>
      ) : null}

      {hasSearch ? (
        <label className="mb-3 flex min-h-control items-center gap-2 rounded-control border border-app-border bg-app-surface-soft px-3 text-app-muted focus-within:border-[color-mix(in_srgb,var(--accent)_56%,var(--border))]">
          <Search size={16} aria-hidden="true" />
          <input
            className="min-w-0 flex-1 border-0 bg-transparent px-0 shadow-none outline-none focus:border-0 focus:shadow-none"
            value={searchValue}
            placeholder={t(searchPlaceholder)}
        onChange={(event) => onSearchChange?.(event.target.value)}
          />
        </label>
      ) : null}

      {(sectionLabel || sectionAction) ? (
        <div className="mb-2 flex items-center justify-between gap-3 text-xs font-bold text-app-muted">
          {sectionLabel ? <span>{t(sectionLabel)}</span> : <span />}
          {sectionAction}
        </div>
      ) : null}

      <div className={cn('min-h-0 flex-1 overflow-y-auto pr-1', contentClassName)}>{children}</div>
      {footer ? <div className="mt-3 border-t border-[var(--line-soft)] pt-3">{footer}</div> : null}
    </aside>
  );
}

const statPillClass =
  'inline-flex min-h-control items-center justify-center gap-2 rounded-control border border-app-border bg-app-surface-soft px-3 text-sm font-bold text-app-accent-strong';
