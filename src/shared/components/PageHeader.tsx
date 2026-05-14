import type { ReactNode } from 'react';
import { useI18n } from '../i18n/I18nProvider';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  const { t } = useI18n();
  return (
    <header className="page-header">
      <div>
        <h1>{t(title)}</h1>
        {subtitle ? <p>{t(subtitle)}</p> : null}
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </header>
  );
}
