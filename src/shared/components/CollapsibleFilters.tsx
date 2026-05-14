import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import type { ReactNode } from 'react';
import { SearchInput } from './SearchInput';
import { useI18n } from '../i18n/I18nProvider';

interface CollapsibleFiltersProps {
  query: string;
  placeholder: string;
  isOpen?: boolean;
  activeCount?: number;
  children?: ReactNode;
  onQueryChange: (value: string) => void;
  onToggle?: () => void;
}

export function CollapsibleFilters({
  query,
  placeholder,
  isOpen = false,
  activeCount = 0,
  children,
  onQueryChange,
  onToggle,
}: CollapsibleFiltersProps) {
  const { t } = useI18n();
  const hasFilters = Boolean(children);

  return (
    <div className="collapsible-filter-shell">
      <div className="collapsible-filter-search">
        <SearchInput value={query} placeholder={placeholder} onChange={onQueryChange} />
        {hasFilters ? (
          <button className={`filter-toggle-button${isOpen ? ' active' : ''}`} type="button" aria-expanded={isOpen} onClick={onToggle}>
            <SlidersHorizontal size={17} aria-hidden="true" />
            <span>{t('Filters')}</span>
            {activeCount > 0 ? <strong>{activeCount}</strong> : null}
            <ChevronDown size={16} aria-hidden="true" />
          </button>
        ) : null}
      </div>
      {hasFilters && isOpen ? <div className="collapsible-filter-panel">{children}</div> : null}
    </div>
  );
}
