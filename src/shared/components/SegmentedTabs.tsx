import type { ReactNode } from 'react';
import { useI18n } from '../i18n/I18nProvider';

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
    <div className={['segmented-tabs', className].filter(Boolean).join(' ')} role="tablist" aria-label={t(ariaLabel)}>
      {tabs.map((tab) => (
        <button
          className={`segmented-tab${activeTab === tab.id ? ' active' : ''}`}
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
