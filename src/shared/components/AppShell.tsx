import type { ReactNode } from 'react';
import { useState } from 'react';
import type { ModuleKey } from '../types/common';
import { Sidebar } from './Sidebar';

interface AppShellProps {
  active: ModuleKey;
  onNavigate: (key: ModuleKey) => void;
  reminderBadges?: Partial<Record<ModuleKey, number>>;
  children: ReactNode;
}

export function AppShell({ active, onNavigate, reminderBadges, children }: AppShellProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className={`app-shell ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar
        active={active}
        isCollapsed={isSidebarCollapsed}
        onNavigate={onNavigate}
        onToggleCollapse={() => setIsSidebarCollapsed((current) => !current)}
        reminderBadges={reminderBadges}
      />
      <main className="main-content">{children}</main>
    </div>
  );
}
