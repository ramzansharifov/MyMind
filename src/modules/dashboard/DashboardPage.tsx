import { BookOpen, CalendarHeart, CheckSquare, Dumbbell, Flag, Lightbulb, Plus, WalletCards } from 'lucide-react';
import type { ReactNode } from 'react';
import type { AppData } from '../../shared/app/appData';
import { GlobalSearch } from '../../shared/components/GlobalSearch';
import { StatCard } from '../../shared/components/StatCard';
import { useI18n } from '../../shared/i18n/I18nProvider';
import type { AppSettings, ModuleKey } from '../../shared/types/common';
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
    <section>
      <GlobalSearch data={data} onNavigate={onNavigate} />
      <header className="dashboard-hero dashboard-hero-grid">
        <div>
          <div className="dashboard-brand">
            <span className="dashboard-brand-mark">M</span>
            <div>
              <span className="eyebrow">{t('Personal OS')}</span>
              <h1>MyMind</h1>
            </div>
          </div>
          <p>{t('A local personal operating system for plans, records, routines, and quiet review.')}</p>
        </div>
        <div className="quick-actions">
          <QuickAction icon={<CheckSquare size={18} />} label="Task" module="todos" onNavigate={onNavigate} />
          <QuickAction icon={<WalletCards size={18} />} label="Expense" module="finance" onNavigate={onNavigate} />
          <QuickAction icon={<BookOpen size={18} />} label="Diary" module="journal" onNavigate={onNavigate} />
          <QuickAction icon={<Lightbulb size={18} />} label="Note" module="notes" onNavigate={onNavigate} />
          <QuickAction icon={<CalendarHeart size={18} />} label="Life event" module="calendar" onNavigate={onNavigate} />
        </div>
      </header>

      <div className="stats-grid">
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

      <div className="dashboard-layout section-block">
        <section className="panel command-panel">
          <div className="section-heading">
            <h2>{t('Today')}</h2>
            <button className="button ghost" type="button" onClick={() => onNavigate('todos')}>
              <Plus size={16} aria-hidden="true" />
              {t('Add task')}
            </button>
          </div>
          <div className="stack">
            {todaysTodos.slice(0, 6).map((todo) => (
              <article className="mini-row signal-row" key={todo.id}>
                <CheckSquare size={17} aria-hidden="true" />
                <div>
                  <strong>{todo.title}</strong>
                  <span>{todo.priority} / {todo.dueDate ? formatDate(todo.dueDate) : t('No date')}</span>
                </div>
              </article>
            ))}
            {todaysHabits.slice(0, 6).map((habit) => (
              <article className="mini-row signal-row" key={habit.id}>
                <Dumbbell size={17} aria-hidden="true" />
                <div>
                  <strong>{habit.title}</strong>
                  <span>{habit.timeOfDay || t('Any time')}</span>
                </div>
              </article>
            ))}
            {todaysTodos.length === 0 && todaysHabits.length === 0 ? <EmptyMini title="Nothing urgent today" /> : null}
          </div>
        </section>

        <section className="panel">
          <h2>{t('Needs attention')}</h2>
          <div className="stack">
            {overdueTodos.map((todo) => (
              <button className="mini-row signal-row action-row" type="button" key={todo.id} onClick={() => onNavigate('todos')}>
                <CheckSquare size={17} aria-hidden="true" />
                <div>
                  <strong>{todo.title}</strong>
                  <span>{t('Overdue')} / {formatDate(todo.dueDate)}</span>
                </div>
              </button>
            ))}
            {activeGoals.filter((goal) => goal.progress < 25).slice(0, 3).map((goal) => (
              <button className="mini-row signal-row action-row" type="button" key={goal.id} onClick={() => onNavigate('goals')}>
                <Flag size={17} aria-hidden="true" />
                <div>
                  <strong>{goal.title}</strong>
                  <span>{goal.progress}% / {goal.horizon}</span>
                </div>
              </button>
            ))}
            {overdueTodos.length === 0 && activeGoals.filter((goal) => goal.progress < 25).length === 0 ? <EmptyMini title="Everything looks calm" /> : null}
          </div>
        </section>

        <section className="panel">
          <h2>{t('Next signals')}</h2>
          <div className="stack">
            {upcomingEvents.map((event) => (
              <button className="mini-row signal-row action-row" type="button" key={event.id} onClick={() => onNavigate('calendar')}>
                <CalendarHeart size={17} aria-hidden="true" />
                <div>
                  <strong>{event.title}</strong>
                  <span>{formatDate(event.date)} {event.isImportant ? `/ ${t('Important')}` : ''}</span>
                </div>
              </button>
            ))}
            {upcomingEvents.length === 0 ? <EmptyMini title="No upcoming events" /> : null}
          </div>
        </section>

        <section className="panel">
          <h2>{t('Recent activity')}</h2>
          <div className="stack">
            {latestWorkout ? (
              <button className="mini-row signal-row action-row" type="button" onClick={() => onNavigate('workouts')}>
                <Dumbbell size={17} aria-hidden="true" />
                <div>
                  <strong>{t('Latest workout')}</strong>
                  <span>{formatDate(latestWorkout.date)} / {latestWorkout.energyLevel}/10</span>
                </div>
              </button>
            ) : null}
            {recentHealth ? (
              <button className="mini-row signal-row action-row" type="button" onClick={() => onNavigate('health')}>
                <WalletCards size={17} aria-hidden="true" />
                <div>
                  <strong>{t('Latest health entry')}</strong>
                  <span>{formatDate(recentHealth.date)} / {recentHealth.energy}/10</span>
                </div>
              </button>
            ) : null}
            {recentEntries.slice(0, 2).map((entry) => (
              <button className="mini-row signal-row action-row" type="button" key={entry.id} onClick={() => onNavigate('journal')}>
                <BookOpen size={17} aria-hidden="true" />
                <div>
                  <strong>{entry.title}</strong>
                  <span>{entry.mood || t('No mood')}</span>
                </div>
              </button>
            ))}
            {recentNotes.slice(0, 2).map((note) => (
              <button className="mini-row signal-row action-row" type="button" key={note.id} onClick={() => onNavigate('notes')}>
                <Lightbulb size={17} aria-hidden="true" />
                <div>
                  <strong>{note.title}</strong>
                  <span>{note.category || t('Uncategorized')}</span>
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
    <button className="quick-action" type="button" onClick={() => onNavigate(module)}>
      {icon}
      <span>{t(label)}</span>
    </button>
  );
}

function EmptyMini({ title }: { title: string }) {
  const { t } = useI18n();
  return (
    <article className="mini-row">
      <strong>{t(title)}</strong>
      <span>{t('Add more data when you are ready.')}</span>
    </article>
  );
}
