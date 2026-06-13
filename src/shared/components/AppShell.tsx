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
  const isStudyMode = active === 'study';
  const isEffectiveSidebarCollapsed = isStudyMode || isSidebarCollapsed;

  return (
    <div className={`app-shell ${isEffectiveSidebarCollapsed ? 'sidebar-collapsed' : ''} ${isStudyMode ? 'study-shell' : ''}`}>
      <Sidebar
        active={active}
        isCollapsed={isEffectiveSidebarCollapsed}
        canToggleCollapse={!isStudyMode}
        onNavigate={onNavigate}
        onToggleCollapse={() => {
          if (!isStudyMode) {
            setIsSidebarCollapsed((current) => !current);
          }
        }}
        sidebarSettings={sidebarSettings}
        onSidebarSettingsChange={onSidebarSettingsChange}
        reminderBadges={reminderBadges}
      />
      <main className="main-content">{children}</main>
    </div>
  );
}
