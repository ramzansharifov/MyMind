import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Check } from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider';

interface ChoiceTileProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  description?: string;
  icon?: ReactNode;
  active?: boolean;
}

export function ChoiceTile({ label, description, icon, active = false, className = '', ...props }: ChoiceTileProps) {
  const { t } = useI18n();

  return (
    <button className={['choice-tile', active ? 'active' : '', className].filter(Boolean).join(' ')} type="button" {...props}>
      <span className="choice-tile-mark">{active ? <Check size={16} aria-hidden="true" /> : null}</span>
      {icon ? <span className="choice-tile-icon">{icon}</span> : null}
      <span className="choice-tile-copy">
        <strong>{t(label)}</strong>
        {description ? <small>{t(description)}</small> : null}
      </span>
    </button>
  );
}
