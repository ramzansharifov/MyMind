import type { ReactNode } from 'react';
import { PageHeader } from './PageHeader';

interface ModulePageShellProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  filters?: ReactNode;
  children: ReactNode;
}

export function ModulePageShell({ title, subtitle, actions, filters, children }: ModulePageShellProps) {
  return (
    <section className="module-page-shell">
      <PageHeader title={title} subtitle={subtitle} actions={actions} />
      {filters ? <div className="module-page-filters">{filters}</div> : null}
      {children}
    </section>
  );
}
