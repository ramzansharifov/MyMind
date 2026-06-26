import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import type { ReactNode } from 'react';
import { SearchInput } from './SearchInput';
import { useI18n } from '../i18n';
import { cn } from '../utils/classNames';

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
    <div className="mb-5 grid gap-2.5">
      <div className="grid grid-cols-[minmax(260px,1fr)_auto] items-end gap-3 max-[900px]:grid-cols-1">
        <SearchInput value={query} placeholder={placeholder} onChange={onQueryChange} />
        {hasFilters ? (
          <button
            className={cn(
              'inline-flex min-h-11 items-center gap-2 rounded-panel border border-[var(--glass-border)] bg-[color-mix(in_srgb,var(--glass-surface-strong)_76%,transparent)] px-3 py-2.5 text-app-text [backdrop-filter:var(--glass-blur)]',
              'hover:border-[color-mix(in_srgb,var(--accent)_52%,var(--border))] hover:bg-[color-mix(in_srgb,var(--accent)_12%,var(--surface-strong))]',
              isOpen && 'border-[color-mix(in_srgb,var(--accent)_52%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_12%,var(--surface-strong))]',
            )}
            type="button"
            aria-expanded={isOpen}
            onClick={onToggle}
          >
            <SlidersHorizontal size={17} aria-hidden="true" />
            <span>{t('Filters')}</span>
            {activeCount > 0 ? <strong className="grid h-5 min-w-5 place-items-center rounded-full bg-app-accent px-1.5 text-xs leading-none text-white">{activeCount}</strong> : null}
            <ChevronDown className={cn(isOpen && 'rotate-180')} size={16} aria-hidden="true" />
          </button>
        ) : null}
      </div>
      {hasFilters && isOpen ? (
        <div className="grid gap-3.5 rounded-panel border border-[var(--glass-border)] bg-[var(--glass-surface-soft)] p-3.5 [backdrop-filter:var(--glass-blur)]">
          {children}
        </div>
      ) : null}
    </div>
  );
}
