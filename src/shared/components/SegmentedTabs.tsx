import type { ReactNode } from 'react';
import { PageTabs } from './PageTabs';

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
  return <PageTabs tabs={tabs} activeTab={activeTab} ariaLabel={ariaLabel} onChange={onChange} className={className} />;
}
