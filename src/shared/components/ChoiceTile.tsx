import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Check } from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider';
import { cn } from '../utils/classNames';

interface ChoiceTileProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  description?: string;
  icon?: ReactNode;
  active?: boolean;
}

export function ChoiceTile({ label, description, icon, active = false, className = '', ...props }: ChoiceTileProps) {
  const { t } = useI18n();

  return (
    <button
      className={cn(
        'grid min-h-[58px] w-full grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-3 rounded-panel border border-[var(--glass-border)] bg-[var(--glass-surface-soft)] p-3 text-left text-app-text transition-[border-color,background,box-shadow] duration-150',
        'hover:border-[color-mix(in_srgb,var(--accent)_48%,var(--glass-border))] hover:bg-[color-mix(in_srgb,var(--accent)_14%,var(--glass-surface-soft))]',
        active && 'border-[color-mix(in_srgb,var(--accent)_48%,var(--glass-border))] bg-[color-mix(in_srgb,var(--accent)_14%,var(--glass-surface-soft))]',
        className,
      )}
      type="button"
      {...props}
    >
      <span
        className={cn(
          'grid h-[22px] w-[22px] place-items-center rounded-md border border-[var(--glass-border)] bg-app-surface-soft text-app-surface-strong',
          active && 'border-[color-mix(in_srgb,var(--accent)_56%,var(--border))] bg-app-accent',
        )}
      >
        {active ? <Check size={16} aria-hidden="true" /> : null}
      </span>
      {icon ? (
        <span className="grid h-[38px] w-[38px] place-items-center rounded-panel border border-[color-mix(in_srgb,var(--accent)_30%,var(--glass-border))] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-app-accent">
          {icon}
        </span>
      ) : null}
      <span className="min-w-0">
        <strong className="block break-words">{t(label)}</strong>
        {description ? <small className="mt-0.5 block break-words text-app-muted">{t(description)}</small> : null}
      </span>
    </button>
  );
}
