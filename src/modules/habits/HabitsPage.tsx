import { useState } from 'react';
import { AddButton } from '../../shared/components/ActionButtons';
import { EmptyState } from '../../shared/components/EmptyState';
import { PageHeader } from '../../shared/components/PageHeader';
import { StatCard } from '../../shared/components/StatCard';
import { useI18n } from '../../shared/i18n/I18nProvider';
import { formatDate, todayDateOnly } from '../../shared/utils/dateUtils';
import { createId } from '../../shared/utils/idGenerator';
import { activeHabits, isHabitCompletedToday, recentHabitLogs, todayHabits, todayLog } from './habitUtils';
import { HabitCard } from './HabitCard';
import { HabitForm } from './HabitForm';
import type { Habit, HabitData, HabitLog } from './types';

interface HabitsPageProps {
  data: HabitData;
  onChange: (data: HabitData) => void;
}

export function HabitsPage({ data, onChange }: HabitsPageProps) {
  const [editing, setEditing] = useState<Habit | null | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<'routine' | 'history' | 'charts'>('routine');
  const habitsForToday = todayHabits(data.habits);
  const { t } = useI18n();
  const completedToday = habitsForToday.filter((habit) => isHabitCompletedToday(habit.id, data.logs)).length;
  const active = activeHabits(data.habits);

  function saveHabit(habit: Habit) {
    const exists = data.habits.some((item) => item.id === habit.id);
    onChange({ ...data, habits: exists ? data.habits.map((item) => (item.id === habit.id ? habit : item)) : [habit, ...data.habits] });
    setEditing(undefined);
  }

  function upsertTodayLog(habit: Habit, patch: Partial<HabitLog>) {
    const date = todayDateOnly();
    const existing = todayLog(habit.id, data.logs);
    const nextLog: HabitLog = {
      id: existing?.id ?? createId('habitlog'),
      habitId: habit.id,
      habitTitle: habit.title,
      date,
      isCompleted: existing?.isCompleted ?? false,
      notes: existing?.notes ?? '',
      ...patch,
    };
    onChange({
      ...data,
      logs: existing ? data.logs.map((log) => (log.id === existing.id ? nextLog : log)) : [...data.logs, nextLog],
    });
  }

  function removeFromActive(habit: Habit) {
    const timestamp = new Date().toISOString();
    onChange({
      ...data,
      habits: data.habits.map((item) => (item.id === habit.id ? { ...item, isActive: false, archivedAt: timestamp, updatedAt: timestamp } : item)),
    });
  }

  return (
    <section>
      <PageHeader
        title="Habits"
        subtitle="A daily routine list with notes and preserved history."
        actions={<AddButton label="Add habit" onClick={() => setEditing(null)} />}
      />
      <div className="stats-grid habits-stats">
        <StatCard label="Active habits" value={active.length} />
        <StatCard label="Today" value={`${completedToday}/${habitsForToday.length}`} detail="completed today" />
        <StatCard label="History entries" value={data.logs.length} />
      </div>

      <div className="workout-tabs" role="tablist" aria-label={t('Habit sections')}>
        {[
          { id: 'routine', label: 'Routine' },
          { id: 'history', label: 'History' },
          { id: 'charts', label: 'Charts' },
        ].map((tab) => (
          <button
            className={`workout-tab${activeTab === tab.id ? ' active' : ''}`}
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id as 'routine' | 'history' | 'charts')}
          >
            {t(tab.label)}
          </button>
        ))}
      </div>

      {activeTab === 'routine' ? (
        <section className="panel habits-panel today-habits-panel">
          <div className="section-heading">
            <h2>{t('Daily routine')}</h2>
            <span className="rating-pill">{completedToday}/{habitsForToday.length}</span>
          </div>
          {habitsForToday.length === 0 ? <EmptyState title="No active habits" message="Create habits, then mark them every day." /> : null}
          <div className="stack">
            {habitsForToday.map((habit) => {
              const log = todayLog(habit.id, data.logs);
              return (
                <HabitCard
                  habit={habit}
                  key={habit.id}
                  isCompleted={Boolean(log?.isCompleted)}
                  note={log?.notes ?? ''}
                  onToggle={() => upsertTodayLog(habit, { isCompleted: !log?.isCompleted })}
                  onNoteChange={(notes) => upsertTodayLog(habit, { notes })}
                  onEdit={() => setEditing(habit)}
                  onRemove={() => removeFromActive(habit)}
                />
              );
            })}
          </div>
        </section>
      ) : null}

      {activeTab === 'history' ? (
        <section className="panel habits-panel all-habits-panel">
          <h2>{t('Habit history')}</h2>
          <div className="stack">
            {groupHabitLogsByDate(recentHabitLogs(data.logs)).map((day) => (
              <article className="card habit-history-day" key={day.date}>
                <div className="section-heading">
                  <h3>{formatDate(day.date)}</h3>
                  <span className="rating-pill">{day.logs.filter((log) => log.isCompleted).length}/{day.logs.length}</span>
                </div>
                <div className="stack">
                  {day.logs.map((log) => (
                    <div className="mini-row" key={log.id}>
                      <span className={`habit-history-status ${log.isCompleted ? 'completed' : ''}`} aria-hidden="true" />
                      <div>
                        <strong>{log.habitTitle || data.habits.find((habit) => habit.id === log.habitId)?.title || t('Deleted habit')}</strong>
                        <span>{log.notes || t('No notes yet.')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
            {data.logs.length === 0 ? <p className="muted-text">{t('No habit history yet.')}</p> : null}
          </div>
        </section>
      ) : null}

      {activeTab === 'charts' ? (
        <section className="panel habits-panel">
          <h2>{t('Charts')}</h2>
          <div className="workout-placeholder">
            <p>{t('Habit charts will appear here.')}</p>
          </div>
        </section>
      ) : null}
      {editing !== undefined ? <HabitForm habit={editing} onCancel={() => setEditing(undefined)} onSave={saveHabit} /> : null}
    </section>
  );
}

function groupHabitLogsByDate(logs: HabitLog[]) {
  const grouped = new Map<string, HabitLog[]>();
  for (const log of logs) {
    grouped.set(log.date, [...(grouped.get(log.date) ?? []), log]);
  }
  return Array.from(grouped.entries()).map(([date, dayLogs]) => ({ date, logs: dayLogs }));
}
