import type { ReactNode } from 'react';
import { useI18n } from '../i18n/I18nProvider';
import { cn } from '../utils/classNames';

export interface PageTab<T extends string> {
  id: T;
  label: string;
  icon?: ReactNode;
  count?: number;
}

interface PageTabsProps<T extends string> {
  tabs: Array<PageTab<T>>;
  activeTab: T;
  ariaLabel: string;
  onChange: (tab: T) => void;
  className?: string;
  fullWidth?: boolean;
}

export function PageTabs<T extends string>({
  tabs,
  activeTab,
  ariaLabel,
  onChange,
  className = '',
  fullWidth = false,
}: PageTabsProps<T>) {
  const { t } = useI18n();

  return (
    <div
      className={cn(
        'mb-[22px] flex max-w-full flex-wrap items-center gap-1 rounded-panel border border-app-border bg-app-surface-soft p-1',
        fullWidth ? 'w-full' : 'w-fit',
        className,
      )}
      role="tablist"
      aria-label={t(ariaLabel)}
    >
      {tabs.map((tab) => (
        <button
          className={cn(
            'inline-flex min-h-[38px] items-center justify-center gap-2 rounded-md border border-transparent bg-transparent px-3 text-sm font-extrabold text-app-muted transition-colors',
            'hover:border-[color-mix(in_srgb,var(--accent)_30%,transparent)] hover:bg-[color-mix(in_srgb,var(--accent)_16%,var(--surface-strong))] hover:text-app-accent-strong',
            fullWidth && 'flex-1',
            activeTab === tab.id &&
              'border-[color-mix(in_srgb,var(--accent)_44%,transparent)] bg-[color-mix(in_srgb,var(--accent)_16%,var(--surface-strong))] text-app-accent-strong',
          )}
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          onClick={() => onChange(tab.id)}
        >
          {tab.icon}
          <span>{t(tab.label)}</span>
          {typeof tab.count === 'number' ? (
            <strong className="inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-app-border bg-app-chip px-2 text-xs text-app-chip-text">
              {tab.count}
            </strong>
          ) : null}
        </button>
      ))}
    </div>
  );
}
