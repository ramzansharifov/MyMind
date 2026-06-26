import type { ReactNode } from 'react';
import { useI18n } from '../i18n';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  const { t } = useI18n();
  return (
    <header className="mb-[22px] flex items-start justify-between gap-6">
      <div className="min-w-0">
        <h1 className="text-[34px] font-extrabold tracking-normal text-app-text">{t(title)}</h1>
        {subtitle ? <p className="mt-1.5 max-w-[720px] text-app-muted">{t(subtitle)}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
