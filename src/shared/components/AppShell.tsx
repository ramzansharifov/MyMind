import type { ReactNode } from 'react';
import type { ModuleKey } from '../types/common';
import { Sidebar } from './Sidebar';

interface AppShellProps {
  active: ModuleKey;
  onNavigate: (key: ModuleKey) => void;
  reminderBadges?: Partial<Record<ModuleKey, number>>;
  children: ReactNode;
}

export function AppShell({ active, onNavigate, reminderBadges, children }: AppShellProps) {
  return (
    <div className="app-shell">
      <Sidebar active={active} onNavigate={onNavigate} reminderBadges={reminderBadges} />
      <main className="main-content">{children}</main>
    </div>
  );
}
