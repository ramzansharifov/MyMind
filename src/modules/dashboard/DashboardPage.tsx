import { BookOpen, CalendarHeart, CheckSquare, Dumbbell, Flag, Lightbulb, Plus, WalletCards } from 'lucide-react';
import type { ReactNode } from 'react';
import type { AppData } from '../../shared/app/appData';
import { GlobalSearch } from '../../shared/components/GlobalSearch';
import { StatCard } from '../../shared/components/StatCard';
import { useI18n } from '../../shared/i18n/I18nProvider';
import type { AppSettings, ModuleKey } from '../../shared/types/common';
import { cn } from '../../shared/utils/classNames';
import { isHiddenFromRegularLists } from '../../shared/utils/archiveUtils';
import { formatDate, isWithinDays, todayDateOnly } from '../../shared/utils/dateUtils';
import { formatCurrency } from '../../shared/utils/formatters';
import { currentBalance, totalByType } from '../finance/financeUtils';
import { todayHabits } from '../habits/habitUtils';
import { todayTodos } from '../todos/todoUtils';
import { TimeToolsPanel } from './TimeToolsPanel';
import { WeatherPanel } from './WeatherPanel';

interface DashboardPageProps {
  data: AppData;
  currency: string;
  onNavigate: (module: ModuleKey) => void;
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => Promise<void>;
}

