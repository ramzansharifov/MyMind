import type { ReactNode } from 'react';
import { useState } from 'react';
import type { ModuleKey, SidebarSettings } from '../types/common';
import { Sidebar } from './Sidebar';

interface AppShellProps {
  active: ModuleKey;
  onNavigate: (key: ModuleKey) => void;
  sidebarSettings: SidebarSettings;
  onSidebarSettingsChange: (settings: SidebarSettings) => void;
  reminderBadges?: Partial<Record<ModuleKey, number>>;
  children: ReactNode;
}

export function AppShell({ active, onNavigate, sidebarSettings, onSidebarSettingsChange, reminderBadges, children }: AppShellProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className={`app-shell ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar
        active={active}
        isCollapsed={isSidebarCollapsed}
        onNavigate={onNavigate}
        onToggleCollapse={() => setIsSidebarCollapsed((current) => !current)}
        sidebarSettings={sidebarSettings}
        onSidebarSettingsChange={onSidebarSettingsChange}
        reminderBadges={reminderBadges}
      />
      <main className="main-content">{children}</main>
    </div>
  );
}
