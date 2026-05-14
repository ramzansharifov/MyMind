import {
  Activity,
  BookOpen,
  CalendarHeart,
  CheckSquare,
  Clapperboard,
  Contact,
  Dumbbell,
  Film,
  Flag,
  HeartPulse,
  Home,
  Landmark,
  Lightbulb,
  Package,
  Settings,
} from 'lucide-react';
import type { ComponentType } from 'react';
import type { ModuleKey } from '../types/common';
import { useI18n } from '../i18n/I18nProvider';

interface SidebarItem {
  key: ModuleKey;
  label: string;
  icon: ComponentType<{ size?: number; 'aria-hidden'?: boolean | 'true' | 'false' }>;
}

const items: SidebarItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: Home },
  { key: 'movies', label: 'Movies', icon: Film },
  { key: 'workouts', label: 'Workouts', icon: Dumbbell },
  { key: 'todos', label: 'Todo', icon: CheckSquare },
  { key: 'finance', label: 'Finance', icon: Landmark },
  { key: 'habits', label: 'Habits', icon: Activity },
  { key: 'calendar', label: 'Calendar', icon: CalendarHeart },
  { key: 'journal', label: 'Diary', icon: BookOpen },
  { key: 'notes', label: 'Notes', icon: Lightbulb },
  { key: 'projects', label: 'Projects', icon: Clapperboard },
  { key: 'contacts', label: 'Contacts', icon: Contact },
  { key: 'health', label: 'Health', icon: HeartPulse },
  { key: 'goals', label: 'Goals', icon: Flag },
  { key: 'inventory', label: 'Inventory', icon: Package },
  { key: 'settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  active: ModuleKey;
  onNavigate: (key: ModuleKey) => void;
  reminderBadges?: Partial<Record<ModuleKey, number>>;
}

export function Sidebar({ active, onNavigate, reminderBadges }: SidebarProps) {
  const { t } = useI18n();
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark">M</span>
        <div>
          <strong>MyMind</strong>
          <small>{t('Personal OS')}</small>
        </div>
      </div>
      <nav>
        {items.map((item) => {
          const Icon = item.icon;
          return (
          <button
            className={`nav-item ${active === item.key ? 'active' : ''}`}
            key={item.key}
            type="button"
            onClick={() => onNavigate(item.key)}
          >
            <Icon size={18} aria-hidden="true" />
            <span>{t(item.label)}</span>
            {reminderBadges?.[item.key] ? <strong className="nav-badge">{reminderBadges[item.key]}</strong> : null}
          </button>
          );
        })}
      </nav>
    </aside>
  );
}
