import type { CSSProperties, ReactNode } from 'react';
import { useState } from 'react';
import type { ModuleKey, SidebarSettings } from '../types/common';
import { Sidebar } from './Sidebar';
import { cn } from '../utils/classNames';

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
  const sidebarWidth = isEffectiveSidebarCollapsed ? '76px' : '260px';

  return (
    <div
      className="grid min-h-screen grid-cols-[var(--sidebar-width)_minmax(0,1fr)] transition-[grid-template-columns] duration-200 ease-out"
      style={{ '--sidebar-width': sidebarWidth } as CSSProperties}
    >
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
      <main className={cn('h-screen min-w-0 overflow-y-auto overflow-x-hidden bg-transparent', isStudyMode ? 'p-0' : 'p-8')}>
        {children}
      </main>
    </div>
  );
}
