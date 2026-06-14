import type { ReactNode } from 'react';
import { useI18n } from '../i18n/I18nProvider';
import { cn } from '../utils/classNames';

export interface SegmentedTab<T extends string> {
  id: T;
  label: string;
  icon?: ReactNode;
}

interface SegmentedTabsProps<T extends string> {
  tabs: Array<SegmentedTab<T>>;
  activeTab: T;
  ariaLabel: string;
  onChange: (tab: T) => void;
  className?: string;
}

export function SegmentedTabs<T extends string>({ tabs, activeTab, ariaLabel, onChange, className = '' }: SegmentedTabsProps<T>) {
  const { t } = useI18n();

  return (
    <div className={cn('mb-[22px] inline-flex w-fit max-w-full flex-wrap items-center gap-1 rounded-panel border border-app-border bg-app-surface-soft p-1', className)} role="tablist" aria-label={t(ariaLabel)}>
      {tabs.map((tab) => (
        <button
          className={cn(
            'inline-flex min-h-[38px] items-center justify-center gap-2 rounded-md border-0 bg-transparent px-3 font-extrabold text-app-muted',
            'hover:bg-[color-mix(in_srgb,var(--accent)_16%,var(--surface-strong))] hover:text-app-accent-strong',
            activeTab === tab.id && 'bg-[color-mix(in_srgb,var(--accent)_16%,var(--surface-strong))] text-app-accent-strong',
          )}
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          onClick={() => onChange(tab.id)}
        >
          {tab.icon}
          <span>{t(tab.label)}</span>
        </button>
      ))}
    </div>
  );
}
