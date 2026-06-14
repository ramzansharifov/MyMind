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
    <section className="min-w-0">
      <PageHeader title={title} subtitle={subtitle} actions={actions} />
      {filters ? <div className="mb-[18px]">{filters}</div> : null}
      {children}
    </section>
  );
}