export function DashboardPage({
  data,
  currency,
  onNavigate,
  settings,
  onSettingsChange,
}: DashboardPageProps) {
  const { t } = useI18n();
  const today = todayDateOnly();
  const activeTodos = data.todos.items.filter((todo) => !isHiddenFromRegularLists(todo));
  const activeNotes = data.notes.items.filter((note) => !isHiddenFromRegularLists(note));
  const activeEntries = data.journalEntries.items.filter((entry) => !isHiddenFromRegularLists(entry));
  const activeEvents = data.calendarEvents.filter((event) => !isHiddenFromRegularLists(event));
  const upcomingEvents = activeEvents
    .filter((event) => isWithinDays(event.date, 14))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6);
  const todaysTodos = todayTodos(activeTodos).filter((todo) => todo.status !== 'completed');
  const overdueTodos = activeTodos
    .filter((todo) => todo.status !== 'completed' && todo.dueDate && todo.dueDate < today)
    .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)))
    .slice(0, 5);
  const todaysHabits = todayHabits(data.habits.habits).filter((habit) => habit.isActive);
  const activeProjects = data.projects.filter((project) => !isHiddenFromRegularLists(project) && project.status === 'active');
  const activeGoals = data.goals.filter((goal) => !isHiddenFromRegularLists(goal) && goal.status === 'active');
  const recentNotes = [...activeNotes]
    .sort((a, b) => Number(Boolean(b.pinned || b.pinnedAt)) - Number(Boolean(a.pinned || a.pinnedAt)) || b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 4);
  const recentEntries = [...activeEntries]
    .sort((a, b) => Number(Boolean(b.pinnedAt)) - Number(Boolean(a.pinnedAt)) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, 4);
  const recentHealth = [...data.health.entries].sort((a, b) => b.date.localeCompare(a.date))[0];
  const latestWorkout = [...data.workouts.sessions].sort((a, b) => b.date.localeCompare(a.date))[0];

  return (
    <section className="min-w-0">
      <GlobalSearch data={data} onNavigate={onNavigate} />
      <header className="mb-[18px] grid grid-cols-[minmax(0,1fr)_minmax(300px,420px)] items-end gap-5 rounded-panel border border-[var(--hero-border)] bg-[var(--hero-bg)] p-6 max-[900px]:grid-cols-1">
        <div>
          <div className="flex min-w-0 items-center gap-3.5">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-panel bg-[linear-gradient(135deg,var(--accent),var(--accent-strong))] font-extrabold text-white shadow-[0_14px_30px_var(--accent-glow)]">M</span>
            <div>
              <span className="mb-2 inline-flex text-xs font-bold uppercase tracking-[0.08em] text-app-accent-strong">{t('Personal OS')}</span>
              <h1 className="text-[34px] font-extrabold text-app-text">MyMind</h1>
            </div>
          </div>
          <p className="mt-1.5 max-w-[720px] text-app-muted">{t('A local personal operating system for plans, records, routines, and quiet review.')}</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <QuickAction icon={<CheckSquare size={18} />} label="Task" module="todos" onNavigate={onNavigate} />
          <QuickAction icon={<WalletCards size={18} />} label="Expense" module="finance" onNavigate={onNavigate} />
          <QuickAction icon={<BookOpen size={18} />} label="Diary" module="journal" onNavigate={onNavigate} />
          <QuickAction icon={<Lightbulb size={18} />} label="Note" module="notes" onNavigate={onNavigate} />
          <QuickAction icon={<CalendarHeart size={18} />} label="Life event" module="calendar" onNavigate={onNavigate} />
        </div>
      </header>

      <div className="mb-[22px] grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
        <StatCard label="Today's todos" value={todaysTodos.length} detail={overdueTodos.length ? `${overdueTodos.length} overdue` : 'Clear'} />
        <StatCard label="Today's habits" value={todaysHabits.length} detail={`${data.habits.logs.filter((log) => log.date === today && log.isCompleted).length} done`} />
        <StatCard label="Balance" value={formatCurrency(currentBalance(data.finance.transactions, data.finance.startingBalance), currency)} detail="Local ledger" />
        <StatCard label="Expenses" value={formatCurrency(totalByType(data.finance.transactions, 'expense'), currency)} detail="All time" />
        <StatCard label="Income" value={formatCurrency(totalByType(data.finance.transactions, 'income'), currency)} detail="All time" />
        <StatCard label="Active goals" value={activeGoals.length} detail={`${activeProjects.length} active projects`} />
        <StatCard label="Upcoming events" value={upcomingEvents.length} detail="Next 14 days" />
        <StatCard label="Pinned notes" value={activeNotes.filter((note) => note.pinned || note.pinnedAt).length} detail={`${activeNotes.length} total notes`} />
        <StatCard label="Recent entries" value={recentEntries.length} detail="Diary" />
      </div>

      <WeatherPanel settings={settings} onSettingsChange={onSettingsChange} />
      <TimeToolsPanel />

      <div className="mt-[22px] grid grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)] gap-4 max-[980px]:grid-cols-1">
        <section className={cn(panelClass, 'row-span-2')}>
          <div className={sectionHeadingClass}>
            <h2>{t('Today')}</h2>
            <button className={ghostButtonClass} type="button" onClick={() => onNavigate('todos')}>
              <Plus size={16} aria-hidden="true" />
              {t('Add task')}
            </button>
          </div>
          <div className={stackClass}>
            {todaysTodos.slice(0, 6).map((todo) => (
              <article className={signalRowClass} key={todo.id}>
                <CheckSquare size={17} aria-hidden="true" />
                <div>
                  <strong>{todo.title}</strong>
                  <span className="block text-xs text-app-muted">{todo.priority} / {todo.dueDate ? formatDate(todo.dueDate) : t('No date')}</span>
                </div>
              </article>
            ))}
            {todaysHabits.slice(0, 6).map((habit) => (
              <article className={signalRowClass} key={habit.id}>
                <Dumbbell size={17} aria-hidden="true" />
                <div>
                  <strong>{habit.title}</strong>
                  <span className="block text-xs text-app-muted">{habit.timeOfDay || t('Any time')}</span>
                </div>
              </article>
            ))}
            {todaysTodos.length === 0 && todaysHabits.length === 0 ? <EmptyMini title="Nothing urgent today" /> : null}
          </div>
        </section>

        <section className={panelClass}>
          <h2>{t('Needs attention')}</h2>
          <div className={stackClass}>
            {overdueTodos.map((todo) => (
              <button className={cn(signalRowClass, actionRowClass)} type="button" key={todo.id} onClick={() => onNavigate('todos')}>
                <CheckSquare size={17} aria-hidden="true" />
                <div>
                  <strong>{todo.title}</strong>
                  <span className="block text-xs text-app-muted">{t('Overdue')} / {formatDate(todo.dueDate)}</span>
                </div>
              </button>
            ))}
            {activeGoals.filter((goal) => goal.progress < 25).slice(0, 3).map((goal) => (
              <button className={cn(signalRowClass, actionRowClass)} type="button" key={goal.id} onClick={() => onNavigate('goals')}>
                <Flag size={17} aria-hidden="true" />
                <div>
                  <strong>{goal.title}</strong>
                  <span className="block text-xs text-app-muted">{goal.progress}% / {goal.horizon}</span>
                </div>
              </button>
            ))}
            {overdueTodos.length === 0 && activeGoals.filter((goal) => goal.progress < 25).length === 0 ? <EmptyMini title="Everything looks calm" /> : null}
          </div>
        </section>

        <section className={panelClass}>
          <h2>{t('Next signals')}</h2>
          <div className={stackClass}>
            {upcomingEvents.map((event) => (
              <button className={cn(signalRowClass, actionRowClass)} type="button" key={event.id} onClick={() => onNavigate('calendar')}>
                <CalendarHeart size={17} aria-hidden="true" />
                <div>
                  <strong>{event.title}</strong>
                  <span className="block text-xs text-app-muted">{formatDate(event.date)} {event.isImportant ? `/ ${t('Important')}` : ''}</span>
                </div>
              </button>
            ))}
            {upcomingEvents.length === 0 ? <EmptyMini title="No upcoming events" /> : null}
          </div>
        </section>

        <section className={panelClass}>
          <h2>{t('Recent activity')}</h2>
          <div className={stackClass}>
            {latestWorkout ? (
              <button className={cn(signalRowClass, actionRowClass)} type="button" onClick={() => onNavigate('workouts')}>
                <Dumbbell size={17} aria-hidden="true" />
                <div>
                  <strong>{t('Latest workout')}</strong>
                  <span className="block text-xs text-app-muted">{formatDate(latestWorkout.date)} / {latestWorkout.energyLevel}/10</span>
                </div>
              </button>
            ) : null}
            {recentHealth ? (
              <button className={cn(signalRowClass, actionRowClass)} type="button" onClick={() => onNavigate('health')}>
                <WalletCards size={17} aria-hidden="true" />
                <div>
                  <strong>{t('Latest health entry')}</strong>
                  <span className="block text-xs text-app-muted">{formatDate(recentHealth.date)} / {recentHealth.energy}/10</span>
                </div>
              </button>
            ) : null}
            {recentEntries.slice(0, 2).map((entry) => (
              <button className={cn(signalRowClass, actionRowClass)} type="button" key={entry.id} onClick={() => onNavigate('journal')}>
                <BookOpen size={17} aria-hidden="true" />
                <div>
                  <strong>{entry.title}</strong>
                  <span className="block text-xs text-app-muted">{entry.mood || t('No mood')}</span>
                </div>
              </button>
            ))}
            {recentNotes.slice(0, 2).map((note) => (
              <button className={cn(signalRowClass, actionRowClass)} type="button" key={note.id} onClick={() => onNavigate('notes')}>
                <Lightbulb size={17} aria-hidden="true" />
                <div>
                  <strong>{note.title}</strong>
                  <span className="block text-xs text-app-muted">{note.category || t('Uncategorized')}</span>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

function QuickAction({
  icon,
  label,
  module,
  onNavigate,
}: {
  icon: ReactNode;
  label: string;
  module: ModuleKey;
  onNavigate: (module: ModuleKey) => void;
}) {
  const { t } = useI18n();
  return (
    <button className="flex items-center gap-[9px] rounded-panel border border-app-border bg-[color-mix(in_srgb,var(--surface)_78%,transparent)] p-3 text-left text-app-text transition-colors hover:border-[color-mix(in_srgb,var(--accent)_44%,var(--border))] hover:bg-app-surface-strong" type="button" onClick={() => onNavigate(module)}>
      {icon}
      <span>{t(label)}</span>
    </button>
  );
}

function EmptyMini({ title }: { title: string }) {
  const { t } = useI18n();
  return (
    <article className={miniRowClass}>
      <strong>{t(title)}</strong>
      <span className="block text-xs text-app-muted">{t('Add more data when you are ready.')}</span>
    </article>
  );
}

const panelClass =
  'grid gap-3.5 rounded-panel border border-[var(--glass-border)] bg-[var(--panel-bg)] p-[18px] text-app-text [backdrop-filter:var(--glass-blur)] shadow-panel';
const sectionHeadingClass = 'mb-4 flex items-center justify-between gap-3';
const stackClass = 'grid gap-2.5';
const miniRowClass = 'rounded-panel border border-[var(--line-soft)] bg-app-surface-soft p-3 text-app-text';
const signalRowClass = cn(miniRowClass, 'grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2.5');
const actionRowClass = 'w-full text-left transition-colors hover:border-[color-mix(in_srgb,var(--accent)_44%,var(--border))] hover:bg-app-surface-strong';
const ghostButtonClass =
  'inline-flex min-h-control items-center justify-center gap-2 whitespace-nowrap rounded-control border border-[color-mix(in_srgb,var(--accent)_36%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_10%,var(--surface-strong))] px-3.5 py-2.5 text-[color-mix(in_srgb,var(--accent-strong)_86%,var(--text))] transition-[border-color,box-shadow,transform,background,color] duration-150 hover:-translate-y-px hover:border-[color-mix(in_srgb,var(--accent-strong)_82%,var(--border))] hover:bg-[var(--control-bg-hover)] hover:text-[color-mix(in_srgb,var(--accent-strong)_92%,white)] hover:shadow-[0_8px_22px_var(--shadow)]';
